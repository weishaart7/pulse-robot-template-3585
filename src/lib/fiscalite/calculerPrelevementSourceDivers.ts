import { PrelevementSourceDiversInput } from './types';

/** CSG + CRDS dont sont exonérés 8RV/8RC/8RM (revenus du patrimoine à 18,6 % : CSG 10,6 % + CRDS 0,5 %). */
export const TAUX_CSG_CRDS_PATRIMOINE = 0.111;
/** CSG + CRDS dont est exonéré 8RF (revenus fonciers restés à 17,2 % : CSG 9,2 % + CRDS 0,5 %). */
export const TAUX_CSG_CRDS_FONCIER = 0.097;

/**
 * 8SH/8SI : personne seule (8SH) ou couple dont les deux conjoints (8SH et 8SI)
 * sont affiliés à un régime d'assurance maladie EEE, Royaume-Uni ou Suisse —
 * tous les revenus du patrimoine sont exonérés de CSG-CRDS, sans saisie de
 * montants (brochure IR 2026 p. 330). Les montants 8RF…8RM ne servent que si
 * un seul des conjoints remplit la condition.
 */
export function exonerationTotaleCsgCrds(input: PrelevementSourceDiversInput, coupleImpositionCommune: boolean): boolean {
  return coupleImpositionCommune ? input.case8sh && input.case8si : input.case8sh;
}

/** Cadre 8 vide : aucune case saisie. */
export const PRELEVEMENT_SOURCE_DIVERS_VIDE: PrelevementSourceDiversInput = {
  case8hv: null, case8iv: null, case8jv: null, case8kv: null, case8hw: null, case8iw: null, case8jw: null, case8kw: null, case8hx: null, case8ix: null, case8jx: null, case8kx: null, case8hy: null, case8iy: null, case8jy: null, case8ky: null, case8hz: null, case8iz: null, case8jz: null, case8kz: null, case8hr: null, case8hs: null, case8ea: null, case8tk: null, case8ta: null, case8ut: null, case8ti: null, case8pl: null, case8vl: null, case8pm: null, case8vm: null, case8wm: null, case8um: null, case8tf: null, case8rf: null, case8rv: null, case8rc: null, case8rm: null, case8tt: false, case8uu: false, case8sh: false, case8si: false, case8fv: false,
  case8tq: null, case8tr: null, case8sc: null, case8sw: null, case8sx: null, case8tw: null, case8tv: null, case8qv: null, case8th: null, case8qh: null, case8tx: null, case8qx: null, case8sa: null, case8sd: null, case8sb: null,
};

/** CRDS sur tous les revenus d'activité et de remplacement (ord. 96-50). */
export const TAUX_CRDS = 0.005;
/** CASA sur les pensions et préretraites soumises à la CSG au taux de 8,3 % ou 6,6 % (art. L14-10-4 CASF). */
export const TAUX_CASA = 0.003;

const montant = (v: number | null) => Math.max(0, v ?? 0);
const somme = (...v: (number | null)[]) => v.reduce<number>((s, x) => s + montant(x), 0);

