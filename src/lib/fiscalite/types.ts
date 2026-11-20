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
  /** Années de naissance des déclarants (case 0DA/0DB) : abattement personnes âgées (art. 157 bis CGI). */
  anneeNaissanceDeclarant1?: number | null;
  anneeNaissanceDeclarant2?: number | null;
  /** Case N : personnes rattachées au titre d'enfants mariés, pacsés ou chargés de famille (enfant, conjoint, leurs enfants) — abattement art. 196 B, pas de demi-part. */
  personnesRattacheesFoyerDistinct?: number;
  /** Case P : dont petits-enfants en résidence alternée (demi-abattement). */
  petitsEnfantsRattachesAlternee?: number;
}

export interface MajorationDetail {
  type: string;
  libelle: string;
  parts: number;
  plafondUnitaire?: number;
  plafondComplementaire?: number;
}

export interface MajorationNonRetenue {
  type: string;
  libelle: string;
  motif: string;
}

export interface PartsFiscalesResult {
  partsBase: number;
  majorations: MajorationDetail[];
  /** Cases cochées qui n'ouvrent pas droit à majoration (non-cumul, condition non remplie), avec le motif. */
  majorationsNonRetenues: MajorationNonRetenue[];
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
  /** Personnes à charge (colonnes C/D = PAC 1/PAC 2, I/J pour 1GB/1GF/1GH) : même règle que la case jumelle du déclarant 1 (1CJ ↔ 1AJ, 1IB ↔ 1GB, 1PD ↔ 1PB…), vérifié sur le simulateur officiel 2026. */
  case1cj?: number | null;
  case1dj?: number | null;
  case1ca?: number | null;
  case1da?: number | null;
  case1cp?: number | null;
  case1dp?: number | null;
  case1cg?: number | null;
  case1dg?: number | null;
  case1ib?: number | null;
  case1jb?: number | null;
  case1if?: number | null;
  case1jf?: number | null;
  case1ck?: number | null;
  case1dk?: number | null;
  case1cd?: number | null;
  case1dd?: number | null;
  case1ih?: number | null;
  case1jh?: number | null;
  case1pd?: number | null;
  case1pe?: number | null;
  /** Personnes à charge : salaires de source étrangère ouvrant droit au crédit égal à l'impôt français (jumelles de 1AF/1BF). */
  case1cf?: number | null;
  case1df?: number | null;
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
  /** Cases de la déclaration 2027 (revenus 2026), voir cases2027.ts : ignorées pour les millésimes antérieurs. 1PP/1PQ : management packages, report expiré (comme 1MP/1MQ). */
  case1pp?: number | null;
  case1pq?: number | null;
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
  /** Personnes à charge (C = PAC 1, D = PAC 2) : jumelles de 1AS/1AT/1AI/1AZ/1AO/1AM, vérifié sur le simulateur officiel 2026. */
  case1cs?: number | null;
  case1ds?: number | null;
  case1ct?: number | null;
  case1dt?: number | null;
  case1ci?: number | null;
  case1di?: number | null;
  case1cz?: number | null;
  case1dz?: number | null;
  case1co?: number | null;
  case1do?: number | null;
  case1cm?: number | null;
  case1dm?: number | null;
  /** Personnes à charge : pensions de source étrangère ouvrant droit au crédit égal à l'impôt français (jumelles de 1AL/1BL). */
  case1cl?: number | null;
  case1dl?: number | null;
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
  /** Personnes à charge (C = PAC 1, D = PAC 2) : jumelles de 1AC/1AE/1AH, vérifié sur le simulateur officiel 2026. */
  case1cc?: number | null;
  case1dc?: number | null;
  case1ce?: number | null;
  case1de?: number | null;
  case1ch?: number | null;
  case1dh?: number | null;
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
  /** Fraction exonérée des RCM des impatriés (CGI art. 155 B) : RFR et PS seulement. */
  case2dm: number | null;
  /**
   * Hors catégorie : option pour l'imposition au barème (2OP). true = barème, false = PFU,
   * null = mode le plus favorable, résolu dans `useFiscalOverview.ts` (choix par défaut, comme ClickImpôts).
   */
  case2op: boolean | null;
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
  case3sz: number | null;
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
  /** Plus-values en report (art. 150-0 B ter) réalisées du 14.11 au 31.12.2012, taxables à 24 % (3WI) ou 19 % (3WJ) */
  case3wi?: number | null;
  case3wj?: number | null;
  /** Plus-values en report avant abattement : réalisées de 2013 à 2016 (3WN), depuis le 1.1.2017 (3XN) */
  case3wn?: number | null;
  case3xn?: number | null;
  /** Plus-values en report imposables (3WP, sans effet propre sur le calcul) */
  case3wp?: number | null;
  /** Impôt dû sur ces reports : IR au taux historique du barème (3WR), à 12,8 % (3WS), CEHR (3WT) */
  case3wr?: number | null;
  case3ws?: number | null;
  case3wt?: number | null;
  /** Plus-values au quotient (option 2OP) : sans abattement (RVG, quotient NVG = 4), abattement de droit commun (RSG) */
  caseRvg?: number | null;
  caseNvg?: number | null;
  caseRsg?: number | null;
  /** Plus-values au quotient avec abattement renforcé : avant abattement (RUA, quotient NUA = 4), abattement (RSL) */
  caseRua?: number | null;
  caseNua?: number | null;
  caseRsl?: number | null;
  /** Abattement fixe départ à la retraite d'un dirigeant (3VA) sur la plus-value au quotient RUA */
  caseRva?: number | null;
  /** Cases de la déclaration 2027 (revenus 2026), voir cases2027.ts : ignorées pour les millésimes antérieurs. 3YN : report 150-0 B ter expiré, plus-values réalisées depuis 2025 (comme 3XN, PS à 18,6 %). */
  case3yn?: number | null;
}

