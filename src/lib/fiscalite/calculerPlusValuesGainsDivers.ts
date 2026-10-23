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
/** 3PI : seule la moitié du profit est imposable (libellé CERFA « taxables à 50 % »). */
const FRACTION_IMPOSABLE_3PI = 0.5;

/**
 * Cases du cadre 3 saisies mais sans effet sur l'impôt de l'année :
 * - 3VH (moins-value 2025) et 3BN (moins-value d'actifs numériques) : le
 *   déclarant les a déjà imputées lui-même avant de remplir 3VG/3AN (montants
 *   CERFA jamais recalculés, comme 2VQ-2VU au cadre 2) ; reliquat reportable
 *   seulement. 3BN ne s'impute jamais sur les plus-values de valeurs mobilières.
 */
export const CASES_PLUS_VALUES_EXCLUES_DU_CALCUL = ['case3vh', 'case3bn'] as const;

export interface PlusValuesGainsDiversResult {
  /** Part imposée au barème (option 2OP, option 3CN pour 3AN, et 3SB toujours). */
  totalNetImposable: number;
  /** Impôt à 12,8 % déjà calculé, ajouté après la décote par `calculerImpot.ts`. */
  impotForfaitaire: number;
  /**
   * Montants retenus pour le RFR hors `totalNetImposable` : bases imposées au
   * PFU (absentes du revenu au barème), abattements pour durée de détention
   * (3SG/3SL) et abattement fixe (3VA) réintégrés (art. 1417 IV 1° CGI),
   * plus-values immobilières 3VZ et 3VW.
   */
  revenuExonereRetenuPourRFR: number;
  /** Base soumise aux PS à 18,6 % : 3VG, 3UA, 3WE, 3AN avant tout abattement. */
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
 * - non cochée (PFU) : 3VG + 3WE, 3UA − 3VA, 3VT et la moitié de 3PI sont
 *   taxés à 12,8 % ; les abattements pour durée de détention (3SG, 3SL) ne
 *   s'appliquent pas, seul l'abattement fixe 3VA s'applique ;
 * - cochée : ces mêmes montants, nets de 3SG/3SL/3VA, rejoignent le barème.
 * 3AN suit sa propre option 3CN (art. 150 VH bis CGI), indépendante de 2OP.
 * 3SB (plus-value 150-0 D bis en report expiré, déjà après abattement) est
 * toujours au barème — hypothèse à confirmer, voir docs/fiscalite.md.
 *
 * Prélèvements sociaux : 3VT exclu (prélevés à la source par l'établissement
 * gestionnaire du PEA), 3PI et 3SB exclus en attendant vérification.
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
  const instrumentsFinanciers = (input.case3pi ?? 0) * FRACTION_IMPOSABLE_3PI;
  const reportExpire = input.case3sb ?? 0;
  const actifsNumeriques = input.case3an ?? 0;
  const plusValuesImmobilieres = (input.case3vz ?? 0) + (input.case3vw ?? 0);

  let bareme = reportExpire;
  let basePFU = 0;
  let rfrHorsBareme = plusValuesImmobilieres + abattementFixe;

  if (optionBareme) {
    bareme += droitCommun - abattementDroitCommun + renforceApresFixe - abattementRenforce
      + pea + instrumentsFinanciers;
    rfrHorsBareme += abattementDroitCommun + abattementRenforce;
  } else {
    basePFU += droitCommun + renforceApresFixe + pea + instrumentsFinanciers;
  }

  if (input.case3cn) bareme += actifsNumeriques;
  else basePFU += actifsNumeriques;

  const basePrelevementsSociaux = droitCommun + renforce + actifsNumeriques;

  return {
    totalNetImposable: bareme,
    impotForfaitaire: basePFU * TAUX_PFU,
    revenuExonereRetenuPourRFR: rfrHorsBareme + basePFU,
    basePrelevementsSociaux,
    prelevementsSociaux: basePrelevementsSociaux * TAUX_PS_PLUS_VALUES,
    casesExclues: CASES_PLUS_VALUES_EXCLUES_DU_CALCUL,
  };
}
