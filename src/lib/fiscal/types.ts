export interface EnfantPartsInput {
  fiscalementACharge: boolean;
  handicap: boolean;
}

export interface FoyerFiscalInput {
  statutCouple?: string;
  impositionDistincte?: boolean;
  parentIsole?: boolean;
  personneHandicapeeClient?: boolean;
  personneHandicapeeConjoint?: boolean;
  ancienCombattantClient?: boolean;
  ancienCombattantConjoint?: boolean;
  enfants: EnfantPartsInput[];
}

export interface PartsFiscalesResult {
  partsBase: number;
  partsEnfants: number;
  majorationParentIsole: number;
  majorationInvalidite: number;
  majorationAncienCombattant: number;
  totalParts: number;
  nombreEnfantsFiscalementACharge: number;
}