/**
 * Cases foncières saisies dans la 2042 (cadre 4 de la 2042 et de la 2042-C,
 * phase 4.1). Le régime réel 4BA à 4BD vient de la 2044 (calculerDeclaration2044.ts) ;
 * sans 2044, 4BA (parts de sociétés immobilières seulement) et 4BD se saisissent ici.
 */
export interface RevenusFonciers2042Input {
  case4ba: number | null;
  case4bd: number | null;
  case4be: number | null;
  case4bk: number | null;
  case4bl: number | null;
  case4bn: boolean;
  case4bz: boolean;
  case4by: number | null;
  case4ea: number | null;
  case4eb: number | null;
  /** Déficit foncier imputable sur le revenu global (sans 2044 ; avec une 2044, celle-ci le calcule) */
  case4bc?: number | null;
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
  /** Plus-values à long terme exonérées départ à la retraite (art. 151 septies A), soumises aux seuls PS — Déclarant 1 */
  case5hg: number | null;
  /** Plus-values à long terme exonérées départ à la retraite — Déclarant 2 */
  case5ig: number | null;
  /** BNC non pro : inventeurs et auteurs de logiciels, produits taxables à 10 % (PS en sus) — Déclarant 1 */
  case5qj: number | null;
  /** BNC non pro : inventeurs, produits taxables à 10 % — Déclarant 2 */
  case5rj: number | null;
  /** BNC non pro : inventeurs, produits à 10 % soumis aux cotisations sociales (sans PS) — Déclarant 1 */
  case5tc: number | null;
  /** BNC non pro : inventeurs, produits à 10 % soumis aux cotisations sociales — Déclarant 2 */
  case5uc: number | null;
  /** BA réel : fraction du bénéfice excédant la moyenne triennale, imposée au taux marginal — Déclarant 1 */
  case5xt: number | null;
  /** BA réel : fraction excédant la moyenne triennale — Déclarant 2 */
  case5xu: number | null;
  /** BA : revenu forfaitaire provenant des coupes de bois (revenu cadastral) — Déclarant 1 */
  case5hd: number | null;
  /** BA : revenu forfaitaire des coupes de bois — Déclarant 2 */
  case5id: number | null;
  /** BIC non pro réel : brevets et assimilés taxables à 10 % — Déclarant 1 */
  case5tf: number | null;
  /** BIC non pro réel : brevets taxables à 10 % — Déclarant 2 */
  case5uf: number | null;
  /** BNC pro : jeunes créateurs, abattement de 50 % déjà déduit de 5QC (RFR) — Déclarant 1 */
  case5ql: number | null;
  /** BNC pro : jeunes créateurs, abattement de 50 % — Déclarant 2 */
  case5rl: number | null;
  /** BNC non pro : jeunes créateurs, abattement de 50 % déjà déduit de 5JG (RFR) — Déclarant 1 */
  case5sv: number | null;
  /** BNC non pro : jeunes créateurs, abattement de 50 % — Déclarant 2 */
  case5sw: number | null;
  /** Agents généraux d'assurances : montant brut de l'indemnité de cessation (taxe art. 719) — Déclarant 1 */
  case5qm: number | null;
  /** Agents généraux d'assurances : indemnité de cessation — Déclarant 2 */
  case5rm: number | null;
  /** Personnes à charge (3e colonne du cadre 5) : chaque case suit la règle de sa jumelle déclarant 1 (`JUMELLES_PAC_CADRE_5`), vérifié sur le simulateur officiel 2026. */
  case5ja?: number | null;
  case5jb?: number | null;
  case5jc?: number | null;
  case5jd?: number | null;
  case5je?: number | null;
  case5jf?: number | null;
  case5jp?: number | null;
  case5jq?: number | null;
  case5jr?: number | null;
  case5jv?: number | null;
  case5jw?: number | null;
  case5jx?: number | null;
  case5jy?: number | null;
  case5lk?: number | null;
  case5mb?: number | null;
  case5mc?: number | null;
  case5me?: number | null;
  case5mf?: number | null;
  case5mj?: number | null;
  case5mn?: number | null;
  case5mo?: number | null;
  case5mp?: number | null;
  case5mq?: number | null;
  case5mu?: number | null;
  case5mv?: number | null;
  case5mx?: number | null;
  case5my?: number | null;
  case5mz?: number | null;
  case5ot?: number | null;
  case5pa?: number | null;
  case5pb?: number | null;
  case5pc?: number | null;
  case5pe?: number | null;
  case5pg?: number | null;
  case5ph?: number | null;
  case5pi?: number | null;
  case5pj?: number | null;
  case5pk?: number | null;
  case5pl?: number | null;
  case5pm?: number | null;
  case5pn?: number | null;
  case5po?: number | null;
  case5pp?: number | null;
  case5pq?: number | null;
  case5px?: number | null;
  case5sa?: number | null;
  case5sb?: number | null;
  case5sc?: number | null;
  case5sd?: number | null;
  case5se?: number | null;
  case5sf?: number | null;
  case5sj?: number | null;
  case5sl?: number | null;
  case5sx?: number | null;
  case5va?: number | null;
  case5vb?: number | null;
  case5vc?: number | null;
  case5ve?: number | null;
  case5vf?: number | null;
  case5vh?: number | null;
  case5wi?: number | null;
  case5za?: number | null;
  case5zb?: number | null;
  case5zo?: number | null;
  /** Personnes à charge, ajoutées après la campagne 2042 de novembre 2026 (simulateur officiel 2026 et 2027) :
   * crédit égal à l'impôt français (5CK BA, 5FF BIC pro, 5WR BIC non pro, 5GY LMNP, 5ZJ BNC pro, 5ZS BNC non pro),
   * moins-values à court terme (5SZ micro-BIC non pro, 5MD micro-BNC non pro), déficits (5PF BIC non pro, 5PY LMNP, 5SG BNC non pro). */
  case5ck?: number | null;
  case5ff?: number | null;
  case5wr?: number | null;
  case5gy?: number | null;
  case5zj?: number | null;
  case5zs?: number | null;
  case5sz?: number | null;
  case5md?: number | null;
  case5pf?: number | null;
  case5py?: number | null;
  case5sg?: number | null;
  /** Personnes à charge : déficits LMNP relevant des organismes de sécurité sociale (jumelle de 5WE). */
  case5ye?: number | null;
  /** Micro-BA, moyenne triennale : recettes de l'année N-1 (5XM/5YT/5ZT) et N-2 (5YM/5YU/5ZU), déclarant 1 / déclarant 2 / personnes à charge. */
  case5xm?: number | null;
  case5yt?: number | null;
  case5zt?: number | null;
  case5ym?: number | null;
  case5yu?: number | null;
  case5zu?: number | null;
  /** Cases de la déclaration 2027 (revenus 2026), voir cases2027.ts : ignorées pour les millésimes antérieurs. Micro-BIC professionnel : locations meublées (abattement 50 %). */
  case5km?: number | null;
  case5lm?: number | null;
  case5mm?: number | null;
}

