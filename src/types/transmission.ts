export interface TransmissionScenario {
  id: string;
  name: string;
  description: string;
  parameters: {
    decedentId: string;
    dateSuccession: string;
    regimeMatrimonial?: string;
    conjointOption?: 'quartPP' | 'usufruitTotal' | 'quartPP_plus_3quartsUS';
    donations?: Array<{
      beneficiaire: string;
      montant: number;
      date: string;
      rapportable: boolean;
    }>;
    legs?: Array<{
      beneficiaire: string;
      montant: number;
      nature: string;
    }>;
  };
  results?: {
    masseCalcul: number;
    reserve: number;
    quotiteDisponible: number;
    transmissionNette: number;
    heirs: Array<{
      personId: string;
      nom: string;
      lien: string;
      partCivile: number;
      partFinale: number;
      droitsSuccession: number;
    }>;
  };
}

export interface TransmissionAnalysis {
  scenarios: TransmissionScenario[];
  recommendations: string[];
  fiscalOptimizations: Array<{
    type: string;
    description: string;
    impact: number;
  }>;
}

// Enhanced types for better integration
export interface FamilySituationSummary {
  decedent: {
    nom: string;
    prenom: string;
    regimeMatrimonial?: string;
  };
  conjoint?: {
    nom: string;
    prenom: string;
    vivant: boolean;
  };
  enfants: Array<{
    id: string;
    nom: string;
    prenom: string;
    vivant: boolean;
    branche?: 'commune' | 'precedente';
  }>;
  autres: Array<{
    id: string;
    nom: string;
    lien: string;
    vivant: boolean;
  }>;
}

export interface PatrimoineSummary {
  actifs: {
    total: number;
    immobilier: number;
    financier: number;
    professionnel: number;
    autres: number;
  };
  passifs: number;
  actifNet: number;
  assuranceVie?: number;
}