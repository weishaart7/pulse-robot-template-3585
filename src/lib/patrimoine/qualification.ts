/**
 * Qualification automatique d'un actif en bien propre / commun
 * selon le régime matrimonial (ou la convention PACS), l'origine du bien et
 * la date d'acquisition.
 *
 * Règles simplifiées (régime légal français : communauté réduite aux acquêts)
 * - Clause de remploi actée → bien propre (prioritaire sur tout le reste, y
 *   compris communauté universelle : un époux peut avoir acté une clause de
 *   remploi explicite pour conserver le caractère propre d'un bien)
 * - Bien acquis AVANT le mariage → bien propre, sauf sous le régime de la
 *   communauté de meubles et acquêts : les biens meubles (tout sauf un
 *   immeuble) acquis avant le mariage y sont communs, seuls les immeubles
 *   acquis avant le mariage restent propres
 * - Bien acquis PENDANT le mariage à titre onéreux → commun
 * - Bien reçu par héritage / donation / présent d'usage → bien propre, sauf
 *   stipulation expresse d'entrée en communauté actée sur une donation ou une
 *   succession → commun (art. 1405 al. 2) ; vaut aussi sous communauté
 *   universelle, où c'est la seule exception restante hors "propres par
 *   nature" (art. 1404, cf. clause d'extension)
 * - Régime de séparation de biens → toujours bien propre
 * - Régime de séparation de biens avec société d'acquêts (3 masses : propre
 *   époux A / société d'acquêts commune / propre époux B) → bien commun si
 *   désigné dans la société d'acquêts (par ID ou via le flag "résidence
 *   principale, quel que soit le bien"), indivision si détenu par les deux
 *   sans désignation, propre sinon
 * - Régime de communauté universelle → commun pour tout le reste (biens à
 *   titre onéreux, ou libéralités sans stipulation expresse)
 * - PACS avec convention de séparation de patrimoines (par défaut) → bien propre
 * - PACS avec convention d'indivision → bien commun (assimilé, pas de notion
 *   distincte pour les besoins de cet outil : répartition/transmission identiques)
 * - Concubinage → aucune masse commune ni régime légal (le concubinage n'est
 *   pas une union juridique, art. 515-8) : bien personnel s'il est détenu par
 *   un seul concubin, indivision de droit commun s'il est détenu par les deux
 * - Sans union (célibataire / divorcé / veuf) → bien personnel
 */

import { getAssetCategory } from '@/constants/assetTypes';
import { isDetenteurCommon } from './utils';

export type QualificationBien =
  | 'Bien propre'
  | 'Bien commun'
  | 'Bien personnel'
  | 'Indivision'
  | 'À qualifier';

export interface QualificationContext {
  statutCouple?: string;
  regimeMatrimonial?: string;
  dateMariage?: string;
  conventionPacs?: string;
  /** Date de conclusion du PACS, pour déterminer le régime par défaut (indivision avant le 1er janvier 2007, séparation depuis) quand conventionPacs n'est pas explicitement renseigné. */
  datePacs?: string;
  dateAcquisition?: string;
  origineActif?: string[];
  modeDetention?: string;
  detenteur?: string;
  clauseEntreeCommunaute?: boolean;
  clauseRemploi?: boolean;
  /** Nature de l'actif (valeur brute ASSET_NATURES), pour distinguer meuble et immeuble. */
  natureActif?: string;
  /** ID de l'actif qualifié, pour le confronter à la liste de biens désignés dans la société d'acquêts. */
  assetId?: string;
  /** IDs des biens désignés dans la société d'acquêts (régime séparation de biens avec société d'acquêts). */
  societeAcquetsAssetIds?: string[];
  /** Flag "résidence principale, quel que soit le bien" de la société d'acquêts : suit l'actif de nature "Résidence principale". */
  societeAcquetsResidencePrincipale?: boolean;
  /** Bien propre par nature (art. 1404 : vêtements, actions en réparation d'un dommage corporel/moral, créances et pensions incessibles, instruments de travail nécessaires à la profession), saisi manuellement sur l'actif. */
  estPropreParNature?: boolean;
  /** Clause d'extension de la communauté aux biens propres par nature (art. 1526), lue depuis clauses_contrat.extension_propres_par_nature?.enabled. */
  extensionProprsParNature?: boolean;
  /** Prix total d'acquisition (financement mixte, art. 1436), pour le comparer à apportFondsPropres. */
  valeurAcquisition?: number;
  /** Frais d'acquisition (financement mixte, art. 1436) : à inclure dans le coût total comparé à apportFondsPropres (Cass. 1re civ., 7 oct. 2018, n°17-25965). */
  fraisAcquisition?: number;
  /** Financement mixte (art. 1436, régimes communautaires uniquement) : montant de la contribution en fonds propres apportée à l'acquisition, saisi manuellement sur l'actif. Sans effet si clauseRemploi est actée (remploi total, cas distinct traité en priorité). */
  apportFondsPropres?: number;
}

