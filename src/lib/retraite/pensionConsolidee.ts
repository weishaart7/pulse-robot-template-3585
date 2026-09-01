/**
 * Pension consolidée tous régimes — référence unique, consommée par
 * Synthese.tsx (via usePensionConsolidee.ts) et par Carriere.tsx (appel
 * direct, cf. docs/audit/audit-pension-consolidation.md). CarriereFonctionPublique.tsx
 * et CarriereCNAVPL.tsx conservent leur propre calcul local pour leur affichage
 * de détail intra-carte (formules identiques, vérifiées par cet audit) — seul
 * le total consolidé de Carriere.tsx est désormais sourcé exclusivement d'ici.
 *
 * Fonctions pures, sans JSX ni state React — orchestre calcul.ts,
 * calculFonctionPublique.ts et calculCNAVPL.ts, sur le modèle attendu par
 * CLAUDE.md (types + fonctions pures, pas de logique métier dans les
 * composants React).
 */

import { RegimeDetecte, PeriodeCarriere } from './parseRIS';
import { FamilyLink } from '@/services/familyService';
import {
  DateNaissance,
  AgeLegalResultat,
  tauxProratisation,
  decoteSurTrimestresPlafond25,
  decoteSurAge,
  decoteApplicable,
  pensionBase,
  pensionComplementaireAnnuelle,
  majorationEnfantsAgircArrco,
  minimumContributif,
  majorationPalier2MICO,
  ecretementMICO,
  ageLegalAtteint,
  ageLegalParentaleEligible,
  dateAnniversaireLegal,
  ageLegalPourGeneration,
  surcotePourTrimestresCotises,
  trimestresCotisesPeriodeSurcoteClassique,
  surcoteParentale,
  surcoteTotale,
  majorationTroisEnfants,
  pensionTotaleConsolideeTousRegimes,
} from './calcul';
import {
  trimestresCotisesEtAssimilesDepuisCarriere,
  ResultatTrimestresCotisesEtAssimiles,
} from './calculTrimestres';
import {
  nombreEnfantsEligiblesMajorationTroisEnfants,
  nombreEnfantsEligiblesMajorationAgircArrco,
} from './enfantsEligiblesMajoration';
import { estRegimeAgircArrco } from './regimesConnus';
import {
  pensionBaseFonctionPublique,
  decoteFonctionPublique,
  tauxDecoteParTrimestreFonctionPublique,
  minimumGaranti,
  pensionFonctionPubliqueFinale,
  majorationEnfantsFonctionPublique,
  pensionFonctionPubliqueAvecMajorationEnfants,
  VALEUR_REFERENCE_MIGA_ANNUELLE_2026,
  supplementNBI,
} from './calculFonctionPublique';
import { pensionBaseCNAVPL, decoteCNAVPL } from './calculCNAVPL';

const VALEUR_SERVICE_POINT_RAFP_2026 = 0.05671;

export interface DonneesFonctionPublique {
  traitementIndiciaireBrut: number;
  trimestresLiquidables: number;
  pointsRAFP: number;
  departAnticipeCategorieActive: boolean;
  ageDepartAnticipe?: number;
  ageAnnulationDecote?: number;
  departPourInvalidite: boolean;
  anneeOuvertureDroits?: number;
  // Supplément NBI (écart #13-NBI, docs/retraite.md) : formule sourcée
  // uniquement pour SRE/CNRACL (docs/retraite-base-referentiel.md §7.7.1) —
  // regimeAffiliation non renseigné (undefined) => supplément non calculé,
  // jamais accordé par défaut.
  regimeAffiliation?: 'SRE' | 'CNRACL';
  moyenneAnnuelleNBI: number;
  trimestresLiquidablesNBI: number;
  /**
   * Déclaratif : trimestres cotisés au-delà de l'âge légal — période de
   * référence de la surcote CLASSIQUE (art. L. 351-1-2 CSS). Saisi à la main
   * car ce régime n'a pas de détail de carrière par année dans cet outil.
   * Non renseigné => 0 (comportement historique).
   */
  trimestresCotisesApresAgeLegal?: number;
}

export interface DonneesCNAVPL {
  trimestresCNAVPL: number;
  pointsCNAVPL: number;
  valeurPointCNAVPL: number;
  /** Cf. `DonneesFonctionPublique.trimestresCotisesApresAgeLegal`. */
  trimestresCotisesApresAgeLegal?: number;
}

