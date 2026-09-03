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
