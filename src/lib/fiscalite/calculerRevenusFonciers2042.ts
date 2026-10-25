import { TAUX_PRELEVEMENTS_SOCIAUX } from '@/lib/immobilier/rentabilite';
import { SEUIL_MICRO_FONCIER } from '@/lib/immobilier/foncierFoyer';
import { RevenusFonciers2042Input } from './types';

/** Abattement forfaitaire du micro-foncier (art. 32 CGI), appliqué à 4BE, 4BK et 4EB. */
const ABATTEMENT_MICRO_FONCIER = 0.30;

const netMicro = (recettes: number) => Math.round(recettes * (1 - ABATTEMENT_MICRO_FONCIER));

export type AlerteRevenusFonciers2042 =
  | 'micro_et_reel'
  | 'micro_au_dela_du_seuil'
  | 'micro_et_parts_sci'
  | '4ba_ignore_2044'
  | '4bd_ignore_2044';

export interface RevenusFonciers2042Result {
  /**
   * Foncier net imposable au barème hors 2044 : 70 % de 4BE et 4BA saisi
   * directement, hors fractions 4BK/4BL, après imputation de 4BD.
   */
  totalNetImposable: number;
  /**
   * Fraction de 4BA (2044) relevant de 4BL, plafonnée à 4BA : à retirer du
   * revenu imposable repris de la 2044, elle passe au crédit d'impôt.
   */
  deductionReel4BL: number;
  /**
   * 4BK (après abattement) et 4BL : crédit d'impôt égal à l'impôt français,
   * additionné au revenu retenu pour le taux effectif comme 1AF/1AL (voir
   * useFiscalOverview.ts).
   */
  revenuCreditImpotEgalImpotFrancais: number;
  /** 4BD effectivement imputé (sans 2044) ; le reliquat reste reportable. */
  deficitAnterieurImpute: number;
  /** 4EA + 70 % de 4EB : exonérés, retenus pour le taux effectif. */
  revenuExonereTauxEffectif: number;
  /** 4BY (amortissement Robien/Borloo neuf déjà déduit) : réintégré au RFR seulement. */
  revenuExonereRetenuPourRFR: number;
  /** 17,2 % du foncier net hors 2044 après 4BD, 4BK/4BL compris (taux inchangé par la LFSS 2026 pour les revenus fonciers). */
  prelevementsSociaux: number;
  alertes: AlerteRevenusFonciers2042[];
}

/**
 * Cases foncières de la 2042 hors 2044 (revenus 2025/impôt 2026).
 *
 * `revenuFoncierReel` est la case 4BA de la 2044 de l'année (null sans 2044
 * ouverte) : 4BL en est une fraction, jamais un montant additionnel. Sans 2044,
 * 4BA se saisit directement (parts de sociétés immobilières seulement, brochure
 * p. 157) et 4BD s'impute sur le foncier net, part au barème d'abord, sans le
 * rendre négatif (CGI art. 32, brochure p. 158) ; avec une 2044, ces deux saisies
 * sont ignorées car la 2044 les calcule. 4BN/4BZ sont informatives. Le calcul ne
 * bloque pas les incompatibilités, il les signale (`alertes`).
 */
export function calculerRevenusFonciers2042(
  input: RevenusFonciers2042Input,
  revenuFoncierReel: number | null,
): RevenusFonciers2042Result {
  const avec2044 = revenuFoncierReel !== null;
  const recettesMicro = input.case4be ?? 0;
  const netMicroTotal = netMicro(recettesMicro);
  const netMicroEtranger = netMicro(Math.min(input.case4bk ?? 0, recettesMicro));
  const reelSaisi = avec2044 ? 0 : input.case4ba ?? 0;
  const reelSaisiEtranger = Math.min(input.case4bl ?? 0, reelSaisi);
  const deductionReel4BL = avec2044 ? Math.min(input.case4bl ?? 0, Math.max(0, revenuFoncierReel)) : 0;

  const brutBareme = netMicroTotal - netMicroEtranger + reelSaisi - reelSaisiEtranger;
  const brutEtranger = netMicroEtranger + reelSaisiEtranger;
  const deficit = avec2044 ? 0 : input.case4bd ?? 0;
  const imputeBareme = Math.min(deficit, brutBareme);
  const imputeEtranger = Math.min(deficit - imputeBareme, brutEtranger);

  const alertes: AlerteRevenusFonciers2042[] = [];
  if (recettesMicro > 0 && avec2044) alertes.push('micro_et_reel');
  if (recettesMicro > SEUIL_MICRO_FONCIER) alertes.push('micro_au_dela_du_seuil');
  if (recettesMicro > 0 && reelSaisi > 0) alertes.push('micro_et_parts_sci');
  if (avec2044 && (input.case4ba ?? 0) > 0) alertes.push('4ba_ignore_2044');
  if (avec2044 && (input.case4bd ?? 0) > 0) alertes.push('4bd_ignore_2044');

  return {
    totalNetImposable: brutBareme - imputeBareme,
    deductionReel4BL,
    revenuCreditImpotEgalImpotFrancais: brutEtranger - imputeEtranger + deductionReel4BL,
    deficitAnterieurImpute: imputeBareme + imputeEtranger,
    revenuExonereTauxEffectif: (input.case4ea ?? 0) + netMicro(input.case4eb ?? 0),
    revenuExonereRetenuPourRFR: input.case4by ?? 0,
    prelevementsSociaux: Math.round((brutBareme + brutEtranger - imputeBareme - imputeEtranger) * TAUX_PRELEVEMENTS_SOCIAUX),
    alertes,
  };
}