export interface EntreePensionConsolidee {
  salaireAnnuelMoyen: number;
  trimestresValides: number;
  trimestresRequis: number;
  dateNaissance: DateNaissance | null;
  ageActuel: number | null;
  regimesPoints: RegimeDetecte[];
  detailCarriere: PeriodeCarriere[];
  familyLinks: FamilyLink[];
  auMoinsUnTrimestreMajorationEnfant: boolean;
  autresPensionsMensuelles: number;
  fonctionPublique: DonneesFonctionPublique | null;
  cnavpl: DonneesCNAVPL | null;
}

// Sous-totaux annuels par régime — exposés pour l'annexe de l'export PDF
// (cf. Synthese.tsx), déjà calculés en interne par calculerPensionConsolidee
// mais jusqu'ici non retournés.
export interface RepartitionParRegime {
  baseRegimeGeneral: number;
  complementaireRegimeGeneral: number;
  fonctionPublique: number;
  rafp: number;
  cnavpl: number;
}

// Détail du calcul régime général — exposé pour les écrans qui affichent la
// décomposition (Carriere.tsx : décote/surcote, MICO palier 1/2, écrêtement,
// majoration enfants), en plus du total consolidé déjà retourné ci-dessus.
// Toutes ces valeurs sont déjà calculées en interne par calculerPensionConsolidee
// — ce type ne fait que les rendre visibles à l'appelant, aucun calcul
// supplémentaire.
export interface DetailRegimeGeneral {
  pensionBaseBrute: number;
  decote: number;
  surcoteClassiquePct: number;
  surcoteParentalePct: number;
  surcoteTotalePct: number;
  surcoteMontant: number;
  micoMontant: number;
  majorationPalier1: number;
  majorationPalier2: number;
  majorationMicoAvantEcretement: number;
  majorationMicoApresEcretement: number;
  majorationEnfantsPct: number;
  nombreEnfantsEligibles: number;
}

export interface ResultatPensionConsolidee {
  pensionTotaleConsolidee: number;
  ageTauxPlein: string;
  repartitionParRegime: RepartitionParRegime;
  historiqueTrimestres: ResultatTrimestresCotisesEtAssimiles;
  ageLegal: AgeLegalResultat | null;
  detailRegimeGeneral: DetailRegimeGeneral;
}

