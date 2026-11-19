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
/** Plus-values en report réalisées du 14.11 au 31.12.2012 (3WI, 3WJ). */
const TAUX_3WI = 0.24;
const TAUX_3WJ = 0.19;

/** Plafond de l'abattement fixe des dirigeants de PME partant à la retraite (art. 150-0 D ter CGI), 600 000 € au profit de jeunes agriculteurs. */
const PLAFOND_ABATTEMENT_FIXE_DIRIGEANT = 500_000;

/**
 * Cases du cadre 3 saisies mais sans effet sur l'impôt de l'année :
 * - 3VH (moins-value 2025) et 3BN (moins-value d'actifs numériques) : le
 *   déclarant les a déjà imputées lui-même avant de remplir 3VG/3AN (montants
 *   CERFA jamais recalculés, comme 2VQ-2VU au cadre 2) ; reliquat reportable
 *   seulement. 3BN ne s'impute jamais sur les plus-values de valeurs mobilières.
 */
export const CASES_PLUS_VALUES_EXCLUES_DU_CALCUL = ['case3vh', 'case3bn'] as const;

export interface PlusValuesGainsDiversResult {
  /** Part imposée au barème (option 2OP, option 3CN pour 3AN). */
  totalNetImposable: number;
  /** Impôt à 12,8 % (et à 50 % pour 3PI, 30 % pour 3SK/3PE, 19 % pour 3SJ, 12,8 % pour 3PC) déjà calculé, ajouté après la décote par `calculerImpot.ts`. */
  impotForfaitaire: number;
  /**
   * Montants retenus pour le RFR hors `totalNetImposable` : bases imposées au
   * PFU (absentes du revenu au barème), abattements pour durée de détention
   * (3SG/3SL) et abattement fixe (3VA) réintégrés (art. 1417 IV 1° CGI),
   * plus-values immobilières 3VZ (3VW exclu, brochure IR 2026 p. 155) ; bases
   * imposées à taux fixe (3PI, 3SJ, 3PC, 3SK, 3PE), abattements fixes 3TK/3TM,
   * fraction exonérée des impatriés 3VQ, capital-risque 3VC et gain PEAC 3EX,
   * diminués de la moins-value non imputable des impatriés 3VR (plancher 0).
   */
  revenuExonereRetenuPourRFR: number;
  /** Base soumise aux PS à 18,6 % : 3VG, 3UA, 3WE, 3SZ, 3AN, gains BSPCE, 3VQ, RVG et RUA, avant tout abattement, moins 3VR (plancher 0). */
  basePrelevementsSociaux: number;
  /** Base soumise aux PS à 17,2 % (taux 2017) : 3XN, rejoint la ligne du foncier (simulateur officiel 2026). */
  basePrelevementsSociaux172: number;
  /** Base soumise aux PS à 15,5 % (taux 2013-2016) : 3WI, 3WJ, 3WN. */
  basePrelevementsSociaux155: number;
  /**
   * Plus-values au quotient (RVG − RSG) + (RUA − RSL), option barème seulement : hors revenu imposable,
   * imposées par le système du quotient (coefficient 4, comme 0XX), RFR augmenté du quart.
   */
  revenuExceptionnelQuotient: number;
  prelevementsSociaux: number;
  casesExclues: readonly string[];
}

/**
 * IR, RFR et prélèvements sociaux du cadre 3 « Plus-values et gains divers »
 * (revenus 2025/impôt 2026), phase 3.1.
 *
 * `optionBareme` est la case 2OP du cadre 2 : l'option est globale à
 * l'ensemble des revenus de capitaux mobiliers ET des plus-values mobilières.
 * - non cochée (PFU) : 3VG + 3WE, 3UA − 3VA, 3VT, 3SB et 3SZ sont taxés à 12,8 % ; les abattements pour durée de détention (3SG, 3SL) ne
 *   s'appliquent pas, seul l'abattement fixe 3VA s'applique ;
 * - cochée : ces mêmes montants, nets de 3SG/3SL/3VA, rejoignent le barème.
 * 3AN suit sa propre option 3CN (art. 150 VH bis CGI), indépendante de 2OP.
 * 3SB (plus-value 150-0 D bis en report expiré, déjà après abattement) et 3SZ
 * (OPC monétaires, art. 150-0 B quater) sont imposés au taux applicable à
 * l'expiration du report (brochure IR 2026 p. 145), donc suivent 2OP comme 3VG.
 *
 * 3PI est toujours taxé à 50 % (art. 150 ter CGI), indépendamment de 2OP.
 *
 * Prélèvements sociaux : 3VT exclu (prélevés à la source par l'établissement
 * gestionnaire du PEA), 3PI exclu en attendant vérification, 3SB exclu (seul
 * l'IR est reporté par l'art. 150-0 D bis : les PS ont été acquittés l'année
 * de la cession) ; 3SZ soumis à 18,6 % sur le montant déclaré.
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
 * exonéré) retenus au RFR seulement ; 3VW (remploi) hors RFR. 3VR (fraction
 * non imputable des moins-values des impatriés) diminue la base des PS et le
 * RFR du cadre 3, sans les rendre négatifs.
 */
