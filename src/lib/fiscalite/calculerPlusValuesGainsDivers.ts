import { PlusValuesGainsDiversInput } from './types';

/** PFU applicable en l'absence d'option barème (art. 200 A CGI), comme le cadre 2. */
const TAUX_PFU = 0.128;
/**
 * Prélèvements sociaux sur les plus-values mobilières et actifs numériques des
 * revenus 2025 : CSG 10,6 % (LFSS 2026, art. L. 136-8 CSS) + CRDS 0,5 % +
 * prélèvement de solidarité 7,5 % = 18,6 %, même taux que
 * `TAUX_PS_CAPITAUX_MOBILIERS`. Les plus-values immobilières restent à 17,2 %
 * mais sont prélevées chez le notaire (3VZ/3VW, hors PS ici).
 */
export const TAUX_PS_PLUS_VALUES = 0.186;
/**
 * Taux forfaitaire des gains BSPCE lorsque le bénéficiaire exerce son activité
 * dans la société depuis moins de 3 ans (art. 163 bis G CGI) : 3SK et 3PE,
 * sans option barème possible.
 */
const TAUX_BSPCE_MOINS_DE_3_ANS = 0.30;
/**
 * Taux des gains BSPCE souscrits avant le 1.1.2018 lorsque le bénéficiaire exerce
 * son activité dans la société depuis au moins 3 ans (3SJ, brochure IR 2026 p. 154),
 * sans option barème possible.
 */
const TAUX_BSPCE_AVANT_2018 = 0.19;
/**
 * 3PI : profits sur instruments financiers à terme dont le teneur de compte est
 * établi dans un État ou territoire non coopératif, imposés au taux forfaitaire
 * de 50 % (art. 150 ter CGI), sans option barème.
 */
const TAUX_3PI = 0.50;

/**
 * Cases du cadre 3 saisies mais sans effet sur l'impôt de l'année :
 * - 3VH (moins-value 2025) et 3BN (moins-value d'actifs numériques) : le
 *   déclarant les a déjà imputées lui-même avant de remplir 3VG/3AN (montants
 *   CERFA jamais recalculés, comme 2VQ-2VU au cadre 2) ; reliquat reportable
 *   seulement. 3BN ne s'impute jamais sur les plus-values de valeurs mobilières.
 * - 3VR (moins-values non imputables des impatriés) : non imputables par nature.
 */
export const CASES_PLUS_VALUES_EXCLUES_DU_CALCUL = ['case3vh', 'case3bn', 'case3vr'] as const;

export interface PlusValuesGainsDiversResult {
  /** Part imposée au barème (option 2OP, option 3CN pour 3AN, et 3SB toujours). */
  totalNetImposable: number;
  /** Impôt à 12,8 % (et à 50 % pour 3PI, 30 % pour 3SK/3PE, 19 % pour 3SJ, 12,8 % pour 3PC) déjà calculé, ajouté après la décote par `calculerImpot.ts`. */
  impotForfaitaire: number;
  /**
   * Montants retenus pour le RFR hors `totalNetImposable` : bases imposées au
   * PFU (absentes du revenu au barème), abattements pour durée de détention
   * (3SG/3SL) et abattement fixe (3VA) réintégrés (art. 1417 IV 1° CGI),
   * plus-values immobilières 3VZ (3VW exclu, brochure IR 2026 p. 155) ; bases
   * imposées à taux fixe (3PI, 3SJ, 3PC, 3SK, 3PE), abattements fixes 3TK/3TM,
   * fraction exonérée des impatriés 3VQ, capital-risque 3VC et gain PEAC 3EX.
   */
  revenuExonereRetenuPourRFR: number;
  /** Base soumise aux PS à 18,6 % : 3VG, 3UA, 3WE, 3AN, gains BSPCE et 3VQ, avant tout abattement. */
  basePrelevementsSociaux: number;
  prelevementsSociaux: number;
  casesExclues: readonly string[];
}

