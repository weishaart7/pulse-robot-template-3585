import { RevenusCapitauxMobiliersInput } from './types';

/** Abattement de 40 % sur les revenus distribués (2DC/2FU), applicable uniquement en cas d'option barème (2OP). */
const ABATTEMENT_DIVIDENDES_TAUX = 0.40;
/** PFU applicable en l'absence d'option barème (art. 200 A CGI, IR seul, PS hors périmètre). */
const TAUX_PFU = 0.128;
/** Coefficient multiplicateur de 2GO (revenus réputés distribués / structures ETNC), quelle que soit la modalité d'imposition — vérifié brochure DGFiP p.126. */
const COEFFICIENT_2GO = 1.25;

/**
 * Cases du cadre 2 "Revenus de capitaux mobiliers" volontairement exclues du
 * calcul (Phase 1) : mécanismes trop hétérogènes pour être fiabilisés sans
 * validation métier dédiée, ou cases sans effet sur l'IR par nature.
 * - 2DH/2CH/2UU/2VV/2WW/2XX/2YY/2ZZ (contrats d'assurance-vie) : prélèvement
 *   déjà opéré à la source + mécanisme de crédit d'impôt sur l'abattement
 *   annuel de 4 600 €/9 200 € inutilisé (imputation dans un ordre précis),
 *   non modélisé.
 * - 2VM/2VN/2VO/2VP (gains de cession de bons/contrats) et 2VQ-2VU
 *   (moins-values reportables) : règle d'imputation "par taux" (une
 *   moins-value à 12,8 % ne s'impute que sur des gains à 12,8 %), non
 *   modélisée.
 * - 2TU/2TV/2TW/2TX/2TY (pertes prêts participatifs non imputées) : pur
 *   report sur les années suivantes, aucun effet sur l'année en cours.
 * - 2CG/2BH/2DF/2DG/2DI/2EE : lignes exclusivement PS/revenu fiscal de
 *   référence (les deux hors périmètre du module) — sans effet sur l'IR.
 * - 2AB/2CK : crédits d'impôt imputables sur l'impôt dû (pas sur le revenu),
 *   mécanisme de crédit d'impôt général absent de calculerImpot.ts, ordre
 *   face à la décote non confirmé.
 */
export const CASES_CAPITAUX_MOBILIERS_EXCLUES_DU_CALCUL = [
  'case2dh', 'case2ch', 'case2uu', 'case2vv', 'case2ww',
  'case2xx', 'case2yy', 'case2zz',
  'case2vm', 'case2vn', 'case2vo', 'case2vp',
  'case2vq', 'case2vr', 'case2vs', 'case2vt', 'case2vu',
  'case2tu', 'case2tv', 'case2tw', 'case2tx', 'case2ty',
  'case2cg', 'case2bh', 'case2df', 'case2dg', 'case2di', 'case2ee',
  'case2ab', 'case2ck',
] as const;

export interface RevenuCapitauxMobiliersResult {
  /** Revenu net imposable au barème (uniquement si 2OP coché) — 0 sinon. */
  totalNetImposable: number;
  /**
   * Impôt à taux forfaitaire (PFU 12,8 %, uniquement si 2OP non coché) :
   * montant d'impôt déjà calculé, distinct du revenu net imposable au
   * barème — ne s'additionne pas à `totalNetImposable`, s'ajoute à l'impôt
   * net après décote dans `calculerImpot.ts` (même famille que
   * `calculerGainsActionnariatSalarie.ts::impotForfaitaire`).
   */
  impotForfaitaire: number;
  casesExclues: readonly string[];
}

/**
 * Revenu net imposable et impôt forfaitaire du cadre 2 "Revenus de capitaux
 * mobiliers" (Phase 1, revenus 2025/impôt 2026), limité aux cases dont le
 * régime est sans ambiguïté : dividendes/revenus assimilés (2DC/2FU,
 * abattement 40 % si option barème), intérêts et produits sans abattement
 * (2TS/2TR/2TT/2TQ/2TZ), revenus réputés distribués (2GO, × 1,25).
 *
 * `2OP` (option pour l'imposition au barème, globale à l'ensemble du cadre) :
 * - coché : l'abattement de 40 % sur 2DC/2FU s'applique, les frais et charges
 *   (2CA) et les déficits antérieurs (2AA-2AR, plancher à 0, pas de report
 *   au-delà) sont déduits de la base globale, qui rejoint `totalNetImposable`.
 * - non coché (PFU par défaut depuis 2018) : aucun abattement, aucun frais,
 *   aucun déficit (la brochure DGFiP réserve ces trois mécanismes à l'option
 *   barème) — la même base est taxée à 12,8 % dans `impotForfaitaire`.
 *
 * Cases hors calcul : voir CASES_CAPITAUX_MOBILIERS_EXCLUES_DU_CALCUL.
 */
export function calculerRevenuCapitauxMobiliers(
  input: RevenusCapitauxMobiliersInput,
): RevenuCapitauxMobiliersResult {
  const dividendes = (input.case2dc ?? 0) + (input.case2fu ?? 0);
  const sansAbattement = (input.case2ts ?? 0) + (input.case2tr ?? 0) + (input.case2tt ?? 0)
    + (input.case2tq ?? 0) + (input.case2tz ?? 0);
  const revenusReputesDistribues = (input.case2go ?? 0) * COEFFICIENT_2GO;

  if (input.case2op) {
    const abattementDividendes = dividendes * ABATTEMENT_DIVIDENDES_TAUX;
    const fraisCharges = input.case2ca ?? 0;
    const deficitsAnterieurs = (input.case2aa ?? 0) + (input.case2al ?? 0) + (input.case2am ?? 0)
      + (input.case2an ?? 0) + (input.case2aq ?? 0) + (input.case2ar ?? 0);

    const baseAvantDeficits = (dividendes - abattementDividendes)
      + sansAbattement + revenusReputesDistribues - fraisCharges;

    return {
      totalNetImposable: Math.max(0, baseAvantDeficits - deficitsAnterieurs),
      impotForfaitaire: 0,
      casesExclues: CASES_CAPITAUX_MOBILIERS_EXCLUES_DU_CALCUL,
    };
  }

  const baseImposable = dividendes + sansAbattement + revenusReputesDistribues;

  return {
    totalNetImposable: 0,
    impotForfaitaire: baseImposable * TAUX_PFU,
    casesExclues: CASES_CAPITAUX_MOBILIERS_EXCLUES_DU_CALCUL,
  };
}
