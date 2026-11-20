import { TAUX_PS_CAPITAUX_MOBILIERS } from './calculerPrelevementsSociauxCapitauxMobiliers';
import { RevenusNonSalariesInput } from './types';
import { PARAMETRES_PAR_DEFAUT, type ParametresFiscaux } from './parametres';

const SEUILS_PAR_DEFAUT = PARAMETRES_PAR_DEFAUT.nonSalaries;

/** Abattement minimal des régimes micro, par activité (art. 50-0 et 102 ter CGI). */
const ABATTEMENT_MINIMUM = 305;

/** Seuils des régimes micro du millésime par défaut (valeurs : `parametres.nonSalaries`). */
export const SEUIL_MICRO_VENTES = SEUILS_PAR_DEFAUT.seuilMicroVentes;
export const SEUIL_MICRO_SERVICES = SEUILS_PAR_DEFAUT.seuilMicroServices;
export const SEUIL_MICRO_MEUBLES = SEUILS_PAR_DEFAUT.seuilMicroMeubles;
export const SEUIL_MICRO_MEUBLES_NON_CLASSES = SEUILS_PAR_DEFAUT.seuilMicroMeublesNonClasses;

/**
 * Prélèvements sociaux sur les revenus des locations meublées non professionnelles
 * et sur 5HY/5IY : revenus du patrimoine, 18,6 % pour les revenus 2025 (LFSS 2026),
 * même taux que les capitaux mobiliers.
 */
export const TAUX_PS_NON_SALARIES = TAUX_PS_CAPITAUX_MOBILIERS;

/** Seuil du micro-BA (moyenne des recettes HT des trois dernières années), apprécié ici sur l'année. */
export const SEUIL_MICRO_BA = SEUILS_PAR_DEFAUT.seuilMicroBA;
/**
 * Déficit agricole imputable sur le revenu global seulement si les revenus nets
 * d'autres sources du foyer n'excèdent pas ce montant (art. 156 I 1° CGI,
 * brochure IR 2026 p. 165) ; sinon reportable sur les BA des six années suivantes.
 */
export const SEUIL_DEFICIT_AGRICOLE = SEUILS_PAR_DEFAUT.seuilDeficitAgricole;
/** Plafond annuel de l'abattement jeunes créateurs (art. 93-9 CGI, brochure p. 178). */
export const PLAFOND_ABATTEMENT_JEUNES_CREATEURS = 50_000;
/**
 * Locations meublées soumises aux cotisations sociales (CSS art. L. 611-1, brochure p. 173) :
 * courte durée au-delà de 23 000 € de recettes, chambres d'hôtes au-delà de 6 123 € de revenu imposable.
 */
export const SEUIL_COTISATIONS_MEUBLES_COURTE_DUREE = 23_000;
export const SEUIL_COTISATIONS_CHAMBRES_HOTES = SEUILS_PAR_DEFAUT.seuilCotisationsChambresHotes;

/** Abattement du micro-BA (art. 64 bis CGI), minimum 305 €. */
const ABATTEMENT_MICRO_BA = 0.87;
/** Plus-values professionnelles à long terme : 12,8 % (art. 39 quindecies CGI), PS en sus. */
const TAUX_PLUS_VALUES_LONG_TERME = 0.128;
/** Produits de la cession ou concession de brevets : 10 % (art. 238 CGI), sans PS. */
export const TAUX_BREVETS = 0.10;

/**
 * Taxe sur l'indemnité de cessation des agents généraux d'assurances (art. 151 septies A V
 * et 719 CGI, brochure IR 2026 p. 179) : barème des cessions de fonds de commerce, par personne.
 */
const TRANCHES_TAXE_AGENTS_GENERAUX = [
  { seuil: 23_000, taux: 0 },
  { seuil: 107_000, taux: 0.02 },
  { seuil: 200_000, taux: 0.006 },
  { seuil: Infinity, taux: 0.026 },
] as const;

/** Taxe due sur une indemnité brute, tranche par tranche. */
export function taxeAgentGeneral(indemnite: number): number {
  let taxe = 0;
  let seuilPrecedent = 0;
  for (const tranche of TRANCHES_TAXE_AGENTS_GENERAUX) {
    if (indemnite <= seuilPrecedent) break;
    taxe += (Math.min(indemnite, tranche.seuil) - seuilPrecedent) * tranche.taux;
    seuilPrecedent = tranche.seuil;
  }
  return Math.round(taxe);
}

