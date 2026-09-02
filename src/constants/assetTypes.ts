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
  "Dépôt de garantie",
  "Autres dépôts",
  "Autres disponibilités",

  // Actifs financiers investis
  "Compte-titres (CTO)",
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
  "Droits à royalties",
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

export const TYPE_GARANTIE_OPTIONS = [
  "Hypothèque",
  "Caution",
  "Nantissement",
  "Aucune",
] as const;

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
  "ponctuelle",
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
    "Vins & spiritueux d'investissement",
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
    "Compte-titres (CTO)",
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
    "Droits à royalties",
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
  ]
} as const;

// Libellés affichés distincts de la valeur technique stockée dans assets.nature
// (et comparée telle quelle ailleurs : catégorisation, régimes fiscaux, etc.).
// N'ajouter ici que des natures pour lesquelles on veut un libellé différent
// de la valeur brute d'ASSET_NATURES.
export const NATURE_DISPLAY_LABELS: Record<string, string> = {
  "PEA": "Plan d'Épargne en Actions (PEA)",
  "PEA-PME": "Plan d'Épargne en Actions PME (PEA-PME)",
};

export const getNatureDisplayLabel = (nature: string): string => NATURE_DISPLAY_LABELS[nature] || nature;

export const ASSET_NATURE_OPTIONS = ASSET_NATURES.map((nature) => ({
  value: nature,
  label: getNatureDisplayLabel(nature),
}));

// Natures PER (loi PACTE) pour lesquelles le sous-type Bancaire/Assurantiel
// est proposé. PERCO/PERCOI et PERP sont des produits retraite antérieurs,
// juridiquement distincts d'un PER, volontairement exclus.
export const NATURES_PER = [
  "PER individuel",
  "PER entreprise collectif",
  "PER entreprise obligatoire",
];

// Natures réelles du sous-jacent principal proposées quand un CTO détient
// autre chose que des actions/obligations classiques (voir cto_multi_actifs).
export const CTO_SOUS_JACENT_OPTIONS = [
  "SCPI",
  "Cryptomonnaies",
  "Or / métaux précieux",
  "Private equity (FCPR/FPCI)",
] as const;

// Natures de la famille "épargne et assurance-vie" réellement "hors succession" (art. L132-12
// code des assurances — capital transmis via la clause bénéficiaire, taxé en 990I/757B) —
// contrairement à "Bons & contrats de capitalisation", qui intègrent la succession classique au
// décès (droits de succession de droit commun selon le lien de parenté, transmission par voie
// testamentaire/légale, pas de clause bénéficiaire hors succession). Utilisée par
// dmtg/assurance-vie.ts et transmissionHelpers.ts/transmission/index.ts pour ne plus traiter les
// 4 natures de la famille de façon uniforme.
export const NATURES_AV_HORS_SUCCESSION = [
  "Contrat d'assurance-vie",
  "Contrat vie-génération",
  "PEP assurance vie",
];

export const isAssuranceVieHorsSuccession = (nature: string | null | undefined): boolean =>
  !!nature && NATURES_AV_HORS_SUCCESSION.includes(nature);

// Natures "parts foncières/forestières" de la famille "actifs immobiliers" non éligibles au
// module Sociétés (cf. SOCIETE_ELIGIBLE_NATURES dans societeTransfer.ts, qui ne contient que
// "Parts de SCI") : elles reçoivent à la place, dans AssetForm.tsx, un établissement
// (société de gestion / gestionnaire), des revenus distribués et un régime fiscal dédiés.
export const PARTS_FONCIERES_NATURES = [
  "Parts de SCPI",
  "Parts de groupements fonciers",
  "Parts de GFA, GAF, GFV et GFR",
  "Parts de sociétés d'épargne forestière",
] as const;

// Options de régime fiscal proposées pour chacune des natures ci-dessus (AssetForm.tsx,
// champ regime_fiscal_parts) — la liste dépend de la nature sélectionnée.
export const REGIME_FISCAL_PARTS_OPTIONS: Record<string, string[]> = {
  "Parts de SCPI": ["Revenus fonciers", "SCPI fiscale (Pinel / Malraux / Déficit foncier)", "Autre"],
  "Parts de groupements fonciers": ["Revenus fonciers", "Dividendes", "Autre"],
  "Parts de GFA, GAF, GFV et GFR": ["Revenus fonciers agricoles", "Revenus fonciers viticoles", "Dividendes", "Autre"],
  "Parts de sociétés d'épargne forestière": ["Revenus forestiers", "Dividendes", "Autre"],
};

