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
  
  // Actifs mobiliers corporels
  "Meubles meublants",
  "Objets d'art et antiquités",
  "Objets numériques (NFT, etc.)",
  "Autres placements divers",
  
  // Actifs professionnels
  "Droits sociaux",
  "Droits sociaux (Pacte Dutreil)",
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
  "Contrat 83",
  "Contrat 82",
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
  "PERCO",
  
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
  "Bons de caisse",
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
  "Portefeuille de valeurs numériques (cryptomonnaies)",
  "Droits de propriété littéraire ou artistique",
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
  "immobiliers": [
    "Résidence principale",
    "Résidences secondaires", 
    "Terrains",
    "Autres biens d'usage",
    "Immeubles locatifs (loués nus)",
    "Immeubles locatifs (LMNP)",
    "Immeubles locatifs (LMP)",
    "Parts de SCI",
    "Parts de SCPI",
    "Autres immeubles de rapport",
    "Immeubles professionnels (hors LMP)",
    "Terrains agricoles",
    "Parts de groupements fonciers",
    "Bois & forêts",
    "Parts de GFA, GAF, GFV et GFR",
    "Parts de sociétés d'épargne forestière"
  ],
  "mobiliers corporels": [
    "Meubles meublants",
    "Objets d'art et antiquités",
    "Autres placements divers"
  ],
  "professionnels": [
    "Droits sociaux",
    "Droits sociaux (Pacte Dutreil)",
    "Autres droits sociaux",
    "Entreprise individuelle",
    "Autres biens professionnels",
    "Parts de holding",
    "Compte courant d'associé"
  ],
  "retraite et prévoyance": [
    "PER individuel",
    "PER entreprise collectif",
    "PER entreprise obligatoire",
    "PERCO / PERCOI",
    "PERP",
    "Contrat loi Madelin",
    "Contrat loi Madelin Agricole",
    "Contrat 83",
    "Contrat 82",
    "Contrat Préfon-retraite",
    "Contrat retraite mutualiste du combattant",
    "Temporaire décès",
    "Vie entière",
    "Contrat prévoyance individuelle",
    "Contrat d'assurance-vie",
    "Contrat vie-génération",
    "PEP assurance vie",
    "Bons & contrats de capitalisation",
    "PEE / PEI"
  ],
  "financiers liquides": [
    "PEL",
    "CEL",
    "PEP Bancaire",
    "Comptes courants",
    "Comptes sur livret (CSL)",
    "LDDS",
    "Livret A",
    "Livret Bleu",
    "LEP",
    "Livret Jeune",
    "Compte à terme",
    "Bons de caisse",
    "Autres dépôts",
    "Autres disponibilités"
  ],
  "financiers investis": [
    "Compte-titres",
    "PEA",
    "PEA-PME",
    "Portefeuille de valeurs numériques (cryptomonnaies)",
    "Parts de SOFICA",
    "Parts de FIP",
    "Parts de FCPI",
    "Parts de FIP Corse",
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