/** Cadre 5 : revenus de source étrangère ouvrant droit au crédit d'impôt égal à l'impôt français. */
export const CASES_CREDIT_IMPOT_FRANCAIS_CADRE_5 = ['case5ak', 'case5bk', 'case5df', 'case5ef', 'case5ur', 'case5vr',
  'case5ey', 'case5fy', 'case5xj', 'case5yj', 'case5xs', 'case5ys',
  // Personnes à charge (simulateur officiel 2026 et 2027 : même crédit que la jumelle déclarant).
  'case5ck', 'case5ff', 'case5wr', 'case5gy', 'case5zj', 'case5zs'] as const;

export const REVENUS_NON_SALARIES_VIDE: RevenusNonSalariesInput = {
  case5ta: null, case5ua: null, case5tb: null, case5ub: null, case5te: null, case5ue: null, case5ko: null, case5lo: null,
  case5kp: null, case5lp: null, case5no: null, case5oo: null, case5np: null, case5op: null, case5ng: null, case5og: null,
  case5nh: null, case5oh: null, case5ni: null, case5oi: null, case5nj: null, case5oj: null, case5nk: null, case5ok: null,
  case5nl: null, case5ol: null, case5hq: null, case5iq: null, case5ku: null, case5lu: null, case5hy: null, case5iy: null,
  case5xb: null, case5yb: null, case5xa: null, case5ya: null, case5hw: null, case5iw: null, case5xo: null, case5yo: null,
  case5hx: null, case5ix: null, case5xn: null, case5yn: null, case5hb: null, case5ib: null, case5hc: null, case5ic: null,
  case5ak: null, case5bk: null, case5ha: null, case5ia: null, case5hf: null, case5if: null, case5he: null, case5ie: null,
  case5kn: null, case5ln: null, case5kx: null, case5lx: null, case5kj: null, case5lj: null, case5kq: null, case5lq: null,
  case5kr: null, case5lr: null, case5kb: null, case5lb: null, case5kc: null, case5lc: null, case5df: null, case5ef: null,
  case5ui: null, case5vi: null, case5kf: null, case5lf: null, case5ke: null, case5le: null, case5nn: null, case5on: null,
  case5nx: null, case5ox: null, case5iu: null, case5rz: null, case5nq: null, case5oq: null, case5nr: null, case5or: null,
  case5nb: null, case5ob: null, case5nc: null, case5oc: null, case5ur: null, case5vr: null, case5nf: null, case5of: null,
  case5ne: null, case5oe: null, case5na: null, case5oa: null, case5ey: null, case5fy: null, case5nm: null, case5om: null,
  case5ny: null, case5oy: null, case5we: null, case5xe: null, case5hp: null, case5ip: null, case5hv: null, case5iv: null,
  case5kz: null, case5lz: null, case5hr: null, case5ir: null, case5hs: null, case5is: null, case5qb: null, case5rb: null,
  case5qc: null, case5rc: null, case5xj: null, case5yj: null, case5qa: null, case5ra: null, case5qe: null, case5re: null,
  case5qd: null, case5rd: null, case5th: null, case5uh: null, case5ky: null, case5ly: null, case5ju: null, case5ld: null,
  case5kv: null, case5lv: null, case5kw: null, case5lw: null, case5hk: null, case5jk: null, case5jg: null, case5rf: null,
  case5xs: null, case5ys: null, case5jj: null, case5rg: null, case5so: null, case5nt: null, case5qf: null, case5qg: null,
  case5qn: null, case5qo: null, case5qp: null, case5qq: null, case5rn: null, case5ro: null, case5rp: null, case5rq: null,
  case5rr: null, case5rw: null, case5ga: null, case5gb: null, case5gc: null, case5gd: null, case5ge: null, case5gf: null,
  case5gg: null, case5gh: null, case5gi: null, case5gj: null, case5ht: null, case5it: null, case5jt: null, case5kt: null,
  case5lt: null, case5mt: null, case5hg: null, case5ig: null, case5qj: null, case5rj: null, case5tc: null, case5uc: null,
  case5xt: null, case5xu: null, case5hd: null, case5id: null, case5tf: null, case5uf: null, case5ql: null, case5rl: null,
  case5sv: null, case5sw: null, case5qm: null, case5rm: null,
};

type Cle = keyof RevenusNonSalariesInput;

