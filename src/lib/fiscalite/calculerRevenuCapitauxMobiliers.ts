import { FoyerFiscalInput, RevenusCapitauxMobiliersInput } from './types';

/** Abattement de 40 % sur les revenus distribués (2DC/2FU), applicable uniquement en cas d'option barème (2OP). */
const ABATTEMENT_DIVIDENDES_TAUX = 0.40;
/** PFU applicable en l'absence d'option barème (art. 200 A CGI, IR seul, PS hors périmètre). */
const TAUX_PFU = 0.128;
/** Taux réduit applicable à 2VV (primes ≤ 150 000 €) en l'absence d'option barème. */
const TAUX_PFU_REDUIT_2VV = 0.075;
/** Coefficient multiplicateur de 2GO (revenus réputés distribués / structures ETNC), quelle que soit la modalité d'imposition — vérifié brochure DGFiP p.126. */
const COEFFICIENT_2GO = 1.25;

/**
 * Abattement annuel sur les produits des contrats d'assurance-vie/capitalisation
 * ≥ 8 ans (art. 125-0 A CGI), quelle que soit leur modalité d'imposition —
 * vérifié brochure DGFiP p.129.
 */
const ABATTEMENT_CONTRATS_8_ANS_CELIBATAIRE = 4600;
const ABATTEMENT_CONTRATS_8_ANS_COUPLE = 9200;
/** Taux du prélèvement libératoire historique dont 2DH a déjà fait l'objet, base du crédit d'impôt sur abattement inutilisé. */
const TAUX_PFL_2DH = 0.075;

const COUPLE_IMPOSITION_COMMUNE: FoyerFiscalInput['situationFamille'][] = ['marie', 'pacse'];

/**
 * Cases du cadre 2 "Revenus de capitaux mobiliers" volontairement exclues du
 * calcul : mécanismes trop hétérogènes pour être fiabilisés sans validation
 * métier dédiée, ou cases sans effet sur l'IR par nature.
 * - 2UU : total informatif à répartir entre 2VV et 2WW (déjà comptés), pas un
 *   montant additionnel.
 * - 2XX (contrats < 8 ans, prélevé à titre définitif à la source lors du
 *   versement, taux 15/25/35/45 % selon durée) : déjà taxé, aucun effet
 *   supplémentaire sur l'IR — informatif/RFR seulement, comme 2CG/2BH/2DF.
 * - 2VM (gains de cession de bons/contrats attachés à des primes versées
 *   avant le 27.9.2017, déjà soumis au prélèvement libératoire lors du
 *   versement) : même mécanisme que 2XX, déjà taxé à titre définitif, sans
 *   effet supplémentaire sur l'IR (brochure DGFiP IR 2026 p.131-132 ;
 *   BOI-RPPM-RCM-20-10-20-50 § 450 et suiv.).
 * - 2VQ-2VU (reliquat de moins-value de cession non imputée, par année
 *   d'origine 2021-2025) : la brochure est explicite (p.132) — le montant
 *   inscrit ici est celui qui *reste* après imputation par le déclarant
 *   lui-même sur ses gains de même régime de l'année (l'app ne recalcule
 *   jamais les montants CERFA, cf. 2VM/2VN/2VO/2VP ci-dessous, déjà nets de
 *   cette imputation) — purement informatif pour l'année suivante, même
 *   famille que 2TU-2TY, aucun effet sur l'année en cours.
 * - 2TU/2TV/2TW/2TX/2TY (pertes prêts participatifs non imputées) : pur
 *   report sur les années suivantes, aucun effet sur l'année en cours.
 * - 2CG/2BH/2DF/2DG/2DI/2EE : lignes exclusivement PS/revenu fiscal de
 *   référence (les deux hors périmètre du module) — sans effet sur l'IR.
 * - 2AB/2CK : crédits d'impôt imputables sur l'impôt dû (pas sur le revenu),
 *   mécanisme de crédit d'impôt général absent de calculerImpot.ts, ordre
 *   face à la décote non confirmé.
 */
export const CASES_CAPITAUX_MOBILIERS_EXCLUES_DU_CALCUL = [
  'case2uu',
  'case2xx',
  'case2vm',
  'case2vq', 'case2vr', 'case2vs', 'case2vt', 'case2vu',
  'case2tu', 'case2tv', 'case2tw', 'case2tx', 'case2ty',
  'case2cg', 'case2bh', 'case2df', 'case2dg', 'case2di', 'case2ee',
  'case2ab', 'case2ck',
] as const;

