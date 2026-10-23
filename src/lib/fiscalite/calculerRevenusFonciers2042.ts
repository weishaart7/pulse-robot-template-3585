import { TAUX_PRELEVEMENTS_SOCIAUX } from '@/lib/immobilier/rentabilite';
import { SEUIL_MICRO_FONCIER } from '@/lib/immobilier/foncierFoyer';
import { RevenusFonciers2042Input } from './types';

/** Abattement forfaitaire du micro-foncier (art. 32 CGI), appliqué à 4BE, 4BK et 4EB. */
const ABATTEMENT_MICRO_FONCIER = 0.30;

const netMicro = (recettes: number) => Math.round(recettes * (1 - ABATTEMENT_MICRO_FONCIER));

export type AlerteRevenusFonciers2042 = 'micro_et_reel' | 'micro_au_dela_du_seuil';

export interface RevenusFonciers2042Result {
  /** Micro-foncier net imposable au barème : 70 % de 4BE, hors fraction 4BK. */
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
  /** 4EA + 70 % de 4EB : exonérés, retenus pour le taux effectif. */
  revenuExonereTauxEffectif: number;
  /** 4BY (amortissement Robien/Borloo neuf déjà déduit) : réintégré au RFR seulement. */
  revenuExonereRetenuPourRFR: number;
  /** 17,2 % du micro-foncier net, 4BK compris (taux inchangé par la LFSS 2026 pour les revenus fonciers). */
  prelevementsSociaux: number;
  alertes: AlerteRevenusFonciers2042[];
}

/**
 * Cases foncières de la 2042 hors régime réel (revenus 2025/impôt 2026).
 *
 * `revenuFoncierReel` est la case 4BA de la 2044 de l'année (null sans 2044
 * ouverte) : 4BL en est une fraction, jamais un montant additionnel.
 * 4BN/4BZ sont informatives. Le micro-foncier est incompatible avec le régime
 * réel et plafonné à 15 000 € de recettes : le calcul ne bloque pas, il
 * signale (`alertes`).
 */
export function calculerRevenusFonciers2042(
  input: RevenusFonciers2042Input,
  revenuFoncierReel: number | null,
): RevenusFonciers2042Result {
  const recettesMicro = input.case4be ?? 0;
  const netMicroTotal = netMicro(recettesMicro);
  const netMicroEtranger = netMicro(Math.min(input.case4bk ?? 0, recettesMicro));
  const deductionReel4BL = Math.min(input.case4bl ?? 0, Math.max(0, revenuFoncierReel ?? 0));

  const alertes: AlerteRevenusFonciers2042[] = [];
  if (recettesMicro > 0 && revenuFoncierReel !== null) alertes.push('micro_et_reel');
  if (recettesMicro > SEUIL_MICRO_FONCIER) alertes.push('micro_au_dela_du_seuil');

  return {
    totalNetImposable: netMicroTotal - netMicroEtranger,
    deductionReel4BL,
    revenuCreditImpotEgalImpotFrancais: netMicroEtranger + deductionReel4BL,
    revenuExonereTauxEffectif: (input.case4ea ?? 0) + netMicro(input.case4eb ?? 0),
    revenuExonereRetenuPourRFR: input.case4by ?? 0,
    prelevementsSociaux: Math.round(netMicroTotal * TAUX_PRELEVEMENTS_SOCIAUX),
    alertes,
  };
}