const ORIGINES_PROPRES = [
  'Donation',
  'Héritage',
  "Présent d'usage",
  'Acquisition à titre gratuit',
  'Découverte',
  'Création',
];

const isInCouple = (statut?: string): boolean => {
  if (!statut) return false;
  const s = statut.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return s.includes('mari') || s.includes('pacs') || s.includes('concubin');
};

const isSeparationSocieteAcquets = (regime?: string): boolean => {
  if (!regime) return false;
  const r = regime.toLowerCase();
  return (r.includes('séparation') || r.includes('separation')) && r.includes('société') && r.includes('acquêts');
};

const isSeparationDeBiens = (regime?: string): boolean => {
  if (!regime) return false;
  const r = regime.toLowerCase();
  return r.includes('séparation') || r.includes('separation');
};

// Pendant le mariage, la participation aux acquêts fonctionne comme une
// séparation de biens (chacun reste seul propriétaire) : seule la
// dissolution fait naître une créance de participation, déjà traitée à part
// (patrimoineOriginaire/patrimoineFinal), indépendamment de qualifierBien().
const isParticipationAcquets = (regime?: string): boolean => {
  if (!regime) return false;
  const r = regime.toLowerCase();
  return r.includes('participation') && r.includes('acquêt');
};

const isCommunauteUniverselle = (regime?: string): boolean => {
  if (!regime) return false;
  const r = regime.toLowerCase();
  return r.includes('universelle');
};

const isCommunauteMeublesEtAcquets = (regime?: string): boolean => {
  if (!regime) return false;
  const r = regime.toLowerCase();
  return r.includes('meubles') && r.includes('acquêts');
};

// Régime communautaire (réduite aux acquêts, meubles et acquêts, ou
// universelle) : seuls ces régimes ont une masse commune à laquelle l'art.
// 1404 (biens propres par nature) fait exception.
export const isRegimeCommunautaire = (regime?: string): boolean => {
  if (!regime) return false;
  const r = regime.toLowerCase();
  return r.includes('communauté') || r.includes('communaute');
};

const isImmeuble = (natureActif?: string): boolean => {
  if (!natureActif) return false;
  return getAssetCategory(natureActif) === 'actifs immobiliers';
};

const isPacse = (statut?: string): boolean => {
  if (!statut) return false;
  const s = statut.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return s.includes('pacs');
};

const isConcubinage = (statut?: string): boolean => {
  if (!statut) return false;
  const s = statut.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return s.includes('concubin');
};

const isMarie = (statut?: string): boolean => {
  if (!statut) return false;
  const s = statut.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return s.includes('mari');
};

const isConventionPacsIndivision = (convention?: string): boolean => {
  if (!convention) return false;
  return convention.toLowerCase().includes('indivision');
};