/**
 * Colonnes « personnes à charge » du cadre 5 et leur jumelle déclarant 1 (ordre des champs du simulateur
 * officiel 2026) : chaque case PAC rejoint les mêmes agrégats que sa jumelle — 63 paires vérifiées à
 * l'identique (RNI, RFR, impôt et PS), 5JY avec un bénéfice agricole PAC (= 5HG) ; 11 paires ajoutées en
 * novembre 2026 (crédit 8TK 5CK…5ZS, moins-values 5SZ/5MD, déficits 5PF/5PY/5SG/5YE), vérifiées sur les
 * simulateurs officiels 2026 et 2027.
 */
export const JUMELLES_PAC_CADRE_5: Record<string, string> = {
  case5ja: 'case5ha',
  case5jb: 'case5hb',
  case5jc: 'case5hc',
  case5jd: 'case5hd',
  case5je: 'case5he',
  case5jf: 'case5hf',
  case5jp: 'case5hp',
  case5jq: 'case5hq',
  case5jr: 'case5hr',
  case5jv: 'case5hv',
  case5jw: 'case5hw',
  case5jx: 'case5hx',
  case5jy: 'case5hg',
  case5lk: 'case5hk',
  case5mb: 'case5kb',
  case5mc: 'case5kc',
  case5me: 'case5ke',
  case5mf: 'case5kf',
  case5mj: 'case5kj',
  case5mn: 'case5kn',
  case5mo: 'case5ko',
  case5mp: 'case5kp',
  case5mq: 'case5kq',
  case5mu: 'case5ku',
  case5mv: 'case5kv',
  case5mx: 'case5kx',
  case5my: 'case5ky',
  case5mz: 'case5kz',
  case5ot: 'case5so',
  case5pa: 'case5na',
  case5pb: 'case5nb',
  case5pc: 'case5nc',
  case5pe: 'case5ne',
  case5pg: 'case5ng',
  case5ph: 'case5nh',
  case5pi: 'case5ni',
  case5pj: 'case5nj',
  case5pk: 'case5nk',
  case5pl: 'case5nl',
  case5pm: 'case5nm',
  case5pn: 'case5nn',
  case5po: 'case5no',
  case5pp: 'case5np',
  case5pq: 'case5nq',
  case5px: 'case5nx',
  case5sa: 'case5qa',
  case5sb: 'case5qb',
  case5sc: 'case5qc',
  case5sd: 'case5qd',
  case5se: 'case5qe',
  case5sf: 'case5jg',
  case5sj: 'case5qj',
  case5sl: 'case5ql',
  case5sx: 'case5sv',
  case5va: 'case5ta',
  case5vb: 'case5tb',
  case5vc: 'case5tc',
  case5ve: 'case5te',
  case5vf: 'case5tf',
  case5vh: 'case5th',
  case5wi: 'case5ui',
  case5za: 'case5xa',
  case5zb: 'case5xb',
  case5zo: 'case5xo',
  case5ck: 'case5ak',
  case5ff: 'case5df',
  case5wr: 'case5ur',
  case5gy: 'case5ey',
  case5zj: 'case5xj',
  case5zs: 'case5xs',
  case5sz: 'case5iu',
  case5md: 'case5ju',
  case5pf: 'case5nf',
  case5py: 'case5ny',
  case5sg: 'case5jj',
  case5ye: 'case5we',
  case5mm: 'case5km',
};
type Imposition = 'bareme' | 'versement_liberatoire';

interface Categorie {
  cles: Cle[];
  taux: number;
  imposition: Imposition;
}

