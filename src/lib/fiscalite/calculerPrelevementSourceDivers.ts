import { PrelevementSourceDiversInput } from './types';

/** CSG + CRDS dont sont exonérés 8RV/8RC/8RM (revenus du patrimoine à 18,6 % : CSG 10,6 % + CRDS 0,5 %). */
export const TAUX_CSG_CRDS_PATRIMOINE = 0.111;
/** CSG + CRDS dont est exonéré 8RF (revenus fonciers restés à 17,2 % : CSG 9,2 % + CRDS 0,5 %). */
export const TAUX_CSG_CRDS_FONCIER = 0.097;

/** Cadre 8 vide : aucune case saisie. */
export const PRELEVEMENT_SOURCE_DIVERS_VIDE: PrelevementSourceDiversInput = {
  case8hv: null, case8iv: null, case8jv: null, case8kv: null, case8hw: null, case8iw: null, case8jw: null, case8kw: null, case8hx: null, case8ix: null, case8jx: null, case8kx: null, case8hy: null, case8iy: null, case8jy: null, case8ky: null, case8hz: null, case8iz: null, case8jz: null, case8kz: null, case8hr: null, case8hs: null, case8ea: null, case8tk: null, case8ta: null, case8ut: null, case8ti: null, case8pl: null, case8vl: null, case8pm: null, case8vm: null, case8wm: null, case8um: null, case8tf: null, case8rf: null, case8rv: null, case8rc: null, case8rm: null, case8tt: false, case8uu: false, case8sh: false, case8si: false, case8vf: false,
  case8tq: null, case8tr: null, case8sc: null, case8sw: null, case8sx: null, case8tw: null, case8tv: null, case8qv: null, case8th: null, case8qh: null, case8tx: null, case8qx: null, case8sa: null, case8sd: null, case8sb: null,
};

/** CRDS sur tous les revenus d'activité et de remplacement (ord. 96-50). */
export const TAUX_CRDS = 0.005;
/** CASA sur les pensions et préretraites soumises à la CSG au taux de 8,3 % ou 6,6 % (art. L14-10-4 CASF). */
export const TAUX_CASA = 0.003;

const montant = (v: number | null) => Math.max(0, v ?? 0);
const somme = (...v: (number | null)[]) => v.reduce<number>((s, x) => s + montant(x), 0);

export interface PrelevementSourceDiversResult {
  /** 8TI + 8TK : ajoutés au revenu retenu pour le taux effectif (8TK comme 1AF). */
  revenuTauxEffectif: number;
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
 * 8UT, 8TT, 8UU, 8VF, 8SH/8SI (seuls les montants 8RF…8RM ont un effet).
 * Contributions 8TQ…8SB : montants saisis tels que déclarés, sans abattement
 * pour frais professionnels de 1,75 % (hypothèse à confronter au simulateur).
 */
export function calculerPrelevementSourceDivers(input: PrelevementSourceDiversInput): PrelevementSourceDiversResult {
  return {
    revenuTauxEffectif: montant(input.case8ti) + montant(input.case8tk),
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

/**
 * Crédit égal à l'impôt étranger (8PL/8VL, 8PM/8VM…8UM), non restituable :
 * pour chaque catégorie, le moindre de l'impôt payé à l'étranger et de
 * l'impôt français correspondant, approché par `impotFrancais` (impôt après
 * décote, impôt forfaitaire et réductions) × revenus étrangers / revenu
 * imposable. Les revenus restent déclarés dans leur catégorie.
 */
export function creditImpotEgalImpotEtranger(
  input: PrelevementSourceDiversInput,
  impotFrancais: number,
  revenuImposable: number,
): number {
  if (impotFrancais <= 0 || revenuImposable <= 0) return 0;
  const impotCorrespondant = (revenu: number) => impotFrancais * Math.min(1, revenu / revenuImposable);
  const credit = Math.min(montant(input.case8vl), impotCorrespondant(montant(input.case8pl)))
    + Math.min(somme(input.case8vm, input.case8wm, input.case8um), impotCorrespondant(montant(input.case8pm)));
  return Math.round(Math.min(credit, impotFrancais));
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
