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