const CATEGORIES: Categorie[] = [
  // Micro-entrepreneur ayant opté pour le versement libératoire
  { cles: ['case5ta', 'case5va', 'case5ua'], taux: 0.71, imposition: 'versement_liberatoire' },
  { cles: ['case5tb', 'case5vb', 'case5ub'], taux: 0.50, imposition: 'versement_liberatoire' },
  { cles: ['case5te', 'case5ve', 'case5ue'], taux: 0.34, imposition: 'versement_liberatoire' },
  // Micro-BIC professionnel et non professionnel
  { cles: ['case5ko', 'case5mo', 'case5lo'], taux: 0.71, imposition: 'bareme' },
  { cles: ['case5kp', 'case5mp', 'case5lp'], taux: 0.50, imposition: 'bareme' },
  // Locations meublées professionnelles (déclaration 2027) : abattement propre de 50 % (simulateur calc-2027).
  { cles: ['case5km', 'case5mm', 'case5lm'], taux: 0.50, imposition: 'bareme' },
  { cles: ['case5no', 'case5po', 'case5oo'], taux: 0.71, imposition: 'bareme' },
  { cles: ['case5np', 'case5pp', 'case5op'], taux: 0.50, imposition: 'bareme' },
  // Locations meublées non professionnelles
  { cles: ['case5ng', 'case5pg', 'case5og'], taux: 0.50, imposition: 'bareme' },
  { cles: ['case5nh', 'case5ph', 'case5oh'], taux: 0.30, imposition: 'bareme' },
  { cles: ['case5ni', 'case5pi', 'case5oi'], taux: 0.50, imposition: 'bareme' },
  { cles: ['case5nj', 'case5pj', 'case5oj'], taux: 0.50, imposition: 'bareme' },
  { cles: ['case5nk', 'case5pk', 'case5ok'], taux: 0.30, imposition: 'bareme' },
  { cles: ['case5nl', 'case5pl', 'case5ol'], taux: 0.50, imposition: 'bareme' },
  // Micro-BNC professionnel et non professionnel
  { cles: ['case5hq', 'case5jq', 'case5iq'], taux: 0.34, imposition: 'bareme' },
  { cles: ['case5ku', 'case5mu', 'case5lu'], taux: 0.34, imposition: 'bareme' },
];

/** Revenu net après abattement forfaitaire, avec le minimum de 305 €. */
export function netMicro(recettes: number, taux: number): number {
  if (recettes <= 0) return 0;
  return Math.max(0, Math.round(recettes - Math.max(ABATTEMENT_MINIMUM, recettes * taux)));
}

export type AlerteRevenusNonSalaries =
  | 'ventes_au_dela_du_seuil'
  | 'services_au_dela_du_seuil'
  | 'bnc_au_dela_du_seuil'
  | 'jeunes_createurs_au_dela_du_plafond'
  | 'meubles_cotisations_a_verifier'
  | 'meubles_au_dela_du_seuil'
  | 'meubles_non_classes_au_dela_du_seuil'
  | 'ba_micro_au_dela_du_seuil';

export interface RevenusNonSalariesResult {
  /**
   * Revenus nets imposés au barème, déclarants 1 et 2 : micro et réel, plus-values
   * à court terme. Peut être négatif (déficits BIC/BNC professionnels, imputables
   * sur le revenu global). Hors déficit agricole : voir `deficitAgricole`.
   */
  totalNetImposable: number;
  /**
   * Déficits agricoles de l'année (5HF/5IF), à retrancher du revenu global par
   * `useFiscalOverview.ts` seulement si les autres revenus nets du foyer
   * n'excèdent pas le seuil du millésime (`parametres.nonSalaries.seuilDeficitAgricole`).
   */
  deficitAgricole: number;
  /** Plus-values professionnelles à long terme (12,8 %) et brevets (10 %), ajoutés après la décote. */
  impotForfaitaire: number;
  /**
   * Excédent du bénéfice agricole sur la moyenne triennale l'année de la cession (5XT/5XU,
   * art. 75-0 B CGI) : hors barème, imposé au taux marginal du revenu global par `calculerImpot`.
   */
  /** Produits de brevets imposés à 10 % (art. 238), retirés du revenu de référence et de l'impôt retenus par la CDHR. */
  produitsBrevets: number;
  revenuImposableTauxMarginal: number;
  /** Taxe sur les indemnités des agents généraux (5QM/5RM) : due en sus de l'IR, hors réductions d'impôt. */
  taxeAgentsGeneraux: number;
  /** Revenus de source étrangère avec crédit d'impôt égal à l'impôt français, retenus pour le taux effectif (comme 1AF). */
  revenuCreditImpotEgalImpotFrancais: number;
  /** RFR hors barème : plus-values à long terme (y compris exonérées départ à la retraite), brevets, revenus exonérés zonés, excédent au taux marginal, abattements jeunes créateurs. */
  revenuExonereRetenuPourRFR: number;
  /**
   * Revenus nets des micro-entrepreneurs au versement libératoire (5TA/5TB/5TE) :
   * l'impôt est déjà payé, mais ces revenus sont retenus pour le taux effectif
   * (art. 197 C CGI) et donc pour le RFR.
   */
  revenuExonereTauxEffectif: number;
  /** Base à 18,6 % : LMNP non soumises aux cotisations (micro et réel, nettes des déficits), plus-values à long terme, inventeurs 5QJ/5RJ, 5HY/5IY, 5HG/5IG. */
  basePrelevementsSociaux: number;
  prelevementsSociaux: number;
  alertes: AlerteRevenusNonSalaries[];
}

