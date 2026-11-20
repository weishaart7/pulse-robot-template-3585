import { PARAMETRES_REVENUS_2025 } from './revenus2025';
import type { ParametresFiscaux } from './types';

/**
 * Revenus 2026 / impôt 2027, PROVISOIRE : loi de finances pour 2027 non promulguée.
 * Relevé sur le simulateur officiel calc-2027.cgi (novembre 2026) : barème, décote, quotient
 * familial, abattements et plafonds des cadres 6 et 7 identiques aux revenus 2025, sauf les
 * dons à 75 % (7UD unique, plafond 2 000 € sur l'année), des FCPI (7GQ seule, à 25 % ; 7GR supprimée),
 * de 7UQ (Chambord, plafond propre), des reports 7JT/7KC (sans effet) et des rentes 1AR…1DR (crédit 8TK).
 */
export const PARAMETRES_REVENUS_2026: ParametresFiscaux = {
  ...PARAMETRES_REVENUS_2025,
  anneeRevenus: 2026,
  statut: 'provisoire',
  source: 'Simulateur officiel calc-2027.cgi, novembre 2026 (loi de finances pour 2027 non promulguée)',
  // Loi de finances pour 2026 : les dons (art. 200) entrent dans les avantages réintégrés (calc-2027.cgi).
  cdhr: { ...PARAMETRES_REVENUS_2025.cdhr, donsReintegres: true, cehrProratiseeAbattementFixe: true },
  reductionsCredits: {
    ...PARAMETRES_REVENUS_2025.reductionsCredits,
    plafondDons75Premiere: 2000,
    // calc-2027 : 7UQ 3 000 € → 750 € (1 000 × 75 %) + 1 320 € (2 000 × 66 %), cumulable avec 7UD.
    plafondDonsChambord: 1000,
    // calc-2027 : 7JT 1 000 € et 7KC 1 000 € → aucune réduction.
    reportsSansEffet: ['case7jt', 'case7kc'],
    // calc-2027 : 1AJ 40 000 + 1AR 5 000 + 8TK 5 000 → crédit 4 954 × 3 500 / 39 500 = 439 €, PS nuls.
    rentesCreditImpotFrancais: true,
    plafondDons75Annee: 2000,
    tauxFcpi: { case7gr: 0, case7gq: 0.25 },
  },
};