export function calculerPlusValuesGainsDivers(
  input: PlusValuesGainsDiversInput,
  optionBareme: boolean,
): PlusValuesGainsDiversResult {
  const droitCommun = input.case3vg ?? 0;
  // 3WE : complément de prix d'une plus-value en report (art. 150-0 D bis) — pas d'IR, RFR et PS 18,6 %
  // (simulateur officiel 2026 : 5 000 € → impôt inchangé, RFR +5 000, PS 930 €).
  const complementPrixReport = input.case3we ?? 0;
  const abattementDroitCommun = Math.min(input.case3sg ?? 0, input.case3vg ?? 0);
  const renforce = input.case3ua ?? 0;
  const abattementFixe = Math.min(input.case3va ?? 0, renforce);
  const renforceApresFixe = renforce - abattementFixe;
  const abattementRenforce = Math.min(input.case3sl ?? 0, renforceApresFixe);
  const pea = input.case3vt ?? 0;
  const instrumentsFinanciers = input.case3pi ?? 0;
  const reportExpire = (input.case3sb ?? 0) + (input.case3sz ?? 0);
  const moinsValueImpatries = input.case3vr ?? 0;
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

  // Reports (simulateur officiel 2026) : 3WI/3WJ imposés à 24 %/19 % ; 3WR/3WS/3WT sont des impôts déjà
  // calculés, ajoutés tels quels ; 3WN/3XN entrent au RFR ; 3WP n'a pas d'effet propre.
  const report2012 = (input.case3wi ?? 0) + (input.case3wj ?? 0);
  const impotReports = (input.case3wi ?? 0) * TAUX_3WI + (input.case3wj ?? 0) * TAUX_3WJ
    + (input.case3wr ?? 0) + (input.case3ws ?? 0) + (input.case3wt ?? 0);
  const reportsAvantAbattement = (input.case3wn ?? 0) + (input.case3xn ?? 0);

  // Quotient (RVG/RUA, coefficient NVG/NUA = 4) : seulement avec l'option barème ; abattements réintégrés au RFR.
  // RVA (abattement fixe dirigeant) s'impute d'abord sur RUA, RSL sur le reliquat, comme 3VA puis 3SL sur 3UA
  // (simulateur officiel 2026 et 2027 : RUA 200 000, RVA 100 000 → RFR + 25 000 au quotient + 100 000).
  const abattementFixeQuotient = optionBareme ? Math.min(input.caseRva ?? 0, input.caseRua ?? 0) : 0;
  const abattementQuotient = optionBareme
    ? Math.min(input.caseRsg ?? 0, input.caseRvg ?? 0) + abattementFixeQuotient
      + Math.min(input.caseRsl ?? 0, Math.max(0, (input.caseRua ?? 0) - abattementFixeQuotient))
    : 0;
  const revenuExceptionnelQuotient = optionBareme
    ? Math.max(0, (input.caseRvg ?? 0) + (input.caseRua ?? 0) - abattementQuotient)
    : 0;

  let bareme = 0;
  let basePFU = 0;
  let rfrHorsBareme = plusValuesImmobilieres + abattementFixe
    + abattementBspceAncien + abattementBspceCession2025 + (input.case3vq ?? 0) + capitalRisque
    + (input.case3ex ?? 0) + bspceMoinsDeTroisAns + instrumentsFinanciers + bspceAvant2018 + complementPrixReport
    + report2012 + reportsAvantAbattement + abattementQuotient;

  if (optionBareme) {
    bareme += droitCommun - abattementDroitCommun + renforceApresFixe - abattementRenforce
      + pea + bspceTroisAns + reportExpire;
    rfrHorsBareme += abattementDroitCommun + abattementRenforce;
  } else {
    basePFU += droitCommun + renforceApresFixe + pea + bspceTroisAns + reportExpire;
  }
  basePFU += gainExerciceBspce;

  if (input.case3cn) bareme += actifsNumeriques;
  else basePFU += actifsNumeriques;

  const basePrelevementsSociaux = Math.max(0, droitCommun + complementPrixReport + renforce + actifsNumeriques + (input.case3sz ?? 0)
    + bspceAvant2018 + bspceAncien + bspceCession2025 + gainExerciceBspce
    + bspceMoinsDeTroisAns + (input.case3vq ?? 0) + pea + instrumentsFinanciers - moinsValueImpatries
    + (optionBareme ? (input.caseRvg ?? 0) + (input.caseRua ?? 0) : 0));
  // 3VT (PEA avant 5 ans) et 3PI (instruments à 50 %) soumis à 18,6 % (simulateur officiel 2026 : 5 000 € → 930 €).

  return {
    totalNetImposable: bareme,
    impotForfaitaire: basePFU * TAUX_PFU + bspceMoinsDeTroisAns * TAUX_BSPCE_MOINS_DE_3_ANS
      + bspceAvant2018 * TAUX_BSPCE_AVANT_2018 + instrumentsFinanciers * TAUX_3PI + impotReports,
    // 3SB hors RFR, au PFU comme au barème (simulateur officiel 2026, choix retenu contre l'art. 1417 IV 1°) :
    // au barème, il est retiré du RFR alors qu'il figure dans le revenu imposable.
    revenuExonereRetenuPourRFR: Math.max(0, rfrHorsBareme + basePFU - moinsValueImpatries - (optionBareme ? 0 : (input.case3sb ?? 0)))
      - (optionBareme ? (input.case3sb ?? 0) : 0),
    basePrelevementsSociaux,
    basePrelevementsSociaux172: input.case3xn ?? 0,
    basePrelevementsSociaux155: report2012 + (input.case3wn ?? 0),
    revenuExceptionnelQuotient,
    prelevementsSociaux: basePrelevementsSociaux * TAUX_PS_PLUS_VALUES + (input.case3xn ?? 0) * 0.172
      + (report2012 + (input.case3wn ?? 0)) * 0.155,
    casesExclues: CASES_PLUS_VALUES_EXCLUES_DU_CALCUL,
  };
}

