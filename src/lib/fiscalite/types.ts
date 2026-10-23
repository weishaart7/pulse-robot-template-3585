export interface EnfantCharge {
  anneeNaissance: number;
  invalide: boolean;
  residenceAlternee: boolean;
}

export interface PersonneInvalideCharge {
  anneeNaissance: number;
}

export interface FoyerFiscalInput {
  situationFamille: 'marie' | 'pacse' | 'celibataire' | 'divorce' | 'veuf';
  lieuResidence: 'metropole' | 'guadeloupe_martinique_reunion' | 'guyane_mayotte';
  enfantsCharge: EnfantCharge[];
  personnesInvalidesCharge: PersonneInvalideCharge[];
  enfantsMajeursRattaches: number;
  parentIsole: boolean;
  ancienParentIsole: boolean;
  invaliditeDeclarant1: boolean;
  invaliditeDeclarant2: boolean;
  ancienCombattantDeclarant1: boolean;
  ancienCombattantDeclarant2: boolean;
  veufAncienCombattant: boolean;
  veuveDeGuerre: boolean;
}

export interface MajorationDetail {
  type: string;
  libelle: string;
  parts: number;
  plafondUnitaire?: number;
  plafondComplementaire?: number;
}

export interface PartsFiscalesResult {
  partsBase: number;
  majorations: MajorationDetail[];
  nombreParts: number;
}

export interface RevenusSalairesInput {
  case1aj: number | null;
  case1bj: number | null;
  case1aa: number | null;
  case1ba: number | null;
  case1ga: number | null;
  case1ha: number | null;
  case1gh: number | null;
  case1hh: number | null;
  case1pb: number | null;
  case1pc: number | null;
  case1ad: number | null;
  case1bd: number | null;
  case1av: boolean;
  case1bv: boolean;
  case1gb: number | null;
  case1hb: number | null;
  case1gk: boolean;
  case1gl: boolean;
  case1gf: number | null;
  case1hf: number | null;
  case1gg: number | null;
  case1hg: number | null;
  case1aq: number | null;
  case1bq: number | null;
  case1ap: number | null;
  case1bp: number | null;
  case1af: number | null;
  case1bf: number | null;
  case1ag: number | null;
  case1bg: number | null;
  case1ak: number | null;
  case1bk: number | null;
  case1pm: number | null;
  case1qm: number | null;
  case1dy: number | null;
  case1ey: number | null;
  case1sm: number | null;
  case1dn: number | null;
}

export interface GainsActionnariatSalarieInput {
  case1tp: number | null;
  case1up: number | null;
  case1tt: number | null;
  case1ut: number | null;
  case1tz: number | null;
  case1uz: number | null;
  case1wz: number | null;
  case1vz: number | null;
  case1nx: number | null;
  case1ox: number | null;
  case1ny: number | null;
  case1oy: number | null;
  case1ay: number | null;
  case1by: number | null;
  case1mp: number | null;
  case1mq: number | null;
  case3vd: number | null;
  case3vi: number | null;
  case3vf: number | null;
  case3vj: number | null;
  case3vk: number | null;
  case3vn: number | null;
  /** Revenus exceptionnels ou différés à imposer selon le système du quotient (art. 163-0 A CGI, montant unique, pas de colonne déclarant 2). */
  case0xx: number | null;
}

export interface PensionsRetraitesRentesInput {
  case1as: number | null;
  case1bs: number | null;
  case1at: number | null;
  case1bt: number | null;
  case1ai: number | null;
  case1bi: number | null;
  case1az: number | null;
  case1bz: number | null;
  case1ao: number | null;
  case1bo: number | null;
  case1al: number | null;
  case1bl: number | null;
  case1am: number | null;
  case1bm: number | null;
  /** Rentes viagères à titre onéreux — montant perçu par le foyer par tranche d'âge d'entrée en jouissance (pas par déclarant). */
  case1aw: number | null;
  case1bw: number | null;
  case1cw: number | null;
  case1dw: number | null;
  case1ar: number | null;
  case1br: number | null;
  case1cr: number | null;
  case1dr: number | null;
  /** "Ne perçoit plus de pensions 1AO, 1AM" (case à cocher, purement informative). */
  case1hk: boolean;
  case1hl: boolean;
}