export interface PrelevementSourceDiversResult {
  /** 8TI : ajouté au revenu retenu pour le taux effectif. */
  revenuTauxEffectif: number;
  /**
   * 8TK : revenus déjà déclarés dans leur catégorie, ouvrant droit à un crédit
   * égal à l'impôt français. L'appelant les retire de la base imposée en France
   * et les ajoute au revenu retenu pour le taux effectif (comme 1AF), ce qui
   * revient au crédit impôt × 8TK / revenu imposable.
   */
  revenuCreditImpotEgalImpotFrancais: number;
  /** 8TF : reprises ajoutées à l'impôt net. */
  reprises: number;
  /**
   * CSG et CRDS non dues sur 8RF/8RV/8RC/8RM (affiliés EEE, Royaume-Uni, Suisse) :
   * à retrancher des prélèvements sociaux calculés, plafonnée à ceux-ci par l'appelant.
   */
  reductionPrelevementsSociaux: number;
  /** Retenue et acomptes d'IR versés (8HV…8KV, 8HW…8KW), nets des remboursements obtenus (8HY…8KY). */
  impotDejaPaye: number;
  /** Acomptes de PS versés (8HX…8KX), nets des remboursements obtenus (8HZ…8KZ). */
  prelevementsSociauxDejaPayes: number;
  /** 8EA : avance déjà reçue, retranchée des réductions et crédits restant à recevoir. */
  avanceReductionsCredits: number;
  /**
   * CSG, CRDS et CASA sur les revenus d'activité et de remplacement de source
   * étrangère (8TQ…8SB, phase 8.2), au taux de CSG de chaque case.
   */
  contributionsSocialesRevenusActivite: number;
}

/**
 * Cadre 8 de la 2042 et de la 2042-C (revenus 2025/impôt 2026), hors crédit
 * égal à l'impôt étranger (voir `creditImpotEgalImpotEtranger`, qui dépend
 * de l'impôt calculé). Informatives : 8HR/8HS (CDHR non calculée), 8TA,
 * 8UT, 8TT, 8UU, 8FV. 8SH/8SI : voir `exonerationTotaleCsgCrds`.
 * Contributions 8TQ…8SB : montants saisis tels que déclarés, la base déclarée
 * étant déjà après déduction de 1,75 % sur salaires et chômage (brochure p. 328).
 */
export function calculerPrelevementSourceDivers(input: PrelevementSourceDiversInput): PrelevementSourceDiversResult {
  return {
    revenuTauxEffectif: montant(input.case8ti),
    revenuCreditImpotEgalImpotFrancais: montant(input.case8tk),
    reprises: montant(input.case8tf),
    reductionPrelevementsSociaux: Math.round(
      montant(input.case8rf) * TAUX_CSG_CRDS_FONCIER
      + somme(input.case8rv, input.case8rc, input.case8rm) * TAUX_CSG_CRDS_PATRIMOINE,
    ),
    impotDejaPaye: somme(input.case8hv, input.case8iv, input.case8jv, input.case8kv, input.case8hw, input.case8iw, input.case8jw, input.case8kw)
      - somme(input.case8hy, input.case8iy, input.case8jy, input.case8ky),
    prelevementsSociauxDejaPayes: somme(input.case8hx, input.case8ix, input.case8jx, input.case8kx)
      - somme(input.case8hz, input.case8iz, input.case8jz, input.case8kz),
    avanceReductionsCredits: montant(input.case8ea),
    contributionsSocialesRevenusActivite: Math.round(
      somme(input.case8tq, input.case8tr) * (0.092 + TAUX_CRDS)
      + montant(input.case8sc) * (0.092 + TAUX_CRDS + TAUX_CASA)
      + somme(input.case8sw, input.case8tw) * (0.062 + TAUX_CRDS)
      + montant(input.case8sx) * (0.038 + TAUX_CRDS)
      + somme(input.case8tv, input.case8qv, input.case8sa) * (0.083 + TAUX_CRDS + TAUX_CASA)
      + somme(input.case8th, input.case8qh, input.case8sd) * (0.066 + TAUX_CRDS + TAUX_CASA)
      + somme(input.case8tx, input.case8qx, input.case8sb) * (0.038 + TAUX_CRDS),
    ),
  };
}

/** PFU, part impôt sur le revenu (art. 200 A CGI), applicable à 8PL sans option 2OP. */
export const TAUX_PFU_IR = 0.128;
/** Prélèvements sociaux des revenus du patrimoine (CSG 10,6 % + CRDS 0,5 % + solidarité 7,5 %). */
export const TAUX_PS_PATRIMOINE = 0.186;
/** Prélèvement de solidarité seul, resté dû par les affiliés EEE, Royaume-Uni, Suisse (8SH/8SI). */
export const TAUX_PRELEVEMENT_SOLIDARITE = 0.075;

