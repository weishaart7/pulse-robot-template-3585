import { ClauseDefinition, ClauseType, RegimeType } from '@/types/matrimonial';

// Définitions des clauses par type de régime
export const CLAUSES_BY_REGIME: Record<RegimeType, ClauseDefinition[]> = {
  communaute_reduite: [
    {
      key: 'mise_en_communaute',
      label: 'Clause de mise en communauté',
      hasAssets: true,
      impactTransmission: 'neutre',
      description: 'Permet de faire entrer des biens propres dans la communauté',
      momentEffet: 'cours_mariage',
      soumisRetranchement: false,
      assietteImpactee: 'masse_commune'
    },
    {
      key: 'extension_propres_par_nature',
      label: 'Clause d\'extension de la communauté aux biens propres par nature',
      impactTransmission: 'neutre',
      description: "Étend conventionnellement la communauté aux biens normalement propres par nature (art. 1404 : vêtements, actions en réparation d'un dommage corporel/moral, créances et pensions incessibles, instruments de travail nécessaires à la profession)",
      momentEffet: 'cours_mariage',
      soumisRetranchement: false,
      assietteImpactee: 'masse_commune'
    },
    {
      key: 'reprise_apports',
      label: 'Clause de reprise des apports (dite « clause alsacienne ») (uniquement cas de divorce)',
      impactTransmission: 'neutre',
      momentEffet: 'dissolution',
      soumisRetranchement: false,
      assietteImpactee: 'aucune'
    },
    {
      key: 'preciput',
      label: 'Clause de préciput',
      hasAssets: true,
      hasOptions: true,
      impactTransmission: 'exclut_succession',
      description: 'Permet au conjoint de prélever certains biens avant le partage',
      momentEffet: 'dissolution',
      soumisRetranchement: true,
      assietteImpactee: 'succession'
    },
    {
      key: 'attribution_integrale',
      label: "Clause d'attribution intégrale (uniquement cas de décès)",
      hasPorteSurOption: true,
      impactTransmission: 'avantage_matrimonial',
      description: 'Attribue la totalité de la communauté au conjoint survivant, en pleine propriété ou en usufruit seulement (art. 1524 al. 2)',
      momentEffet: 'dissolution',
      soumisRetranchement: true,
      assietteImpactee: 'succession'
    },
    {
      key: 'partage_inegal',
      label: 'Clause de partage inégal',
      hasPercentages: true,
      impactTransmission: 'avantage_matrimonial',
      description: 'Modifie la répartition par défaut 50/50 de la communauté',
      momentEffet: 'dissolution',
      soumisRetranchement: false,
      assietteImpactee: 'masse_commune'
    },
    {
      key: 'exclusion_certains_biens',
      label: 'Exclusion de certains biens',
      hasAssets: true,
      impactTransmission: 'neutre',
      momentEffet: 'cours_mariage',
      soumisRetranchement: false,
      assietteImpactee: 'masse_commune'
    },
    {
      key: 'stipulation_bien_propre',
      label: 'La clause de stipulation de bien propre',
      hasAssets: true,
      impactTransmission: 'neutre',
      momentEffet: 'cours_mariage',
      soumisRetranchement: false,
      assietteImpactee: 'masse_commune'
    },
    {
      key: 'modification_recompenses',
      label: 'La clause modifiant le montant des récompenses et des créances entre époux',
      impactTransmission: 'neutre',
      momentEffet: 'dissolution',
      soumisRetranchement: false,
      assietteImpactee: 'aucune'
    },
    {
      key: 'prelevement_biens_communs',
      label: 'La clause de prélèvement des biens communs moyennant indemnité',
      description: "Porte sur des biens COMMUNS (art. 1511) : un époux peut les prélever à la dissolution moyennant indemnité à la communauté.",
      impactTransmission: 'neutre',
      momentEffet: 'dissolution',
      soumisRetranchement: false,
      assietteImpactee: 'aucune'
    },
    {
      key: 'prelevement_indemnisation',
      label: 'La clause de prélèvement moyennant indemnisation (dite « clause commerciale »)',
      description: "Porte sur des biens PROPRES du prédécédé (art. 1390) : le survivant peut les prélever moyennant indemnité à la succession — à distinguer du prélèvement sur les biens communs (art. 1511).",
      impactTransmission: 'neutre',
      momentEffet: 'dissolution',
      soumisRetranchement: false,
      assietteImpactee: 'aucune'
    },
    {
      key: 'administration_conjointe',
      label: 'Clause d\'administration conjointe (« main commune »)',
      impactTransmission: 'neutre',
      description: "Actes d'administration et de disposition des biens communs sous signature conjointe (art. 1503), solidarité de plein droit des obligations. Seuls les actes conservatoires restent possibles seul.",
      momentEffet: 'cours_mariage',
      soumisRetranchement: false,
      assietteImpactee: 'aucune'
    },
    {
      key: 'apport_franc_et_quitte',
      label: "Clause d'apport franc et quitte",
      impactTransmission: 'neutre',
      description: "Les époux énumèrent dans le contrat les dettes antérieures (anc. art. 1513) : toute dette non énoncée est écartée du passif commun et reste personnelle.",
      momentEffet: 'cours_mariage',
      soumisRetranchement: false,
      assietteImpactee: 'aucune'
    },
    {
      key: 'separation_de_dettes',
      label: 'Clause de séparation de dettes',
      impactTransmission: 'neutre',
      description: "Exclut du passif commun les dettes antérieures au mariage et celles grevant les successions et libéralités (anc. art. 1510).",
      momentEffet: 'cours_mariage',
      soumisRetranchement: false,
      assietteImpactee: 'aucune'
    },
    {
      key: 'apport_plafonne',
      label: "Clause d'apport plafonné",
      hasAssets: true,
      impactTransmission: 'neutre',
      description: "Un bien désigné n'entre en communauté qu'à concurrence d'un montant (art. 1387) ; au-delà, il reste propre.",
      momentEffet: 'cours_mariage',
      soumisRetranchement: false,
      assietteImpactee: 'masse_commune'
    },
    {
      key: 'dissolution_alternative',
      label: 'Clause de dissolution alternative (décès / divorce)',
      impactTransmission: 'neutre',
      description: "Le contrat prévoit deux jeux de règles de liquidation distincts, l'un pour le décès, l'autre pour le divorce (art. 1387). Construction avancée : la rédaction précise des deux jeux de règles se fait dans l'acte.",
      momentEffet: 'dissolution',
      soumisRetranchement: false,
      assietteImpactee: 'aucune'
    }
  ],

  communaute_meubles: [
    {
      key: 'preciput',
      label: 'Clause de préciput',
      hasAssets: true,
      impactTransmission: 'exclut_succession',
      momentEffet: 'dissolution',
      soumisRetranchement: true,
      assietteImpactee: 'succession'
    },
    {
      key: 'mise_en_communaute',
      label: 'Clause de mise en communauté',
      hasAssets: true,
      impactTransmission: 'neutre',
      momentEffet: 'cours_mariage',
      soumisRetranchement: false,
      assietteImpactee: 'masse_commune'
    },
    {
      key: 'extension_propres_par_nature',
      label: 'Clause d\'extension de la communauté aux biens propres par nature',
      impactTransmission: 'neutre',
      description: "Étend conventionnellement la communauté aux biens normalement propres par nature (art. 1404 : vêtements, actions en réparation d'un dommage corporel/moral, créances et pensions incessibles, instruments de travail nécessaires à la profession)",
      momentEffet: 'cours_mariage',
      soumisRetranchement: false,
      assietteImpactee: 'masse_commune'
    },
    {
      key: 'reprise_apports',
      label: 'Clause de reprise des apports (clause alsacienne) (uniquement cas de divorce)',
      impactTransmission: 'neutre',
      momentEffet: 'dissolution',
      soumisRetranchement: false,
      assietteImpactee: 'aucune'
    },
    {
      key: 'attribution_integrale',
      label: "Clause d'attribution intégrale (uniquement cas de décès)",
      hasPorteSurOption: true,
      impactTransmission: 'avantage_matrimonial',
      description: 'Attribue la totalité de la communauté au conjoint survivant, en pleine propriété ou en usufruit seulement (art. 1524 al. 2)',
      momentEffet: 'dissolution',
      soumisRetranchement: true,
      assietteImpactee: 'succession'
    },
    {
      key: 'partage_inegal',
      label: 'Clause de partage inégal',
      hasPercentages: true,
      impactTransmission: 'avantage_matrimonial',
      momentEffet: 'dissolution',
      soumisRetranchement: false,
      assietteImpactee: 'masse_commune'
    },
    {
      key: 'exclusion_certains_biens',
      label: 'Exclusion de certains biens',
      hasAssets: true,
      impactTransmission: 'neutre',
      momentEffet: 'cours_mariage',
      soumisRetranchement: false,
      assietteImpactee: 'masse_commune'
    },
    {
      key: 'stipulation_bien_propre',
      label: 'La clause de stipulation de bien propre',
      hasAssets: true,
      impactTransmission: 'neutre',
      momentEffet: 'cours_mariage',
      soumisRetranchement: false,
      assietteImpactee: 'masse_commune'
    },
    {
      key: 'prelevement_biens_communs',
      label: 'La clause de prélèvement des biens communs moyennant indemnité',
      description: "Porte sur des biens COMMUNS (art. 1511) : un époux peut les prélever à la dissolution moyennant indemnité à la communauté.",
      impactTransmission: 'neutre',
      momentEffet: 'dissolution',
      soumisRetranchement: false,
      assietteImpactee: 'aucune'
    },
    {
      key: 'prelevement_indemnisation',
      label: 'La clause de prélèvement moyennant indemnisation (dite « clause commerciale »)',
      description: "Porte sur des biens PROPRES du prédécédé (art. 1390) : le survivant peut les prélever moyennant indemnité à la succession — à distinguer du prélèvement sur les biens communs (art. 1511).",
      impactTransmission: 'neutre',
      momentEffet: 'dissolution',
      soumisRetranchement: false,
      assietteImpactee: 'aucune'
    },
    {
      key: 'administration_conjointe',
      label: 'Clause d\'administration conjointe (« main commune »)',
      impactTransmission: 'neutre',
      description: "Actes d'administration et de disposition des biens communs sous signature conjointe (art. 1503), solidarité de plein droit des obligations. Seuls les actes conservatoires restent possibles seul.",
      momentEffet: 'cours_mariage',
      soumisRetranchement: false,
      assietteImpactee: 'aucune'
    },
    {
      key: 'apport_franc_et_quitte',
      label: "Clause d'apport franc et quitte",
      impactTransmission: 'neutre',
      description: "Les époux énumèrent dans le contrat les dettes antérieures (anc. art. 1513) : toute dette non énoncée est écartée du passif commun et reste personnelle.",
      momentEffet: 'cours_mariage',
      soumisRetranchement: false,
      assietteImpactee: 'aucune'
    },
    {
      key: 'separation_de_dettes',
      label: 'Clause de séparation de dettes',
      impactTransmission: 'neutre',
      description: "Exclut du passif commun les dettes antérieures au mariage et celles grevant les successions et libéralités (anc. art. 1510).",
      momentEffet: 'cours_mariage',
      soumisRetranchement: false,
      assietteImpactee: 'aucune'
    },
    {
      key: 'apport_plafonne',
      label: "Clause d'apport plafonné",
      hasAssets: true,
      impactTransmission: 'neutre',
      description: "Un bien désigné n'entre en communauté qu'à concurrence d'un montant (art. 1387) ; au-delà, il reste propre.",
      momentEffet: 'cours_mariage',
      soumisRetranchement: false,
      assietteImpactee: 'masse_commune'
    },
    {
      key: 'dissolution_alternative',
      label: 'Clause de dissolution alternative (décès / divorce)',
      impactTransmission: 'neutre',
      description: "Le contrat prévoit deux jeux de règles de liquidation distincts, l'un pour le décès, l'autre pour le divorce (art. 1387). Construction avancée : la rédaction précise des deux jeux de règles se fait dans l'acte.",
      momentEffet: 'dissolution',
      soumisRetranchement: false,
      assietteImpactee: 'aucune'
    }
  ],

  communaute_universelle: [
    {
      key: 'attribution_integrale',
      label: "Clause d'attribution intégrale au survivant",
      hasPorteSurOption: true,
      impactTransmission: 'avantage_matrimonial',
      description: 'Toute la communauté (donc tout le patrimoine) revient au survivant, en pleine propriété ou en usufruit seulement (art. 1524 al. 2)',
      momentEffet: 'dissolution',
      soumisRetranchement: true,
      assietteImpactee: 'succession'
    },
    {
      key: 'preciput',
      label: 'Clause de préciput',
      hasAssets: true,
      impactTransmission: 'exclut_succession',
      momentEffet: 'dissolution',
      soumisRetranchement: true,
      assietteImpactee: 'succession'
    },
    {
      key: 'exclusion_certains_biens',
      label: 'Exclusion de certains biens',
      hasAssets: true,
      impactTransmission: 'neutre',
      momentEffet: 'cours_mariage',
      soumisRetranchement: false,
      assietteImpactee: 'masse_commune'
    },
    {
      key: 'extension_propres_par_nature',
      label: 'Clause d\'extension de la communauté aux biens propres par nature',
      impactTransmission: 'neutre',
      description: "Étend conventionnellement la communauté aux biens normalement propres par nature (art. 1404 : vêtements, actions en réparation d'un dommage corporel/moral, créances et pensions incessibles, instruments de travail nécessaires à la profession) — seule exception restant hors communauté universelle en l'absence de cette clause (art. 1526)",
      momentEffet: 'cours_mariage',
      soumisRetranchement: false,
      assietteImpactee: 'masse_commune'
    },
    {
      key: 'reprise_apports',
      label: 'Clause de reprise des apports',
      impactTransmission: 'neutre',
      momentEffet: 'dissolution',
      soumisRetranchement: false,
      assietteImpactee: 'aucune'
    },
    {
      key: 'administration_conjointe',
      label: 'Clause d\'administration conjointe (« main commune »)',
      impactTransmission: 'neutre',
      description: "Actes d'administration et de disposition des biens communs sous signature conjointe (art. 1503), solidarité de plein droit des obligations. Seuls les actes conservatoires restent possibles seul.",
      momentEffet: 'cours_mariage',
      soumisRetranchement: false,
      assietteImpactee: 'aucune'
    },
    {
      key: 'apport_franc_et_quitte',
      label: "Clause d'apport franc et quitte",
      impactTransmission: 'neutre',
      description: "Les époux énumèrent dans le contrat les dettes antérieures (anc. art. 1513) : toute dette non énoncée est écartée du passif commun et reste personnelle.",
      momentEffet: 'cours_mariage',
      soumisRetranchement: false,
      assietteImpactee: 'aucune'
    },
    {
      key: 'separation_de_dettes',
      label: 'Clause de séparation de dettes',
      impactTransmission: 'neutre',
      description: "Exclut du passif commun les dettes antérieures au mariage et celles grevant les successions et libéralités (anc. art. 1510).",
      momentEffet: 'cours_mariage',
      soumisRetranchement: false,
      assietteImpactee: 'aucune'
    },
    {
      key: 'apport_plafonne',
      label: "Clause d'apport plafonné",
      hasAssets: true,
      impactTransmission: 'neutre',
      description: "Un bien désigné n'entre en communauté qu'à concurrence d'un montant (art. 1387) ; au-delà, il reste propre.",
      momentEffet: 'cours_mariage',
      soumisRetranchement: false,
      assietteImpactee: 'masse_commune'
    },
    {
      key: 'dissolution_alternative',
      label: 'Clause de dissolution alternative (décès / divorce)',
      impactTransmission: 'neutre',
      description: "Le contrat prévoit deux jeux de règles de liquidation distincts, l'un pour le décès, l'autre pour le divorce (art. 1387). Construction avancée : la rédaction précise des deux jeux de règles se fait dans l'acte.",
      momentEffet: 'dissolution',
      soumisRetranchement: false,
      assietteImpactee: 'aucune'
    }
  ],

  separation_biens: [
    {
      key: 'contribution_charges',
      label: 'Clause aménageant la contribution aux charges du mariage',
      impactTransmission: 'neutre',
      momentEffet: 'cours_mariage',
      soumisRetranchement: false,
      assietteImpactee: 'aucune'
    },
    {
      key: 'amenagement_indivision',
      label: "Aménagement de l'indivision",
      impactTransmission: 'neutre',
      momentEffet: 'cours_mariage',
      soumisRetranchement: false,
      assietteImpactee: 'aucune'
    },
    {
      key: 'maintien_indivision',
      label: "Clause de maintien dans l'indivision (À regarder)",
      impactTransmission: 'neutre',
      momentEffet: 'cours_mariage',
      soumisRetranchement: false,
      assietteImpactee: 'aucune'
    },
    {
      key: 'exclusion_reprise',
      label: "Clause d'exclusion de reprise",
      impactTransmission: 'neutre'
      // Pas de ligne correspondante dans le référentiel §8.11 : momentEffet /
      // soumisRetranchement / assietteImpactee non renseignés, à valider avant
      // de les fixer (cf. note de diagnostic).
    },
    {
      key: 'prelevement_indemnisation',
      label: 'La clause de prélèvement moyennant indemnisation (dite « clause commerciale »)',
      description: "Porte sur des biens PROPRES du prédécédé (art. 1390) : le survivant peut les prélever moyennant indemnité à la succession — pertinent en séparation de biens puisque tout le patrimoine y est propre.",
      impactTransmission: 'neutre',
      momentEffet: 'dissolution',
      soumisRetranchement: false,
      assietteImpactee: 'aucune'
    },
    {
      key: 'presomption_propriete',
      label: 'Clause de présomption de propriété',
      hasAssets: true,
      impactTransmission: 'neutre',
      description: "Stipule que telle catégorie de biens est réputée appartenir à tel époux (art. 1538 al. 2 et 3). Opposable erga omnes, mais preuve contraire de droit — présomption simple, jamais irréfragable. Règle de preuve, pas de propriété.",
      momentEffet: 'cours_mariage',
      soumisRetranchement: false,
      assietteImpactee: 'aucune'
    },
    {
      key: 'dissolution_alternative',
      label: 'Clause de dissolution alternative (décès / divorce)',
      impactTransmission: 'neutre',
      description: "Le contrat prévoit deux jeux de règles de liquidation distincts, l'un pour le décès, l'autre pour le divorce (art. 1387). Construction avancée : la rédaction précise des deux jeux de règles se fait dans l'acte.",
      momentEffet: 'dissolution',
      soumisRetranchement: false,
      assietteImpactee: 'aucune'
    }
  ],

  participation_acquets: [
    {
      key: 'evaluation_biens',
      label: "La clause d'évaluation des biens",
      impactTransmission: 'neutre',
      momentEffet: 'cours_mariage',
      soumisRetranchement: false,
      assietteImpactee: 'aucune'
    },
    {
      key: 'simplification_preuve',
      label: 'La clause de simplification de la preuve de la consistance des patrimoines des époux',
      impactTransmission: 'neutre',
      momentEffet: 'cours_mariage',
      soumisRetranchement: false,
      assietteImpactee: 'aucune'
    },
    {
      key: 'exclusion_biens_professionnels',
      label: "La clause d'exclusion des biens professionnels du calcul de la créance de participation",
      hasMaintienDivorceOption: true,
      impactTransmission: 'neutre',
      momentEffet: 'dissolution',
      soumisRetranchement: false,
      assietteImpactee: 'masse_commune'
    },
    {
      key: 'plafonnement_creance',
      label: 'La clause de plafonnement de la créance de participation',
      impactTransmission: 'neutre',
      momentEffet: 'dissolution',
      soumisRetranchement: false,
      assietteImpactee: 'masse_commune'
    },
    {
      key: 'attribution_preferentielle',
      label: "Clause d'attribution préférentielle",
      impactTransmission: 'neutre',
      momentEffet: 'dissolution',
      soumisRetranchement: false,
      assietteImpactee: 'aucune'
    },
    {
      key: 'partage_inegal_acquets',
      label: 'Clause de partage inégal des acquêts',
      impactTransmission: 'avantage_matrimonial',
      momentEffet: 'dissolution',
      soumisRetranchement: false,
      assietteImpactee: 'masse_commune'
    },
    {
      key: 'renonciation',
      label: 'Clause de renonciation (À regarder)',
      impactTransmission: 'neutre'
      // Pas de ligne correspondante dans le référentiel §8.11.
    },
    {
      key: 'indexation',
      label: "Clause d'indexation (À regarder)",
      impactTransmission: 'neutre'
      // Pas de ligne correspondante dans le référentiel §8.11.
    },
    {
      key: 'prelevement_indemnisation',
      label: 'La clause de prélèvement moyennant indemnisation (dite « clause commerciale »)',
      description: "Porte sur des biens PROPRES du prédécédé (art. 1390) : le survivant peut les prélever moyennant indemnité à la succession.",
      impactTransmission: 'neutre',
      momentEffet: 'dissolution',
      soumisRetranchement: false,
      assietteImpactee: 'aucune'
    },
    {
      key: 'presomption_propriete',
      label: 'Clause de présomption de propriété',
      hasAssets: true,
      impactTransmission: 'neutre',
      description: "Stipule que telle catégorie de biens est réputée appartenir à tel époux (art. 1538 al. 2 et 3). Opposable erga omnes, mais preuve contraire de droit — présomption simple, jamais irréfragable. Règle de preuve, pas de propriété.",
      momentEffet: 'cours_mariage',
      soumisRetranchement: false,
      assietteImpactee: 'aucune'
    },
    {
      key: 'dissolution_alternative',
      label: 'Clause de dissolution alternative (décès / divorce)',
      impactTransmission: 'neutre',
      description: "Le contrat prévoit deux jeux de règles de liquidation distincts, l'un pour le décès, l'autre pour le divorce (art. 1387). Construction avancée : la rédaction précise des deux jeux de règles se fait dans l'acte.",
      momentEffet: 'dissolution',
      soumisRetranchement: false,
      assietteImpactee: 'aucune'
    }
  ],

  // Régime autonome à 3 masses : propres époux A / société d'acquêts (masse
  // commune, soumise aux règles de la communauté) / propres époux B. Ancien
  // "societe_acquets" de separation_biens et participation_acquets, promu en
  // régime à part entière (cf. chantier régime société d'acquêts).
  separation_societe_acquets: [
    {
      key: 'societe_acquets',
      label: "Composition de la société d'acquêts",
      hasAssets: true,
      hasSubClauses: true,
      hasResidencePrincipaleOption: true,
      impactTransmission: 'avantage_matrimonial',
      description: "Biens désignés comme communs, soumis aux règles de la communauté : le reste du patrimoine de chaque époux demeure propre.",
      momentEffet: 'cours_mariage',
      soumisRetranchement: false,
      assietteImpactee: 'masse_commune'
    },
    {
      key: 'exclusion_certains_biens',
      label: 'Exclusion de certains biens',
      hasAssets: true,
      impactTransmission: 'neutre',
      momentEffet: 'cours_mariage',
      soumisRetranchement: false,
      assietteImpactee: 'masse_commune'
    },
    {
      key: 'administration_conjointe',
      label: 'Clause d\'administration conjointe (« main commune »)',
      impactTransmission: 'neutre',
      description: "Actes d'administration et de disposition des biens communs sous signature conjointe (art. 1503), solidarité de plein droit des obligations. Seuls les actes conservatoires restent possibles seul.",
      momentEffet: 'cours_mariage',
      soumisRetranchement: false,
      assietteImpactee: 'aucune'
    },
    {
      key: 'apport_franc_et_quitte',
      label: "Clause d'apport franc et quitte",
      impactTransmission: 'neutre',
      description: "Les époux énumèrent dans le contrat les dettes antérieures (anc. art. 1513) : toute dette non énoncée est écartée du passif commun et reste personnelle.",
      momentEffet: 'cours_mariage',
      soumisRetranchement: false,
      assietteImpactee: 'aucune'
    },
    {
      key: 'separation_de_dettes',
      label: 'Clause de séparation de dettes',
      impactTransmission: 'neutre',
      description: "Exclut du passif commun les dettes antérieures au mariage et celles grevant les successions et libéralités (anc. art. 1510).",
      momentEffet: 'cours_mariage',
      soumisRetranchement: false,
      assietteImpactee: 'aucune'
    },
    {
      key: 'apport_plafonne',
      label: "Clause d'apport plafonné",
      hasAssets: true,
      impactTransmission: 'neutre',
      description: "Un bien désigné n'entre en communauté qu'à concurrence d'un montant (art. 1387) ; au-delà, il reste propre.",
      momentEffet: 'cours_mariage',
      soumisRetranchement: false,
      assietteImpactee: 'masse_commune'
    },
    {
      key: 'presomption_propriete',
      label: 'Clause de présomption de propriété',
      hasAssets: true,
      impactTransmission: 'neutre',
      description: "Stipule que telle catégorie de biens est réputée appartenir à tel époux (art. 1538 al. 2 et 3). Opposable erga omnes, mais preuve contraire de droit — présomption simple, jamais irréfragable. Règle de preuve, pas de propriété.",
      momentEffet: 'cours_mariage',
      soumisRetranchement: false,
      assietteImpactee: 'aucune'
    },
    {
      key: 'dissolution_alternative',
      label: 'Clause de dissolution alternative (décès / divorce)',
      impactTransmission: 'neutre',
      description: "Le contrat prévoit deux jeux de règles de liquidation distincts, l'un pour le décès, l'autre pour le divorce (art. 1387). Construction avancée : la rédaction précise des deux jeux de règles se fait dans l'acte.",
      momentEffet: 'dissolution',
      soumisRetranchement: false,
      assietteImpactee: 'aucune'
    }
  ]
};