/**
 * IR, RFR et prélèvements sociaux du cadre 3 « Plus-values et gains divers »
 * (revenus 2025/impôt 2026), phase 3.1.
 *
 * `optionBareme` est la case 2OP du cadre 2 : l'option est globale à
 * l'ensemble des revenus de capitaux mobiliers ET des plus-values mobilières.
 * - non cochée (PFU) : 3VG + 3WE, 3UA − 3VA et 3VT sont taxés à 12,8 % ; les abattements pour durée de détention (3SG, 3SL) ne
 *   s'appliquent pas, seul l'abattement fixe 3VA s'applique ;
 * - cochée : ces mêmes montants, nets de 3SG/3SL/3VA, rejoignent le barème.
 * 3AN suit sa propre option 3CN (art. 150 VH bis CGI), indépendante de 2OP.
 * 3SB (plus-value 150-0 D bis en report expiré, déjà après abattement) est
 * toujours au barème — hypothèse à confirmer, voir docs/fiscalite.md.
 *
 * 3PI est toujours taxé à 50 % (art. 150 ter CGI), indépendamment de 2OP.
 *
 * Prélèvements sociaux : 3VT exclu (prélevés à la source par l'établissement
 * gestionnaire du PEA), 3PI et 3SB exclus en attendant vérification.
 *
 * **BSPCE (phase 3.2, art. 163 bis G CGI, LF 2025)** : activité ≥ 3 ans,
 * 3TJ − 3TK et 3TL − 3TM (gain de cession des bons depuis 2025, régime des
 * plus-values) suivent le switch 2OP comme 3VG ; 3SJ (bons souscrits avant 2018)
 * est taxé à 19 % et 3PC (gain d'exercice depuis 2025) à 12,8 %, sans effet de
 * 2OP (l'option salaires de 3PC passe par 1AY/1BY) ; activité < 3 ans, 3SK et
 * 3PE taxés à 30 % sans option. PS à 18,6 % sur l'ensemble avant abattement
 * (brochure IR 2026 p. 154-155).
 *
 * **Autres régimes** (brochure IR 2026 p. 143, 149, 155) : 3VQ (moitié exonérée
 * des plus-values des impatriés, art. 155 B CGI) retenu au RFR et soumis aux PS ;
 * 3VC (capital-risque, exonéré d'IR, PS prélevés à la source) et 3EX (gain PEAC
 * exonéré) retenus au RFR seulement ; 3VW (remploi) hors RFR.
 */
export function calculerPlusValuesGainsDivers(
  input: PlusValuesGainsDiversInput,
  optionBareme: boolean,
): PlusValuesGainsDiversResult {
  const droitCommun = (input.case3vg ?? 0) + (input.case3we ?? 0);
  const abattementDroitCommun = Math.min(input.case3sg ?? 0, input.case3vg ?? 0);
  const renforce = input.case3ua ?? 0;
  const abattementFixe = Math.min(input.case3va ?? 0, renforce);
  const renforceApresFixe = renforce - abattementFixe;
  const abattementRenforce = Math.min(input.case3sl ?? 0, renforceApresFixe);
  const pea = input.case3vt ?? 0;
  const instrumentsFinanciers = input.case3pi ?? 0;
  const reportExpire = input.case3sb ?? 0;
  const actifsNumeriques = input.case3an ?? 0;
  const plusValuesImmobilieres = input.case3vz ?? 0;
  const bspceAncien = input.case3tj ?? 0;
  const abattementBspceAncien = Math.min(input.case3tk ?? 0, bspceAncien);
  const bspceCession2025 = input.case3tl ?? 0;
  const abattementBspceCession2025 = Math.min(input.case3tm ?? 0, bspceCession2025);
  const bspceTroisAns = bspceAncien - abattementBspceAncien
    + bspceCession2025 - abattementBspceCession2025;
  const bspceAvant2018 = input.case3sj ?? 0;
  const gainExerciceBspce = input.case3pc ?? 0;
  const bspceMoinsDeTroisAns = (input.case3sk ?? 0) + (input.case3pe ?? 0);
  const capitalRisque = input.case3vc ?? 0;

  let bareme = reportExpire;
  let basePFU = 0;
  let rfrHorsBareme = plusValuesImmobilieres + abattementFixe
    + abattementBspceAncien + abattementBspceCession2025 + (input.case3vq ?? 0) + capitalRisque
    + (input.case3ex ?? 0) + bspceMoinsDeTroisAns + instrumentsFinanciers + bspceAvant2018;

  if (optionBareme) {
    bareme += droitCommun - abattementDroitCommun + renforceApresFixe - abattementRenforce
      + pea + bspceTroisAns;
    rfrHorsBareme += abattementDroitCommun + abattementRenforce;
  } else {
    basePFU += droitCommun + renforceApresFixe + pea + bspceTroisAns;
  }
  basePFU += gainExerciceBspce;

  if (input.case3cn) bareme += actifsNumeriques;
  else basePFU += actifsNumeriques;

  const basePrelevementsSociaux = droitCommun + renforce + actifsNumeriques
    + bspceAvant2018 + bspceAncien + bspceCession2025 + gainExerciceBspce
    + bspceMoinsDeTroisAns + (input.case3vq ?? 0);

  return {
    totalNetImposable: bareme,
    impotForfaitaire: basePFU * TAUX_PFU + bspceMoinsDeTroisAns * TAUX_BSPCE_MOINS_DE_3_ANS
      + bspceAvant2018 * TAUX_BSPCE_AVANT_2018 + instrumentsFinanciers * TAUX_3PI,
    revenuExonereRetenuPourRFR: rfrHorsBareme + basePFU,
    basePrelevementsSociaux,
    prelevementsSociaux: basePrelevementsSociaux * TAUX_PS_PLUS_VALUES,
    casesExclues: CASES_PLUS_VALUES_EXCLUES_DU_CALCUL,
  };
}
