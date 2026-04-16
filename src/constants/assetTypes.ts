export const ASSET_NATURES = [
  // Actifs immobiliers
  "Résidence principale",
  "Résidences secondaires", 
  "Terrains",
  "Terrains agricoles",
  "Immeubles locatifs (loués nus)",
  "Immeubles locatifs (LMNP)",
  "Immeubles locatifs (LMP)",
  "Immeubles professionnels (hors LMP)",
  "Autres immeubles de rapport",
  "Parts de SCI",
  "Parts de SCPI",
  "Parts de groupements fonciers",
  "Parts de GFA, GAF, GFV et GFR",
  "Bois & forêts",
  "Parts de sociétés d'épargne forestière",
  "Maison mobile (péniche, etc.)",
  "Parking / Garage / Box",
  "Autres biens d'usage",
  
  // Actifs corporels
  "Meubles meublants",
  "Objets d'art et antiquités",
  "Véhicules motorisés",
  "Montres",
  "Objets de collection",
  "Bijoux et pierres précieuses",
  "Sacs et accessoires de luxe",
  "Matériel informatique ou audiovisuel haut de gamme",
  "Matériel sportif de valeur",
  "Vins & spiritueux d'investissement",
  "Autres placements divers",
  
  // Actifs professionnels
  "Droits sociaux",
  "Autres droits sociaux",
  "Entreprise individuelle",
  "Parts de holding",
  "Compte courant d'associé",
  "Autres biens professionnels",
  
  // Retraite et prévoyance
  "PER individuel",
  "PER entreprise collectif",
  "PER entreprise obligatoire",
  "PERCO/PERCOI",
  "PERP",
  "Contrat loi Madelin",
  "Contrat loi Madelin Agricole",
  "Contrat article 83",
  "Contrat article 82",
  "Contrat Préfon-retraite",
  "Contrat retraite mutualiste du combattant",
  "Régimes de retraite étrangers",
  "Temporaire décès",
  "Vie entière",
  "Contrat prévoyance individuelle",
  "Contrat d'assurance-vie",
  "Contrat vie-génération",
  "PEP assurance vie",
  "Bons & contrats de capitalisation",
  "PEE",
  "PEI",
  
  // Actifs financiers liquides
  "Comptes courants",
  "Comptes sur livret (CSL)",
  "Livret A",
  "Livret Bleu",
  "Livret de développement durable et solidaire (LDDS)",
  "Livret d'épargne populaire (LEP)",
  "Livret Jeune",
  "CEL",
  "PEL",
  "Compte à terme",
  "Bons de caisse (ou bon d'épargne)",
  "PEP Bancaire",
  "Autres dépôts",
  "Autres disponibilités",
  
  // Actifs financiers investis
  "Compte-titres",
  "PEA",
  "PEA-PME",
  "Parts de FIP",
  "Parts de FIP Corse",
  "Parts de FCPI",
  "Parts de SOFICA",
  "Actions",
  "Obligations",
  "Credit default swap",
  "Contrat à terme",
  "Options",
  "Stock-options",
  "Actions gratuites",
  "Titres de dette subordonné",
  "Bons du Trésor",
  "BCSPE",
  "Portefeuille de valeurs numériques (cryptomonnaies)",
  "Objets numériques (NFT, etc.)",
  "Droits de propriété littéraire ou artistique",
  "Fonds de private equity (LBO, growth, venture)",
  "Club deals",
  "SPV d'investissement (structures ad hoc)",
  "Fonds de dette privée",
  "Produits structurés",
  "Autres produits dérivés (Swap, Warrants, CFD...)",
  "Or (physique)",
  "Métaux précieux (argent, platine)",
  "Matières premières (pétrole, blé…)",
  "Autres valeurs mobilières"
];

export const EMPRUNT_NATURES = [
  "Crédit à la consommation",
  "Crédit affecté (auto, travaux, etc.)",
  "Crédit in fine (adossé à assurance-vie ou autres actifs)",
  "Crédit Lombard (prêt gagé sur portefeuille-titres)",
  "Crédit relais",
  "Crédit renouvelable / revolving",
  "Prêt immobilier (résidence principale)",
  "Prêt immobilier (résidences secondaires)",
  "Prêt immobilier locatif (investissement locatif)",
  "Prêt pour acquisition de SCPI"
];

export const PASSIF_NATURES = [
  "Autres dettes diverses",
  "Avances sur contrats d'assurance-vie",
  "Cotisations sociales non réglées",
  "Dettes issues d'un divorce ou d'un partage de communauté", 
  "Dettes successorales (droits de succession restant dus)",
  "Emprunts familiaux ou privés",
  "Emprunts participatifs",
  "Engagements liés à produits d'investissement (appels de marge, etc.)",
  "Impôt sur la fortune immobilière (IFI) restant dû",
  "Impôt sur le revenu restant dû",
  "Indemnités prud'homales ou litiges judiciaires en cours",
  "Prêt patronal",
  "Prêts entre particuliers contractés"
];

