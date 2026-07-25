// Types for matrimonial regime clauses and their impact on transmission

export type RegimeType =
  | 'communaute_reduite'
  | 'communaute_meubles'
  | 'communaute_universelle'
  | 'separation_biens'
  | 'participation_acquets'
  | 'separation_societe_acquets';

export type ClauseType = 
  | 'attribution_integrale'
  | 'preciput'
  | 'partage_inegal'
  | 'mise_en_communaute'
  | 'extension_propres_par_nature'
  | 'reprise_apports'
  | 'stipulation_bien_propre'
  | 'modification_recompenses'
  | 'prelevement_biens_communs'
  | 'prelevement_indemnisation'
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
  | 'preciput_sub'
  | 'administration_conjointe'
  | 'presomption_propriete'
  | 'apport_franc_et_quitte'
  | 'separation_de_dettes'
  | 'apport_plafonne'
  | 'dissolution_alternative';

export interface ClauseDefinition {
  key: ClauseType;
  label: string;
  hasAssets?: boolean;
  hasPercentages?: boolean;
  hasOptions?: boolean;
  hasSubClauses?: boolean;
  /** Expose une case « Résidence principale (quel que soit le bien) » à côté de la sélection de biens par ID. */
  hasResidencePrincipaleOption?: boolean;
  /** Expose une case « Maintien exprès en cas de divorce », pour écarter la révocation de plein droit (Cass. 1re civ., 18 déc. 2019). */
  hasMaintienDivorceOption?: boolean;
  /** Expose un choix pleine_propriete / usufruit (art. 1524 al. 2 pour l'attribution intégrale). */
  hasPorteSurOption?: boolean;
  description?: string;
  impactTransmission?: 'exclut_succession' | 'reduit_masse' | 'avantage_matrimonial' | 'neutre';
  /** Quand la clause prend effet : en cours de mariage, ou seulement à la dissolution (pilote la révocation de plein droit au divorce, art. 265). */
  momentEffet?: 'cours_mariage' | 'dissolution';
  /** Avantage matrimonial soumis à l'action en retranchement (art. 1527 al. 2) en présence d'enfants non communs. */
  soumisRetranchement?: boolean;
  /** Masse sur laquelle porte l'effet de la clause. */
  assietteImpactee?: 'masse_commune' | 'succession' | 'aucune';
}

export interface ClauseState {
  enabled: boolean;
  selectedAssets?: string[];
  partPleineProprietee?: number;
  partUsufruit?: number;
  options?: {
    pleineProprietee?: boolean;
    usufruit?: boolean;
    /** Désignation par catégorie : suit l'actif marqué "Résidence principale", pas un ID figé. */
    residencePrincipale?: boolean;
    /** Stipulation expresse de maintien de la clause en cas de divorce, pour écarter la révocation de plein droit (Cass. 1re civ., 18 déc. 2019). */
    maintienDivorce?: boolean;
    /** Attribution intégrale (art. 1524 al. 2) : pleine propriété (défaut) ou seulement l'usufruit. */
    porteSur?: 'pleine_propriete' | 'usufruit';
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
