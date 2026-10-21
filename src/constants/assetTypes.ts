export const EMPRUNT_NATURES = [
  "Crédit à la consommation",
  "Crédit affecté (auto, travaux, etc.)",
  "Crédit in fine (adossé à assurance-vie ou autres actifs)",
  "Crédit Lombard (prêt gagé sur portefeuille-titres)",
  "Crédit relais",
  "Crédit renouvelable / revolving",
  "Prêt à taux zéro (PTZ)",
  "Prêt immobilier (résidence principale)",
  "Prêt immobilier (résidences secondaires)",
  "Prêt immobilier locatif (investissement locatif)",
  "Prêt pour acquisition de SCPI"
];

// Sous-groupes d'affichage des emprunts dans la fenêtre de choix de nature (sans effet sur la valeur stockée).
export const EMPRUNT_SOUS_GROUPES: { titre: string; natures: readonly string[] }[] = [
  { titre: "Immobilier", natures: [
    "Prêt immobilier (résidence principale)",
    "Prêt immobilier (résidences secondaires)",
    "Prêt immobilier locatif (investissement locatif)",
    "Prêt à taux zéro (PTZ)",
    "Crédit relais",
    "Prêt pour acquisition de SCPI",
  ] },
  { titre: "Consommation", natures: [
    "Crédit à la consommation",
    "Crédit affecté (auto, travaux, etc.)",
    "Crédit renouvelable / revolving",
  ] },
  { titre: "Adossés à un patrimoine", natures: [
    "Crédit in fine (adossé à assurance-vie ou autres actifs)",
    "Crédit Lombard (prêt gagé sur portefeuille-titres)",
  ] },
];

// Sous-groupes d'affichage des dettes dans la fenêtre de choix de nature (sans effet sur la valeur stockée).
export const DETTE_SOUS_GROUPES: { titre: string; natures: readonly string[] }[] = [
  { titre: "Fiscales et sociales", natures: [
    "Impôt sur le revenu restant dû",
    "Impôt sur la fortune immobilière (IFI) restant dû",
    "Dettes successorales (droits de succession restant dus)",
    "Cotisations sociales non réglées",
  ] },
  { titre: "Prêts privés", natures: [
    "Emprunts familiaux ou privés",
    "Prêts entre particuliers contractés",
    "Prêt patronal",
    "Emprunts participatifs",
  ] },
  { titre: "Litiges et séparations", natures: [
    "Dettes issues d'un divorce ou d'un partage de communauté",
    "Indemnités prud'homales ou litiges judiciaires en cours",
  ] },
  { titre: "Autres", natures: [
    "Engagements liés à produits d'investissement (appels de marge, etc.)",
    "Autres dettes diverses",
  ] },
];

export const TYPE_GARANTIE_OPTIONS = [
  "Hypothèque",
  "Caution",
  "Nantissement",
  "Aucune",
] as const;

// Déclaratifs, saisis tels que figurant sur l'offre de prêt — cf. docs/patrimoine.md.
export const MODE_AMORTISSEMENT_OPTIONS = [
  "Amortissable",
  "In fine",
] as const;

export const TYPE_TAUX_OPTIONS = [
  "Fixe",
  "Variable",
  "Mixte",
] as const;