/**
 * Contrôles de saisie du cadre 3 (brochure IR 2026 p. 140-141 et 154), sans
 * effet sur le calcul :
 * - 3VA ne peut dépasser la plus-value 3UA ;
 * - l'abattement fixe (3VA, 3TK, 3TM) est plafonné à 500 000 € par cédant,
 *   600 000 € en cas de cession à de jeunes agriculteurs.
 */
export function controlerSaisiePlusValues(input: PlusValuesGainsDiversInput): string[] {
  const alertes: string[] = [];
  const abattementFixe = input.case3va ?? 0;
  // 3VA puis 3SL sur le reliquat se cumulent (simulateur officiel 2026 et 2027 : 3UA 700 000, 3VA 500 000, 3SL 130 000).
  const renforceSaisi = input.case3sl ?? 0;
  if (abattementFixe > 0 && renforceSaisi > 0 && renforceSaisi > Math.max(0, (input.case3ua ?? 0) - abattementFixe)) {
    alertes.push("L'abattement renforcé 3SL dépasse la plus-value 3UA diminuée de l'abattement fixe 3VA");
  }
  if (abattementFixe > (input.case3ua ?? 0)) {
    alertes.push("L'abattement fixe 3VA dépasse la plus-value 3UA");
  }
  const totalAbattementsFixes = abattementFixe + (input.case3tk ?? 0) + (input.case3tm ?? 0) + (input.caseRva ?? 0);
  if (totalAbattementsFixes > PLAFOND_ABATTEMENT_FIXE_DIRIGEANT) {
    alertes.push('Abattements fixes 3VA + 3TK + 3TM + RVA supérieurs à 500 000 € (600 000 € seulement pour une cession à de jeunes agriculteurs)');
  }
  const reports = (input.case3wn ?? 0) + (input.case3xn ?? 0);
  if ((input.case3wp ?? 0) > 0 && reports <= 0) alertes.push('3WP exige le montant avant abattement en 3WN ou 3XN');
  if (reports > 0 && (input.case3wp ?? 0) <= 0) alertes.push('3WN ou 3XN exige les plus-values imposables en 3WP');
  if ((input.caseRvg ?? 0) > 0 && input.caseNvg !== 4) alertes.push('NVG doit valoir 4 quand RVG est rempli');
  if ((input.caseRua ?? 0) > 0 && input.caseNua !== 4) alertes.push('NUA doit valoir 4 quand RUA est rempli');
  if ((input.caseRua ?? 0) > 0 && (input.caseRsl ?? 0) <= 0 && (input.caseRva ?? 0) <= 0) {
    alertes.push("RUA exige l'abattement renforcé RSL ou l'abattement fixe RVA");
  }
  if ((input.caseRva ?? 0) > (input.caseRua ?? 0)) alertes.push("L'abattement fixe RVA dépasse la plus-value RUA");
  return alertes;
}