// Sous-clauses pour la société d'acquêts
export const SOCIETE_ACQUETS_SUB_CLAUSES: ClauseDefinition[] = [
  {
    key: 'partage_inegal_sub',
    label: 'Clause de partage inégal',
    impactTransmission: 'avantage_matrimonial',
    momentEffet: 'dissolution',
    soumisRetranchement: false,
    assietteImpactee: 'masse_commune'
  },
  {
    key: 'attribution_integrale_sub',
    label: "Clause d'attribution intégrale",
    impactTransmission: 'avantage_matrimonial',
    momentEffet: 'dissolution',
    soumisRetranchement: true,
    assietteImpactee: 'succession'
  },
  {
    key: 'preciput_sub',
    label: 'Clause de préciput',
    hasAssets: true,
    impactTransmission: 'exclut_succession',
    momentEffet: 'dissolution',
    soumisRetranchement: true,
    assietteImpactee: 'succession'
  },
  {
    key: 'reprise_apports',
    label: 'Clause de reprise des apports (dite « clause alsacienne »)',
    impactTransmission: 'neutre',
    description: "Ne confère aucun avantage matrimonial (jurisprudence constante) : reprise, en cas de dissolution, des apports faits à la société d'acquêts.",
    momentEffet: 'dissolution',
    soumisRetranchement: false,
    assietteImpactee: 'aucune'
  }
];