const isConventionPacsSeparation = (convention?: string): boolean => {
  if (!convention) return false;
  return convention.toLowerCase().includes('séparation') || convention.toLowerCase().includes('separation');
};

// Avant le 1er janvier 2007, le régime par défaut du PACS (à défaut de
// convention contraire) était l'indivision ; depuis cette date, c'est la
// séparation de biens (art. 515-5 C. civ., loi du 23 juin 2006).
const PACS_DATE_REFORME_2007 = new Date('2007-01-01');
const isPacsAvant2007 = (datePacs?: string): boolean => {
  if (!datePacs) return false;
  const d = new Date(datePacs);
  return !isNaN(d.getTime()) && d < PACS_DATE_REFORME_2007;
};

// PACS effectivement sous indivision (convention explicite, ou absence de
// convention renseignée + PACS conclu avant le 1er janvier 2007) — seul cas
// où les exclusions art. 515-5-2 ont un sens (sous PACS-séparation, tout est
// déjà personnel par défaut, pas de masse commune dont exclure quoi que ce soit).
export const isPacsIndivision = (statutCouple?: string, conventionPacs?: string, datePacs?: string): boolean => {
  if (!isPacse(statutCouple)) return false;
  if (isConventionPacsIndivision(conventionPacs)) return true;
  if (isConventionPacsSeparation(conventionPacs)) return false;
  return isPacsAvant2007(datePacs);
};