// « Avances sur contrats d'assurance-vie » retirée (2026-10-14) : l'avance se saisit sur le contrat
// (av_contract_details.avance_en_cours), l'assureur la déduisant du capital décès — ce n'est pas une
// dette de la succession.
export const PASSIF_NATURES = [
  "Autres dettes diverses",
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

// Catégories et natures d'actifs (refonte validée le 2026-10-18, docs/patrimoine.md). Les
// valeurs sont stockées telles quelles dans assets.nature et comparées ailleurs (régimes
// fiscaux, IFI, Transmission) : un libellé différent passe par NATURE_DISPLAY_LABELS.
export const ASSET_CATEGORIES = {
  "actifs immobiliers": [
    "Résidence principale",
    "Résidences secondaires",
    "Terrains",
    "Terrains agricoles",
    "Immeubles locatifs (loués nus)",
    "Immeubles locatifs (meublés)",
    "Immeubles professionnels (hors LMP)",
    "Parts de SCI",
    "Parts de SCPI",
    "Parts de groupements fonciers",
    "Bois & forêts",
    "Parts de sociétés d'épargne forestière",
    "Maison mobile (péniche, etc.)",
    "Parking / Garage / Box"
  ],
  "actifs corporels": [
    "Meubles meublants",
    "Objets d'art et de collection",
    "Véhicules motorisés",
    "Montres",
    "Bijoux et pierres précieuses",
    "Sacs et accessoires de luxe",
    "Matériel informatique ou audiovisuel haut de gamme",
    "Matériel sportif de valeur",
    "Vins & spiritueux d'investissement",
    "Or et métaux précieux"
  ],
  "actifs professionnels": [
    "Droits sociaux",
    "Entreprise individuelle",
    "Parts de holding",
    "Compte courant d'associé",
    "Autres biens professionnels"
  ],
  "épargne retraite": [
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
    "Régimes de retraite étrangers"
  ],
  // Contrats de prévoyance décès : sans valeur de rachat (sauf vie entière), ils pèsent 0 dans
  // le patrimoine mais restent transmis par clause (capital garanti, cf. NATURES_PREVOYANCE_DECES).
  "prévoyance": [
    "Temporaire décès",
    "Vie entière",
    "Contrat prévoyance individuelle"
  ],
  "épargne et assurance-vie": [
    "Contrat d'assurance-vie",
    "Assurance-vie luxembourgeoise",
    "Contrat vie-génération",
    "PEP assurance vie",
    "Bons & contrats de capitalisation",
    "Contrat de capitalisation luxembourgeois"
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
    "PEP Bancaire"
  ],
  "valeurs mobilières et placements financiers": [
    "Compte-titres (CTO)",
    "PEA",
    "PEA-PME",
    "Fonds de capital-investissement",
    "Parts de SOFICA",
    "Stock-options",
    "Actions gratuites",
    "BSPCE",
    "Portefeuille de valeurs numériques (cryptomonnaies)",
    "Objets numériques (NFT, etc.)",
    "Club deals",
    "SPV d'investissement (structures ad hoc)",
    "Fonds de dette privée",
    "Autres placements divers",
    "Autres valeurs mobilières"
  ],
  // Sommes dues au foyer : valorisées au montant restant dû, sans plus-value.
  "créances": [
    "Prêt consenti à un proche",
    "Créance sur un tiers (reconnaissance de dette)",
    "Soulte ou prix de vente à recevoir",
    "Dépôt de garantie"
  ],
  "autres": [
    "Droits de propriété littéraire ou artistique",
    "Droits à royalties"
  ]
} as const;

// Ordre d'affichage du sélecteur de nature : celui des catégories ci-dessous.
export const ASSET_NATURES: string[] = Object.values(ASSET_CATEGORIES).flat();

// Sous-groupes d'affichage du sélecteur de nature (NaturePicker), sans effet sur la catégorie
// ni sur le stockage. Une catégorie absente s'affiche à plat. Chaque catégorie listée doit
// couvrir exactement ses natures d'ASSET_CATEGORIES (vérifié par assetTypes.test.ts).
/** Natures retirées du choix à la saisie (règles spécifiques à reprendre plus tard).
 *  Toujours reconnues pour les actifs existants, qui gardent leur nature. */
export const NATURES_MASQUEES_SAISIE: readonly string[] = ["Maison mobile (péniche, etc.)"];

export const NATURE_SOUS_GROUPES: Partial<Record<keyof typeof ASSET_CATEGORIES, { titre: string; natures: string[] }[]>> = {
  "actifs immobiliers": [
    { titre: "Résidences", natures: ["Résidence principale", "Résidences secondaires", "Maison mobile (péniche, etc.)", "Parking / Garage / Box"] },
    { titre: "Locatif et professionnel", natures: ["Immeubles locatifs (loués nus)", "Immeubles locatifs (meublés)", "Immeubles professionnels (hors LMP)"] },
    { titre: "Foncier", natures: ["Terrains", "Terrains agricoles", "Bois & forêts"] },
    { titre: "Parts de sociétés", natures: ["Parts de SCI", "Parts de SCPI", "Parts de groupements fonciers", "Parts de sociétés d'épargne forestière"] },
  ],
  "actifs corporels": [
    { titre: "Cadre de vie", natures: ["Meubles meublants", "Véhicules motorisés", "Matériel informatique ou audiovisuel haut de gamme", "Matériel sportif de valeur"] },
    { titre: "Objets de valeur", natures: ["Objets d'art et de collection", "Montres", "Bijoux et pierres précieuses", "Sacs et accessoires de luxe"] },
    { titre: "Placements tangibles", natures: ["Vins & spiritueux d'investissement", "Or et métaux précieux"] },
  ],
  "épargne retraite": [
    { titre: "PER (loi PACTE)", natures: ["PER individuel", "PER entreprise collectif", "PER entreprise obligatoire"] },
    { titre: "Anciens contrats d'entreprise", natures: ["PERCO/PERCOI", "Contrat article 83", "Contrat article 82"] },
    { titre: "Anciens contrats individuels", natures: ["PERP", "Contrat loi Madelin", "Contrat loi Madelin Agricole", "Contrat Préfon-retraite", "Contrat retraite mutualiste du combattant"] },
    { titre: "Étranger", natures: ["Régimes de retraite étrangers"] },
  ],
  "épargne et assurance-vie": [
    { titre: "Assurance-vie", natures: ["Contrat d'assurance-vie", "Assurance-vie luxembourgeoise", "Contrat vie-génération", "PEP assurance vie"] },
    { titre: "Capitalisation", natures: ["Bons & contrats de capitalisation", "Contrat de capitalisation luxembourgeois"] },
  ],
  "épargne bancaire / liquidités": [
    { titre: "Comptes", natures: ["Comptes courants", "Compte à terme"] },
    { titre: "Livrets", natures: ["Comptes sur livret (CSL)", "Livret A", "Livret Bleu", "Livret de développement durable et solidaire (LDDS)", "Livret d'épargne populaire (LEP)", "Livret Jeune"] },
    { titre: "Épargne logement et bons", natures: ["CEL", "PEL", "PEP Bancaire", "Bons de caisse (ou bon d'épargne)"] },
  ],
  "valeurs mobilières et placements financiers": [
    { titre: "Enveloppes", natures: ["Compte-titres (CTO)", "PEA", "PEA-PME"] },
    { titre: "Non coté", natures: ["Fonds de capital-investissement", "Club deals", "SPV d'investissement (structures ad hoc)", "Fonds de dette privée"] },
    { titre: "Défiscalisation", natures: ["Parts de SOFICA"] },
    { titre: "Actionnariat salarié", natures: ["Stock-options", "Actions gratuites", "BSPCE"] },
    { titre: "Actifs alternatifs", natures: ["Portefeuille de valeurs numériques (cryptomonnaies)", "Objets numériques (NFT, etc.)"] },
    { titre: "Divers", natures: ["Autres placements divers", "Autres valeurs mobilières"] },
  ],
};



// Libellés affichés distincts de la valeur technique stockée dans assets.nature
// (et comparée telle quelle ailleurs : catégorisation, régimes fiscaux, etc.).
// N'ajouter ici que des natures pour lesquelles on veut un libellé différent
// de la valeur brute d'ASSET_NATURES.
export const NATURE_DISPLAY_LABELS: Record<string, string> = {
  "Immeubles locatifs (meublés)": "Immeubles locatifs (LMNP et LMP)",
  "Immeubles professionnels (hors LMP)": "Locaux professionnels et commerciaux",
  "PEA": "Plan d'Épargne en Actions (PEA)",
  "PEA-PME": "Plan d'Épargne en Actions PME (PEA-PME)",
  "Résidences secondaires": "Résidence secondaire",
  "Terrains": "Terrain",
  "CEL": "Compte épargne logement (CEL)",
  "PEL": "Plan épargne logement (PEL)",
  "PEE": "Plan d'épargne entreprise (PEE)",
  "PEI": "Plan d'épargne interentreprises (PEI)",
  "BSPCE": "Bons de souscription de parts de créateur d'entreprise (BSPCE)",
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
  // Contrat luxembourgeois : même régime civil et fiscal qu'un contrat français pour un
  // résident (L132-12, 990 I / 757 B) ; seule la protection des avoirs diffère.
  "Assurance-vie luxembourgeoise",
  "Contrat vie-génération",
  "PEP assurance vie",
];

export const isAssuranceVieHorsSuccession = (nature: string | null | undefined): boolean =>
  !!nature && NATURES_AV_HORS_SUCCESSION.includes(nature);

// "PER entreprise obligatoire" (ex-article 83) est toujours souscrit via un contrat d'assurance
// de groupe : son sous-type est figé sur Assurantiel, quelle que soit la valeur en base.
export const NATURE_PER_TOUJOURS_ASSURANTIEL = "PER entreprise obligatoire";

export const isPER = (nature: string | null | undefined): boolean =>
  !!nature && NATURES_PER.includes(nature);

// PER sans sous-type renseigné (hors PER obligatoire) : impossible de savoir s'il sort de la
// succession — l'appelant doit bloquer le calcul (cf. transmissionHelpers.ts::assertPERQualifies),
// jamais deviner.
export const isPERNonQualifie = (asset: { nature?: string | null; sous_type_per?: string | null }): boolean =>
  isPER(asset.nature) && asset.nature !== NATURE_PER_TOUJOURS_ASSURANTIEL
  && asset.sous_type_per !== 'Assurantiel' && asset.sous_type_per !== 'Bancaire';

// PER assurantiel (contrat d'assurance de groupe, loi PACTE) : capital décès versé hors
// succession aux bénéficiaires de la clause (art. L132-12 C. assur.), taxé en 990 I si le
// titulaire décède avant 70 ans, 757 B après. Un PER bancaire (compte-titres) reste, lui,
// dans l'actif successoral de droit commun.
export const isPERAssurantiel = (asset: { nature?: string | null; sous_type_per?: string | null }): boolean =>
  isPER(asset.nature)
  && (asset.nature === NATURE_PER_TOUJOURS_ASSURANTIEL || asset.sous_type_per === 'Assurantiel');

// Tout contrat transmis hors succession via une clause bénéficiaire (assurance-vie ou PER
// assurantiel) — à utiliser partout où l'actif successoral est construit, à la place de
// isAssuranceVieHorsSuccession qui ne voit que la nature.
// Contrats de retraite par rente, d'assurance (PERP, Madelin, article 83, Préfon, retraite
// mutualiste du combattant). Au décès en phase de constitution, tout dépend de la garantie
// décès (contre-assurance / réversion) : sans elle, l'épargne reste acquise à l'assureur
// (mutualisation) — rien n'est transmis ni n'entre dans la succession ; avec elle, rente ou
// capital versé hors succession aux bénéficiaires de la clause. Exclus du 990 I si primes
// échelonnées sur 15 ans et sortie au plus tôt à la retraite (art. 990 I al. 2 CGI,
// BOI-TCAS-AUT-60 §150-171) ; le 757 B reste applicable aux primes versées après 70 ans.
export const NATURES_RETRAITE_RENTE = [
  "PERP",
  "Contrat loi Madelin",
  "Contrat loi Madelin Agricole",
  "Contrat article 83",
  "Contrat Préfon-retraite",
  "Contrat retraite mutualiste du combattant",
];

// Madelin et article 83 remplissent par construction les conditions d'exclusion du 990 I
// (cotisations périodiques, sortie à la retraite) : valeur proposée par défaut dans le formulaire.
export const NATURES_RETRAITE_RENTE_EXONERATION_990I_PAR_DEFAUT = [
  "Contrat loi Madelin",
  "Contrat loi Madelin Agricole",
  "Contrat article 83",
];

export const isRetraiteRente = (nature: string | null | undefined): boolean =>
  !!nature && NATURES_RETRAITE_RENTE.includes(nature);

// assure_tiers : assurance-vie dont l'assuré n'est pas le souscripteur — non dénouée au décès du
// souscripteur, sa valeur de rachat entre dans l'actif successoral (jamais hors succession).
type ContratInput = {
  nature?: string | null; sous_type_per?: string | null; garantie_deces?: boolean | null; assure_tiers?: boolean | null;
  regime_retraite_etrangere?: string | null;
};

// Régime de retraite étranger : sa transmission au décès dépend du droit du régime — qualifiée sur
// le bien, jamais présumée (calcul bloqué sinon, cf. transmissionHelpers.ts::assertPERQualifies).
// 'actif_successoral' : épargne transmise par la succession ; 'clause_beneficiaire' : capital versé
// aux bénéficiaires désignés, régime de l'assurance-vie (990 I / 757 B) ; 'aucune' : rente éteinte.
export const NATURE_RETRAITE_ETRANGERE = "Régimes de retraite étrangers";
export type RegimeRetraiteEtrangere = 'actif_successoral' | 'clause_beneficiaire' | 'aucune';

export const isRetraiteEtrangereNonQualifiee = (asset: ContratInput): boolean =>
  asset.nature === NATURE_RETRAITE_ETRANGERE
  && !['actif_successoral', 'clause_beneficiaire', 'aucune'].includes(asset.regime_retraite_etrangere || '');

// Contrat hors succession qui ne transmet rien (épargne acquise à l'assureur ou rente éteinte) :
// jamais un AVContract.
export const isContratNonTransmis = (asset: ContratInput): boolean =>
  isRetraiteRenteSansGarantie(asset)
  || (asset.nature === NATURE_RETRAITE_ETRANGERE && asset.regime_retraite_etrangere === 'aucune');

// Garantie décès non renseignée : impossible de savoir si le contrat transmet quoi que ce
// soit — calcul bloqué (cf. transmissionHelpers.ts::assertContratsRetraiteQualifies).
export const isRetraiteRenteNonQualifie = (asset: ContratInput): boolean =>
  isRetraiteRente(asset.nature) && asset.garantie_deces !== true && asset.garantie_deces !== false;

// Sans garantie décès : hors succession ET non transmis (épargne acquise à l'assureur).
export const isRetraiteRenteSansGarantie = (asset: ContratInput): boolean =>
  isRetraiteRente(asset.nature) && asset.garantie_deces === false;

// Contrats de prévoyance décès (temporaire décès, vie entière, prévoyance individuelle) : capital
// versé hors succession aux bénéficiaires de la clause (art. L132-12 C. assur.). Le capital
// transmis est le capital garanti (assets.capital_garanti), jamais la valeur estimée. Contrats non
// rachetables : l'assiette 990 I est la fraction rachetable (valeur de rachat d'une vie entière,
// assets.valeur_estimee ; 0 pour les deux autres) plus les primes de la dernière année, plafonnée
// au capital (art. 990 I, BOI-TCAS-AUT-60) ; 757 B sur les primes versées après 70 ans.
export const NATURES_PREVOYANCE_DECES = [
  "Temporaire décès",
  "Vie entière",
  "Contrat prévoyance individuelle",
];

// Seule nature de prévoyance pouvant avoir une valeur de rachat.
export const NATURE_PREVOYANCE_RACHETABLE = "Vie entière";

export const isPrevoyanceDeces = (nature: string | null | undefined): boolean =>
  !!nature && NATURES_PREVOYANCE_DECES.includes(nature);

// Capital garanti non renseigné : capital transmis inconnu — calcul bloqué
// (cf. transmissionHelpers.ts::assertPERQualifies).
export const isPrevoyanceNonQualifiee = (asset: { nature?: string | null; capital_garanti?: number | null }): boolean =>
  isPrevoyanceDeces(asset.nature) && !(Number(asset.capital_garanti) > 0);

// Contrat article 82 (retraite supplémentaire à cotisations définies, assurance de groupe) : en
// phase de constitution, capital décès versé hors succession aux bénéficiaires de la clause,
// même régime qu'une assurance-vie (990 I / 757 B selon l'âge à chaque versement).
export const NATURE_ARTICLE_82 = "Contrat article 82";

// Capital décès d'un contrat transmis par clause : capital garanti pour la prévoyance, valeur
// estimée (valeur du contrat) sinon.
export const getCapitalDecesContrat = (asset: { nature?: string | null; valeur_estimee?: number | null; capital_garanti?: number | null }): number =>
  isPrevoyanceDeces(asset.nature) ? Number(asset.capital_garanti) || 0 : Number(asset.valeur_estimee) || 0;

// Biens dont les données de contrat (av_contract_details : clause bénéficiaire, origine des
// fonds ; av_operations : versements) sont chargées pour le calcul de transmission : famille
// "épargne et assurance-vie" + PER assurantiels + contrats de retraite par rente avec garantie
// décès + prévoyance décès + article 82.
export const hasDonneesContratAV = (asset: ContratInput): boolean =>
  getAssetCategory(asset.nature || '') === 'épargne et assurance-vie' || isPERAssurantiel(asset)
  || (isRetraiteRente(asset.nature) && asset.garantie_deces === true)
  || isPrevoyanceDeces(asset.nature) || asset.nature === NATURE_ARTICLE_82
  || (asset.nature === NATURE_RETRAITE_ETRANGERE && asset.regime_retraite_etrangere === 'clause_beneficiaire');

export const isContratHorsSuccession = (asset: ContratInput): boolean =>
  (isAssuranceVieHorsSuccession(asset.nature) && !asset.assure_tiers) || isPERAssurantiel(asset) || isRetraiteRente(asset.nature)
  || isPrevoyanceDeces(asset.nature) || asset.nature === NATURE_ARTICLE_82
  || (asset.nature === NATURE_RETRAITE_ETRANGERE
    && (asset.regime_retraite_etrangere === 'clause_beneficiaire' || asset.regime_retraite_etrangere === 'aucune'));

// Les 4 natures de la famille "épargne et assurance-vie" (hors succession + "Bons & contrats de
// capitalisation") — utilisée dans AssetForm.tsx pour le vocabulaire assurantiel ("Souscripteur"
// plutôt que "Détenteur") et pour masquer l'attachement émotionnel, sans rapport avec le régime
// de transmission qui ne distingue, lui, que les 3 natures hors succession ci-dessus.
export const NATURES_EPARGNE_ASSURANCE_VIE = ASSET_CATEGORIES['épargne et assurance-vie'];

export const isEpargneAssuranceVie = (nature: string | null | undefined): boolean =>
  !!nature && (NATURES_EPARGNE_ASSURANCE_VIE as readonly string[]).includes(nature);

// Contrats d'assurance et de retraite (assurance-vie, capitalisation, épargne retraite,
// prévoyance) : un souscripteur, jamais d'indivision avec un tiers ; libellé « Souscripteur ».
export const isContratSouscrit = (nature: string | null | undefined): boolean =>
  !!nature && (['épargne et assurance-vie', 'épargne retraite', 'prévoyance'] as const)
    .some((c) => (ASSET_CATEGORIES[c] as readonly string[]).includes(nature));

// Plans d'épargne en actions : un titulaire unique (pas de compte joint ni d'indivision,
// art. L221-30 CMF), alors même que leur valeur peut être commune entre époux.
export const NATURES_PEA = ['PEA', 'PEA-PME'] as const;

export const NATURE_CTO = 'Compte-titres (CTO)';
export const isCTO = (nature: string | null | undefined): boolean => nature === NATURE_CTO;

// Non coté à appels de fonds : valeur_acquisition = montant appelé (sommes effectivement versées),
// distinct du montant engagé (montant_engage). Club deals / SPV : titres de société (art. 1832-2).
export const NATURES_NON_COTE = [
  'Club deals',
  "SPV d'investissement (structures ad hoc)",
  'Fonds de dette privée',
] as const;
export const isNonCote = (nature: string | null | undefined): boolean =>
  !!nature && (NATURES_NON_COTE as readonly string[]).includes(nature);
export const isClubDealOuSPV = (nature: string | null | undefined): boolean =>
  nature === 'Club deals' || nature === "SPV d'investissement (structures ad hoc)";
export const isPEA = (nature: string | null | undefined): boolean =>
  !!nature && (NATURES_PEA as readonly string[]).includes(nature);

// Livrets réglementés et épargne logement : un seul titulaire (un plan par personne, pas de compte
// joint), alors même que leur valeur peut être commune entre époux (art. 1402).
export const NATURES_COMPTES_REGLEMENTES = [
  'Livret A', 'Livret Bleu', 'Livret de développement durable et solidaire (LDDS)',
  "Livret d'épargne populaire (LEP)", 'Livret Jeune', 'CEL', 'PEL', 'PEP Bancaire',
] as const;
export const isCompteReglemente = (nature: string | null | undefined): boolean =>
  !!nature && (NATURES_COMPTES_REGLEMENTES as readonly string[]).includes(nature);
/** Compte ou plan nominatif (PEA, livret réglementé, épargne logement) : libellé « Titulaire », ni « Le couple » ni indivision. */
export const isTitulaireNominatif = (nature: string | null | undefined): boolean =>
  isPEA(nature) || isCompteReglemente(nature);
export const isLiquidites = (nature: string | null | undefined): boolean =>
  !!nature && (ASSET_CATEGORIES['épargne bancaire / liquidités'] as readonly string[]).includes(nature);

// SOFICA : valeur_acquisition = montant souscrit, base de la réduction d'IR (taux saisi,
// reduction_ir_entree) et de la plus-value.
export const NATURES_DEFISCALISATION = ['Parts de SOFICA'] as const;
export const isDefiscalisation = (nature: string | null | undefined): boolean =>
  !!nature && (NATURES_DEFISCALISATION as readonly string[]).includes(nature);

// Fonds de capital-investissement : nature unique, le type de fonds (assets.type_fonds) aiguille
// le régime fiscal (regimeFiscalPlusValue.ts) et les champs. FCPI / FIP / FIP Corse : réduction
// d'IR à la souscription, montant souscrit. FCPR / FPCI : appels de fonds (montant engagé,
// valeur_acquisition = montant appelé).
export const NATURE_FONDS_CI = 'Fonds de capital-investissement';
export const isFondsCI = (nature: string | null | undefined): boolean => nature === NATURE_FONDS_CI;
export type TypeFondsCI = 'fcpi' | 'fip' | 'fip_corse' | 'fcpr_fpci';
export const TYPES_FONDS_CI: { value: TypeFondsCI; label: string; aide: string }[] = [
  { value: 'fcpi', label: 'FCPI', aide: 'innovation, réduction d’IR' },
  { value: 'fip', label: 'FIP', aide: 'PME régionales, réduction d’IR' },
  { value: 'fip_corse', label: 'FIP Corse', aide: 'PME corses, réduction d’IR majorée' },
  { value: 'fcpr_fpci', label: 'FCPR / FPCI', aide: 'private equity : LBO, growth, venture' },
];
export const isFondsReductionIR = (typeFonds: string | null | undefined): boolean =>
  typeFonds === 'fcpi' || typeFonds === 'fip' || typeFonds === 'fip_corse';
/** Fonds à appels de fonds : montant engagé saisi à l'étape Prix, à côté du montant appelé. */
export const hasEngagementAppels = (nature: string | null | undefined, typeFonds?: string | null): boolean =>
  isNonCote(nature) || (isFondsCI(nature) && typeFonds === 'fcpr_fpci');
/** Suivi des appels de fonds et distributions (table fonds_mouvements) : FCPR / FPCI et dette privée. */
export const hasSuiviAppelsFonds = (nature: string | null | undefined, typeFonds?: string | null): boolean =>
  nature === 'Fonds de dette privée' || (isFondsCI(nature) && typeFonds === 'fcpr_fpci');
/** Libellé de valeur_acquisition selon la nature (et le type de fonds) ; undefined = défaut. */
export const getLibelleMontantInvesti = (nature: string | null | undefined, typeFonds?: string | null): string | undefined =>
  isPEA(nature) ? 'Montant versé'
  : isCTO(nature) ? 'Montant investi'
  : isFondsCI(nature) ? (typeFonds === 'fcpr_fpci' ? 'Montant appelé' : 'Montant souscrit')
  : isNonCote(nature) ? 'Montant appelé'
  : isDefiscalisation(nature) ? 'Montant souscrit'
  : undefined;

// Actionnariat salarié : droits NON exercés uniquement (option non levée, AGA en période
// d'acquisition, BSPCE non exercé). Droit attaché à la personne, propre par nature (art. 1404 ;
// Cass. 1re civ., 9 juil. 2014) ; ni prix d'achat ni origine. Les titres obtenus se saisissent
// dans un CTO.
export const NATURES_ACTIONNARIAT_SALARIE = ['Stock-options', 'Actions gratuites', 'BSPCE'] as const;
export const isActionnariatSalarie = (nature: string | null | undefined): boolean =>
  !!nature && (NATURES_ACTIONNARIAT_SALARIE as readonly string[]).includes(nature);

// Titulaire unique (contrat souscrit ou PEA) : jamais « Le couple » ni indivision, même pour
// un bien commun — la communauté porte sur la valeur, pas sur la qualité de titulaire.
export const isTitulaireUnique = (nature: string | null | undefined): boolean =>
  isContratSouscrit(nature) || isTitulaireNominatif(nature) || isActionnariatSalarie(nature) || isDroitsAuteur(nature);

// Droits d'auteur : droit d'exploitation propre à l'époux auteur sous tous les régimes (art. L121-9
// CPI), seuls les revenus perçus pendant le mariage suivant le régime matrimonial. À distinguer des
// droits à royalties achetés comme placement (droit commun).
export const NATURE_DROITS_AUTEUR = 'Droits de propriété littéraire ou artistique';
export const isDroitsAuteur = (nature: string | null | undefined): boolean => nature === NATURE_DROITS_AUTEUR;

// Prévoyance sans valeur de rachat (temporaire décès, prévoyance individuelle) : rien à
// partager entre époux, la qualification commun / propre est sans objet (art. L132-16 C. ass.).
// Créances (prêt à un proche, créance sur un tiers, soulte ou prix à recevoir) : sans prix
// d'achat, mais avec une origine et une date qui en fixent la qualification (commune ou propre).
export const isCreance = (nature: string | null | undefined): boolean =>
  !!nature && (ASSET_CATEGORIES['créances'] as readonly string[]).includes(nature);

// Libellé qui identifie la charge « prime » d'un contrat de prévoyance parmi ses charges
// (PrimeFields.tsx).
export const DENOMINATION_PRIME = "Prime d'assurance";

export const isPrevoyanceSansRachat = (nature: string | null | undefined): boolean =>
  isPrevoyanceDeces(nature) && nature !== NATURE_PREVOYANCE_RACHETABLE;

// Natures "parts foncières/forestières" de la famille "actifs immobiliers" non rattachables à
// une fiche du module Sociétés (cf. NATURES_PARTS_SOCIETE dans societeTransfer.ts, qui ne
// contient que "Parts de SCI" parmi les natures immobilières) : elles reçoivent à la place, dans AssetForm.tsx, un établissement
// (société de gestion / gestionnaire), des revenus distribués et un régime fiscal dédiés.
export const PARTS_FONCIERES_NATURES = [
  "Parts de SCPI",
  "Parts de groupements fonciers",
  "Parts de sociétés d'épargne forestière",
] as const;

// Biens ruraux, groupements fonciers, bois et forêts : exonération partielle de DMTG
// (art. 793-1-3°, 793-2-2° et 793 bis CGI), selon le régime et les conditions saisis sur le
// bien (assets.regime_exoneration_rural / conditions_exoneration_rural). Jamais présumé :
// un bien de ces natures non qualifié bloque le calcul de transmission.
// - 'forestier' : bois, forêts, groupements forestiers — 3/4 sans plafond ;
// - 'agricole' : GFA, GAF, GFV, biens ruraux loués par bail à long terme — 3/4 jusqu'à
//   600 000 € par bénéficiaire, 1/2 au-delà ;
// - 'aucun' : pas d'exonération (terre non louée par bail à long terme…).
// GFR (forêts et terres agricoles) : régime dominant. Sociétés d'épargne forestière : régime
// forestier au prorata de la fraction de l'actif éligible (assets.fraction_eligible_rural). GFI :
// même prorata (part forestière, hors trésorerie), 90 % par défaut.
export type RegimeExonerationRurale = 'forestier' | 'agricole' | 'aucun';

export const NATURES_RURALES = [
  "Bois & forêts",
  "Parts de groupements fonciers",
  "Terrains agricoles",
  "Parts de sociétés d'épargne forestière",
] as const;

// Régime imposé par la nature (« Bois & forêts ») ou proposé par défaut (GFA), modifiable.
export const REGIME_RURAL_IMPOSE: Record<string, RegimeExonerationRurale> = {
  "Bois & forêts": 'forestier',
  "Parts de sociétés d'épargne forestière": 'forestier',
};

export const NATURE_SEF = "Parts de sociétés d'épargne forestière";

// Type de groupement foncier (assets.type_groupement, informatif) : propose le régime
// d'exonération par défaut, toujours modifiable. GFR : régime dominant à choisir (agricole proposé).
export const TYPES_GROUPEMENT_FONCIER = [
  { value: 'GFA', label: 'Groupement foncier agricole (GFA)', regime: 'agricole' },
  { value: 'GAF', label: "Groupement agricole foncier (GAF)", regime: 'agricole' },
  { value: 'GFV', label: 'Groupement foncier viticole (GFV)', regime: 'agricole' },
  { value: 'GFR', label: 'Groupement foncier rural (GFR)', regime: 'agricole' },
  { value: 'GFF', label: 'Groupement forestier (GFF)', regime: 'forestier' },
  // GFI : groupement forestier d'investissement (offre au public, société de gestion agréée AMF).
  { value: 'GFI', label: "Groupement forestier d'investissement (GFI)", regime: 'forestier' },
] as const satisfies readonly { value: string; label: string; regime: RegimeExonerationRurale }[];
export type TypeGroupementFoncier = (typeof TYPES_GROUPEMENT_FONCIER)[number]['value'];
export const NATURE_GROUPEMENT_FONCIER = "Parts de groupements fonciers";

export const isNatureRurale = (nature: string | null | undefined): boolean =>
  !!nature && (NATURES_RURALES as readonly string[]).includes(nature);

type BienRuralInput = {
  nature?: string | null;
  regime_exoneration_rural?: string | null;
  conditions_exoneration_rural?: boolean | null;
  fraction_eligible_rural?: number | null;
  type_groupement?: string | null;
};

// Part forestière par défaut d'un GFI : environ 10 % de l'actif est en trésorerie, non éligible.
export const FRACTION_FORESTIERE_GFI_DEFAUT = 90;
export const isGfi = (asset: Pick<BienRuralInput, 'nature' | 'type_groupement'>): boolean =>
  asset.nature === NATURE_GROUPEMENT_FONCIER && asset.type_groupement === 'GFI';

// Régime ou conditions non renseignés (les conditions sont sans objet en régime 'aucun'), ou
// société d'épargne forestière exonérée sans fraction éligible saisie.
export const isBienRuralNonQualifie = (asset: BienRuralInput): boolean =>
  isNatureRurale(asset.nature) && (
    !asset.regime_exoneration_rural
    || (asset.regime_exoneration_rural !== 'aucun'
      && asset.conditions_exoneration_rural !== true && asset.conditions_exoneration_rural !== false)
    || (asset.nature === NATURE_SEF && asset.conditions_exoneration_rural === true
      && asset.fraction_eligible_rural == null)
  );

// Fraction (0 à 1) de la valeur à laquelle s'applique l'exonération rurale : 1, sauf pour une
// société d'épargne forestière (part de l'actif investie en bois, forêts et groupements éligibles)
// et un GFI (part forestière hors trésorerie, 90 % si non saisie).
export const getFractionEligibleRurale = (asset: BienRuralInput): number => {
  const borne = (pct: number) => Math.min(1, Math.max(0, pct / 100));
  if (asset.nature === NATURE_SEF) return borne(asset.fraction_eligible_rural ?? 0);
  if (isGfi(asset)) return borne(asset.fraction_eligible_rural ?? FRACTION_FORESTIERE_GFI_DEFAUT);
  return 1;
};

// Régime d'exonération effectivement applicable (conditions remplies), sinon null.
export const getExonerationRurale = (asset: BienRuralInput): 'forestier' | 'agricole' | null =>
  isNatureRurale(asset.nature) && asset.conditions_exoneration_rural === true
    && (asset.regime_exoneration_rural === 'forestier' || asset.regime_exoneration_rural === 'agricole')
    ? asset.regime_exoneration_rural
    : null;

// Biens affectés à l'exploitation d'une entreprise individuelle (art. 787 C CGI) : exonération de
// 75 % si les conditions sont remplies (détention de 2 ans si acquis à titre onéreux, engagement
// des héritiers de conserver les biens 4 ans — la LF 2026 n'a modifié que l'art. 787 B —, et
// poursuite de l'exploitation par l'un d'eux pendant 3 ans). Non renseigné : calcul bloqué.
export const NATURES_787C = ["Entreprise individuelle", "Autres biens professionnels"];

export const isBien787CNonQualifie = (asset: { nature?: string | null; conditions_787c?: boolean | null }): boolean =>
  !!asset.nature && NATURES_787C.includes(asset.nature)
  && asset.conditions_787c !== true && asset.conditions_787c !== false;

export const isExonere787C = (asset: { nature?: string | null; conditions_787c?: boolean | null }): boolean =>
  !!asset.nature && NATURES_787C.includes(asset.nature) && asset.conditions_787c === true;

// Bijoux, pierreries, objets d'art ou de collection : valeur imposable au moins égale à 60 % de
// l'évaluation du contrat d'assurance vol/incendie en cours, conclu depuis moins de 10 ans (art. 764
// II CGI) — plancher fiscal seulement, la valeur civile reste la valeur estimée.
export const NATURES_PLANCHER_ASSURANCE = [
  "Bijoux et pierres précieuses",
  "Montres",
  "Objets d'art et de collection",
];
export const TAUX_PLANCHER_ASSURANCE = 0.6;

// Options de régime fiscal proposées pour chacune des natures ci-dessus (AssetForm.tsx,
// champ regime_fiscal_parts) — la liste dépend de la nature sélectionnée.
export const REGIME_FISCAL_PARTS_OPTIONS: Record<string, string[]> = {
  "Parts de SCPI": ["Revenus fonciers", "SCPI fiscale (Pinel / Malraux / Déficit foncier)", "Autre"],
  // « Revenus forestiers (forfait cadastral) » : groupements forestiers (GFF, GFI) et GFR, imposés en
  // bénéfices agricoles sur le revenu cadastral des bois (art. 76 CGI) — libellé repris par
  // REGIME_FORFAIT_FORESTIER (lib/immobilier/partsFoncieres.ts).
  "Parts de groupements fonciers": ["Revenus fonciers", "Revenus fonciers agricoles", "Revenus fonciers viticoles", "Revenus forestiers (forfait cadastral)", "Dividendes", "Autre"],
  "Parts de sociétés d'épargne forestière": ["Revenus forestiers", "Dividendes", "Autre"],
};

// Champs additionnels proposés, dans AssetForm.tsx (pill "Caractéristiques"), pour certaines
// natures de la famille "actifs corporels" — les natures absentes de ce mapping (Meubles
// meublants, Véhicules motorisés, Matériel informatique/audiovisuel haut de gamme, Matériel
// sportif de valeur, Autres placements divers) n'affichent aucun champ additionnel.
export type CorpsChamp = 'quantite_millesime';

// Objets d'art et de collection : catégorie de l'art. 98 A, annexe III CGI (informative, sans effet
// sur les calculs ; une collection n'est jamais un meuble meublant, art. 534 C. civ.).
export const NATURE_OBJETS_ART_COLLECTION = "Objets d'art et de collection";
export const CATEGORIES_OBJET_ART = [
  { value: 'objet_art', label: "Objet d'art", aide: 'Tableau, dessin, gravure, sculpture originale, tapisserie…' },
  { value: 'antiquite', label: 'Antiquité', aide: 'Objet de plus de 100 ans.' },
  { value: 'objet_collection', label: 'Objet de collection', aide: "Timbres, monnaies, collections d'histoire naturelle, d'archéologie…" },
] as const;

export const CORPS_NATURES_CHAMPS: Record<string, CorpsChamp[]> = {
  "Vins & spiritueux d'investissement": ['quantite_millesime'],
};

// Champs additionnels proposés, dans AssetForm.tsx (pill "Caractéristiques"), pour certaines
// natures de la famille "épargne retraite et prévoyance". Le champ texte libre
// "beneficiaire_designe" n'est plus proposé (colonne conservée en base) : la clause des PER
// assurantiels, des contrats de prévoyance décès et des contrats article 82 se saisit dans
// Transmission → Assurance-vie (clause structurée, seule lue par le calcul de transmission).
// Le capital garanti des contrats de prévoyance se saisit avec la valeur (ValeurEstimeeFields).
export type RetraitePrevoyanceChamp = 'mode_sortie';

export const RETRAITE_PREVOYANCE_NATURES_CHAMPS: Record<string, RetraitePrevoyanceChamp[]> = {
  'PER individuel': ['mode_sortie'],
  'PER entreprise collectif': ['mode_sortie'],
  'PER entreprise obligatoire': ['mode_sortie'],
  'PERCO/PERCOI': ['mode_sortie'],
  'PERP': ['mode_sortie'],
  'Contrat loi Madelin': ['mode_sortie'],
  'Contrat loi Madelin Agricole': ['mode_sortie'],
  'Contrat article 83': ['mode_sortie'],
  'Contrat article 82': ['mode_sortie'],
  'Contrat Préfon-retraite': ['mode_sortie'],
  'Contrat retraite mutualiste du combattant': ['mode_sortie'],
  'Régimes de retraite étrangers': ['mode_sortie'],
};

export const MODE_SORTIE_OPTIONS = ['Rente', 'Capital', 'Mixte'] as const;

// Natures de la famille "épargne salariale" recevant, dans AssetForm.tsx (pill
// "Caractéristiques"), les champs abondement employeur / date de disponibilité / motif de
// déblocage anticipé / support d'investissement — les 2 natures de la famille en bénéficient
// toutes les deux de façon identique (pas de variance par nature, contrairement à
// CORPS_NATURES_CHAMPS/RETRAITE_PREVOYANCE_NATURES_CHAMPS), d'où un simple tableau plutôt qu'un
// mapping nature → champs.
export const NATURES_EPARGNE_SALARIALE = ["PEE", "PEI"];

// Natures pour lesquelles le libellé du champ "Date d'acquisition" est
// relabellé "Date d'ouverture" dans AssetForm.tsx (même champ `date_acquisition`,
// pas de nouvelle colonne) : CEL/PEL (compte bancaire réglementé) et PEA/PEA-PME
// (point de départ du délai fiscal des 5 ans).
export const NATURES_DATE_OUVERTURE = ["CEL", "PEL", "PEA", "PEA-PME", NATURE_CTO];

// Champs additionnels proposés, dans AssetForm.tsx (pill "Caractéristiques"), pour certaines
// natures de la famille "épargne bancaire / liquidités". Les livrets réglementés (Livret A,
// Livret Bleu, LDDS, LEP, Livret Jeune) et les autres natures de la famille n'ont volontairement
// aucun champ additionnel (taux légal non propre à l'actif pour les premiers).
export type LiquiditesChamp = 'taux_remuneration' | 'date_echeance';

export const LIQUIDITES_NATURES_CHAMPS: Record<string, LiquiditesChamp[]> = {
  'CEL': ['taux_remuneration'],
  'PEL': ['taux_remuneration'],
  'Compte à terme': ['date_echeance', 'taux_remuneration'],
  "Bons de caisse (ou bon d'épargne)": ['date_echeance', 'taux_remuneration'],
};

// Champs additionnels proposés, dans AssetForm.tsx (pill "Caractéristiques"), pour certaines
// natures de la famille "valeurs mobilières et placements financiers". "Compte-titres (CTO)" a
// son propre traitement dédié (cto_multi_actifs / cto_nature_sous_jacent), hors de ce mapping.
// Les natures absentes de ce mapping n'affichent aucun champ additionnel.
export type ValeursMobilieresChamp =
  | 'duree_blocage'
  | 'reduction_ir_entree'
  | 'prix_exercice'
  | 'lieu_stockage'
  | 'quantite';

// Fonds de capital-investissement : champs selon le type de fonds (aucun tant qu'il n'est pas choisi).
export const getChampsFondsCI = (typeFonds: string | null | undefined): ValeursMobilieresChamp[] =>
  isFondsReductionIR(typeFonds) ? ['duree_blocage', 'reduction_ir_entree']
  : typeFonds === 'fcpr_fpci' ? ['duree_blocage']
  : [];

export const VALEURS_MOBILIERES_NATURES_CHAMPS: Record<string, ValeursMobilieresChamp[]> = {
  'Parts de SOFICA': ['duree_blocage', 'reduction_ir_entree'],
  'Stock-options': ['prix_exercice'],
  'BSPCE': ['prix_exercice'],
  'Club deals': ['duree_blocage'],
  "SPV d'investissement (structures ad hoc)": ['duree_blocage'],
  'Fonds de dette privée': ['duree_blocage'],
  'Or et métaux précieux': ['lieu_stockage', 'quantite'],
};

// Or et métaux précieux : nature unique (ex-« Or (physique) » et « Métaux précieux (argent,
// platine) », même régime : taxe forfaitaire ou plus-value réelle), métal informatif (assets.metal).
export const NATURE_OR_METAUX = 'Or et métaux précieux';
export const METAUX_PRECIEUX = [
  { value: 'or', label: 'Or' },
  { value: 'argent', label: 'Argent' },
  { value: 'platine', label: 'Platine' },
  { value: 'palladium', label: 'Palladium' },
] as const;

// Cryptomonnaies : mode de conservation (assets.conservation_crypto). En portefeuille personnel,
// les avoirs sont perdus au décès si les héritiers n'ont pas accès aux clés.
export const NATURE_CRYPTO = 'Portefeuille de valeurs numériques (cryptomonnaies)';
export const CONSERVATIONS_CRYPTO = [
  { value: 'plateforme', label: 'Plateforme d’échange', aide: 'compte chez un prestataire' },
  { value: 'portefeuille_personnel', label: 'Portefeuille personnel', aide: 'clés privées détenues soi-même' },
] as const;

// Objets numériques (NFT) : qualification fiscale (assets.qualification_nft), sans valeur par
// défaut — régime aiguillé dans lib/patrimoine/assetFiscalRegime.ts.
export const QUALIFICATIONS_NFT = [
  { value: 'actif_numerique', label: 'Actif numérique (droits transférables)' },
  { value: 'titre_financier', label: 'Titre financier (droits financiers ou de gouvernance)' },
  { value: 'oeuvre_art', label: "Œuvre d'art (certificat d'une œuvre physique)" },
  { value: 'bien_meuble', label: 'Bien meuble incorporel (autres cas)' },
] as const;

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
// Fiscalité des intérêts des liquidités (taux au 01/01/2026), affichée sur la fiche de l'actif :
// ces placements produisent des intérêts, pas de plus-value. PEL, CEL et PEP restent à 17,2 %
// de prélèvements sociaux (exclus de la hausse de CSG de la LFSS 2026).
const LIVRET_REGLEMENTE = "Intérêts exonérés d'impôt sur le revenu et de prélèvements sociaux, dans la limite du plafond du livret.";
const INTERETS_PFU = "Intérêts au PFU de 31,4 % (12,8 % d'IR + 18,6 % de prélèvements sociaux), ou au barème sur option.";
export const NOTES_FISCALITE_INTERETS: Record<string, string> = {
  "Comptes courants": "Compte non rémunéré en général ; intérêts éventuels au PFU de 31,4 %.",
  "Comptes sur livret (CSL)": INTERETS_PFU,
  "Livret A": LIVRET_REGLEMENTE,
  "Livret Bleu": LIVRET_REGLEMENTE,
  "Livret de développement durable et solidaire (LDDS)": LIVRET_REGLEMENTE,
  "Livret d'épargne populaire (LEP)": LIVRET_REGLEMENTE,
  "Livret Jeune": LIVRET_REGLEMENTE,
  "CEL": "Intérêts : 12,8 % d'IR et 17,2 % de prélèvements sociaux (CEL exclu de la hausse de CSG).",
  "PEL": "Intérêts : 12,8 % d'IR (PEL ouvert depuis le 01/01/2018, imposé chaque année ; avant, exonéré d'IR jusqu'à 12 ans) et 17,2 % de prélèvements sociaux (exclu de la hausse de CSG).",
  "Compte à terme": INTERETS_PFU,
  "Bons de caisse (ou bon d'épargne)": INTERETS_PFU,
  "PEP Bancaire": "Intérêts exonérés d'impôt sur le revenu après 8 ans (PFU sinon) ; prélèvements sociaux à 17,2 % (PEP exclu de la hausse de CSG).",
  "Dépôt de garantie": "Créance sur le bailleur, restituée à la sortie du logement : ni intérêts ni plus-value.",
  "Prêt consenti à un proche": "Intérêts éventuels au PFU de 31,4 % ; prêt de plus de 5 000 € à déclarer (formulaire 2062). Un prêt sans intérêt ou une remise de dette peut être requalifié en donation.",
  "Créance sur un tiers (reconnaissance de dette)": "Intérêts éventuels au PFU de 31,4 % ; reconnaissance de dette de plus de 5 000 € à déclarer (formulaire 2062).",
  "Soulte ou prix de vente à recevoir": "Créance sans plus-value : la plus-value de la vente ou du partage est imposée à sa date, pas au paiement. Intérêts éventuels au PFU de 31,4 %.",
  "Compte courant d'associé": "Créance sur la société, sans plus-value : intérêts au PFU de 31,4 % (déductibles pour la société dans la limite du taux légal). En succession, retenu pour sa valeur nominale, sauf créance irrécouvrable.",
};

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
  "Compte courant d'associé",
  ...ASSET_CATEGORIES["créances"],
];