export const CHARGE_TYPES = [
  "Charges courantes",
  "Charges fiscales"
] as const;

export const DEBITEUR_OPTIONS = [
  "Époux 1",
  "Époux 2", 
  "Couple"
] as const;

export const PERIODICITE_OPTIONS = [
  "annuelle",
  "trimestrielle",
  "mensuelle"
] as const;

export const DUREE_TYPE_OPTIONS = [
  "Indéterminée",
  "Jusqu'à date",
  "Pendant années"
] as const;

export const UNITE_OPTIONS = [
  "€",
  "%"
] as const;

export const ASSET_CATEGORIES = {
  "actifs immobiliers": [
    "Résidence principale",
    "Résidences secondaires", 
    "Terrains",
    "Terrains agricoles",
    "Immeubles locatifs (loués nus)",
    "Immeubles locatifs (LMNP)",
    "Immeubles locatifs (LMP)",
    "Immeubles professionnels (hors LMP)",
    "Autres immeubles de rapport",
    "Parts de SCI",
    "Parts de SCPI",
    "Parts de groupements fonciers",
    "Parts de GFA, GAF, GFV et GFR",
    "Bois & forêts",
    "Parts de sociétés d'épargne forestière",
    "Maison mobile (péniche, etc.)",
    "Parking / Garage / Box",
    "Autres biens d'usage"
  ],
  "actifs corporels": [
    "Meubles meublants",
    "Objets d'art et antiquités",
    "Véhicules motorisés",
    "Montres",
    "Objets de collection",
    "Bijoux et pierres précieuses",
    "Sacs et accessoires de luxe",
    "Matériel informatique ou audiovisuel haut de gamme",
    "Matériel sportif de valeur",
    "Autres placements divers"
  ],
  "actifs professionnels": [
    "Droits sociaux",
    "Autres droits sociaux",
    "Entreprise individuelle",
    "Parts de holding",
    "Compte courant d'associé",
    "Autres biens professionnels"
  ],
  "épargne retraite et prévoyance": [
    "PER individuel",
    "PER entreprise collectif",
    "PER entreprise obligatoire",
    "PERCO/PERCOI",
    "PERP",
    "Contrat loi Madelin",
    "Contrat loi Madelin Agricole",
    "Contrat article 83",
    "Contrat article 82",
    "Contrat Préfon-retraite",
    "Contrat retraite mutualiste du combattant",
    "Régimes de retraite étrangers",
    "Temporaire décès",
    "Vie entière",
    "Contrat prévoyance individuelle"
  ],
  "épargne et assurance-vie": [
    "Contrat d'assurance-vie",
    "Contrat vie-génération",
    "PEP assurance vie",
    "Bons & contrats de capitalisation"
  ],
  "épargne salariale": [
    "PEE",
    "PEI"
  ],
  "épargne bancaire / liquidités": [
    "Comptes courants",
    "Comptes sur livret (CSL)",
    "Livret A",
    "Livret Bleu",
    "Livret de développement durable et solidaire (LDDS)",
    "Livret d'épargne populaire (LEP)",
    "Livret Jeune",
    "CEL",
    "PEL",
    "Compte à terme",
    "Bons de caisse (ou bon d'épargne)",
    "PEP Bancaire",
    "Dépôt de garantie",
    "Autres dépôts",
    "Autres disponibilités"
  ],
  "valeurs mobilières et placements financiers": [
    "Compte-titres",
    "PEA",
    "PEA-PME",
    "Parts de FIP",
    "Parts de FIP Corse",
    "Parts de FCPI",
    "Parts de SOFICA",
    "Actions",
    "Obligations",
    "Credit default swap",
    "Contrat à terme",
    "Options",
    "Stock-options",
    "Actions gratuites",
    "Titres de dette subordonné",
    "Bons du Trésor",
    "BCSPE",
    "Portefeuille de valeurs numériques (cryptomonnaies)",
    "Objets numériques (NFT, etc.)",
    "Droits de propriété littéraire ou artistique",
    "Autres valeurs mobilières"
  ]
} as const;

export const getAssetCategory = (nature: string): string => {
  for (const [category, natures] of Object.entries(ASSET_CATEGORIES)) {
    if ((natures as readonly string[]).includes(nature)) {
      return category;
    }
  }
  return "autres";
};

// Natures pour lesquelles les champs d'acquisition (date, valeur, frais) et plus-values n'ont pas de sens
export const NATURES_WITHOUT_ACQUISITION: string[] = [
  "Comptes courants",
  "Comptes sur livret (CSL)",
  "Livret A",
  "Livret Bleu",
  "Livret de développement durable et solidaire (LDDS)",
  "Livret d'épargne populaire (LEP)",
  "Livret Jeune",
  "CEL",
  "PEL",
  "Compte à terme",
  "Bons de caisse (ou bon d'épargne)",
  "PEP Bancaire",
  "Dépôt de garantie",
  "Autres dépôts",
  "Autres disponibilités"
];