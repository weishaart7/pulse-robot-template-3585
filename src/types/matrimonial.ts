// Types for matrimonial regime clauses and their impact on transmission

export type RegimeType = 
  | 'communaute_reduite' 
  | 'communaute_meubles' 
  | 'communaute_universelle' 
  | 'separation_biens' 
  | 'participation_acquets';

export type ClauseType = 
  | 'attribution_integrale'
  | 'preciput'
  | 'partage_inegal'
  | 'mise_en_communaute'
  | 'reprise_apports'
  | 'stipulation_bien_propre'
  | 'modification_recompenses'
  | 'prelevement_biens_communs'
  | 'prelevement_indemnisation'
  | 'exclusion_bien_communaute'
  | 'attribution_integrale_survivant'
  | 'exclusion_certains_biens'
  | 'societe_acquets'
  | 'contribution_charges'
  | 'amenagement_indivision'
  | 'maintien_indivision'
  | 'exclusion_reprise'
  | 'evaluation_biens'
  | 'simplification_preuve'
  | 'exclusion_biens_professionnels'
  | 'plafonnement_creance'
  | 'attribution_preferentielle'
  | 'partage_inegal_acquets'
  | 'renonciation'
  | 'indexation'
  | 'partage_inegal_sub'
  | 'attribution_integrale_sub'
  | 'preciput_sub';

export interface ClauseDefinition {
  key: ClauseType;
  label: string;
  hasAssets?: boolean;
  hasPercentages?: boolean;
  hasOptions?: boolean;
  hasSubClauses?: boolean;
  description?: string;
  impactTransmission?: 'exclut_succession' | 'reduit_masse' | 'avantage_matrimonial' | 'neutre';
}

export interface ClauseState {
  enabled: boolean;
  selectedAssets?: string[];
  partPleineProprietee?: number;
  partUsufruit?: number;
  options?: {
    pleineProprietee?: boolean;
    usufruit?: boolean;
  };
}

export interface ClausesData {
  [key: string]: ClauseState;
}

export interface DonationDernierVivant {
  enFaveurUtilisateur: boolean;
  enFaveurConjoint: boolean;
  dateUtilisateur?: string;
  dateConjoint?: string;
}

// Impact sur la transmission - pour le calcul DMTG
export interface MatrimonialClauseImpact {
  clauseKey: ClauseType;
  type: 'attribution_integrale' | 'preciput' | 'parts_inegales' | 'autre';
  valeur: number;
  assetIds?: string[];
  partPleineProprietee?: number;
  partUsufruit?: number;
}

// Résultat de l'analyse des clauses pour la transmission
export interface MatrimonialAnalysisResult {
  regimeSimplified: 'communauté' | 'séparation' | 'participation' | 'autre';
  avantagesMatrimoniaux: MatrimonialClauseImpact[];
  totalExcluSuccession: number;
  notes: string[];
}

// Helper pour mapper le type de régime vers la forme simplifiée
export function getSimplifiedRegime(regimeType: RegimeType | string): 'communauté' | 'séparation' | 'participation' | 'autre' {
  if (regimeType.includes('communaute')) return 'communauté';
  if (regimeType.includes('separation')) return 'séparation';
  if (regimeType.includes('participation')) return 'participation';
  return 'autre';
}