function calculerResultatFonctionPublique(
  donnees: DonneesFonctionPublique,
  trimestresRequis: number,
  trimestresAutresRegimes: number,
  dateNaissance: DateNaissance | null,
  auMoinsUnTrimestreMajorationEnfant: boolean,
  nombreEnfantsEligibles: number
): { pensionFinale: number; rafpAnnuelle: number } {
  const tauxDecoteParTrimestre = tauxDecoteParTrimestreFonctionPublique(donnees.anneeOuvertureDroits);
  const taux = tauxProratisation(donnees.trimestresLiquidables, trimestresRequis);
  // Règle du plus petit des deux comptages (art. L. 14 I CPCMR), partagée
  // avec l'écran via `decoteFonctionPublique()` — voir son docstring pour la
  // règle et pour la raison de l'implémentation unique. Aucun calcul local
  // ici : c'est ce qui garantit que l'écran et ce moteur renvoient la même
  // décote pour un même profil.
  //
  // `ageDepartAnticipe` porte l'âge de départ quel que soit le motif (nom
  // hérité de la saisie « départ anticipé catégorie active »).
  // `departAnticipeCategorieActive` ne conditionne plus rien : ce drapeau
  // décrit le motif du départ, il ne restreint pas le champ de la règle.
  const decote = decoteFonctionPublique({
    trimestresLiquidables: donnees.trimestresLiquidables,
    trimestresAutresRegimes,
    trimestresRequis,
    ageDepart: donnees.ageDepartAnticipe,
    ageAnnulationDecote: donnees.ageAnnulationDecote,
    tauxDecoteParTrimestre,
  });

  const pensionCalculee = pensionBaseFonctionPublique(donnees.traitementIndiciaireBrut, taux, decote);
  const minimumGarantiValue = minimumGaranti(
    donnees.trimestresLiquidables,
    trimestresRequis,
    VALEUR_REFERENCE_MIGA_ANNUELLE_2026,
    donnees.departPourInvalidite
  );
  const pensionApresMiga = pensionFonctionPubliqueFinale(pensionCalculee, minimumGarantiValue);

  const pensionCalculeeAvantDecote = pensionBaseFonctionPublique(donnees.traitementIndiciaireBrut, taux, 0);
  const dateEffetProxy = new Date();
  const ageLegalAtteintFlag = dateNaissance ? ageLegalAtteint(dateNaissance, dateEffetProxy) : undefined;
  const ageLegalParentaleEligibleFlag = dateNaissance
    ? ageLegalParentaleEligible(dateNaissance, dateEffetProxy)
    : undefined;
  const dureeRequiseAtteinte = donnees.trimestresLiquidables + trimestresAutresRegimes >= trimestresRequis;
  // Surcote CLASSIQUE : alimentée par le champ déclaratif « trimestres
  // cotisés au-delà de l'âge légal » (période de référence art. L. 351-1-2
  // CSS). Auparavant codé en dur à 0, ce qui rendait la surcote de ce régime
  // structurellement nulle.
  const surcoteClassiquePct = surcotePourTrimestresCotises(
    Math.max(0, donnees.trimestresCotisesApresAgeLegal ?? 0),
    ageLegalAtteintFlag,
    dureeRequiseAtteinte
  );
  // ⚠️ Surcote PARENTALE : période de référence DIFFÉRENTE (année civile
  // précédant l'âge légal) — le champ déclaratif ci-dessus ne la renseigne
  // PAS et ne doit pas y être réutilisé, sous peine de rétablir exactement la
  // confusion des deux périodes corrigée pour le régime général. Reste donc à
  // 0 pour ce régime : dette documentée dans docs/retraite.md.
  const trimestresCotisesAnneeReferenceParentale = 0;
  const surcoteParentalePct = surcoteParentale(
    auMoinsUnTrimestreMajorationEnfant,
    ageLegalParentaleEligibleFlag,
    dureeRequiseAtteinte,
    trimestresCotisesAnneeReferenceParentale
  );
  const surcoteTotalePct = surcoteTotale(surcoteClassiquePct, surcoteParentalePct, false);
  const surcoteMontant = pensionCalculeeAvantDecote * (surcoteTotalePct / 100);
  const pensionApresSurcote = pensionApresMiga + surcoteMontant;

  const majorationEnfantsPct = majorationEnfantsFonctionPublique(nombreEnfantsEligibles);
  const pensionAvantNBI = pensionFonctionPubliqueAvecMajorationEnfants(
    pensionApresSurcote,
    majorationEnfantsPct,
    donnees.traitementIndiciaireBrut
  );

  // Supplément NBI (référentiel §7.7.1) : « s'ajoute à la pension liquidée »,
  // donc après décote/surcote/MIGA/majoration enfants — jamais calculé si le
  // régime d'affiliation n'est pas renseigné (cf. docstring DonneesFonctionPublique).
  const montantSupplementNBI =
    donnees.regimeAffiliation === 'SRE' || donnees.regimeAffiliation === 'CNRACL'
      ? supplementNBI(donnees.moyenneAnnuelleNBI, donnees.trimestresLiquidablesNBI, trimestresRequis)
      : 0;
  const pensionFinale = pensionAvantNBI + montantSupplementNBI;

  const rafpAnnuelle =
    pensionComplementaireAnnuelle({
      nom: 'RAFP',
      type: 'points',
      points: donnees.pointsRAFP,
      valeurPoint: VALEUR_SERVICE_POINT_RAFP_2026,
    }) ?? 0;

  return { pensionFinale, rafpAnnuelle };
}