export interface RevenuCapitauxMobiliersResult {
  /** Revenu net imposable au barème (uniquement si 2OP coché) — 0 sinon. */
  totalNetImposable: number;
  /**
   * Impôt à taux forfaitaire (PFU 12,8 % ou 7,5 % selon la case, uniquement
   * si 2OP non coché) : montant d'impôt déjà calculé, distinct du revenu net
   * imposable au barème — ne s'additionne pas à `totalNetImposable`, s'ajoute
   * à l'impôt net après décote dans `calculerImpot.ts` (même famille que
   * `calculerGainsActionnariatSalarie.ts::impotForfaitaire`).
   */
  impotForfaitaire: number;
  /**
   * Crédit d'impôt restituable (art. 125-0 A CGI, BOI-RPPM-RCM-20-10-20-50
   * §330-365) : la fraction de l'abattement de 4 600 €/9 200 € imputée sur
   * 2DH (déjà prélevé à 7,5 % à la source, non réintégré au revenu) donne
   * droit à un crédit égal à 7,5 % de cette fraction. Indépendant de 2OP
   * (mécanisme du régime antérieur à 2018, sans lien avec l'option barème
   * globale). S'impute sur l'impôt net en tout dernier, après la décote
   * (calculerImpot.ts) — restituable si l'impôt dû est insuffisant pour
   * l'absorber.
   */
  creditImpotAssuranceVie: number;
  casesExclues: readonly string[];
}

/**
 * Revenu net imposable et impôt forfaitaire du cadre 2 "Revenus de capitaux
 * mobiliers" (revenus 2025/impôt 2026), limité aux cases dont le régime est
 * sans ambiguïté : dividendes/revenus assimilés (2DC/2FU, abattement 40 % si
 * option barème), intérêts et produits sans abattement
 * (2TS/2TR/2TT/2TQ/2TZ), revenus réputés distribués (2GO, × 1,25), produits
 * des contrats d'assurance-vie de moins de 8 ans (2YY/2ZZ — Phase 2a) et de
 * 8 ans et plus (2CH/2DH/2VV/2WW — Phase 2b).
 *
 * `2OP` (option pour l'imposition au barème, globale à l'ensemble du cadre) :
 * - coché : l'abattement de 40 % sur 2DC/2FU s'applique, les frais et charges
 *   (2CA) et les déficits antérieurs (2AA-2AR, plancher à 0, pas de report
 *   au-delà) sont déduits de la base globale, qui rejoint `totalNetImposable`
 *   avec 2ZZ, le net de 2VV et le net de 2WW (après abattement contrats
 *   ≥ 8 ans, voir ci-dessous) — en plus de 2YY et 2CH, toujours au barème.
 * - non coché (PFU par défaut depuis 2018) : aucun abattement 40 %, aucun
 *   frais, aucun déficit (la brochure DGFiP réserve ces trois mécanismes à
 *   l'option barème) — la même base, plus 2ZZ et le net de 2WW, est taxée à
 *   12,8 % ; le net de 2VV est taxé à 7,5 % (primes ≤ 150 000 €).
 *
 * **2YY et 2CH échappent à ce switch** : la brochure DGFiP est explicite pour
 * 2YY (p.130, « y compris sans option globale ») ; le BOFiP
 * (BOI-RPPM-RCM-20-10-20-50 §75) confirme le même principe pour 2CH — les
 * produits de versements antérieurs au 27.9.2017 non soumis au prélèvement
 * libératoire à l'époque du versement restent "par principe" au barème,
 * régime antérieur à la réforme PFU de 2018 et donc indépendant de 2OP. Ces
 * deux cases rejoignent toujours `totalNetImposable`.
 *
 * **Contrats ≥ 8 ans (2CH/2DH/2VV/2WW) — abattement annuel de 4 600 €
 * (personne seule) / 9 200 € (couple marié/pacsé), quelle que soit la
 * modalité d'imposition (brochure p.129), imputé dans l'ordre impératif
 * 2CH → 2DH → 2VV → 2WW.** 2DH a déjà fait l'objet d'un prélèvement
 * libératoire de 7,5 % à la source lors du versement (régime antérieur à
 * 2018, choix fait à l'époque) : il n'est jamais réintégré au revenu
 * imposable, mais la fraction de l'abattement qui lui est imputée (faute
 * d'avoir été absorbée par 2CH) donne droit à `creditImpotAssuranceVie`
 * (7,5 % de cette fraction), restituable — voir `RevenuCapitauxMobiliersResult`.
 *
 * **Gains de cession de bons/contrats de capitalisation et d'assurance-vie
 * (2VM-2VP, Phase 2c) — même régime que les produits du contrat, mais
 * jamais d'abattement.** Vérifié brochure DGFiP IR 2026 p.131-132 et BOFiP
 * BOI-RPPM-RCM-20-10-20-50 § 450/460 : « le régime d'imposition de ce gain
 * est le même que celui applicable aux produits du bon ou contrat
 * concerné », mais « ce gain est retenu dans l'assiette de l'impôt pour son
 * montant brut, sans qu'il soit fait application de l'abattement fixe
 * annuel de 4 600 € ou 9 200 € » (contrairement à 2CH/2DH/2VV/2WW). 2VN
 * (gains attachés à des primes versées avant le 27.9.2017, sans option pour
 * le prélèvement libératoire) rejoint donc `toujoursBareme` comme 2CH/2YY ;
 * 2VO/2VP (gains attachés à des primes versées à compter du 27.9.2017,
 * imposables à 7,5 %/12,8 %) suivent le switch 2OP comme 2VV/2WW mais sans
 * jamais passer par l'abattement. La règle d'imputation "par taux" des
 * moins-values de cession (une moins-value à 12,8 % ne s'impute que sur des
 * gains à 12,8 %) n'a rien à modéliser ici : la brochure (p.132) est
 * explicite, cette imputation est faite par le déclarant lui-même avant de
 * remplir sa déclaration — les montants inscrits en 2VM-2VP sont déjà nets
 * de cette imputation, comme le reste du module qui ne recalcule jamais les
 * montants CERFA. Voir CASES_CAPITAUX_MOBILIERS_EXCLUES_DU_CALCUL pour 2VM
 * (déjà prélevé à la source, comme 2XX) et 2VQ-2VU (reliquat non imputé,
 * purement informatif pour l'année suivante).
 *
 * Cases hors calcul : voir CASES_CAPITAUX_MOBILIERS_EXCLUES_DU_CALCUL.
 */