const somme = (input: RevenusNonSalariesInput, cles: Cle[]) => cles.reduce((s, c) => s + (input[c] ?? 0), 0);

/**
 * Régimes micro de la 2042-C-PRO (revenus 2025/impôt 2026). Recettes brutes
 * saisies, abattement forfaitaire appliqué ici : 71 % ventes, 50 % services et
 * meublés (classés ou à l'année), 30 % meublés de tourisme non classés, 34 %
 * BNC — minimum 305 € par activité et par déclarant.
 *
 * PS : les revenus professionnels et les LMNP soumises aux cotisations
 * (5NJ/5NK/5NL) supportent des cotisations sociales, pas de PS sur la 2042 ;
 * les autres revenus non professionnels non soumis aux cotisations ne sont
 * soumis aux PS que via 5HY/5IY (brochure p. 182 : la DGFiP ne les calcule
 * pas d'office, contrairement aux LMNP 5NG/5NH/5NI).
 *
 * Seuils : signalés, jamais bloquants. Appréciés par déclarant et par catégorie :
 * BIC, chiffre d'affaires global (ventes + services) ≤ 188 700 € et services ≤ 77 700 € ;
 * BNC ≤ 77 700 € séparément ; meublés au niveau du foyer.
 *
 * **Phase 5.2.** Réel : bénéfice ou déficit saisi tel que calculé par la
 * comptabilité ; les cases « dont plus-values / moins-values à court terme » du
 * réel sont déjà comprises dans le bénéfice et ne sont pas saisies. Déficits et
 * moins-values à court terme professionnels sur le revenu global ; non
 * professionnels (BIC, BNC) sur la même catégorie, déficits antérieurs compris,
 * plancher 0 ; LMNP sur les seuls revenus LMNP ; BA, voir `deficitAgricole`.
 * Plus-values à long terme (micro et réel) à 12,8 %, PS à 18,6 % calculés
 * d'office (brochure p. 182) ; brevets à 10 % sans PS ; moins-values à long
 * terme reportables, sans effet. Revenus exonérés zonés et taxations
 * proportionnelles retenus au RFR.
 *
 * **Lot 1 (brochure p. 164-182).** Forfait forestier 5HD/5ID ajouté au BA, sans
 * PS (hypothèse validée : bénéfice agricole). Inventeurs non professionnels à
 * 10 % : 5QJ/5RJ avec PS, 5TC/5UC sans PS. Plus-values exonérées départ à la
 * retraite 5HG/5IG : PS seuls, retenues au RFR. Excédent de moyenne triennale
 * 5XT/5XU : hors barème, imposé au taux marginal par `calculerImpot`, retenu au RFR.
 *
 * **Lot 2.** Brevets BIC non professionnels 5TF/5UF à 10 %. Abattements jeunes
 * créateurs 5QL/5RL et 5SV/5SW (déjà déduits du bénéfice déclaré) : RFR seul.
 * Indemnités des agents généraux 5QM/5RM : taxe par personne (art. 719), hors IR.
 */
