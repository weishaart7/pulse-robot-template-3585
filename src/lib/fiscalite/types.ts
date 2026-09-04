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
  case1ap: number | null;
  case1bp: number | null;
  case1af: number | null;
  case1bf: number | null;
  case1ag: number | null;
  case1bg: number | null;
  case1ak: number | null;
  case1bk: number | null;
}