// Champs additionnels proposés, dans AssetForm.tsx (pill "Caractéristiques"), pour certaines
// natures de la famille "actifs corporels" — les natures absentes de ce mapping (Meubles
// meublants, Véhicules motorisés, Matériel informatique/audiovisuel haut de gamme, Matériel
// sportif de valeur, Autres placements divers) n'affichent aucun champ additionnel.
export type CorpsChamp = 'certificat_expertise' | 'numero_serie' | 'quantite_millesime';

export const CORPS_NATURES_CHAMPS: Record<string, CorpsChamp[]> = {
  "Objets d'art et antiquités": ['certificat_expertise'],
  "Montres": ['certificat_expertise', 'numero_serie'],
  "Objets de collection": ['certificat_expertise'],
  "Bijoux et pierres précieuses": ['certificat_expertise'],
  "Sacs et accessoires de luxe": ['certificat_expertise'],
  "Vins & spiritueux d'investissement": ['quantite_millesime'],
};

// Champs additionnels proposés, dans AssetForm.tsx (pill "Caractéristiques"), pour certaines
// natures de la famille "épargne retraite et prévoyance". "beneficiaire_designe" est listé ici
// pour les 3 natures PER, mais reste soumis en plus, côté AssetForm.tsx, à la condition
// sous_type_per === 'Assurantiel' (masqué si Bancaire ou non renseigné) — cette nuance ne peut
// pas être exprimée dans ce mapping statique nature → champs.
export type RetraitePrevoyanceChamp = 'capital_garanti' | 'beneficiaire_designe' | 'mode_sortie';

export const RETRAITE_PREVOYANCE_NATURES_CHAMPS: Record<string, RetraitePrevoyanceChamp[]> = {
  'PER individuel': ['beneficiaire_designe', 'mode_sortie'],
  'PER entreprise collectif': ['beneficiaire_designe', 'mode_sortie'],
  'PER entreprise obligatoire': ['beneficiaire_designe', 'mode_sortie'],
  'PERCO/PERCOI': ['mode_sortie'],
  'PERP': ['mode_sortie'],
  'Contrat loi Madelin': ['mode_sortie'],
  'Contrat loi Madelin Agricole': ['mode_sortie'],
  'Contrat article 83': ['mode_sortie'],
  'Contrat article 82': ['mode_sortie'],
  'Contrat Préfon-retraite': ['mode_sortie'],
  'Contrat retraite mutualiste du combattant': ['mode_sortie'],
  'Régimes de retraite étrangers': ['mode_sortie'],
  'Temporaire décès': ['capital_garanti', 'beneficiaire_designe'],
  'Vie entière': ['capital_garanti', 'beneficiaire_designe'],
  'Contrat prévoyance individuelle': ['capital_garanti', 'beneficiaire_designe'],
};

export const MODE_SORTIE_OPTIONS = ['Rente', 'Capital', 'Mixte'] as const;

// Natures de la famille "épargne salariale" recevant, dans AssetForm.tsx (pill
// "Caractéristiques"), les champs abondement employeur / date de disponibilité / motif de
// déblocage anticipé / support d'investissement — les 2 natures de la famille en bénéficient
// toutes les deux de façon identique (pas de variance par nature, contrairement à
// CORPS_NATURES_CHAMPS/RETRAITE_PREVOYANCE_NATURES_CHAMPS), d'où un simple tableau plutôt qu'un
// mapping nature → champs.
export const NATURES_EPARGNE_SALARIALE = ["PEE", "PEI"];

export const MOTIF_DEBLOCAGE_ANTICIPE_OPTIONS = [
  "Mariage/PACS",
  "Naissance/adoption (3e enfant)",
  "Divorce avec garde d'enfant",
  "Invalidité",
  "Décès",
  "Cessation du contrat de travail",
  "Création/reprise d'entreprise",
  "Acquisition résidence principale",
  "Surendettement",
  "Aucun — épargne non débloquée",
] as const;

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
  "Autres disponibilités",
  "Compte courant d'associé"
];