function calculerResultatCNAVPL(
  donnees: DonneesCNAVPL,
  trimestresRequis: number,
  trimestresAutresRegimes: number,
  dateNaissance: DateNaissance | null,
  ageActuel: number | null,
  auMoinsUnTrimestreMajorationEnfant: boolean,
  nombreEnfantsEligibles: number
): { pensionFinale: number } {
  // Règle du plus petit des deux comptages, partagée avec l'écran via
  // `decoteCNAVPL()` : le taux plein CNAVPL est acquis à 67 ans quel que soit
  // le nombre de trimestres (art. L. 643-4 CSS). Aucun calcul local ici.
  const decoteSeule = decoteCNAVPL({
    trimestresCNAVPL: donnees.trimestresCNAVPL,
    trimestresAutresRegimes,
    trimestresRequis,
    age: ageActuel,
  });

  const pensionAvantDecoteSurcote = pensionBaseCNAVPL(donnees.pointsCNAVPL, donnees.valeurPointCNAVPL, 0);
  const pensionApresDecote = pensionBaseCNAVPL(donnees.pointsCNAVPL, donnees.valeurPointCNAVPL, decoteSeule);
  const dateEffetProxy = new Date();
  const ageLegalAtteintFlag = dateNaissance ? ageLegalAtteint(dateNaissance, dateEffetProxy) : undefined;
  const ageLegalParentaleEligibleFlag = dateNaissance
    ? ageLegalParentaleEligible(dateNaissance, dateEffetProxy)
    : undefined;
  const dureeRequiseAtteinte = donnees.trimestresCNAVPL + trimestresAutresRegimes >= trimestresRequis;
  // Surcote CLASSIQUE : alimentée par le champ déclaratif « trimestres
  // cotisés au-delà de l'âge légal » (période de référence art. L. 351-1-2
  // CSS). Auparavant codé en dur à 0, ce qui rendait la surcote de ce régime
  // structurellement nulle.
  const surcoteClassiquePct = surcotePourTrimestresCotises(
    Math.max(0, donnees.trimestresCotisesApresAgeLegal ?? 0),
    ageLegalAtteintFlag,
    dureeRequiseAtteinte
  );
  // ⚠️ Surcote PARENTALE : période de référence DIFFÉRENTE (année civile
  // précédant l'âge légal) — le champ déclaratif ci-dessus ne la renseigne
  // PAS et ne doit pas y être réutilisé, sous peine de rétablir exactement la
  // confusion des deux périodes corrigée pour le régime général. Reste donc à
  // 0 pour ce régime : dette documentée dans docs/retraite.md.
  const trimestresCotisesAnneeReferenceParentale = 0;
  const surcoteParentalePct = surcoteParentale(
    auMoinsUnTrimestreMajorationEnfant,
    ageLegalParentaleEligibleFlag,
    dureeRequiseAtteinte,
    trimestresCotisesAnneeReferenceParentale
  );
  const surcoteTotalePct = surcoteTotale(surcoteClassiquePct, surcoteParentalePct, true);
  const surcoteMontant = pensionAvantDecoteSurcote * (surcoteTotalePct / 100);
  const pensionApresSurcote = pensionApresDecote + surcoteMontant;

  const majorationEnfantsPct = majorationTroisEnfants(nombreEnfantsEligibles);
  const pensionFinale = pensionApresSurcote * (1 + majorationEnfantsPct / 100);

  return { pensionFinale };
}

/**
 * Âge du taux plein, même texte binaire que Carriere.tsx (ni l'un ni l'autre
 * ne calcule un âge légal réel — cf. docs/audit/audit-retraite.md §5,
 * entrée Carriere.tsx:171-172, dette non résolue par cette fonction).
 */
export function ageTauxPleinAffiche(trimestresValides: number, trimestresRequis: number): string {
  return trimestresValides >= trimestresRequis
    ? 'Taux plein atteint avec les trimestres validés'
    : '67 ans (âge automatique du taux plein)';
}