export interface RevenusExoneresTauxEffectifInput {
  case1ac: number | null;
  case1bc: number | null;
  case1ge: boolean;
  case1he: boolean;
  case1ae: number | null;
  case1be: number | null;
  case1ah: number | null;
  case1bh: number | null;
  caseRse: string | null;
  caseRsf: string | null;
}

/**
 * Revenus de capitaux mobiliers (cadre 2 de la 2042, revenus 2025). Aucune de
 * ces cases ne porte de colonne déclarant 1/déclarant 2 sur le CERFA : chaque
 * case est un montant unique par foyer, contrairement au cadre 1 (Salaires).
 * Regroupement en 6 catégories conforme à la déclaration en ligne
 * impots.gouv.fr (distinct du regroupement thématique du CERFA papier).
 */
export interface RevenusCapitauxMobiliersInput {
  // 1. Produits des contrats d'assurance-vie et de capitalisation de 8 ans et plus
  case2dh: number | null;
  case2ch: number | null;
  case2uu: number | null;
  case2vv: number | null;
  case2ww: number | null;
  // 2. Produits des contrats d'assurance-vie et de capitalisation de moins de 8 ans
  case2xx: number | null;
  case2yy: number | null;
  case2zz: number | null;
  // 3. Revenus ouvrant droit à abattement
  case2dc: number | null;
  case2fu: number | null;
  // 4. Revenus n'ouvrant pas droit à abattement
  case2tr: number | null;
  case2tt: number | null;
  case2tq: number | null;
  case2ts: number | null;
  case2tz: number | null;
  case2go: number | null;
  case2tu: number | null;
  case2tv: number | null;
  case2tw: number | null;
  case2tx: number | null;
  case2ty: number | null;
  // 5. Autres revenus des valeurs et capitaux mobiliers
  case2cg: number | null;
  case2bh: number | null;
  case2df: number | null;
  case2dg: number | null;
  case2di: number | null;
  case2ca: number | null;
  case2ab: number | null;
  case2ck: number | null;
  case2ee: number | null;
  case2aa: number | null;
  case2al: number | null;
  case2am: number | null;
  case2an: number | null;
  case2aq: number | null;
  case2ar: number | null;
  // 6. Gains de cession des bons et contrats de capitalisation et d'assurance-vie
  case2vm: number | null;
  case2vn: number | null;
  case2vo: number | null;
  case2vp: number | null;
  case2vq: number | null;
  case2vr: number | null;
  case2vs: number | null;
  case2vt: number | null;
  case2vu: number | null;
  /** Hors catégorie : option pour l'imposition au barème (case à cocher, en pied de cadre). */
  case2op: boolean;
}

/**
 * Cadre 3 de la 2042-C « Plus-values et gains divers » (phase 3.1) — un montant
 * par foyer, sans colonne déclarant. Gains d'actionnariat 3VD/3VI/3VF/3VJ/3VK/3VN
 * hors de ce type (voir GainsActionnariatSalarieInput).
 */
export interface PlusValuesGainsDiversInput {
  // Gains de cession de valeurs mobilières et assimilés
  case3vg: number | null;
  case3sg: number | null;
  case3vh: number | null;
  case3ua: number | null;
  case3sl: number | null;
  case3va: number | null;
  case3vt: number | null;
  case3pi: number | null;
  case3sb: number | null;
  case3we: number | null;
  // Actifs numériques
  case3an: number | null;
  case3bn: number | null;
  case3cn: boolean;
  // Plus-values immobilières (RFR seulement)
  case3vz: number | null;
  case3vw: number | null;
  // BSPCE (phase 3.2)
  case3sj: number | null;
  case3tj: number | null;
  case3tk: number | null;
  case3sk: number | null;
  case3tl: number | null;
  case3tm: number | null;
  case3pc: number | null;
  case3pe: number | null;
  // Autres régimes (phase 3.2)
  case3vq: number | null;
  case3vr: number | null;
  case3vc: number | null;
  case3ex: number | null;
}

/**
 * Cases foncières saisies dans la 2042 (cadre 4 de la 2042 et de la 2042-C,
 * phase 4.1). Le régime réel 4BA à 4BD vient de la 2044 (calculerDeclaration2044.ts).
 */
export interface RevenusFonciers2042Input {
  case4be: number | null;
  case4bk: number | null;
  case4bl: number | null;
  case4bn: boolean;
  case4bz: boolean;
  case4by: number | null;
  case4ea: number | null;
  case4eb: number | null;
}