// Clauses ayant un impact fiscal sur la transmission
export const CLAUSES_IMPACTING_TRANSMISSION = [
  'attribution_integrale',
  'attribution_integrale_sub',
  'preciput',
  'preciput_sub',
  'partage_inegal',
  'partage_inegal_sub',
  'partage_inegal_acquets',
  'societe_acquets'
] as const;

// Matrice de compatibilité clause/régime, basée sur le référentiel juridique
// (§8.11 — colonne "Régimes où possible"). C'est le plafond légal : une
// entrée absente d'ici pour un régime donné signifie que la clause n'est
// juridiquement pas admise sous ce régime. Elle est distincte de
// CLAUSES_BY_REGIME, qui reflète ce qui est effectivement exposé dans l'UI
// aujourd'hui (sous-ensemble du plafond légal, jamais l'inverse) — voir
// isClauseCompatibleWithRegime, utilisée pour filtrer CLAUSES_BY_REGIME et
// empêcher qu'une future entrée mal placée n'expose une clause incompatible.
//
// Les clés absentes de cette matrice (exclusion_reprise, renonciation,
// indexation) n'ont pas de ligne correspondante dans le référentiel : elles
// ne sont pas restreintes (voir isClauseCompatibleWithRegime) en attendant
// clarification.
export const CLAUSE_REGIME_COMPATIBILITY: Partial<Record<ClauseType, RegimeType[]>> = {
  mise_en_communaute: ['communaute_reduite', 'communaute_meubles', 'communaute_universelle', 'separation_societe_acquets'],
  stipulation_bien_propre: ['communaute_reduite', 'communaute_meubles', 'communaute_universelle', 'separation_societe_acquets'],
  extension_propres_par_nature: ['communaute_reduite', 'communaute_meubles', 'communaute_universelle', 'separation_societe_acquets'],
  exclusion_certains_biens: ['communaute_reduite', 'communaute_meubles', 'communaute_universelle', 'separation_societe_acquets'],
  reprise_apports: ['communaute_reduite', 'communaute_meubles', 'communaute_universelle', 'separation_societe_acquets'],
  prelevement_biens_communs: ['communaute_reduite', 'communaute_meubles', 'communaute_universelle', 'separation_societe_acquets'],
  preciput: ['communaute_reduite', 'communaute_meubles', 'communaute_universelle', 'separation_societe_acquets'],
  preciput_sub: ['separation_societe_acquets'],
  partage_inegal: ['communaute_reduite', 'communaute_meubles', 'communaute_universelle', 'separation_biens', 'separation_societe_acquets', 'participation_acquets'],
  partage_inegal_sub: ['separation_societe_acquets'],
  partage_inegal_acquets: ['participation_acquets'],
  attribution_integrale: ['communaute_reduite', 'communaute_meubles', 'communaute_universelle', 'separation_societe_acquets', 'participation_acquets'],
  attribution_integrale_sub: ['separation_societe_acquets'],
  prelevement_indemnisation: ['communaute_reduite', 'communaute_meubles', 'communaute_universelle', 'separation_biens', 'participation_acquets', 'separation_societe_acquets'],
  modification_recompenses: ['communaute_reduite', 'communaute_meubles', 'communaute_universelle', 'separation_societe_acquets'],
  contribution_charges: ['communaute_reduite', 'communaute_meubles', 'communaute_universelle', 'separation_biens', 'participation_acquets', 'separation_societe_acquets'],
  amenagement_indivision: ['communaute_reduite', 'communaute_meubles', 'separation_biens', 'participation_acquets', 'separation_societe_acquets'],
  maintien_indivision: ['communaute_reduite', 'communaute_meubles', 'separation_biens', 'participation_acquets', 'separation_societe_acquets'],
  attribution_preferentielle: ['communaute_reduite', 'communaute_meubles', 'communaute_universelle', 'separation_biens', 'participation_acquets', 'separation_societe_acquets'],
  exclusion_biens_professionnels: ['participation_acquets'],
  plafonnement_creance: ['participation_acquets'],
  simplification_preuve: ['separation_biens', 'separation_societe_acquets', 'participation_acquets'],
  evaluation_biens: ['participation_acquets'],
  societe_acquets: ['separation_societe_acquets'],
  administration_conjointe: ['communaute_reduite', 'communaute_meubles', 'communaute_universelle', 'separation_societe_acquets'],
  apport_franc_et_quitte: ['communaute_reduite', 'communaute_meubles', 'communaute_universelle', 'separation_societe_acquets'],
  separation_de_dettes: ['communaute_reduite', 'communaute_meubles', 'communaute_universelle', 'separation_societe_acquets'],
  apport_plafonne: ['communaute_reduite', 'communaute_meubles', 'communaute_universelle', 'separation_societe_acquets'],
  presomption_propriete: ['separation_biens', 'separation_societe_acquets', 'participation_acquets'],
  dissolution_alternative: ['communaute_reduite', 'communaute_meubles', 'communaute_universelle', 'separation_biens', 'participation_acquets', 'separation_societe_acquets']
};

/**
 * Vérifie si une clause est juridiquement compatible avec un régime, d'après
 * CLAUSE_REGIME_COMPATIBILITY. Une clause absente de la matrice (pas de ligne
 * référentielle claire) n'est pas restreinte : l'absence de donnée n'équivaut
 * pas à une incompatibilité.
 */
export const isClauseCompatibleWithRegime = (clauseKey: ClauseType, regime: RegimeType): boolean => {
  const allowed = CLAUSE_REGIME_COMPATIBILITY[clauseKey];
  if (!allowed) return true;
  return allowed.includes(regime);
};