export const qualifierBien = (ctx: QualificationContext): {
  qualification: QualificationBien;
  raison: string;
} => {
  const {
    statutCouple,
    dateMariage,
    conventionPacs,
    datePacs,
    dateAcquisition,
    origineActif,
    detenteur,
    clauseEntreeCommunaute,
    clauseRemploi,
    natureActif,
    estPropreParNature,
    extensionProprsParNature,
    valeurAcquisition,
    fraisAcquisition,
    apportFondsPropres,
  } = ctx;

  // regime_matrimonial n'a de sens que sous Marié(e) : les statuts en base ne
  // sont jamais effacés en changeant de statut (cf. RelationInfoForm.tsx),
  // donc un ex-marié devenu Pacsé(e)/Concubinage peut garder une valeur
  // périmée. Neutralisé ici une bonne fois pour toutes plutôt que de
  // reporter la vérification sur chacun des 8 usages ci-dessous.
  const regimeMatrimonial = isMarie(statutCouple) ? ctx.regimeMatrimonial : undefined;

  // Cas indivision (plusieurs détenteurs hors couple)
  if (detenteur && detenteur.toLowerCase().includes('indivision')) {
    return { qualification: 'Indivision', raison: 'Bien détenu en indivision.' };
  }

  // Pas en couple → bien personnel
  if (!isInCouple(statutCouple)) {
    return { qualification: 'Bien personnel', raison: 'Vous n\'êtes pas en couple : bien personnel.' };
  }

  // Concubinage : union de fait (art. 515-8), sans régime légal ni masse
  // commune — aucune des règles matrimoniales ou pacsimoniales de la cascade
  // ci-dessous ne lui est applicable, d'où le traitement en amont de toutes
  // (y compris remploi et origine gratuite, qui renverraient à tort "Bien
  // propre", notion qui n'a de sens que face à une communauté). Un bien
  // détenu par les deux concubins relève de l'indivision de droit commun
  // (art. 815) ; détenu par un seul, il lui appartient personnellement.
  if (isConcubinage(statutCouple)) {
    if (isDetenteurCommon(detenteur)) {
      return {
        qualification: 'Indivision',
        raison: 'Concubinage : bien acquis par les deux concubins — indivision de droit commun (art. 815), le concubinage ne crée aucune masse commune.',
      };
    }
    return {
      qualification: 'Bien personnel',
      raison: 'Concubinage : union de fait sans régime légal (art. 515-8) — le bien appartient personnellement au concubin qui l\'a acquis.',
    };
  }

  const pacsIndivision = isPacsIndivision(statutCouple, conventionPacs, datePacs);

  // Bien propre par nature (art. 1404) → prioritaire sur tout le reste dans
  // les régimes communautaires, y compris universelle, sauf clause
  // d'extension de la communauté aux biens propres par nature (art. 1526),
  // qui les fait alors tomber en commun (lecture littérale de l'art. 1526 :
  // "ne tombent point dans cette communauté", sauf stipulation contraire).
  // Sous PACS-indivision, même logique par analogie (art. 515-5-2, biens à
  // caractère personnel) mais sans notion de clause d'extension, propre au
  // contrat de mariage, sans équivalent PACS.
  if (estPropreParNature && (isRegimeCommunautaire(regimeMatrimonial) || pacsIndivision)) {
    if (isRegimeCommunautaire(regimeMatrimonial)) {
      if (extensionProprsParNature) {
        return {
          qualification: 'Bien commun',
          raison: 'Bien propre par nature (art. 1404), mais la clause d\'extension de la communauté aux biens propres par nature (art. 1526) le fait tomber en commun.',
        };
      }
      return {
        qualification: 'Bien propre',
        raison: 'Bien propre par nature (art. 1404) : reste propre même en communauté, y compris universelle, sauf clause d\'extension.',
      };
    }
    return {
      qualification: 'Bien personnel',
      raison: 'Bien à caractère personnel : exclu de l\'indivision du PACS (art. 515-5-2).',
    };
  }

  // Clause de remploi actée → propre (ou personnel sous PACS-indivision),
  // prioritaire sur tout le reste (y compris communauté universelle : un
  // époux peut avoir acté une clause de remploi explicite pour conserver le
  // caractère propre d'un bien acheté avec des fonds propres réemployés).
  if (clauseRemploi) {
    if (pacsIndivision) {
      return {
        qualification: 'Bien personnel',
        raison: 'Bien acquis en remploi de fonds propres : exclu de l\'indivision du PACS (art. 515-5-2).',
      };
    }
    return {
      qualification: 'Bien propre',
      raison: 'Bien propre car acquis avec des fonds propres réemployés (clause de remploi actée).',
    };
  }

  // Séparation de biens avec société d'acquêts : régime à 3 masses. Un bien
  // désigné dans la société d'acquêts (par ID ou via le flag "résidence
  // principale, quel que soit le bien") est commun ; un bien détenu par les
  // deux sans désignation est en indivision ordinaire (pas de communauté par
  // défaut dans ce régime) ; sinon il reste propre à son acquéreur.
  if (isSeparationSocieteAcquets(regimeMatrimonial)) {
    const { assetId, societeAcquetsAssetIds, societeAcquetsResidencePrincipale } = ctx;
    const estDesigne =
      (!!assetId && !!societeAcquetsAssetIds?.includes(assetId)) ||
      (!!societeAcquetsResidencePrincipale && natureActif === 'Résidence principale');

    if (estDesigne) {
      return {
        qualification: 'Bien commun',
        raison: 'Bien commun car désigné dans la société d\'acquêts (masse commune du régime).',
      };
    }

    if (isDetenteurCommon(detenteur)) {
      return {
        qualification: 'Indivision',
        raison: 'Bien détenu par les deux sans désignation dans la société d\'acquêts : indivision ordinaire.',
      };
    }

    return {
      qualification: 'Bien propre',
      raison: 'Séparation de biens avec société d\'acquêts : bien non désigné dans la société d\'acquêts, propre à son acquéreur.',
    };
  }

  // Séparation de biens (et participation aux acquêts, qui fonctionne comme
  // une séparation de biens pendant le mariage) → toujours propre
  if (isSeparationDeBiens(regimeMatrimonial) || isParticipationAcquets(regimeMatrimonial)) {
    return {
      qualification: 'Bien propre',
      raison: 'Régime de séparation de biens (ou participation aux acquêts, pendant le mariage) : tout bien est propre à son acquéreur.',
    };
  }

  // LIMITE CONNUE (décision arbitrage du 28/08/2026) : l'art. 1405 al. 2 fait
  // aussi tomber en communauté, par défaut, une libéralité (donation/
  // succession) faite conjointement aux DEUX époux (sauf stipulation
  // contraire du donateur) — l'inverse de la règle générale "origine gratuite
  // = propre" appliquée ci-dessous. Ce cas n'est pas capturé : aucun champ ne
  // permet de dire qu'une libéralité a été faite conjointement aux deux
  // époux. Limite acceptée en l'absence de dossier client concerné à ce jour.
  //
  // Origine "gratuite" (donation, héritage, présent d'usage, création...) →
  // bien propre, sauf stipulation expresse du donateur/testateur faisant
  // entrer la libéralité dans la communauté (clauseEntreeCommunaute) — art.
  // 1405 al. 2, qui vaut dans tous les régimes communautaires, y compris
  // universelle : placé avant isCommunauteUniverselle() pour rester
  // atteignable sous ce régime (sinon la branche "toujours commun"
  // ci-dessous absorberait toute libéralité sans respecter l'exception).
  // Sous PACS-indivision, même exclusion par analogie (art. 515-5-2 : deniers
  // reçus par donation/succession non employés, biens créés) mais sans
  // notion de stipulation d'entrée en communauté (concept matrimonial sans
  // équivalent PACS, l'indivision n'ayant pas de "communauté" à intégrer).
  const origines = origineActif || [];
  const estGratuit = origines.some((o) => ORIGINES_PROPRES.includes(o));
  if (estGratuit) {
    if (pacsIndivision) {
      return {
        qualification: 'Bien personnel',
        raison: 'Bien reçu à titre gratuit (donation, succession, création...) : exclu de l\'indivision du PACS (art. 515-5-2).',
      };
    }
    if (clauseEntreeCommunaute && (origines.includes('Donation') || origines.includes('Héritage'))) {
      return {
        qualification: 'Bien commun',
        raison: 'Bien commun car la libéralité (donation ou succession) comporte une stipulation expresse d\'entrée en communauté.',
      };
    }
    return {
      qualification: 'Bien propre',
      raison: 'Bien reçu à titre gratuit (donation, héritage, présent d\'usage) : reste propre, y compris en communauté universelle (art. 1405 al. 2), sauf stipulation expresse d\'entrée en communauté.',
    };
  }

  // Communauté universelle → commun pour tout le reste (biens acquis à
  // titre onéreux ou d'origine non gratuite ; les libéralités sans
  // stipulation expresse sont déjà sorties propres ci-dessus)
  if (isCommunauteUniverselle(regimeMatrimonial)) {
    return {
      qualification: 'Bien commun',
      raison: 'Régime de communauté universelle : tous les biens sont communs.',
    };
  }

  // LIMITE CONNUE (décision arbitrage du 28/08/2026) : sous le régime de la
  // communauté de meubles et acquêts, la loi rend communs TOUS les meubles
  // (hors propres par nature, art. 1404), y compris ceux reçus par donation/
  // succession PENDANT le mariage (sauf clause de non-rapport à la
  // communauté). Ce cas n'est pas géré : seule la branche ci-dessous ("acquis
  // avant le mariage") traite spécifiquement ce régime ; un meuble reçu par
  // donation/succession pendant le mariage sous ce régime retombe à tort dans
  // la branche générale "origine gratuite = propre" plus haut. Régime rare en
  // pratique (essentiellement mariages avant 1966 sans contrat) : limite
  // acceptée en l'absence de dossier client concerné à ce jour.
  //
  // Bien acquis avant le mariage → propre, sauf sous le régime de la
  // communauté de meubles et acquêts : les meubles (tout sauf un immeuble)
  // acquis avant le mariage y sont communs ; seuls les immeubles acquis
  // avant le mariage restent propres.
  if (dateMariage && dateAcquisition) {
    const dAcq = new Date(dateAcquisition);
    const dMar = new Date(dateMariage);
    if (!isNaN(dAcq.getTime()) && !isNaN(dMar.getTime()) && dAcq < dMar) {
      if (isCommunauteMeublesEtAcquets(regimeMatrimonial) && !isImmeuble(natureActif)) {
        return {
          qualification: 'Bien commun',
          raison: 'Bien meuble acquis avant le mariage : commun sous le régime de la communauté de meubles et acquêts.',
        };
      }
      return {
        qualification: 'Bien propre',
        raison: 'Bien acquis avant le mariage : il est propre à son acquéreur.',
      };
    }
  }

  // PACS : régime des partenaires distinct du régime matrimonial. Convention
  // explicite (indivision ou séparation) toujours prioritaire ; à défaut de
  // convention renseignée (anciens profils non mis à jour depuis l'ajout de
  // ce champ), le régime par défaut dépend de la date du PACS (art. 515-5 :
  // indivision avant le 1er janvier 2007, séparation depuis).
  if (isPacse(statutCouple)) {
    if (isConventionPacsIndivision(conventionPacs)) {
      return {
        qualification: 'Indivision',
        raison: 'Bien indivis car les partenaires de PACS ont opté pour la convention d\'indivision.',
      };
    }
    if (!isConventionPacsSeparation(conventionPacs) && isPacsAvant2007(datePacs)) {
      return {
        qualification: 'Indivision',
        raison: 'Bien indivis : PACS conclu avant le 1er janvier 2007, sans convention explicite — régime par défaut de l\'indivision (art. 515-5).',
      };
    }
    return {
      qualification: 'Bien propre',
      raison: 'Bien propre car les partenaires de PACS sont, par défaut, soumis à la séparation de patrimoines.',
    };
  }

  // Financement mixte (art. 1436) : uniquement en régime communautaire — la
  // notion de "commun" par opposition à "propre" n'a pas le même sens en
  // séparation/participation/PACS, déjà tous sortis plus haut dans la
  // cascade. clauseRemploi (remploi total) est prioritaire et retourne avant
  // d'atteindre ce point, donc aucun chevauchement possible entre les deux.
  if (isRegimeCommunautaire(regimeMatrimonial) && apportFondsPropres && valeurAcquisition) {
    const coutTotalAcquisition = valeurAcquisition + (fraisAcquisition || 0);
    const ratio = apportFondsPropres / coutTotalAcquisition;
    if (ratio >= 0.5) {
      return {
        qualification: 'Bien propre',
        raison: `Financement mixte (art. 1436) : la contribution en fonds propres (${apportFondsPropres} €) couvre au moins la moitié du coût total d'acquisition, frais inclus (${coutTotalAcquisition} €, Cass. 1re civ., 7 oct. 2018, n°17-25965) : bien propre, récompense due à la communauté pour le solde financé par des fonds communs — à documenter dans le module Récompenses.`,
      };
    }
    return {
      qualification: 'Bien commun',
      raison: `Financement mixte (art. 1436) : la contribution en fonds propres (${apportFondsPropres} €) est inférieure à la moitié du coût total d'acquisition, frais inclus (${coutTotalAcquisition} €, Cass. 1re civ., 7 oct. 2018, n°17-25965) : bien commun, récompense due à l'époux apporteur pour sa contribution en fonds propres — à documenter dans le module Récompenses.`,
    };
  }

  // Par défaut sous régime légal (mariage) : bien acquis pendant l'union à
  // titre onéreux → commun
  return {
    qualification: 'Bien commun',
    raison: 'Bien acquis pendant l\'union à titre onéreux : présumé commun (régime légal).',
  };
};

export const QUALIFICATION_OPTIONS: QualificationBien[] = [
  'Bien propre',
  'Bien commun',
  'Bien personnel',
  'Indivision',
  'À qualifier',
];