export function calculerPensionConsolidee(entree: EntreePensionConsolidee): ResultatPensionConsolidee {
  const {
    salaireAnnuelMoyen,
    trimestresValides,
    trimestresRequis,
    dateNaissance,
    ageActuel,
    regimesPoints,
    detailCarriere,
    familyLinks,
    auMoinsUnTrimestreMajorationEnfant,
    autresPensionsMensuelles,
    fonctionPublique,
    cnavpl,
  } = entree;

  const hasFonctionPublique = fonctionPublique !== null;
  const hasCNAVPL = cnavpl !== null;

  const trimestresTousRegimes =
    trimestresValides +
    (hasFonctionPublique ? fonctionPublique!.trimestresLiquidables : 0) +
    (hasCNAVPL ? cnavpl!.trimestresCNAVPL : 0);

  const taux = salaireAnnuelMoyen > 0 && trimestresValides > 0 ? tauxProratisation(trimestresValides, trimestresRequis) : 0;
  const pensionBaseBrute = salaireAnnuelMoyen > 0 && trimestresValides > 0 ? pensionBase(salaireAnnuelMoyen, taux, 0) : 0;

  const trimAutresRegimes =
    (hasFonctionPublique ? fonctionPublique!.trimestresLiquidables : 0) +
    (hasCNAVPL ? cnavpl!.trimestresCNAVPL : 0);
  const decoteTrimestresSeule = Math.min(
    decoteSurTrimestresPlafond25(trimestresValides + trimAutresRegimes, trimestresRequis),
    0
  );
  const decoteSurcote =
    ageActuel !== null ? decoteApplicable(decoteTrimestresSeule, decoteSurAge(ageActuel)) : decoteTrimestresSeule;

  const resultatTrimestresDetailCarriere = trimestresCotisesEtAssimilesDepuisCarriere(detailCarriere);

  const dateEffetProxy = new Date();
  const ageLegalResultat = dateNaissance ? ageLegalPourGeneration(dateNaissance, dateEffetProxy) : null;
  const ageLegalAtteintFlag = dateNaissance ? ageLegalAtteint(dateNaissance, dateEffetProxy) : undefined;
  const ageLegalParentaleEligibleFlag = dateNaissance
    ? ageLegalParentaleEligible(dateNaissance, dateEffetProxy)
    : undefined;
  // Condition de durée de la surcote : appréciée TOUS RÉGIMES confondus,
  // comme la décote trois lignes plus haut (`decoteTrimestresSeule`) et comme
  // les branches fonction publique et CNAVPL de ce même fichier. Ne compter
  // que le régime général privait de surcote un polypensionné dont le total
  // atteint pourtant la durée requise.
  const dureeRequiseAtteinte = trimestresValides + trimAutresRegimes >= trimestresRequis;
  // ⚠️ Les deux surcotes ont des périodes de référence DIFFÉRENTES, d'où deux
  // compteurs distincts ci-dessous — ne pas en réutiliser un pour l'autre.
  //
  // Classique (art. L. 351-1-2 CSS) : trimestres cotisés APRÈS l'âge légal,
  // jusqu'à la date d'effet, 4/an au maximum et sans plafond global.
  const trimestresCotisesSurcoteClassique = trimestresCotisesPeriodeSurcoteClassique(
    resultatTrimestresDetailCarriere.parAnnee,
    dateNaissance,
    ageLegalResultat,
    dateEffetProxy
  );
  // Parentale (référentiel §2.3.2) : année civile PRÉCÉDANT l'âge légal,
  // plafonnée à 4 trimestres par `surcoteParentale()` — inchangé.
  const anneeReferenceSurcoteParentale =
    ageLegalResultat?.stable && dateNaissance
      ? dateAnniversaireLegal(dateNaissance, ageLegalResultat.age).getUTCFullYear() - 1
      : null;
  const trimestresCotisesAnneeReferenceParentale =
    anneeReferenceSurcoteParentale !== null
      ? resultatTrimestresDetailCarriere.parAnnee.find((a) => a.annee === anneeReferenceSurcoteParentale)
          ?.cotises ?? 0
      : 0;
  const surcoteClassiquePct = surcotePourTrimestresCotises(
    trimestresCotisesSurcoteClassique,
    ageLegalAtteintFlag,
    dureeRequiseAtteinte
  );
  const surcoteParentalePct = surcoteParentale(
    auMoinsUnTrimestreMajorationEnfant,
    ageLegalParentaleEligibleFlag,
    dureeRequiseAtteinte,
    trimestresCotisesAnneeReferenceParentale
  );
  const surcoteTotalePct = surcoteTotale(surcoteClassiquePct, surcoteParentalePct, true);

  const micoMontant = minimumContributif(trimestresValides, trimestresRequis, decoteSurcote, trimestresTousRegimes);
  const pensionBaseHorsMicoHorsSurcote = pensionBaseBrute * (1 + decoteSurcote / 100);
  const majorationPalier1 = Math.max(0, micoMontant - pensionBaseHorsMicoHorsSurcote);

  const trimestresCotisesRegimeGeneral = resultatTrimestresDetailCarriere.cotises;
  const majorationPalier2 = majorationPalier2MICO(
    trimestresCotisesRegimeGeneral,
    trimestresValides,
    trimestresRequis,
    decoteSurcote,
    trimestresTousRegimes
  );

  const autresPensionsAnnuelles = autresPensionsMensuelles * 12;
  const majorationMicoTotaleAvantEcretement = majorationPalier1 + majorationPalier2;
  const majorationMicoTotaleApresEcretement = ecretementMICO(
    pensionBaseHorsMicoHorsSurcote,
    majorationMicoTotaleAvantEcretement,
    autresPensionsAnnuelles
  );

  const pensionApresMico = pensionBaseHorsMicoHorsSurcote + majorationMicoTotaleApresEcretement;
  const surcoteMontantRegimeGeneral = pensionBaseBrute * (surcoteTotalePct / 100);
  const pensionApresSurcoteRegimeGeneral = pensionApresMico + surcoteMontantRegimeGeneral;

  const nombreEnfantsEligibles = nombreEnfantsEligiblesMajorationTroisEnfants(familyLinks);
  const majorationEnfantsPct = majorationTroisEnfants(nombreEnfantsEligibles);
  const pensionBaseAjustee = pensionApresSurcoteRegimeGeneral * (1 + majorationEnfantsPct / 100);

  // Majoration familiale sur la part Agirc-Arrco du panier `regimesPoints`
  // (10 % à partir de 3 enfants, plafonnée en euros) : elle n'était jamais
  // appliquée, seule la pension de base était majorée.
  //
  // ⚠️ Compteur d'enfants DIFFÉRENT de celui du régime général ci-dessus :
  // critère Agirc-Arrco « nés ou élevés », plus large (cf.
  // `nombreEnfantsEligiblesMajorationAgircArrco()`), et situation appréciée à
  // la date de départ.
  const pensionAgircArrcoAnnuelle = regimesPoints.reduce((total, regime) => {
    if (!estRegimeAgircArrco(regime.nom)) {
      return total;
    }
    const pension = pensionComplementaireAnnuelle(regime);
    return pension !== undefined ? total + pension : total;
  }, 0);
  const nombreEnfantsEligiblesAgircArrco = nombreEnfantsEligiblesMajorationAgircArrco(
    familyLinks,
    dateEffetProxy
  );
  const majorationEnfantsAgircArrcoMontant = majorationEnfantsAgircArrco(
    pensionAgircArrcoAnnuelle,
    nombreEnfantsEligiblesAgircArrco
  );

  const totalPensionComplementaireAnnuelle =
    regimesPoints.reduce((total, regime) => {
      const pension = pensionComplementaireAnnuelle(regime);
      return pension !== undefined ? total + pension : total;
    }, 0) + majorationEnfantsAgircArrcoMontant;

  const pensionTotaleRegimeGeneral = pensionBaseAjustee + totalPensionComplementaireAnnuelle;

  const resultatFonctionPublique = hasFonctionPublique
    ? calculerResultatFonctionPublique(
        fonctionPublique!,
        trimestresRequis,
        trimestresValides + (hasCNAVPL ? cnavpl!.trimestresCNAVPL : 0),
        dateNaissance,
        auMoinsUnTrimestreMajorationEnfant,
        nombreEnfantsEligibles
      )
    : { pensionFinale: 0, rafpAnnuelle: 0 };

  const resultatCNAVPL = hasCNAVPL
    ? calculerResultatCNAVPL(
        cnavpl!,
        trimestresRequis,
        trimestresValides + (hasFonctionPublique ? fonctionPublique!.trimestresLiquidables : 0),
        dateNaissance,
        ageActuel,
        auMoinsUnTrimestreMajorationEnfant,
        nombreEnfantsEligibles
      )
    : { pensionFinale: 0 };

  const pensionTotaleConsolidee = pensionTotaleConsolideeTousRegimes(
    pensionTotaleRegimeGeneral,
    hasFonctionPublique,
    resultatFonctionPublique,
    hasCNAVPL,
    resultatCNAVPL
  );

  return {
    pensionTotaleConsolidee,
    ageTauxPlein: ageTauxPleinAffiche(trimestresValides, trimestresRequis),
    repartitionParRegime: {
      baseRegimeGeneral: pensionBaseAjustee,
      complementaireRegimeGeneral: totalPensionComplementaireAnnuelle,
      fonctionPublique: resultatFonctionPublique.pensionFinale,
      rafp: resultatFonctionPublique.rafpAnnuelle,
      cnavpl: resultatCNAVPL.pensionFinale,
    },
    historiqueTrimestres: resultatTrimestresDetailCarriere,
    ageLegal: ageLegalResultat,
    detailRegimeGeneral: {
      pensionBaseBrute,
      decote: decoteSurcote,
      surcoteClassiquePct,
      surcoteParentalePct,
      surcoteTotalePct,
      surcoteMontant: surcoteMontantRegimeGeneral,
      micoMontant,
      majorationPalier1,
      majorationPalier2,
      majorationMicoAvantEcretement: majorationMicoTotaleAvantEcretement,
      majorationMicoApresEcretement: majorationMicoTotaleApresEcretement,
      majorationEnfantsPct,
      nombreEnfantsEligibles,
    },
  };
}