export function calculerRevenusNonSalaries(
  input: RevenusNonSalariesInput,
  parametres: ParametresFiscaux = PARAMETRES_PAR_DEFAUT,
): RevenusNonSalariesResult {
  const seuils = parametres.nonSalaries;
  const v = (c: Cle) => input[c] ?? 0;
  let revenuExonereTauxEffectif = 0;
  const netParCle = new Map<Cle, number>();

  for (const cat of CATEGORIES) {
    for (const cle of cat.cles) {
      const net = netMicro(v(cle), cat.taux);
      netParCle.set(cle, net);
      if (cat.imposition === 'versement_liberatoire') revenuExonereTauxEffectif += net;
    }
  }
  const micro = (cles: Cle[]) => cles.reduce((t, c) => t + (netParCle.get(c) ?? 0), 0);

  // Professionnels : déficits et moins-values à court terme imputables sur le revenu global.
  const bicPro = micro(['case5ko', 'case5mo', 'case5lo', 'case5kp', 'case5mp', 'case5lp', 'case5km', 'case5mm', 'case5lm'])
    + somme(input, ['case5kx', 'case5mx', 'case5lx', 'case5kc', 'case5mc', 'case5lc'])
    - somme(input, ['case5kj', 'case5mj', 'case5lj', 'case5kf', 'case5mf', 'case5lf']);
  const bncPro = micro(['case5hq', 'case5jq', 'case5iq'])
    + somme(input, ['case5hv', 'case5jv', 'case5iv', 'case5qc', 'case5sc', 'case5rc'])
    - somme(input, ['case5kz', 'case5mz', 'case5lz', 'case5qe', 'case5se', 'case5re']);

  // Non professionnels : déficits imputables seulement sur la même catégorie (plancher 0).
  const bicNonPro = Math.max(0, micro(['case5no', 'case5po', 'case5oo', 'case5np', 'case5pp', 'case5op'])
    + somme(input, ['case5nx', 'case5px', 'case5ox', 'case5nc', 'case5pc', 'case5oc'])
    - somme(input, ['case5iu', 'case5rz', 'case5sz', 'case5nf', 'case5of', 'case5pf', 'case5rn', 'case5ro', 'case5rp', 'case5rq', 'case5rr', 'case5rw']));
  const bncNonPro = Math.max(0, micro(['case5ku', 'case5mu', 'case5lu'])
    + somme(input, ['case5ky', 'case5my', 'case5ly', 'case5jg', 'case5sf', 'case5rf'])
    - somme(input, ['case5ju', 'case5ld', 'case5md', 'case5jj', 'case5rg', 'case5sg', 'case5ht', 'case5it', 'case5jt', 'case5kt', 'case5lt', 'case5mt']));

  // LMNP : déficits imputables sur les seuls revenus LMNP (10 ans).
  const lmnpSansCotisations = micro(['case5ng', 'case5pg', 'case5og', 'case5nh', 'case5ph', 'case5oh', 'case5ni', 'case5pi', 'case5oi'])
    + somme(input, ['case5na', 'case5pa', 'case5oa']);
  const lmnpCotisations = micro(['case5nj', 'case5pj', 'case5oj', 'case5nk', 'case5pk', 'case5ok', 'case5nl', 'case5pl', 'case5ol'])
    + somme(input, ['case5nm', 'case5pm', 'case5om']);
  const deficitsLmnp = somme(input, ['case5ny', 'case5oy', 'case5py', 'case5ga', 'case5gb', 'case5gc', 'case5gd', 'case5ge', 'case5gf', 'case5gg', 'case5gh', 'case5gi', 'case5gj']);
  const lmnpSansCotisationsNet = Math.max(0, lmnpSansCotisations - deficitsLmnp);
  const lmnp = Math.max(0, lmnpSansCotisations + lmnpCotisations - deficitsLmnp - somme(input, ['case5we', 'case5xe', 'case5ye']));

  // Micro-BA : abattement sur la moyenne des recettes de l'année et des années précédentes saisies (N-1
  // obligatoire, N-2 seulement avec N-1), simulateur officiel 2026 et 2027 : 5XB 40 000 + 5XM 70 000 →
  // moyenne 55 000 ; + 5YM 100 000 → 70 000 ; 5YM sans 5XM ignorée.
  const recettesMicroBA = (n: Cle, n1: Cle, n2: Cle) => {
    if (v(n) <= 0 || v(n1) <= 0) return v(n);
    return v(n2) > 0 ? (v(n) + v(n1) + v(n2)) / 3 : (v(n) + v(n1)) / 2;
  };
  const recettesBA = [recettesMicroBA('case5xb', 'case5xm', 'case5ym'), recettesMicroBA('case5yb', 'case5yt', 'case5yu'),
    recettesMicroBA('case5zb', 'case5zt', 'case5zu')];
  // Bénéfices agricoles : déficits antérieurs sur les seuls BA ; déficit de l'année traité par l'appelant.
  const baBenefice = recettesBA.reduce((t, r) => t + netMicro(r, ABATTEMENT_MICRO_BA), 0)
    + somme(input, ['case5hw', 'case5jw', 'case5iw', 'case5hc', 'case5jc', 'case5ic', 'case5hd', 'case5jd', 'case5id'])
    - somme(input, ['case5xo', 'case5zo', 'case5yo']);
  // Les moins-values à court terme du micro-BA (5XO/5YO) s'imputent sur le revenu global : un BA négatif est conservé.
  const ba = baBenefice > 0
    ? Math.max(0, baBenefice - somme(input, ['case5qf', 'case5qg', 'case5qn', 'case5qo', 'case5qp', 'case5qq']))
    : baBenefice;

  const plusValuesLongTerme = somme(input, ['case5hx', 'case5jx', 'case5ix', 'case5he', 'case5je', 'case5ie', 'case5kq', 'case5mq', 'case5lq', 'case5ke', 'case5me', 'case5le',
    'case5nq', 'case5pq', 'case5oq', 'case5ne', 'case5pe', 'case5oe', 'case5hr', 'case5jr', 'case5ir', 'case5qd', 'case5sd', 'case5rd', 'case5kv', 'case5mv', 'case5lv', 'case5so', 'case5ot', 'case5nt']);
  const inventeursAvecPS = somme(input, ['case5qj', 'case5sj', 'case5rj']);
  const brevets = somme(input, ['case5ha', 'case5ja', 'case5ia', 'case5ui', 'case5wi', 'case5vi', 'case5qa', 'case5sa', 'case5ra', 'case5tc', 'case5vc', 'case5uc', 'case5tf', 'case5vf', 'case5uf'])
    + inventeursAvecPS;
  const plusValuesRetraite = somme(input, ['case5hg', 'case5jy', 'case5ig']);
  const revenuImposableTauxMarginal = somme(input, ['case5xt', 'case5xu']);
  const exoneresZones = somme(input, ['case5xa', 'case5za', 'case5ya', 'case5hb', 'case5jb', 'case5ib', 'case5kn', 'case5mn', 'case5ln', 'case5kb', 'case5mb', 'case5lb',
    'case5nn', 'case5pn', 'case5on', 'case5nb', 'case5pb', 'case5ob', 'case5hp', 'case5jp', 'case5ip', 'case5qb', 'case5sb', 'case5rb', 'case5th', 'case5vh', 'case5uh', 'case5hk', 'case5lk', 'case5jk']);

  const basePrelevementsSociaux = lmnpSansCotisationsNet + plusValuesLongTerme + inventeursAvecPS + plusValuesRetraite
    + somme(input, ['case5hy', 'case5iy']);

  const alertes: AlerteRevenusNonSalaries[] = [];
  const parDeclarant = (cles: Cle[][]) => cles.map(c => somme(input, c));
  const ventes = parDeclarant([['case5ta', 'case5ko', 'case5no'], ['case5ua', 'case5lo', 'case5oo'], ['case5va', 'case5mo', 'case5po']]);
  const services = parDeclarant([['case5tb', 'case5kp', 'case5km', 'case5np'], ['case5ub', 'case5lp', 'case5lm', 'case5op'], ['case5vb', 'case5mp', 'case5mm', 'case5pp']]);
  const bnc = parDeclarant([['case5te', 'case5hq', 'case5ku'], ['case5ue', 'case5iq', 'case5lu'], ['case5ve', 'case5jq', 'case5mu']]);
  if (ventes.some((x, d) => x + services[d] > seuils.seuilMicroVentes)) alertes.push('ventes_au_dela_du_seuil');
  if (services.some(x => x > seuils.seuilMicroServices)) alertes.push('services_au_dela_du_seuil');
  if (bnc.some(x => x > seuils.seuilMicroServices)) alertes.push('bnc_au_dela_du_seuil');
  if ((['case5ql', 'case5sl', 'case5rl', 'case5sv', 'case5sx', 'case5sw'] as Cle[]).some(c => v(c) > PLAFOND_ABATTEMENT_JEUNES_CREATEURS)) {
    alertes.push('jeunes_createurs_au_dela_du_plafond');
  }
  const courteDuree = parDeclarant([['case5ng', 'case5nh'], ['case5og', 'case5oh'], ['case5pg', 'case5ph']]);
  if (courteDuree.some(x => x > SEUIL_COTISATIONS_MEUBLES_COURTE_DUREE)
    || (['case5ng', 'case5pg', 'case5og'] as Cle[]).some(c => (netParCle.get(c) ?? 0) > seuils.seuilCotisationsChambresHotes)) {
    alertes.push('meubles_cotisations_a_verifier');
  }
  const meublesNonClasses = somme(input, ['case5nh', 'case5ph', 'case5oh', 'case5nk', 'case5pk', 'case5ok']);
  const meubles = meublesNonClasses + somme(input, ['case5ng', 'case5pg', 'case5og', 'case5ni', 'case5pi', 'case5oi', 'case5nj', 'case5pj', 'case5oj', 'case5nl', 'case5pl', 'case5ol']);
  if (meubles > seuils.seuilMicroMeubles) alertes.push('meubles_au_dela_du_seuil');
  if (meublesNonClasses > seuils.seuilMicroMeublesNonClasses) alertes.push('meubles_non_classes_au_dela_du_seuil');
  if (recettesBA.some(r => r > seuils.seuilMicroBA)) alertes.push('ba_micro_au_dela_du_seuil');

  return {
    totalNetImposable: bicPro + bncPro + bicNonPro + bncNonPro + lmnp + ba,
    deficitAgricole: somme(input, ['case5hf', 'case5jf', 'case5if']),
    impotForfaitaire: plusValuesLongTerme * TAUX_PLUS_VALUES_LONG_TERME + brevets * TAUX_BREVETS,
    produitsBrevets: brevets,
    revenuImposableTauxMarginal,
    taxeAgentsGeneraux: taxeAgentGeneral(v('case5qm')) + taxeAgentGeneral(v('case5rm')),
    revenuCreditImpotEgalImpotFrancais: somme(input, [...CASES_CREDIT_IMPOT_FRANCAIS_CADRE_5]),
    // 5HG/5IG (art. 151 septies A) hors RFR : absentes de l'art. 1417 IV, comme sur le simulateur officiel 2026.
    revenuExonereRetenuPourRFR: plusValuesLongTerme + brevets + exoneresZones + revenuImposableTauxMarginal
      + somme(input, ['case5ql', 'case5sl', 'case5rl', 'case5sv', 'case5sx', 'case5sw']),
    revenuExonereTauxEffectif,
    basePrelevementsSociaux,
    prelevementsSociaux: Math.round(basePrelevementsSociaux * TAUX_PS_NON_SALARIES),
    alertes,
  };
}

