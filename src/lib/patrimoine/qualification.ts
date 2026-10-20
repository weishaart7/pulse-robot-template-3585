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
 *   nature" (art. 1404)
 * - Régime de séparation de biens (et participation aux acquêts) → bien
 *   propre à son acquéreur, indivision s'il a été acquis par les deux époux
 *   (art. 1538)
 * - Séparation de corps : bien acquis à partir de la date du jugement →
 *   traité comme sous séparation de biens (art. 302), quel que soit le régime
 * - Régime de séparation de biens avec société d'acquêts (3 masses : propre
 *   époux A / société d'acquêts commune / propre époux B) → voir la branche
 *   dédiée (périmètre par catégories, désignations et exclusions nommées)
 * - Régime de communauté universelle → commun pour tout le reste (biens à
 *   titre onéreux, ou libéralités sans stipulation expresse)
 * - PACS avec convention de séparation de patrimoines (par défaut) → bien propre
 * - PACS avec convention d'indivision (ou PACS conclu avant 2007 sans convention
 *   renseignée) → indivision (art. 515-5-1), jamais « commun » : la notion de
 *   bien commun est propre au contrat de mariage. Biens à caractère personnel,
 *   remploi et biens reçus à titre gratuit → bien personnel (art. 515-5-2)
 * - Concubinage → aucune masse commune ni régime légal (le concubinage n'est
 *   pas une union juridique, art. 515-8) : bien personnel s'il est détenu par
 *   un seul concubin, indivision de droit commun s'il est détenu par les deux
 * - Sans union (célibataire / divorcé / veuf) → bien personnel
 */

import { getAssetCategory } from '@/constants/assetTypes';
import { isDetenteurCommon } from './utils';
import { categorieCouvrante, PerimetreSocieteAcquets } from './societeAcquets';

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
  /** Périmètre de la société d'acquêts (régime séparation de biens avec société d'acquêts), cf. societeAcquets.ts. */
  societeAcquets?: PerimetreSocieteAcquets;
  /** Bien propre par nature (art. 1404 : vêtements, actions en réparation d'un dommage corporel/moral, créances et pensions incessibles, instruments de travail nécessaires à la profession), saisi manuellement sur l'actif. */
  estPropreParNature?: boolean;
  /** Prix total d'acquisition (financement mixte, art. 1436), pour le comparer à apportFondsPropres. */
  valeurAcquisition?: number;
  /** Frais d'acquisition (financement mixte, art. 1436) : à inclure dans le coût total comparé à apportFondsPropres (Cass. 1re civ., 7 oct. 2018, n°17-25965). */
  fraisAcquisition?: number;
  /** Financement mixte (art. 1436, régimes communautaires uniquement) : montant de la contribution en fonds propres apportée à l'acquisition, saisi manuellement sur l'actif. Sans effet si clauseRemploi est actée (remploi total, cas distinct traité en priorité). */
  apportFondsPropres?: number;
  /** Date du jugement de séparation de corps (marital_status.date_jugement_separation_corps) : à partir de cette date, la séparation de biens remplace le régime (art. 302). Sans effet si absente. */
  dateJugementSeparationCorps?: string;
}

// Libéralités : biens reçus à titre gratuit, propres sous régime légal (art. 1405).
export const ORIGINES_LIBERALITES = [
  'Donation',
  'Héritage',
  "Présent d'usage",
  'Acquisition à titre gratuit',
];

// Origines non onéreuses (sans prix d'achat) : libéralités, plus création et découverte. Sert à
// la fiscalité (pas de forfait de frais d'acquisition), PAS à la qualification : un bien créé
// ou découvert pendant le mariage est un acquêt, commun en communauté (art. 1401).
export const ORIGINES_NON_ONEREUSES = [...ORIGINES_LIBERALITES, 'Découverte', 'Création'];