/**
 * Revenus des professions non salariées, régimes micro (2042-C-PRO, phase 5.1) —
 * recettes brutes, déclarants 1 et 2 (colonne personne à charge hors périmètre).
 */
export interface RevenusNonSalariesInput {
  /** micro-entrepreneur VFL : ventes, chiffre d'affaires brut */
  case5ta: number | null;
  case5ua: number | null;
  /** micro-entrepreneur VFL : prestations de services et locations meublées */
  case5tb: number | null;
  case5ub: number | null;
  /** micro-entrepreneur VFL : revenus non commerciaux, recettes brutes */
  case5te: number | null;
  case5ue: number | null;
  /** micro-BIC professionnel : ventes de marchandises et assimilées */
  case5ko: number | null;
  case5lo: number | null;
  /** micro-BIC professionnel : prestations de services et locations meublées */
  case5kp: number | null;
  case5lp: number | null;
  /** micro-BIC non professionnel : ventes de marchandises et assimilées */
  case5no: number | null;
  case5oo: number | null;
  /** micro-BIC non professionnel : prestations de services */
  case5np: number | null;
  case5op: number | null;
  /** LMNP micro-BIC : chambres d'hôtes et meublés de tourisme classés */
  case5ng: number | null;
  case5og: number | null;
  /** LMNP micro-BIC : meublés de tourisme non classés */
  case5nh: number | null;
  case5oh: number | null;
  /** LMNP micro-BIC : autres locations meublées */
  case5ni: number | null;
  case5oi: number | null;
  /** LMNP soumises aux cotisations sociales : chambres d'hôtes et meublés de tourisme classés */
  case5nj: number | null;
  case5oj: number | null;
  /** LMNP soumises aux cotisations sociales : meublés de tourisme non classés */
  case5nk: number | null;
  case5ok: number | null;
  /** LMNP soumises aux cotisations sociales : autres locations meublées */
  case5nl: number | null;
  case5ol: number | null;
  /** micro-BNC professionnel : recettes brutes */
  case5hq: number | null;
  case5iq: number | null;
  /** micro-BNC non professionnel : recettes brutes */
  case5ku: number | null;
  case5lu: number | null;
  /** BA, BIC, BNC à imposer aux prélèvements sociaux : revenus nets */
  case5hy: number | null;
  case5iy: number | null;
  // Phase 5.2 : régimes réels, LMNP au réel, bénéfices agricoles, plus-values professionnelles
  /** BA micro : recettes brutes (abattement 87 %) */
  case5xb: number | null;
  case5yb: number | null;
  /** BA micro : revenus nets exonérés (régimes zonés) */
  case5xa: number | null;
  case5ya: number | null;
  /** BA micro : plus-values nettes à court terme */
  case5hw: number | null;
  case5iw: number | null;
  /** BA micro : moins-values nettes à court terme */
  case5xo: number | null;
  case5yo: number | null;
  /** BA micro : plus-values nettes à long terme */
  case5hx: number | null;
  case5ix: number | null;
  /** BA micro : moins-values nettes à long terme */
  case5xn: number | null;
  case5yn: number | null;
  /** BA réel : revenus exonérés (régimes zonés) */
  case5hb: number | null;
  case5ib: number | null;
  /** BA réel : revenus imposables */
  case5hc: number | null;
  case5ic: number | null;
  /** BA réel : revenus de source étrangère avec crédit d'impôt égal à l'impôt français */
  case5ak: number | null;
  case5bk: number | null;
  /** BA réel : produits de brevets taxables à 10 % */
  case5ha: number | null;
  case5ia: number | null;
  /** BA réel : déficits */
  case5hf: number | null;
  case5if: number | null;
  /** BA réel : plus-values nettes à long terme */
  case5he: number | null;
  case5ie: number | null;
  /** BIC pro micro : revenus nets exonérés (régimes zonés) */
  case5kn: number | null;
  case5ln: number | null;
  /** BIC pro micro : plus-values nettes à court terme */
  case5kx: number | null;
  case5lx: number | null;
  /** BIC pro micro : moins-values nettes à court terme */
  case5kj: number | null;
  case5lj: number | null;
  /** BIC pro micro : plus-values nettes à long terme */
  case5kq: number | null;
  case5lq: number | null;
  /** BIC pro micro : moins-values nettes à long terme */
  case5kr: number | null;
  case5lr: number | null;
  /** BIC pro réel : revenus exonérés (régimes zonés) */
  case5kb: number | null;
  case5lb: number | null;
  /** BIC pro réel : revenus imposables */
  case5kc: number | null;
  case5lc: number | null;
  /** BIC pro réel : revenus de source étrangère avec crédit d'impôt égal à l'impôt français */
  case5df: number | null;
  case5ef: number | null;
  /** BIC pro réel : produits de brevets taxables à 10 % */
  case5ui: number | null;
  case5vi: number | null;
  /** BIC pro réel : déficits */
  case5kf: number | null;
  case5lf: number | null;
  /** BIC pro réel : plus-values nettes à long terme */
  case5ke: number | null;
  case5le: number | null;
  /** BIC non pro micro : revenus nets exonérés (régimes zonés) */
  case5nn: number | null;
  case5on: number | null;
  /** BIC non pro micro : plus-values nettes à court terme */
  case5nx: number | null;
  case5ox: number | null;
  /** BIC non pro micro : moins-values nettes à court terme */
  case5iu: number | null;
  case5rz: number | null;
  /** BIC non pro micro : plus-values nettes à long terme */
  case5nq: number | null;
  case5oq: number | null;
  /** BIC non pro micro : moins-values nettes à long terme */
  case5nr: number | null;
  case5or: number | null;
  /** BIC non pro réel : revenus exonérés (régimes zonés) */
  case5nb: number | null;
  case5ob: number | null;
  /** BIC non pro réel : revenus imposables */
  case5nc: number | null;
  case5oc: number | null;
  /** BIC non pro réel : revenus de source étrangère avec crédit d'impôt égal à l'impôt français */
  case5ur: number | null;
  case5vr: number | null;
  /** BIC non pro réel : déficits */
  case5nf: number | null;
  case5of: number | null;
  /** BIC non pro réel : plus-values nettes à long terme */
  case5ne: number | null;
  case5oe: number | null;
  /** LMNP réel : revenus imposables */
  case5na: number | null;
  case5oa: number | null;
  /** LMNP réel : revenus de source étrangère avec crédit d'impôt égal à l'impôt français */
  case5ey: number | null;
  case5fy: number | null;
  /** LMNP réel : revenus soumis aux cotisations sociales */
  case5nm: number | null;
  case5om: number | null;
  /** LMNP réel : déficits */
  case5ny: number | null;
  case5oy: number | null;
  /** LMNP réel : déficits relevant des organismes de sécurité sociale */
  case5we: number | null;
  case5xe: number | null;
  /** BNC pro micro : revenus nets exonérés (régimes zonés) */
  case5hp: number | null;
  case5ip: number | null;
  /** BNC pro micro : plus-values nettes à court terme */
  case5hv: number | null;
  case5iv: number | null;
  /** BNC pro micro : moins-values nettes à court terme */
  case5kz: number | null;
  case5lz: number | null;
  /** BNC pro micro : plus-values nettes à long terme */
  case5hr: number | null;
  case5ir: number | null;
  /** BNC pro micro : moins-values nettes à long terme */
  case5hs: number | null;
  case5is: number | null;
  /** BNC pro réel : revenus exonérés (régimes zonés) */
  case5qb: number | null;
  case5rb: number | null;
  /** BNC pro réel : revenus imposables */
  case5qc: number | null;
  case5rc: number | null;
  /** BNC pro réel : revenus de source étrangère avec crédit d'impôt égal à l'impôt français */
  case5xj: number | null;
  case5yj: number | null;
  /** BNC pro réel : produits de brevets taxables à 10 % */
  case5qa: number | null;
  case5ra: number | null;
  /** BNC pro réel : déficits */
  case5qe: number | null;
  case5re: number | null;
  /** BNC pro réel : plus-values nettes à long terme */
  case5qd: number | null;
  case5rd: number | null;
  /** BNC non pro micro : revenus nets exonérés (régimes zonés) */
  case5th: number | null;
  case5uh: number | null;
  /** BNC non pro micro : plus-values nettes à court terme */
  case5ky: number | null;
  case5ly: number | null;
  /** BNC non pro micro : moins-values nettes à court terme */
  case5ju: number | null;
  case5ld: number | null;
  /** BNC non pro micro : plus-values nettes à long terme */
  case5kv: number | null;
  case5lv: number | null;
  /** BNC non pro micro : moins-values nettes à long terme */
  case5kw: number | null;
  case5lw: number | null;
  /** BNC non pro réel : revenus exonérés (régimes zonés) */
  case5hk: number | null;
  case5jk: number | null;
  /** BNC non pro réel : revenus imposables */
  case5jg: number | null;
  case5rf: number | null;
  /** BNC non pro réel : revenus de source étrangère avec crédit d'impôt égal à l'impôt français */
  case5xs: number | null;
  case5ys: number | null;
  /** BNC non pro réel : déficits */
  case5jj: number | null;
  case5rg: number | null;
  /** BNC non pro réel : plus-values nettes à long terme */
  case5so: number | null;
  case5nt: number | null;
  // Phase 5.2 : déficits antérieurs non encore déduits (foyer)
  /** BA : déficits antérieurs non encore déduits, 2019 */
  case5qf: number | null;
  /** BA : déficits antérieurs, 2020 */
  case5qg: number | null;
  /** BA : déficits antérieurs, 2021 */
  case5qn: number | null;
  /** BA : déficits antérieurs, 2022 */
  case5qo: number | null;
  /** BA : déficits antérieurs, 2023 */
  case5qp: number | null;
  /** BA : déficits antérieurs, 2024 */
  case5qq: number | null;
  /** BIC non pro : déficits antérieurs non encore déduits, 2019 */
  case5rn: number | null;
  /** BIC non pro : déficits antérieurs, 2020 */
  case5ro: number | null;
  /** BIC non pro : déficits antérieurs, 2021 */
  case5rp: number | null;
  /** BIC non pro : déficits antérieurs, 2022 */
  case5rq: number | null;
  /** BIC non pro : déficits antérieurs, 2023 */
  case5rr: number | null;
  /** BIC non pro : déficits antérieurs, 2024 */
  case5rw: number | null;
  /** LMNP : déficits antérieurs non encore déduits, 2015 */
  case5ga: number | null;
  /** LMNP : déficits antérieurs non encore déduits, 2016 */
  case5gb: number | null;
  /** LMNP : déficits antérieurs non encore déduits, 2017 */
  case5gc: number | null;
  /** LMNP : déficits antérieurs non encore déduits, 2018 */
  case5gd: number | null;
  /** LMNP : déficits antérieurs non encore déduits, 2019 */
  case5ge: number | null;
  /** LMNP : déficits antérieurs non encore déduits, 2020 */
  case5gf: number | null;
  /** LMNP : déficits antérieurs non encore déduits, 2021 */
  case5gg: number | null;
  /** LMNP : déficits antérieurs non encore déduits, 2022 */
  case5gh: number | null;
  /** LMNP : déficits antérieurs non encore déduits, 2023 */
  case5gi: number | null;
  /** LMNP : déficits antérieurs non encore déduits, 2024 */
  case5gj: number | null;
  /** BNC non pro : déficits antérieurs non encore déduits, 2019 */
  case5ht: number | null;
  /** BNC non pro : déficits antérieurs, 2020 */
  case5it: number | null;
  /** BNC non pro : déficits antérieurs, 2021 */
  case5jt: number | null;
  /** BNC non pro : déficits antérieurs, 2022 */
  case5kt: number | null;
  /** BNC non pro : déficits antérieurs, 2023 */
  case5lt: number | null;
  /** BNC non pro : déficits antérieurs, 2024 */
  case5mt: number | null;
}

