import { ClauseDefinition, RegimeType } from '@/types/matrimonial';

// Définitions des clauses par type de régime
export const CLAUSES_BY_REGIME: Record<RegimeType, ClauseDefinition[]> = {
  communaute_reduite: [
    { 
      key: 'mise_en_communaute', 
      label: 'Clause de mise en communauté', 
      hasAssets: true,
      impactTransmission: 'neutre',
      description: 'Permet de faire entrer des biens propres dans la communauté'
    },
    { 
      key: 'reprise_apports', 
      label: 'Clause de reprise des apports (dite « clause alsacienne ») (uniquement cas de divorce)',
      impactTransmission: 'neutre'
    },
    { 
      key: 'preciput', 
      label: 'Clause de préciput', 
      hasAssets: true, 
      hasOptions: true,
      impactTransmission: 'exclut_succession',
      description: 'Permet au conjoint de prélever certains biens avant le partage'
    },
    { 
      key: 'attribution_integrale', 
      label: "Clause d'attribution intégrale (uniquement cas de décès)", 
      hasPercentages: true,
      impactTransmission: 'avantage_matrimonial',
      description: 'Attribue la totalité de la communauté au conjoint survivant'
    },
    { 
      key: 'partage_inegal', 
      label: 'Clause de partage inégal', 
      hasPercentages: true,
      impactTransmission: 'avantage_matrimonial',
      description: 'Modifie la répartition par défaut 50/50 de la communauté'
    },
    { 
      key: 'stipulation_bien_propre', 
      label: 'La clause de stipulation de bien propre', 
      hasAssets: true,
      impactTransmission: 'neutre'
    },
    { 
      key: 'modification_recompenses', 
      label: 'La clause modifiant le montant des récompenses et des créances entre époux',
      impactTransmission: 'neutre'
    },
    { 
      key: 'prelevement_biens_communs', 
      label: 'La clause de prélèvement des biens communs moyennant indemnité',
      impactTransmission: 'neutre'
    },
    { 
      key: 'prelevement_indemnisation', 
      label: 'La clause de prélèvement moyennant indemnisation (dite « clause commerciale »)',
      impactTransmission: 'neutre'
    }
  ],
  
  communaute_meubles: [
    { 
      key: 'preciput', 
      label: 'Clause de préciput', 
      hasAssets: true,
      impactTransmission: 'exclut_succession'
    },
    { 
      key: 'mise_en_communaute', 
      label: 'Clause de mise en communauté', 
      hasAssets: true,
      impactTransmission: 'neutre'
    },
    { 
      key: 'reprise_apports', 
      label: 'Clause de reprise des apports (clause alsacienne) (uniquement cas de divorce)',
      impactTransmission: 'neutre'
    },
    { 
      key: 'attribution_integrale', 
      label: "Clause d'attribution intégrale (uniquement cas de décès)", 
      hasPercentages: true,
      impactTransmission: 'avantage_matrimonial'
    },
    { 
      key: 'partage_inegal', 
      label: 'Clause de partage inégal', 
      hasPercentages: true,
      impactTransmission: 'avantage_matrimonial'
    },
    { 
      key: 'exclusion_bien_communaute', 
      label: "Exclusion d'un bien de la communauté", 
      hasAssets: true,
      impactTransmission: 'neutre'
    },
    { 
      key: 'stipulation_bien_propre', 
      label: 'La clause de stipulation de bien propre', 
      hasAssets: true,
      impactTransmission: 'neutre'
    },
    { 
      key: 'prelevement_biens_communs', 
      label: 'La clause de prélèvement des biens communs moyennant indemnité',
      impactTransmission: 'neutre'
    },
    { 
      key: 'prelevement_indemnisation', 
      label: 'La clause de prélèvement moyennant indemnisation (dite « clause commerciale »)',
      impactTransmission: 'neutre'
    }
  ],
  
  communaute_universelle: [
    { 
      key: 'attribution_integrale_survivant', 
      label: "Clause d'attribution intégrale au survivant",
      impactTransmission: 'avantage_matrimonial',
      description: 'Toute la communauté (donc tout le patrimoine) revient au survivant'
    },
    { 
      key: 'preciput', 
      label: 'Clause de préciput', 
      hasAssets: true,
      impactTransmission: 'exclut_succession'
    },
    { 
      key: 'exclusion_certains_biens', 
      label: 'Exclusion de certains biens', 
      hasAssets: true,
      impactTransmission: 'neutre'
    },
    { 
      key: 'reprise_apports', 
      label: 'Clause de reprise des apports',
      impactTransmission: 'neutre'
    }
  ],
  
  separation_biens: [
    { 
      key: 'societe_acquets', 
      label: "Société d'acquêts", 
      hasAssets: true, 
      hasSubClauses: true,
      impactTransmission: 'avantage_matrimonial',
      description: 'Crée une mini-communauté pour certains biens acquis pendant le mariage'
    },
    { 
      key: 'contribution_charges', 
      label: 'Clause aménageant la contribution aux charges du mariage',
      impactTransmission: 'neutre'
    },
    { 
      key: 'amenagement_indivision', 
      label: "Aménagement de l'indivision",
      impactTransmission: 'neutre'
    },
    { 
      key: 'maintien_indivision', 
      label: "Clause de maintien dans l'indivision (À regarder)",
      impactTransmission: 'neutre'
    },
    { 
      key: 'exclusion_reprise', 
      label: "Clause d'exclusion de reprise",
      impactTransmission: 'neutre'
    },
    { 
      key: 'prelevement_indemnisation', 
      label: 'La clause de prélèvement moyennant indemnisation (dite « clause commerciale »)',
      impactTransmission: 'neutre'
    }
  ],
  
  participation_acquets: [
    { 
      key: 'societe_acquets', 
      label: "Société d'acquêts", 
      hasAssets: true, 
      hasSubClauses: true,
      impactTransmission: 'avantage_matrimonial'
    },
    { 
      key: 'evaluation_biens', 
      label: "La clause d'évaluation des biens",
      impactTransmission: 'neutre'
    },
    { 
      key: 'simplification_preuve', 
      label: 'La clause de simplification de la preuve de la consistance des patrimoines des époux',
      impactTransmission: 'neutre'
    },
    { 
      key: 'exclusion_biens_professionnels', 
      label: "La clause d'exclusion des biens professionnels du calcul de la créance de participation",
      impactTransmission: 'neutre'
    },
    { 
      key: 'plafonnement_creance', 
      label: 'La clause de plafonnement de la créance de participation',
      impactTransmission: 'neutre'
    },
    { 
      key: 'attribution_preferentielle', 
      label: "Clause d'attribution préférentielle",
      impactTransmission: 'neutre'
    },
    { 
      key: 'partage_inegal_acquets', 
      label: 'Clause de partage inégal des acquêts',
      impactTransmission: 'avantage_matrimonial'
    },
    { 
      key: 'renonciation', 
      label: 'Clause de renonciation (À regarder)',
      impactTransmission: 'neutre'
    },
    { 
      key: 'indexation', 
      label: "Clause d'indexation (À regarder)",
      impactTransmission: 'neutre'
    },
    { 
      key: 'prelevement_indemnisation', 
      label: 'La clause de prélèvement moyennant indemnisation (dite « clause commerciale »)',
      impactTransmission: 'neutre'
    }
  ]
};

// Sous-clauses pour la société d'acquêts
export const SOCIETE_ACQUETS_SUB_CLAUSES: ClauseDefinition[] = [
  { 
    key: 'partage_inegal_sub', 
    label: 'Clause de partage inégal (% en PP et % en usufruit)', 
    hasPercentages: true,
    impactTransmission: 'avantage_matrimonial'
  },
  { 
    key: 'attribution_integrale_sub', 
    label: "Clause d'attribution intégrale (% en PP et % en usufruit)", 
    hasPercentages: true,
    impactTransmission: 'avantage_matrimonial'
  },
  { 
    key: 'preciput_sub', 
    label: 'Clause de préciput', 
    hasAssets: true,
    impactTransmission: 'exclut_succession'
  }
];

// Clauses ayant un impact fiscal sur la transmission
export const CLAUSES_IMPACTING_TRANSMISSION = [
  'attribution_integrale',
  'attribution_integrale_survivant',
  'attribution_integrale_sub',
  'preciput',
  'preciput_sub',
  'partage_inegal',
  'partage_inegal_sub',
  'partage_inegal_acquets',
  'societe_acquets'
] as const;