export const isInCouple = (statut?: string): boolean => {
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

// Date d'acquisition à partir d'une date de référence (incluse). Faux si
// l'une des deux est absente ou invalide.
const estPosterieureOuEgale = (date?: string, reference?: string): boolean => {
  if (!date || !reference) return false;
  const d = new Date(date);
  const r = new Date(reference);
  return !isNaN(d.getTime()) && !isNaN(r.getTime()) && d >= r;
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
    valeurAcquisition,
    fraisAcquisition,
    apportFondsPropres,
  } = ctx;

  // regime_matrimonial n'a de sens que sous Marié(e) : les statuts en base ne
  // sont jamais effacés en changeant de statut (cf. RelationInfoForm.tsx),
  // donc un ex-marié devenu Pacsé(e)/Concubinage peut garder une valeur
  // périmée. Neutralisé ici une bonne fois pour toutes plutôt que de
  // reporter la vérification sur chacun des 8 usages ci-dessous.
  // Séparation de corps (art. 302) : la séparation de biens remplace le régime
  // pour les biens acquis à compter du jugement ; les biens antérieurs gardent
  // la qualification du régime d'origine.
  const apresSeparationCorps =
    isMarie(statutCouple) && estPosterieureOuEgale(dateAcquisition, ctx.dateJugementSeparationCorps);
  const regimeMatrimonial = isMarie(statutCouple)
    ? (apresSeparationCorps ? 'Séparation de biens' : ctx.regimeMatrimonial)
    : undefined;

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
  // les régimes communautaires, y compris universelle (art. 1526 : "ne
  // tombent point dans cette communauté"). Sous PACS-indivision, même logique
  // par analogie (art. 515-5-2, biens à caractère personnel).
  if (estPropreParNature && (isRegimeCommunautaire(regimeMatrimonial) || pacsIndivision)) {
    if (isRegimeCommunautaire(regimeMatrimonial)) {
      return {
        qualification: 'Bien propre',
        raison: 'Bien propre par nature (art. 1404) : reste propre même en communauté, y compris universelle.',
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

  // Séparation de biens avec société d'acquêts : régime à 3 masses, dont le
  // contenu de la masse commune est fixé par le contrat (art. 1497). Ordre :
  // (propre par nature et remploi déjà traités plus haut)
  //   1. bien reçu à titre gratuit → hors société (seuls les acquêts y entrent) ;
  //   2. exclu nommément → hors société ;
  //   3. désigné nommément → commun (vaut aussi apport exprès d'un bien antérieur) ;
  //   4. acquis avant le mariage → hors société ;
  //   5. acquêt couvert par le périmètre (tous les acquêts ou une catégorie) → commun ;
  //   6. sinon → indivision si détenu par les deux, propre à l'acquéreur sinon.
  if (isSeparationSocieteAcquets(regimeMatrimonial)) {
    const { assetId, societeAcquets } = ctx;
    const horsSociete = (motif: string) =>
      isDetenteurCommon(detenteur)
        ? { qualification: 'Indivision' as const, raison: `${motif} Détenu par les deux époux : indivision selon la quote-part de chacun (art. 1538).` }
        : { qualification: 'Bien propre' as const, raison: `${motif} Propre à son acquéreur.` };

    if ((origineActif || []).some((o) => ORIGINES_LIBERALITES.includes(o))) {
      return horsSociete('Bien reçu à titre gratuit : hors société d\'acquêts, qui ne contient que des acquêts.');
    }
    if (assetId && societeAcquets?.biensExclus.includes(assetId)) {
      return horsSociete('Bien exclu nommément de la société d\'acquêts.');
    }
    if (assetId && societeAcquets?.biensDesignes.includes(assetId)) {
      return {
        qualification: 'Bien commun',
        raison: 'Bien commun : désigné nommément dans la société d\'acquêts.',
      };
    }
    if (dateMariage && dateAcquisition) {
      const dAcq = new Date(dateAcquisition);
      const dMar = new Date(dateMariage);
      if (!isNaN(dAcq.getTime()) && !isNaN(dMar.getTime()) && dAcq < dMar) {
        return horsSociete('Bien acquis avant le mariage : hors société d\'acquêts, sauf désignation nommée (apport).');
      }
    }
    const categorie = societeAcquets ? categorieCouvrante(societeAcquets, natureActif) : null;
    if (categorie) {
      return {
        qualification: 'Bien commun',
        raison: `Bien commun : acquis pendant le mariage, inclus dans la société d'acquêts (${categorie}).`,
      };
    }
    return horsSociete('Bien hors du périmètre de la société d\'acquêts.');
  }

  // Séparation de biens (et participation aux acquêts, qui fonctionne comme
  // une séparation de biens pendant le mariage) : propre à son acquéreur, ou
  // indivision si les deux époux l'ont acquis ensemble (art. 1538) — la
  // quote-part de chacun se saisit sur l'actif (50/50 par défaut, présomption
  // d'indivision par moitié faute de preuve contraire).
  if (isSeparationDeBiens(regimeMatrimonial) || isParticipationAcquets(regimeMatrimonial)) {
    const contexte = apresSeparationCorps
      ? 'Bien acquis après le jugement de séparation de corps : la séparation de biens remplace le régime (art. 302)'
      : 'Régime de séparation de biens (ou participation aux acquêts, pendant le mariage)';
    if (isDetenteurCommon(detenteur)) {
      return {
        qualification: 'Indivision',
        raison: `${contexte} : bien acquis par les deux époux, en indivision selon la quote-part de chacun (art. 1538).`,
      };
    }
    return {
      qualification: 'Bien propre',
      raison: `${contexte} : le bien est propre à son acquéreur.`,
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
  // bien propre par défaut, sauf stipulation expresse du donateur/testateur
  // faisant entrer la libéralité dans la communauté (clauseEntreeCommunaute)
  // — art. 1405 al. 2, régime légal (et communauté de meubles et acquêts).
  // Sous communauté universelle, la règle est INVERSÉE (art. 1526, corrigé le
  // 2026-09-16 : la version précédente appliquait à tort la même présomption
  // "propre par défaut" à ce régime) — traitée séparément ci-dessous, avant
  // la présomption générale "propre" de cette branche.
  // Sous PACS-indivision, même exclusion par analogie (art. 515-5-2 : deniers
  // reçus par donation/succession non employés, biens créés) mais sans
  // notion de stipulation d'entrée en communauté (concept matrimonial sans
  // équivalent PACS, l'indivision n'ayant pas de "communauté" à intégrer).
  const origines = origineActif || [];
  const estGratuit = origines.some((o) => ORIGINES_LIBERALITES.includes(o));
  // PACS-indivision : les biens créés restent aussi personnels (art. 515-5-2) ; la découverte
  // n'y figure pas. Hors PACS, création et découverte suivent la règle des acquêts (date).
  if (pacsIndivision && (estGratuit || origines.includes('Création'))) {
    return {
      qualification: 'Bien personnel',
      raison: estGratuit
        ? 'Bien reçu à titre gratuit (donation, succession...) : exclu de l\'indivision du PACS (art. 515-5-2).'
        : 'Bien créé par un partenaire : exclu de l\'indivision du PACS (art. 515-5-2).',
    };
  }
  if (estGratuit) {

    // Communauté universelle (art. 1526) : tous les biens, y compris ceux
    // reçus par succession ou libéralité pendant le mariage, tombent dans la
    // communauté par défaut — à l'inverse du régime légal (art. 1405). Seule
    // une clause d'exclusion (réservant le bien à l'époux bénéficiaire) le
    // maintient propre. Même champ `clauseEntreeCommunaute` que la branche
    // régime légal ci-dessous, mais son sens s'inverse sous ce régime : sous
    // CU il représente une clause d'exclusion, pas une clause d'entrée (voir
    // le libellé conditionnel dans OrigineQualificationFields.tsx).
    if (isCommunauteUniverselle(regimeMatrimonial)) {
      if (clauseEntreeCommunaute) {
        return {
          qualification: 'Bien propre',
          raison: 'Bien reçu à titre gratuit sous communauté universelle, avec une clause d\'exclusion réservant sa propriété à l\'époux bénéficiaire (art. 1526) : reste propre.',
        };
      }
      return {
        qualification: 'Bien commun',
        raison: 'Bien reçu à titre gratuit (donation, succession) : commun par défaut sous communauté universelle (art. 1526), sauf clause d\'exclusion contraire.',
      };
    }

    // Communauté de meubles et acquêts (art. 1498) : les immeubles suivent la
    // même règle que le régime légal (propre par défaut, sauf stipulation
    // expresse d'entrée en communauté, art. 1405 transposé), mais les
    // meubles sont communs par défaut (art. 1498 al. 1), sauf clause
    // d'exclusion de communauté — même inversion de sens du champ
    // `clauseEntreeCommunaute` que sous communauté universelle, mais
    // seulement pour les meubles (corrigé le 2026-09-16, même famille de
    // correctif que la communauté universelle ci-dessus).
    if (isCommunauteMeublesEtAcquets(regimeMatrimonial) && !isImmeuble(natureActif)) {
      if (clauseEntreeCommunaute) {
        return {
          qualification: 'Bien propre',
          raison: 'Bien meuble reçu à titre gratuit sous communauté de meubles et acquêts, avec une clause d\'exclusion réservant sa propriété à l\'époux bénéficiaire (art. 1498 al. 1) : reste propre.',
        };
      }
      return {
        qualification: 'Bien commun',
        raison: 'Bien meuble reçu à titre gratuit (donation, succession) : commun par défaut sous communauté de meubles et acquêts (art. 1498 al. 1), sauf clause d\'exclusion contraire.',
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
      raison: 'Bien reçu à titre gratuit (donation, héritage, présent d\'usage) : reste propre (art. 1405 al. 2), sauf stipulation expresse d\'entrée en communauté.',
    };
  }

  // Communauté universelle → commun pour tout le reste (biens acquis à
  // titre onéreux ou d'origine non gratuite ; les libéralités sont déjà
  // traitées à part ci-dessus, art. 1526)
  if (isCommunauteUniverselle(regimeMatrimonial)) {
    return {
      qualification: 'Bien commun',
      raison: 'Régime de communauté universelle : tous les biens sont communs.',
    };
  }

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

// ---------------------------------------------------------------------------
// Qualification d'une dette (emprunt ou passif simple)
// ---------------------------------------------------------------------------
//
// Distincte de qualifierBien() : une dette n'a ni origine, ni clause de
// remploi, ni financement mixte, et deux règles lui sont propres (accessoire
// d'un actif financé, co-emprunt hors communauté). Ordre de priorité :
//   R1 — dette liée à un actif : suit la qualification de cet actif
//        (accessoire ; art. 1406/1410 pour un bien propre financé à crédit —
//        la récompense due si des fonds communs remboursent relève du module
//        Récompenses, art. 1437) ;
//   R4 — dette successorale sous communauté (hors universelle) : propre
//        (art. 1410) ;
//   R2 — dette antérieure à l'union (date de souscription < mariage/PACS) :
//        personnelle au débiteur, indivise si contractée par les deux,
//        commune sous communauté universelle (art. 1526) ;
//   R3 — dette pendant l'union hors communauté (séparation, participation,
//        PACS) : personnelle au débiteur, indivise si contractée par les deux.
//   Défaut — régime communautaire : commune (art. 1409).
// Hors périmètre (limites documentées dans docs/patrimoine.md) : art. 1415
// (emprunt d'un seul époux sans consentement, effet sur le gage des
// créanciers, pas sur la contribution), art. 220 (solidarité ménagère),
// dettes contractées dans l'intérêt personnel d'un époux.

export interface QualificationDetteContext {
  statutCouple?: string;
  regimeMatrimonial?: string;
  dateMariage?: string;
  conventionPacs?: string;
  datePacs?: string;
  detenteur?: string;
  natureDette?: string;
  dateSouscription?: string;
  // Qualification enregistrée de l'actif financé (emprunts.asset_id), si lié.
  qualificationActifLie?: string;
}

const QUALIFICATIONS_DEFINITIVES: QualificationBien[] = ['Bien propre', 'Bien commun', 'Bien personnel', 'Indivision'];

const isDetteSuccessorale = (nature?: string): boolean =>
  !!nature && nature.toLowerCase().startsWith('dettes successorales');

const estAnterieure = (dateSouscription?: string, dateUnion?: string): boolean => {
  if (!dateSouscription || !dateUnion) return false;
  const dS = new Date(dateSouscription);
  const dU = new Date(dateUnion);
  return !isNaN(dS.getTime()) && !isNaN(dU.getTime()) && dS < dU;
};

export const qualifierDette = (ctx: QualificationDetteContext): {
  qualification: QualificationBien;
  raison: string;
} => {
  const { statutCouple, conventionPacs, datePacs, detenteur, natureDette, dateSouscription, qualificationActifLie } = ctx;
  const regimeMatrimonial = isMarie(statutCouple) ? ctx.regimeMatrimonial : undefined;
  const parLesDeux = isDetenteurCommon(detenteur);

  if (!isInCouple(statutCouple)) {
    return { qualification: 'Bien personnel', raison: 'Vous n\'êtes pas en couple : dette personnelle.' };
  }

  // R1
  if (qualificationActifLie && QUALIFICATIONS_DEFINITIVES.includes(qualificationActifLie as QualificationBien)) {
    return {
      qualification: qualificationActifLie as QualificationBien,
      raison: `Dette liée à un actif qualifié « ${qualificationActifLie} » : elle suit la qualification du bien qu'elle finance.`,
    };
  }

  if (isConcubinage(statutCouple)) {
    return parLesDeux
      ? { qualification: 'Indivision', raison: 'Concubinage : dette contractée par les deux concubins, tenus chacun pour sa part (pas de masse commune).' }
      : { qualification: 'Bien personnel', raison: 'Concubinage : dette personnelle au concubin qui l\'a contractée.' };
  }

  const marie = isMarie(statutCouple);
  const communautaire = marie && (!regimeMatrimonial || isRegimeCommunautaire(regimeMatrimonial));
  const universelle = marie && isCommunauteUniverselle(regimeMatrimonial);

  // R4
  if (communautaire && !universelle && isDetteSuccessorale(natureDette)) {
    return {
      qualification: 'Bien propre',
      raison: 'Dette grevant une succession recueillie par l\'un des époux : propre à cet époux (art. 1410).',
    };
  }

  // R2
  const dateUnion = marie ? ctx.dateMariage : datePacs;
  if (estAnterieure(dateSouscription, dateUnion)) {
    if (universelle) {
      return { qualification: 'Bien commun', raison: 'Dette antérieure au mariage : commune sous communauté universelle (art. 1526).' };
    }
    if (parLesDeux) {
      return { qualification: 'Indivision', raison: `Dette contractée par les deux avant ${marie ? 'le mariage' : 'le PACS'} : chacun en est tenu pour sa part.` };
    }
    return {
      qualification: 'Bien propre',
      raison: marie
        ? 'Dette contractée avant le mariage : elle reste propre à l\'époux débiteur (art. 1410).'
        : 'Dette contractée avant le PACS : elle reste personnelle au partenaire débiteur.',
    };
  }

  const sansDate = !dateSouscription ? ' (date de souscription non renseignée : dette présumée contractée pendant l\'union)' : '';

  if (communautaire) {
    return {
      qualification: 'Bien commun',
      raison: `Dette contractée pendant le mariage sous un régime de communauté : commune (art. 1409)${sansDate}.`,
    };
  }

  // R3 — séparation, participation aux acquêts, PACS (quelle que soit la convention)
  if (parLesDeux) {
    return {
      qualification: 'Indivision',
      raison: `Dette contractée par les deux hors régime de communauté : chacun en est tenu pour sa part${sansDate}.`,
    };
  }
  return {
    qualification: 'Bien propre',
    raison: `Hors régime de communauté, la dette est personnelle à celui qui l'a contractée${sansDate}.`,
  };
};
