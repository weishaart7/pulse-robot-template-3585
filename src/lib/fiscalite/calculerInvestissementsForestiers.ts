import { ReductionsCreditsImpotInput } from './types';

/**
 * Investissements forestiers (2042-RICI, revenus 2025/impôt 2026) : dépenses saisies, crédits
 * restituables. Règles relevées sur le simulateur officiel 2026 (1 000 €, 100 000 €, cumuls) :
 * - acquisition (7UN) 25 % et assurance (7UL) 76 %, plafonds propres de 6 250 € (12 500 € couple) ;
 * - travaux 2025 (7UP, 7UT) et reports 2017-2024 : 25 % ou 18 % selon la case, plafond commun de
 *   6 250 € (12 500 €), reports imputés d'abord, du plus ancien au plus récent ; au sein d'une année,
 *   la case à 25 % avant celle à 18 % (vérifié sur 2017 : 7TS avant 7TR) ;
 * - plafonnement global : compté en entier dans les avantages courants (10 000 €), remboursement
 *   compris.
 */
export const PLAFOND_FORETS = 6_250;
export const TAUX_ASSURANCE_FORETS = 0.76;

type Cle = keyof ReductionsCreditsImpotInput;

/** Travaux, dans l'ordre d'imputation du plafond commun. */
const TRAVAUX: [Cle, number][] = [
  ['case7ts', 0.25], ['case7tr', 0.18], // 2017
  ['case7tu', 0.25], ['case7tt', 0.18], // 2018
  ['case7tw', 0.25], ['case7tv', 0.18], // 2019
  ['case7tb', 0.25], ['case7ta', 0.18], // 2020
  ['case7vr', 0.25], ['case7tf', 0.25], ['case7vq', 0.18], ['case7te', 0.18], // 2021
  ['case7vu', 0.25], ['case7ti', 0.25], ['case7vs', 0.18], ['case7th', 0.18], // 2022
  ['case7vv', 0.25], ['case7tj', 0.25], // 2023
  ['case7vt', 0.25], ['case7tk', 0.25], // 2024
  ['case7vn', 0.25], ['case7tm', 0.25], // report des dépenses 2025 (déclaration 2027)
  ['case7up', 0.25], ['case7ut', 0.25], // 2025
];

const montant = (v: unknown) => Math.max(0, typeof v === 'number' ? v : 0);

export interface InvestissementsForestiersResult {
  /** Crédit restituable, compté en entier au plafonnement global. */
  credit: number;
}

export function calculerInvestissementsForestiers(
  input: ReductionsCreditsImpotInput,
  couple: boolean,
): InvestissementsForestiersResult {
  const plafond = PLAFOND_FORETS * (couple ? 2 : 1);
  let reste = plafond;
  let travaux = 0;
  for (const [cle, taux] of TRAVAUX) {
    const retenu = Math.min(montant(input[cle]), reste);
    reste -= retenu;
    travaux += retenu * taux;
  }
  const acquisition = Math.min(montant(input.case7un), plafond) * 0.25;
  const assurance = Math.min(montant(input.case7ul), plafond) * TAUX_ASSURANCE_FORETS;
  return { credit: Math.round(travaux + acquisition + assurance) };
}