/**
 * Charges déductibles du revenu global (cadre 6 de la 2042 et de la 2042-C,
 * phase 6.1) — déclarants 1 et 2 (colonne personne à charge hors périmètre).
 */
export interface ChargesDeductiblesInput {
  /** CSG déductible calculée sur les revenus du patrimoine */
  case6de: number | null;
  /** Pension alimentaire à un enfant majeur, 1er enfant */
  case6el: number | null;
  /** Pension alimentaire à un enfant majeur, 2e enfant */
  case6em: number | null;
  /** Autres pensions alimentaires (enfants mineurs, ascendants…) */
  case6gu: number | null;
  /** Décision de justice avant 2006 : enfant majeur, 1er enfant */
  case6gi: number | null;
  /** Décision de justice avant 2006 : enfant majeur, 2e enfant */
  case6gj: number | null;
  /** Décision de justice avant 2006 : autres personnes */
  case6gp: number | null;
  /** Cotisations PER déductibles du revenu global, déclarant 1 */
  case6ns: number | null;
  /** Cotisations PER déductibles du revenu global, déclarant 2 */
  case6nt: number | null;
  /** Cotisations PERP, Préfon, Corem, CGOS, déclarant 1 */
  case6rs: number | null;
  /** Cotisations PERP, Préfon, Corem, CGOS, déclarant 2 */
  case6rt: number | null;
  /** Plafond de déduction épargne retraite (avis d'impôt), déclarant 1 */
  case6ps: number | null;
  /** Plafond de déduction épargne retraite (avis d'impôt), déclarant 2 */
  case6pt: number | null;
  /** Mutualisation des plafonds des conjoints */
  case6qr: boolean;
  /** Nouvellement domicilié en France en 2025 */
  case6qw: boolean;
  /** Cotisations PER déduites des BIC, BNC, BA, art. 62, déclarant 1 */
  case6os: number | null;
  /** Cotisations PER déduites des BIC, BNC, BA, art. 62, déclarant 2 */
  case6ot: number | null;
  /** Autres cotisations déduites des BIC, BNC, BA, art. 62 ou salaires, déclarant 1 */
  case6qs: number | null;
  /** Autres cotisations déduites des BIC, BNC, BA, art. 62 ou salaires, déclarant 2 */
  case6qt: number | null;
  /** Charges foncières des monuments historiques */
  case6dg: number | null;
  /** Autres déductions (art. 156 II et 156 bis CGI) */
  case6dd: number | null;
  /** Nombre de personnes de plus de 75 ans accueillies */
  case6ev: number | null;
  /** Frais d'accueil de ces personnes */
  case6eu: number | null;
  /** Grosses réparations des nus-propriétaires : report 2015 */
  case6hp: number | null;
  /** Grosses réparations des nus-propriétaires : report 2016 */
  case6hq: number | null;
  /** Grosses réparations des nus-propriétaires : report 2017 */
  case6hr: number | null;
  /** Sommes à ajouter au revenu imposable */
  case6gh: number | null;
  /** Déficit global 2019 non encore déduit */
  case6fa: number | null;
  /** Déficit global 2020 non encore déduit */
  case6fb: number | null;
  /** Déficit global 2021 non encore déduit */
  case6fc: number | null;
  /** Déficit global 2022 non encore déduit */
  case6fd: number | null;
  /** Déficit global 2023 non encore déduit */
  case6fe: number | null;
  /** Déficit global 2024 non encore déduit */
  case6fl: number | null;
}