export function calculerRevenuCapitauxMobiliers(
  input: RevenusCapitauxMobiliersInput,
  situationFamille: FoyerFiscalInput['situationFamille'],
): RevenuCapitauxMobiliersResult {
  const dividendes = (input.case2dc ?? 0) + (input.case2fu ?? 0);
  const sansAbattement = (input.case2ts ?? 0) + (input.case2tr ?? 0) + (input.case2tt ?? 0)
    + (input.case2tq ?? 0) + (input.case2tz ?? 0);
  const revenusReputesDistribues = (input.case2go ?? 0) * COEFFICIENT_2GO;
  const contratMoinsDe8AnsPost2017 = input.case2zz ?? 0; // 2ZZ : suit le switch 2OP comme le reste

  // Contrats ≥ 8 ans : abattement 4 600 €/9 200 €, imputé dans l'ordre 2CH → 2DH → 2VV → 2WW.
  const estCoupleImpositionCommune = COUPLE_IMPOSITION_COMMUNE.includes(situationFamille);
  const abattementDisponible = estCoupleImpositionCommune
    ? ABATTEMENT_CONTRATS_8_ANS_COUPLE
    : ABATTEMENT_CONTRATS_8_ANS_CELIBATAIRE;

  const case2ch = input.case2ch ?? 0;
  const case2dh = input.case2dh ?? 0;
  const case2vv = input.case2vv ?? 0;
  const case2ww = input.case2ww ?? 0;

  const abattementSur2ch = Math.min(abattementDisponible, case2ch);
  const abattementSur2dh = Math.min(abattementDisponible - abattementSur2ch, case2dh);
  const abattementSur2vv = Math.min(abattementDisponible - abattementSur2ch - abattementSur2dh, case2vv);
  const abattementSur2ww = Math.min(
    abattementDisponible - abattementSur2ch - abattementSur2dh - abattementSur2vv,
    case2ww,
  );

  const net2ch = case2ch - abattementSur2ch; // toujours barème, comme 2YY
  const net2vv = case2vv - abattementSur2vv; // 7,5 % PFU, ou barème sur option
  const net2ww = case2ww - abattementSur2ww; // 12,8 % PFU, ou barème sur option
  const creditImpotAssuranceVie = abattementSur2dh * TAUX_PFL_2DH;

  // Gains de cession de bons/contrats (2VN toujours barème, 2VO/2VP selon le switch 2OP) — jamais d'abattement.
  const case2vn = input.case2vn ?? 0;
  const case2vo = input.case2vo ?? 0;
  const case2vp = input.case2vp ?? 0;

  const toujoursBareme = (input.case2yy ?? 0) + net2ch + case2vn;

  if (input.case2op) {
    const abattementDividendes = dividendes * ABATTEMENT_DIVIDENDES_TAUX;
    const fraisCharges = input.case2ca ?? 0;
    const deficitsAnterieurs = (input.case2aa ?? 0) + (input.case2al ?? 0) + (input.case2am ?? 0)
      + (input.case2an ?? 0) + (input.case2aq ?? 0) + (input.case2ar ?? 0);

    const baseAvantDeficits = (dividendes - abattementDividendes)
      + sansAbattement + revenusReputesDistribues + toujoursBareme + contratMoinsDe8AnsPost2017
      + net2vv + net2ww + case2vo + case2vp
      - fraisCharges;

    return {
      totalNetImposable: Math.max(0, baseAvantDeficits - deficitsAnterieurs),
      impotForfaitaire: 0,
      creditImpotAssuranceVie,
      casesExclues: CASES_CAPITAUX_MOBILIERS_EXCLUES_DU_CALCUL,
    };
  }

  const baseTaux128 = dividendes + sansAbattement + revenusReputesDistribues
    + contratMoinsDe8AnsPost2017 + net2ww + case2vp;

  return {
    totalNetImposable: toujoursBareme,
    impotForfaitaire: baseTaux128 * TAUX_PFU + (net2vv + case2vo) * TAUX_PFU_REDUIT_2VV,
    creditImpotAssuranceVie,
    casesExclues: CASES_CAPITAUX_MOBILIERS_EXCLUES_DU_CALCUL,
  };
}
