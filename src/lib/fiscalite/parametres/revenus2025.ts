import type { ParametresFiscaux } from './types';

/**
 * Revenus 2025 / impôt 2026 : loi de finances pour 2026 (revalorisation de 0,9 %),
 * brochure pratique IR 2026. Contrôlé contre le simulateur officiel calc-2026.cgi
 * (useFiscalOverview.simulateurOfficiel.test.ts).
 */
export const PARAMETRES_REVENUS_2025: ParametresFiscaux = {
  anneeRevenus: 2025,
  statut: 'definitif',
  source: 'Loi de finances pour 2026, brochure IR 2026, simulateur officiel calc-2026.cgi',
  impot: {
    bareme: [
      { seuil: 11600, taux: 0 },
      { seuil: 29579, taux: 0.11 },
      { seuil: 84577, taux: 0.30 },
      { seuil: 181917, taux: 0.41 },
      { seuil: Infinity, taux: 0.45 },
    ],
    decote: {
      taux: 0.4525,
      seuilCelibataire: 1982,
      montantCelibataire: 897,
      seuilCouple: 3277,
      montantCouple: 1483,
    },
    reductionOutreMer: {
      metropole: { taux: 0, plafond: 0 },
      guadeloupe_martinique_reunion: { taux: 0.30, plafond: 2450 },
      guyane_mayotte: { taux: 0.40, plafond: 4050 },
    },
  },
  quotientFamilial: {
    plafondDemiPart: 1807,
    plafondComplementaire: 1801,
    plafondComplementaireVeuf: 2011,
    plafondParentIsole: 4262,
    plafondAncienParentIsole: 1079,
  },
  cehr: {
    seuilPersonneSeule: 250_000,
    tauxPremiereTranche: 0.03,
    tauxSecondeTranche: 0.04,
  },
  cdhr: {
    seuilPersonneSeule: 250_000,
    tauxMinimum: 0.20,
    plafondDecotePersonneSeule: 330_000,
    tauxDecote: 0.825,
    majorationCouple: 12_500,
    majorationPersonneCharge: 1_500,
    donsReintegres: false,
  },
  abattementsDixPourCent: {
    salaires: { plancher: 509, plafond: 14555 },
    pensions: { plancher: 454, plafondFoyer: 4439 },
  },
  nonSalaries: {
    seuilMicroVentes: 188_700,
    seuilMicroServices: 77_700,
    seuilMicroMeubles: 77_700,
    seuilMicroMeublesNonClasses: 15_000,
    seuilMicroBA: 120_000,
    seuilDeficitAgricole: 128_826,
    seuilCotisationsChambresHotes: 6_123,
  },
  chargesDeductibles: {
    plafondPensionEnfantMajeur: 6855,
    plafondAccueilPersonneAgee: 4075,
  },
  reductionsCredits: {
    // 1 000 € jusqu'au 13.10.2025 (7UD/7VA), 2 000 € sur l'année avec 7UQ/7VM.
    plafondDons75Premiere: 1000,
    plafondDons75Annee: 2000,
    seuilsRfrAutonomie: { une: 31393, deux: 49995, parPersonne: 6976 },
    // 7GR : versements 2025 à 25 % ; 7GQ : 18 %.
    tauxFcpi: { case7gr: 0.25, case7gq: 0.18 },
  },
  ifi: {
    seuilExonerationRurale: 101_897,
  },
  abattementsSpeciaux: {
    personnesAgees: { seuilPlein: 17670, seuilReduit: 28430, montantPlein: 2822, montantReduit: 1411 },
    rattachement: 6855,
    rattachementAlterne: 3428,
  },
};