/**
 * Cases des régimes réels (BA, BIC pro et non pro, LMNP, BNC pro et non pro : revenus imposables ou
 * exonérés, déficits, plus-values, brevets, moyenne triennale), colonnes déclarants 1 et 2.
 */
const CASES_REGIME_REEL = [
  'case5hb', 'case5ib', 'case5hc', 'case5ic', 'case5ak', 'case5bk', 'case5ha', 'case5ia', 'case5hf', 'case5if', 'case5he', 'case5ie',
  'case5kb', 'case5lb', 'case5kc', 'case5lc', 'case5df', 'case5ef', 'case5ui', 'case5vi', 'case5kf', 'case5lf', 'case5ke', 'case5le',
  'case5nb', 'case5ob', 'case5nc', 'case5oc', 'case5ur', 'case5vr', 'case5nf', 'case5of', 'case5ne', 'case5oe',
  'case5na', 'case5oa', 'case5ey', 'case5fy', 'case5nm', 'case5om', 'case5ny', 'case5oy', 'case5we', 'case5xe',
  'case5qb', 'case5rb', 'case5qc', 'case5rc', 'case5xj', 'case5yj', 'case5qa', 'case5ra', 'case5qe', 'case5re', 'case5qd', 'case5rd',
  'case5hk', 'case5jk', 'case5jg', 'case5rf', 'case5xs', 'case5ys', 'case5jj', 'case5rg', 'case5so', 'case5nt',
  'case5xt', 'case5xu', 'case5tf', 'case5uf',
];

/**
 * Le foyer déclare-t-il un revenu professionnel au régime réel (déclarants ou personnes à charge) ?
 * Prérequis de 7US (mécénat d'entreprise) : le simulateur officiel 2026 la refuse sans revenu
 * correspondant, ou avec des revenus micro seulement.
 */
export function aRevenuProfessionnelReel(input: RevenusNonSalariesInput): boolean {
  const reel = new Set(CASES_REGIME_REEL);
  const cles = [...CASES_REGIME_REEL,
    ...Object.entries(JUMELLES_PAC_CADRE_5).filter(([, jumelle]) => reel.has(jumelle)).map(([cle]) => cle)];
  const valeurs = input as unknown as Record<string, number | null | undefined>;
  return cles.some(cle => (valeurs[cle] ?? 0) !== 0);
}
