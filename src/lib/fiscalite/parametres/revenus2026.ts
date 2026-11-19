import { PARAMETRES_REVENUS_2025 } from './revenus2025';
import type { ParametresFiscaux } from './types';

/**
 * Revenus 2026 / impôt 2027, PROVISOIRE : loi de finances pour 2027 non promulguée.
 * Relevé sur le simulateur officiel calc-2027.cgi (novembre 2026) : barème, décote, quotient
 * familial, abattements et plafonds des cadres 6 et 7 identiques aux revenus 2025, sauf les
 * dons à 75 % (7UD unique, plafond 2 000 € sur l'année) et des FCPI (7GQ seule, à 25 % ; 7GR supprimée). Les codes de cases qui changent de
 * sens (7UQ : Chambord, 7VM supprimée) ne sont pas encore modélisés.
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
    plafondDons75Annee: 2000,
    tauxFcpi: { case7gr: 0, case7gq: 0.25 },
  },
};