/** Réductions et crédits d'impôt du cadre 7 de la 2042 (phase 7.1, 2042-RICI hors périmètre). */
export interface ReductionsCreditsImpotInput {
  /** Dons aux organismes d'aide aux personnes en difficulté, du 1.1 au 13.10.2025 */
  case7ud: number | null;
  /** Dons aux organismes d'aide aux personnes en difficulté, du 14.10 au 31.12.2025 */
  case7uq: number | null;
  /** Dons pour la sauvegarde du patrimoine religieux */
  case7uj: number | null;
  /** Dons aux autres organismes d'intérêt général */
  case7uf: number | null;
  /** Dépenses de services à la personne */
  case7db: number | null;
  /** Aides perçues pour les services à la personne (APA, PCH, CESU préfinancé…) */
  case7dr: number | null;
  /** Ascendants de plus de 65 ans bénéficiaires de l'APA */
  case7dl: number | null;
  /** Premier emploi direct d'un salarié à domicile en 2025 */
  case7dq: boolean;
  /** Carte d'invalidité ou CMI invalidité dans le foyer */
  case7dg: boolean;
  /** Hors CERFA : membres du foyer âgés de plus de 65 ans (majoration du plafond services à la personne) */
  membresPlus65Ans: number | null;
}

/**
 * Prélèvement à la source et divers (cadre 8 de la 2042 et de la 2042-C,
 * phase 8.1). Contributions sociales sur revenus d'activité étrangers : phase 8.2.
 */