/**
 * Charges déductibles du revenu global (cadre 6 de la 2042 et de la 2042-C,
 * phase 6.1) — déclarants 1 et 2 ; colonne personne à charge pour l'épargne retraite seulement.
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
  /** Colonne personne à charge : cotisations PER déductibles (6NU), PERP et assimilées (6RU), plafond (6PU) */
  case6nu: number | null;
  case6ru: number | null;
  case6pu: number | null;
  /** Colonne personne à charge : cotisations déduites des revenus professionnels, informatives (6OU, 6QU) */
  case6ou: number | null;
  case6qu: number | null;
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
  /** Hors CERFA : 6EL, enfant entretenu seul (marié/pacsé ou chargé de famille), plafond doublé */
  entretienSeul6el: boolean;
  /** Hors CERFA : 6EM, enfant entretenu seul (marié/pacsé ou chargé de famille), plafond doublé */
  entretienSeul6em: boolean;
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
  /** Frais de garde des enfants de moins de 6 ans au 1.1.2025 : 1er, 2e, 3e enfant */
  case7ga?: number | null;
  case7gb?: number | null;
  case7gc?: number | null;
  /** Idem, enfants en résidence alternée */
  case7ge?: number | null;
  case7gf?: number | null;
  case7gg?: number | null;
  /** Nombre d'enfants scolarisés : collège (7EA), lycée (7EC), supérieur (7EF) ; 7EB/7ED/7EG en résidence alternée */
  case7ea?: number | null;
  case7eb?: number | null;
  case7ec?: number | null;
  case7ed?: number | null;
  case7ef?: number | null;
  case7eg?: number | null;
  /** Cotisations syndicales, déclarant 1 / déclarant 2 */
  case7ac?: number | null;
  case7ae?: number | null;
  /** Prestations compensatoires : sommes versées en 2025 (7WN), total fixé par jugement ou capital reconstitué (7WO), capital en substitution de rente (7WM, sans effet sur le calcul) */
  case7wn?: number | null;
  case7wo?: number | null;
  case7wm?: number | null;
  /** Dons et cotisations aux partis politiques */
  case7uh?: number | null;
  /** Report des versements ESUS effectués du 9.5 au 31.12.2021 */
  case7dc?: number | null;
  /** Souscriptions au capital (2042-RICI) : montants versés, voir calculerSouscriptionsCapital. */
  case7ci?: number | null;
  case7co?: number | null;
  case7cr?: number | null;
  case7dz?: number | null;
  case7gw?: number | null;
  case7ct?: number | null;
  case7cu?: number | null;
  case7cw?: number | null;
  case7cp?: number | null;
  case7cq?: number | null;
  case7cv?: number | null;
  case7do?: number | null;
  case7dp?: number | null;
  case7ca?: number | null;
  case7gq?: number | null;
  case7gr?: number | null;
  case7fm?: number | null;
  case7fl?: number | null;
  case7fn?: number | null;
  case7gn?: number | null;
  case7en?: number | null;
  case7bs?: number | null;
  case7bt?: number | null;
  case7bu?: number | null;
  case7bw?: number | null;
  case7ek?: number | null;
  case7cy?: number | null;
  case7dy?: number | null;
  case7ey?: number | null;
  case7fy?: number | null;
  case7gy?: number | null;
  case7mx?: number | null;
  case7my?: number | null;
  case7nz?: number | null;
  case7uc?: number | null;
  case7fh?: number | null;
  /** Mécénat d'entreprise : montant de la réduction (2069-RS), exige un revenu professionnel au réel. */
  case7us?: number | null;
  /** Avance immédiate du crédit services à la personne perçue (7HB) : ajoutée au solde à payer, avec 7DB. */
  case7hb?: number | null;
  /** Investissements forestiers : dépenses, voir calculerInvestissementsForestiers. */
  case7un?: number | null;
  case7ul?: number | null;
  case7up?: number | null;
  case7ut?: number | null;
  case7tr?: number | null;
  case7ts?: number | null;
  case7tt?: number | null;
  case7tu?: number | null;
  case7tv?: number | null;
  case7tw?: number | null;
  case7ta?: number | null;
  case7tb?: number | null;
  case7vq?: number | null;
  case7te?: number | null;
  case7vr?: number | null;
  case7tf?: number | null;
  case7vs?: number | null;
  case7th?: number | null;
  case7vu?: number | null;
  case7ti?: number | null;
  case7vv?: number | null;
  case7tj?: number | null;
  case7vt?: number | null;
  case7tk?: number | null;
  /** Haut du cadre 7 : dons, 7AG, 7WP, investissements locatifs (voir calculerInvestissementsLocatifs). */
  case7uo?: number | null;
  case7xs?: number | null;
  case7xt?: number | null;
  case7xu?: number | null;
  case7xw?: number | null;
  case7xy?: number | null;
  case7va?: number | null;
  case7vm?: number | null;
  case7vc?: number | null;
  case7ag?: number | null;
  case7wp?: number | null;
  case7zq?: number | null;
  case7zr?: number | null;
  case7zs?: number | null;
  case7zt?: number | null;
  case7bk?: number | null;
  case7bl?: number | null;
  case7bm?: number | null;
  case7bn?: number | null;
  case7bo?: number | null;
  case7wr?: number | null;
  case7tx?: number | null;
  case7ty?: number | null;
  case7kw?: number | null;
  case7ky?: number | null;
  case7kx?: number | null;
  /** Pinel, Denormandie, Duflot : voir REGLES_PINEL (calculerInvestissementsPinel). */
  case7nm?: number | null;
  case7nn?: number | null;
  case7pf?: number | null;
  case7pg?: number | null;
  case7no?: number | null;
  case7np?: number | null;
  case7nq?: number | null;
  case7nr?: number | null;
  case7lq?: number | null;
  case7lr?: number | null;
  case7ls?: number | null;
  case7lt?: number | null;
  case7lu?: number | null;
  case7lv?: number | null;
  case7lw?: number | null;
  case7lx?: number | null;
  case7vw?: number | null;
  case7vx?: number | null;
  case7vy?: number | null;
  case7vz?: number | null;
  case7vd?: number | null;
  case7ve?: number | null;
  case7vf?: number | null;
  case7vg?: number | null;
  case7qm?: number | null;
  case7qn?: number | null;
  case7qo?: number | null;
  case7qp?: number | null;
  case7qr?: number | null;
  case7qs?: number | null;
  case7qt?: number | null;
  case7qu?: number | null;
  case7sd?: number | null;
  case7se?: number | null;
  case7sf?: number | null;
  case7sg?: number | null;
  case7jb?: number | null;
  case7jd?: number | null;
  case7jr?: number | null;
  case7js?: number | null;
  case7jt?: number | null;
  case7ju?: number | null;
  case7lg?: number | null;
  case7lh?: number | null;
  case7li?: number | null;
  case7lj?: number | null;
  case7je?: number | null;
  case7jf?: number | null;
  case7jg?: number | null;
  case7jh?: number | null;
  case7ie?: number | null;
  case7if?: number | null;
  case7ig?: number | null;
  case7ih?: number | null;
  case7ne?: number | null;
  case7nf?: number | null;
  case7ng?: number | null;
  case7nh?: number | null;
  case7jn?: number | null;
  case7jo?: number | null;
  case7jp?: number | null;
  case7jq?: number | null;
  case7jv?: number | null;
  case7jw?: number | null;
  case7jx?: number | null;
  case7jy?: number | null;
  case7ji?: number | null;
  case7jj?: number | null;
  case7jk?: number | null;
  case7jl?: number | null;
  case7ia?: number | null;
  case7ib?: number | null;
  case7ic?: number | null;
  case7id?: number | null;
  case7kn?: number | null;
  case7ko?: number | null;
  case7kp?: number | null;
  case7kq?: number | null;
  case7km?: number | null;
  case7mm?: number | null;
  case7jm?: number | null;
  case7lm?: number | null;
  case7rb?: number | null;
  case7rd?: number | null;
  case7rf?: number | null;
  case7rh?: number | null;
  case7fw?: number | null;
  case7fx?: number | null;
  case7hl?: number | null;
  case7hm?: number | null;
  case7xa?: number | null;
  case7xb?: number | null;
  case7xh?: number | null;
  case7xi?: number | null;
  case7rx?: number | null;
  case7ry?: number | null;
  case7ri?: number | null;
  case7rj?: number | null;
  case7sh?: number | null;
  case7si?: number | null;
  case7ro?: number | null;
  case7rp?: number | null;
  case7of?: number | null;
  case7og?: number | null;
  case7na?: number | null;
  case7nb?: number | null;
  case7nc?: number | null;
  case7nd?: number | null;
  case7oh?: number | null;
  case7oi?: number | null;
  case7la?: number | null;
  case7lb?: number | null;
  case7lc?: number | null;
  case7ld?: number | null;
  case7le?: number | null;
  case7lf?: number | null;
  case7sy?: number | null;
  case7sz?: number | null;
  case7uy?: number | null;
  case7uz?: number | null;
  case7wy?: number | null;
  case7wz?: number | null;
  /** Scellier : voir REGLES_SCELLIER (calculerInvestissementsScellier). */
  case7rt?: number | null;
  case7ru?: number | null;
  case7mo?: number | null;
  case7ma?: number | null;
  case7mi?: number | null;
  case7ns?: number | null;
  case7oj?: number | null;
  case7me?: number | null;
  case7mp?: number | null;
  case7mb?: number | null;
  case7mj?: number | null;
  case7nt?: number | null;
  case7ou?: number | null;
  case7mf?: number | null;
  case7mq?: number | null;
  case7mc?: number | null;
  case7mk?: number | null;
  case7nu?: number | null;
  case7ov?: number | null;
  case7mg?: number | null;
  case7mr?: number | null;
  case7md?: number | null;
  case7ml?: number | null;
  case7nv?: number | null;
  case7ow?: number | null;
  case7mh?: number | null;
  case7xc?: number | null;
  case7xd?: number | null;
  case7xe?: number | null;
  case7xl?: number | null;
  case7xm?: number | null;
  case7xn?: number | null;
  case7ya?: number | null;
  case7yc?: number | null;
  case7ym?: number | null;
  case7yn?: number | null;
  case7yo?: number | null;
  case7yp?: number | null;
  case7xj?: number | null;
  case7xk?: number | null;
  case7xo?: number | null;
  case7xp?: number | null;
  case7xq?: number | null;
  case7yr?: number | null;
  case7ys?: number | null;
  case7yt?: number | null;
  case7yu?: number | null;
  case7yv?: number | null;
  case7yw?: number | null;
  case7el?: number | null;
  case7em?: number | null;
  case7eq?: number | null;
  case7er?: number | null;
  case7ev?: number | null;
  case7ew?: number | null;
  case7ex?: number | null;
  case7fa?: number | null;
  case7fc?: number | null;
  case7fd?: number | null;
  case7eh?: number | null;
  case7ei?: number | null;
  case7eu?: number | null;
  case7ez?: number | null;
  case7fb?: number | null;
  case7fe?: number | null;
  case7fi?: number | null;
  case7fk?: number | null;
  case7zi?: number | null;
  case7uu?: number | null;
  case7rk?: number | null;
  case7lk?: number | null;
  case7im?: number | null;
  case7ba?: number | null;
  case7zj?: number | null;
  case7uv?: number | null;
  case7rl?: number | null;
  case7ll?: number | null;
  case7in?: number | null;
  case7bb?: number | null;
  case7zk?: number | null;
  case7uw?: number | null;
  case7rm?: number | null;
  case7lo?: number | null;
  case7io?: number | null;
  case7bc?: number | null;
  case7zl?: number | null;
  case7ux?: number | null;
  case7rn?: number | null;
  case7lp?: number | null;
  case7ip?: number | null;
  case7bd?: number | null;
  case7ha?: number | null;
  case7hj?: number | null;
  case7hk?: number | null;
  case7hn?: number | null;
  case7hy?: number | null;
  case7ij?: number | null;
  case7iq?: number | null;
  case7iw?: number | null;
  case7ka?: number | null;
  case7kb?: number | null;
  case7kk?: number | null;
  case7ox?: number | null;
  case7ok?: number | null;
  case7ol?: number | null;
  case7om?: number | null;
  case7on?: number | null;
  case7oo?: number | null;
  case7pa?: number | null;
  case7pb?: number | null;
  case7ph?: number | null;
  case7pi?: number | null;
  case7pj?: number | null;
  case7py?: number | null;
  case7bi?: number | null;
  case7bq?: number | null;
  case7bx?: number | null;
  case7by?: number | null;
  case7bz?: number | null;
  case7di?: number | null;
  case7du?: number | null;
  case7dv?: number | null;
  case7dx?: number | null;
  case7ai?: number | null;
  case7ap?: number | null;
  case7aq?: number | null;
  case7ar?: number | null;
  case7as?: number | null;
  case7at?: number | null;
  case7au?: number | null;
  case7sj?: number | null;
  case7sk?: number | null;
  case7sr?: number | null;
  case7tc?: number | null;
  case7td?: number | null;
  case7ua?: number | null;
  case7ub?: number | null;
  case7ue?: number | null;
  case7ug?: number | null;
  case7ui?: number | null;
  case7uk?: number | null;
  case7qa?: number | null;
  case7qb?: number | null;
  case7qc?: number | null;
  case7qd?: number | null;
  case7qe?: number | null;
  case7qg?: number | null;
  case7qq?: number | null;
  case7qw?: number | null;
  case7qx?: number | null;
  case7qy?: number | null;
  case7qz?: number | null;
  case7ra?: number | null;
  case7rc?: number | null;
  case7hz?: number | null;
  case7iv?: number | null;
  case7vj?: number | null;
  case7vb?: number | null;
  case7kd?: number | null;
  case7pd?: number | null;
  case7ku?: number | null;
  case7iy?: number | null;
  case7vl?: number | null;
  case7vh?: number | null;
  case7kc?: number | null;
  case7pc?: number | null;
  case7kt?: number | null;
  case7ix?: number | null;
  case7vk?: number | null;
  case7vi?: number | null;
  case7pe?: number | null;
  case7kv?: number | null;
  case7iz?: number | null;
  case7vo?: number | null;
  case7vp?: number | null;
  /** Censi-Bouvard : voir REGLES_CENSI_BOUVARD. */
  case7mn?: number | null;
  case7mw?: number | null;
  case7mz?: number | null;
  case7pz?: number | null;
  case7sl?: number | null;
  case7sx?: number | null;
  case7st?: number | null;
  case7ss?: number | null;
  case7sm?: number | null;
  case7sp?: number | null;
  case7sn?: number | null;
  case7so?: number | null;
  case7sa?: number | null;
  case7sb?: number | null;
  case7sc?: number | null;
  case7ht?: number | null;
  case7hd?: number | null;
  case7ke?: number | null;
  case7oa?: number | null;
  case7po?: number | null;
  case7pt?: number | null;
  case7hu?: number | null;
  case7he?: number | null;
  case7kf?: number | null;
  case7ob?: number | null;
  case7pp?: number | null;
  case7pu?: number | null;
  case7hv?: number | null;
  case7hf?: number | null;
  case7kg?: number | null;
  case7oc?: number | null;
  case7pq?: number | null;
  case7pv?: number | null;
  case7hw?: number | null;
  case7hg?: number | null;
  case7kh?: number | null;
  case7od?: number | null;
  case7pr?: number | null;
  case7pw?: number | null;
  case7hx?: number | null;
  case7hh?: number | null;
  case7ki?: number | null;
  case7oe?: number | null;
  case7ps?: number | null;
  case7px?: number | null;
  /** Travaux PPRT 2025 : crédit de 40 %, 20 000 € par foyer. */
  case7wl?: number | null;
  /** Rente survie, épargne handicap : 25 % de 1 525 € + 300 € par enfant à charge. */
  case7gz?: number | null;
  /** Accueil en établissement pour personnes dépendantes : 25 %, 10 000 € par personne. */
  case7cd?: number | null;
  case7ce?: number | null;
  /** Équipements perte d'autonomie 2025 (crédit 25 %) et dépenses retenues 2021-2024. */
  case7wi?: number | null;
  case7zz?: number | null;
  case7zy?: number | null;
  case7zx?: number | null;
  case7zw?: number | null;
  /** Revenu fiscal de référence 2023 et 2024 (condition de 7WI). */
  case8ys?: number | null;
  case8yu?: number | null;
  /** Investissements outre-mer (2042-IOM) : montants de réduction (crédit pour HJA), voir calculerInvestissementsOutreMer. */
  caseHqa?: number | null;
  caseHyj?: number | null;
  caseHye?: number | null;
  caseHyf?: number | null;
  caseHyg?: number | null;
  caseHyh?: number | null;
  caseHyi?: number | null;
  caseHoa?: number | null;
  caseHob?: number | null;
  caseHoc?: number | null;
  caseHoh?: number | null;
  caseHoi?: number | null;
  caseHoj?: number | null;
  caseHok?: number | null;
  caseHol?: number | null;
  caseHom?: number | null;
  caseHon?: number | null;
  caseHoo?: number | null;
  caseHop?: number | null;
  caseHoq?: number | null;
  caseHor?: number | null;
  caseHos?: number | null;
  caseHot?: number | null;
  caseHou?: number | null;
  caseHov?: number | null;
  caseHow?: number | null;
  caseHod?: number | null;
  caseHoe?: number | null;
  caseHof?: number | null;
  caseHog?: number | null;
  caseHox?: number | null;
  caseHoy?: number | null;
  caseHoz?: number | null;
  caseHua?: number | null;
  caseHub?: number | null;
  caseHuc?: number | null;
  caseHud?: number | null;
  caseHue?: number | null;
  caseHuf?: number | null;
  caseHug?: number | null;
  caseHuh?: number | null;
  caseHui?: number | null;
  caseHuj?: number | null;
  caseHuk?: number | null;
  caseHul?: number | null;
  caseHum?: number | null;
  caseHun?: number | null;
  caseHuo?: number | null;
  caseHup?: number | null;
  caseHuq?: number | null;
  caseHur?: number | null;
  caseHus?: number | null;
  caseHut?: number | null;
  caseHuu?: number | null;
  caseHkc?: number | null;
  caseHva?: number | null;
  caseHvb?: number | null;
  caseHvc?: number | null;
  caseHvd?: number | null;
  caseHve?: number | null;
  caseHvf?: number | null;
  caseHvg?: number | null;
  caseHvk?: number | null;
  caseHvl?: number | null;
  caseHvm?: number | null;
  caseHvn?: number | null;
  caseHvo?: number | null;
  caseHls?: number | null;
  caseHlt?: number | null;
  caseHlu?: number | null;
  caseHlv?: number | null;
  caseHlw?: number | null;
  caseHgs?: number | null;
  caseHgt?: number | null;
  caseHgu?: number | null;
  caseHgw?: number | null;
  caseHhs?: number | null;
  caseHht?: number | null;
  caseHhu?: number | null;
  caseHhw?: number | null;
  caseHis?: number | null;
  caseHit?: number | null;
  caseHiu?: number | null;
  caseHiw?: number | null;
  caseHjs?: number | null;
  caseHjt?: number | null;
  caseHju?: number | null;
  caseHjw?: number | null;
  caseHks?: number | null;
  caseHkt?: number | null;
  caseHku?: number | null;
  caseHkw?: number | null;
  caseHja?: number | null;
  /** Cases de la déclaration 2027 (revenus 2026), voir cases2027.ts : ignorées pour les millésimes antérieurs. */
  case7ln?: number | null;
  case7ly?: number | null;
  case7lz?: number | null;
  case7ni?: number | null;
  case7nj?: number | null;
  case7nk?: number | null;
  case7nl?: number | null;
  case7ir?: number | null;
  case7is?: number | null;
  case7it?: number | null;
  case7iu?: number | null;
  case7ho?: number | null;
  case7hp?: number | null;
  case7rq?: number | null;
  case7rr?: number | null;
  case7yh?: number | null;
  case7yi?: number | null;
  case7tp?: number | null;
  case7tq?: number | null;
  case7hq?: number | null;
  case7hr?: number | null;
  case7pm?: number | null;
  case7pn?: number | null;
  case7qi?: number | null;
  case7qj?: number | null;
  case7re?: number | null;
  case7rg?: number | null;
  case7rs?: number | null;
  case7rz?: number | null;
  case7wa?: number | null;
  case7wb?: number | null;
  case7wc?: number | null;
  case7wd?: number | null;
  case7sq?: number | null;
  case7ot?: number | null;
  case7av?: number | null;
  case7aw?: number | null;
  case7ax?: number | null;
  case7ay?: number | null;
  case7cf?: number | null;
  case7cg?: number | null;
  case7ch?: number | null;
  case7cj?: number | null;
  case7ck?: number | null;
  case7cl?: number | null;
  case7cm?: number | null;
  case7dd?: number | null;
  case7de?: number | null;
  case7df?: number | null;
  case7gh?: number | null;
  case7gi?: number | null;
  case7gj?: number | null;
  case7gk?: number | null;
  case7gs?: number | null;
  case7gt?: number | null;
  case7gu?: number | null;
  case7gv?: number | null;
  case7be?: number | null;
  case7bf?: number | null;
  case7bg?: number | null;
  case7bh?: number | null;
  case7ms?: number | null;
  case7mt?: number | null;
  case7mu?: number | null;
  case7mv?: number | null;
  case7op?: number | null;
  case7oq?: number | null;
  case7or?: number | null;
  case7os?: number | null;
  case7tg?: number | null;
  case7tl?: number | null;
  case7tn?: number | null;
  case7to?: number | null;
  case7we?: number | null;
  case7wf?: number | null;
  case7wg?: number | null;
  case7wu?: number | null;
  case7wv?: number | null;
  case7ww?: number | null;
  case7yj?: number | null;
  case7yk?: number | null;
  case7yl?: number | null;
  case7yx?: number | null;
  case7yy?: number | null;
  case7yz?: number | null;
  case7za?: number | null;
  case7zb?: number | null;
  case7zc?: number | null;
  case7zd?: number | null;
  case7ze?: number | null;
  case7zf?: number | null;
  case7zg?: number | null;
  caseHms?: number | null;
  caseHmt?: number | null;
  caseHmu?: number | null;
  caseHmv?: number | null;
  caseHmw?: number | null;
  caseHvp?: number | null;
  caseHyk?: number | null;
  case7ak?: number | null;
  case7al?: number | null;
  case7am?: number | null;
  case7an?: number | null;
  case7ao?: number | null;
  case7kz?: number | null;
  case7vn?: number | null;
  case7tm?: number | null;
  case7cn?: number | null;
  case7cx?: number | null;
  case7dn?: number | null;
  case7cz?: number | null;
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
  /** 8ZR : revenu net mondial associé à 8TI ; remplace tout le revenu mondial du taux effectif et du RFR. */
  case8zr: number | null;
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
  case8fv: boolean;
  /** Revenus non salariaux de source étrangère, CSG 9,2 % (phase 8.2) */
  case8tq: number | null;
  /** Salaires de source étrangère, CSG 9,2 % (phase 8.2) */
  case8tr: number | null;
  /** Allocations de préretraite, CSG 9,2 % (phase 8.2) */
  case8sc: number | null;
  /** Allocations de chômage, CSG 6,2 % (phase 8.2) */
  case8sw: number | null;
  /** Allocations de chômage, CSG 3,8 % (phase 8.2) */
  case8sx: number | null;
  /** Indemnités journalières de maladie, maternité, accident du travail, CSG 6,2 % (phase 8.2) */
  case8tw: number | null;
  /** Pensions de retraite et d'invalidité, CSG 8,3 %, déclarant 1 (phase 8.2) */
  case8tv: number | null;
  /** Pensions de retraite et d'invalidité, CSG 8,3 %, déclarant 2 (phase 8.2) */
  case8qv: number | null;
  /** Pensions de retraite et d'invalidité, CSG 6,6 %, déclarant 1 (phase 8.2) */
  case8th: number | null;
  /** Pensions de retraite et d'invalidité, CSG 6,6 %, déclarant 2 (phase 8.2) */
  case8qh: number | null;
  /** Pensions de retraite et d'invalidité, CSG 3,8 %, déclarant 1 (phase 8.2) */
  case8tx: number | null;
  /** Pensions de retraite et d'invalidité, CSG 3,8 %, déclarant 2 (phase 8.2) */
  case8qx: number | null;
  /** Pensions en capital soumises à imposition forfaitaire, CSG 8,3 % (phase 8.2) */
  case8sa: number | null;
  /** Pensions en capital soumises à imposition forfaitaire, CSG 6,6 % (phase 8.2) */
  case8sd: number | null;
  /** Pensions en capital soumises à imposition forfaitaire, CSG 3,8 % (phase 8.2) */
  case8sb: number | null;
  /** Crédits restituables : recherche à restitution immédiate (8TB), collaboration de recherche (8WK), famille (8UZ),
   *  industrie verte (8CV), Corse à restitution immédiate (8TS), prêts sans intérêt (8WC), métiers d'art (8WR),
   *  versements libératoires des micro-entrepreneurs (8UY), agriculture biologique (8WA), haute valeur
   *  environnementale (8WH), remplacement pour congé des agriculteurs (8WT) */
  case8tb?: number | null;
  case8wk?: number | null;
  case8uz?: number | null;
  case8cv?: number | null;
  case8ts?: number | null;
  case8wc?: number | null;
  case8wr?: number | null;
  case8uy?: number | null;
  case8wa?: number | null;
  case8wh?: number | null;
  case8wt?: number | null;
  /** Crédits non restituables : recherche autres entreprises (8TC), Corse autres entreprises (8TG), report Corse (8TO) */
  case8tc?: number | null;
  case8tg?: number | null;
  case8to?: number | null;
  /** Reprise du crédit d'investissement en Corse, ajoutée à l'impôt */
  case8tp?: number | null;
  /** Réductions : report de réduction non imputée de 2024 (8PY), prêt à taux zéro mobilité (8PZ) */
  case8py?: number | null;
  case8pz?: number | null;
  /** Cases de la déclaration 2027 (revenus 2026), voir cases2027.ts : ignorées pour les millésimes antérieurs. Taxe holdings 8HA/8HB/8HC, acomptes PS 18,6 % 8HU/8IU, crédit 8WB, report 8PX. */
  case8ha?: number | null;
  case8hb?: number | null;
  case8hc?: number | null;
  case8hu?: number | null;
  case8iu?: number | null;
  case8wb?: number | null;
  case8px?: number | null;
}
