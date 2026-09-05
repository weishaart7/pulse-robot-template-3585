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