export interface PrelevementSourceDiversInput {
  /** Retenue à la source sur salaires et pensions, déclarant 1 */
  case8hv: number | null;
  /** Retenue à la source, déclarant 2 */
  case8iv: number | null;
  /** Retenue à la source, 1re personne à charge */
  case8jv: number | null;
  /** Retenue à la source, 2e personne à charge */
  case8kv: number | null;
  /** Acomptes d'impôt sur le revenu, déclarant 1 */
  case8hw: number | null;
  /** Acomptes d'IR, déclarant 2 */
  case8iw: number | null;
  /** Acomptes d'IR, 1re personne à charge */
  case8jw: number | null;
  /** Acomptes d'IR, 2e personne à charge */
  case8kw: number | null;
  /** Acomptes de prélèvements sociaux, déclarant 1 */
  case8hx: number | null;
  /** Acomptes de PS, déclarant 2 */
  case8ix: number | null;
  /** Acomptes de PS, 1re personne à charge */
  case8jx: number | null;
  /** Acomptes de PS, 2e personne à charge */
  case8kx: number | null;
  /** Remboursement de trop-prélevé d'IR déjà obtenu, déclarant 1 */
  case8hy: number | null;
  /** Trop-prélevé d'IR, déclarant 2 */
  case8iy: number | null;
  /** Trop-prélevé d'IR, 1re personne à charge */
  case8jy: number | null;
  /** Trop-prélevé d'IR, 2e personne à charge */
  case8ky: number | null;
  /** Remboursement de trop-prélevé de PS déjà obtenu, déclarant 1 */
  case8hz: number | null;
  /** Trop-prélevé de PS, déclarant 2 */
  case8iz: number | null;
  /** Trop-prélevé de PS, 1re personne à charge */
  case8jz: number | null;
  /** Trop-prélevé de PS, 2e personne à charge */
  case8kz: number | null;
  /** Acompte de CDHR versé en 2025, déclarant 1 */
  case8hr: number | null;
  /** Acompte de CDHR versé en 2025, déclarant 2 */
  case8hs: number | null;
  /** Avance de 60 % sur réductions et crédits d'impôt reçue en début d'année */
  case8ea: number | null;
  /** Revenus de source étrangère ouvrant droit à un crédit d'impôt égal à l'impôt français */
  case8tk: number | null;
  /** Non-résidents : retenue à la source prélevée en France */
  case8ta: number | null;
  /** Plus-values en report d'imposition non expiré */
  case8ut: number | null;
  /** Revenus exonérés retenus pour le taux effectif (autres que salaires, pensions, fonciers) */
  case8ti: number | null;
  /** Revenus de capitaux mobiliers et plus-values étrangers ouvrant droit à un crédit égal à l'impôt étranger */
  case8pl: number | null;
  /** Impôt payé à l'étranger sur ces revenus */
  case8vl: number | null;
  /** Autres revenus nets étrangers ouvrant droit à un crédit égal à l'impôt étranger */
  case8pm: number | null;
  /** Impôt étranger sur autres revenus, déclarant 1 */
  case8vm: number | null;
  /** Impôt étranger sur autres revenus, déclarant 2 */
  case8wm: number | null;
  /** Impôt étranger sur autres revenus, personne à charge */
  case8um: number | null;
  /** Reprises de réductions ou de crédits d'impôt */
  case8tf: number | null;
  /** Revenus fonciers (micro, après abattement) exonérés de CSG et de CRDS */
  case8rf: number | null;
  /** Rentes viagères à titre onéreux (net après abattement) exonérées de CSG et de CRDS */
  case8rv: number | null;
  /** Revenus de capitaux mobiliers exonérés de CSG et de CRDS */
  case8rc: number | null;
  /** Plus-values mobilières exonérées de CSG et de CRDS */
  case8rm: number | null;
  /** Contrats de capitalisation ou d'assurance-vie souscrits à l'étranger */
  case8tt: boolean;
  /** Comptes ouverts, détenus, utilisés ou clos à l'étranger */
  case8uu: boolean;
  /** Affilié à un régime d'assurance maladie EEE, Royaume-Uni ou Suisse, déclarant 1 */
  case8sh: boolean;
  /** Même situation, déclarant 2 */
  case8si: boolean;
  /** Revenus exonérés non retenus pour le taux effectif */
  case8vf: boolean;
}
