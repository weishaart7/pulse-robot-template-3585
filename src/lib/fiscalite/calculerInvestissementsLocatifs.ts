import { ReductionsCreditsImpotInput } from './types';

/**
 * Investissements locatifs et équipements du haut du cadre 7 (2042-RICI, revenus 2025/impôt 2026).
 * Règles relevées sur le simulateur officiel 2026 (1 000 €, 100 000 €, cumuls) :
 * - bornes de recharge (7ZQ, 7ZR, 7ZS, 7ZT) : crédit restituable de 75 %, 500 € par système ;
 *   compté au plafonnement global (10 000 €) ;
 * - Loc'Avantages (7BK 15 %, 7BL 20 %, 7BM 35 %, 7BN 40 %, 7BO 65 % du montant saisi) : réduction
 *   sans plafond propre, comptée au plafonnement global ;
 * - risques technologiques (7WR) : crédit restituable de 40 %, sans plafond (la loi prévoit
 *   30 000 € par logement, non appliqués par le simulateur), hors plafonnement global ;
 * - Malraux : 7TX (30 %) puis 7TY (22 %), 400 000 € de dépenses en commun ; reports de solde
 *   7KW, 7KY, 7KX (montant de la réduction) ; hors plafonnement global.
 */
export const PLAFOND_BORNE = 500;
export const TAUX_BORNE = 0.75;
export const TAUX_RISQUES_TECHNOLOGIQUES = 0.40;
export const PLAFOND_MALRAUX = 400_000;

type Cle = keyof ReductionsCreditsImpotInput;
const BORNES: Cle[] = ['case7zq', 'case7zr', 'case7zs', 'case7zt'];
const LOC_AVANTAGES: [Cle, number][] = [
  ['case7bk', 0.15], ['case7bl', 0.20], ['case7bm', 0.35], ['case7bn', 0.40], ['case7bo', 0.65],
];
const REPORTS_MALRAUX: Cle[] = ['case7kw', 'case7ky', 'case7kx'];

const montant = (v: unknown) => Math.max(0, typeof v === 'number' ? v : 0);

export interface InvestissementsLocatifsResult {
  /** Réductions non restituables (Loc'Avantages, Malraux). */
  reductions: number;
  /** Crédits restituables (bornes, 7WR). */
  credits: number;
  /** Dont crédit bornes de recharge (art. 200 quater C), réintégré pour la CDHR. */
  creditBornes: number;
  /** Part comptée au plafonnement global de 10 000 € (bornes, Loc'Avantages). */
  avantagesPlafonnesCourants: number;
}

export function calculerInvestissementsLocatifs(input: ReductionsCreditsImpotInput): InvestissementsLocatifsResult {
  const bornes = Math.round(BORNES.reduce((s, cle) => s + Math.min(montant(input[cle]) * TAUX_BORNE, PLAFOND_BORNE), 0));
  const risques = Math.round(montant(input.case7wr) * TAUX_RISQUES_TECHNOLOGIQUES);
  const locAvantages = Math.round(LOC_AVANTAGES.reduce((s, [cle, taux]) => s + montant(input[cle]) * taux, 0));
  const tx = Math.min(montant(input.case7tx), PLAFOND_MALRAUX);
  const ty = Math.min(montant(input.case7ty), PLAFOND_MALRAUX - tx);
  const malraux = Math.round(tx * 0.30 + ty * 0.22 + REPORTS_MALRAUX.reduce((s, cle) => s + montant(input[cle]), 0));
  return {
    reductions: locAvantages + malraux,
    credits: bornes + risques,
    creditBornes: bornes,
    avantagesPlafonnesCourants: bornes + locAvantages,
  };
}
