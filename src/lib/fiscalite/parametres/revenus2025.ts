import type { ParametresFiscaux } from './types';

/**
 * Revenus 2025 / impôt 2026 : loi de finances pour 2026 (revalorisation de 0,9 %),
 * brochure pratique IR 2026. Contrôlé contre le simulateur officiel calc-2026.cgi
 * (useFiscalOverview.simulateurOfficiel.test.ts).
 */
export const PARAMETRES_REVENUS_2025: ParametresFiscaux = {
  anneeRevenus: 2025,
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
    plafondParentIsole: 4262,
    plafondAncienParentIsole: 1079,
  },
  cehr: {
    seuilPersonneSeule: 250_000,
    tauxPremiereTranche: 0.03,
    tauxSecondeTranche: 0.04,
  },
  abattementsSpeciaux: {
    personnesAgees: { seuilPlein: 17670, seuilReduit: 28430, montantPlein: 2822, montantReduit: 1411 },
    rattachement: 6855,
    rattachementAlterne: 3428,
  },
};