export interface CreditImpotEtrangerContexte {
  /** Impôt au barème après décote et réductions, hors impôt forfaitaire. */
  impotBareme: number;
  /** Revenu imposable au barème. */
  revenuImposable: number;
  /** 2OP : option pour le barème des revenus de capitaux mobiliers. */
  optionBareme: boolean;
  /** 8SH/8SI : exonération totale de CSG-CRDS (voir `exonerationTotaleCsgCrds`). */
  exonerationCsgCrds: boolean;
}

export interface CreditImpotEtrangerResult {
  /** Part imputée sur l'impôt sur le revenu (encore plafonnée par `calculerImpot`). */
  creditImpot: number;
  /** Reliquat imputé sur les prélèvements sociaux dus au titre de 8PL. */
  creditPrelevementsSociaux: number;
}

/**
 * Crédit égal à l'impôt étranger (8PL/8VL, 8PM/8VM…8UM), non restituable :
 * pour chaque catégorie, le moindre de l'impôt payé à l'étranger et de
 * l'impôt français correspondant, IR augmenté des PS (notice 2047, brochure
 * IR 2026 p. 366). Imputé d'abord sur l'IR, le reliquat sur les PS dus au
 * titre de ces revenus (notice 2047 2025, BOI-RSA-GEO-40-10-30-20 n° 260).
 * - 8PL : IR correspondant = 12,8 % sans 2OP, prorata du barème avec 2OP ;
 *   PS correspondants = 18,6 % (7,5 % si 8SH/8SI).
 * - 8PM : IR seul, au prorata du barème — la nature des revenus (donc le taux
 *   de PS) n'est pas connue.
 * Les revenus restent déclarés dans leur catégorie.
 */
export function creditImpotEgalImpotEtranger(
  input: PrelevementSourceDiversInput,
  contexte: CreditImpotEtrangerContexte,
): CreditImpotEtrangerResult {
  const impotBareme = Math.max(0, contexte.impotBareme);
  const proratoBareme = (revenu: number) => contexte.revenuImposable > 0
    ? impotBareme * Math.min(1, revenu / contexte.revenuImposable)
    : 0;

  const revenu8PL = montant(input.case8pl);
  const credit8PL = Math.min(
    montant(input.case8vl),
    (contexte.optionBareme ? proratoBareme(revenu8PL) : revenu8PL * TAUX_PFU_IR)
      + revenu8PL * (contexte.exonerationCsgCrds ? TAUX_PRELEVEMENT_SOLIDARITE : TAUX_PS_PATRIMOINE),
  );
  const ir8PL = Math.min(credit8PL, contexte.optionBareme ? proratoBareme(revenu8PL) : revenu8PL * TAUX_PFU_IR);
  const credit8PM = Math.min(somme(input.case8vm, input.case8wm, input.case8um), proratoBareme(montant(input.case8pm)));

  return {
    creditImpot: Math.round(ir8PL + credit8PM),
    creditPrelevementsSociaux: Math.round(credit8PL - ir8PL),
  };
}

export interface SoldeImpotResult {
  /** Positif : reste à payer ; négatif : à rembourser. */
  soldeImpot: number;
  soldePrelevementsSociaux: number;
}

/** Solde de l'impôt de l'année après prélèvement à la source (8HV…8KZ) et avance 8EA. */
export function calculerSoldeImpot(
  resultat: PrelevementSourceDiversResult,
  impotNet: number,
  prelevementsSociaux: number,
): SoldeImpotResult {
  return {
    soldeImpot: Math.round(impotNet - resultat.impotDejaPaye + resultat.avanceReductionsCredits),
    soldePrelevementsSociaux: Math.round(prelevementsSociaux - resultat.prelevementsSociauxDejaPayes),
  };
}
