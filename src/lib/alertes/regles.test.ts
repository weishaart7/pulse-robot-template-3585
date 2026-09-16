import { describe, it, expect } from 'vitest';
import { evaluerAlertes } from './index';
import { AlerteContext } from './types';

// Contexte minimal valide, à surcharger par test. Sert de socle réutilisable
// pour les futures règles du moteur d'alertes de conseil.
const baseContext = (): AlerteContext => ({
  statutCouple: undefined,
  regimeMatrimonial: undefined,
  liberalites: [],
  avContracts: [],
  familyLinks: [],
  hasNonCommonChildren: false,
  hasDDV: false,
  assets: [],
  emprunts: [],
  societes: [],
  patrimoineOriginaire: [],
});

const idsOf = (alertes: ReturnType<typeof evaluerAlertes>) => alertes.map((a) => a.id);

describe('separation_biens_rp_indivise_remboursement_unilateral', () => {
  it('se déclenche : séparation de biens + RP en détention commune + remboursement par un seul époux', () => {
    const ctx = baseContext();
    ctx.regimeMatrimonial = 'Séparation de biens';
    ctx.assets = [{ id: 'asset-1', nature: 'Résidence principale', detenteur: 'commun' }];
    ctx.emprunts = [
      {
        id: 'emprunt-1',
        user_id: 'u1',
        nature: 'Prêt immobilier',
        libelle: 'Crédit RP',
        asset_id: 'asset-1',
        contributeur_remboursement: 'utilisateur',
        created_at: '',
        updated_at: '',
      },
    ];

    expect(idsOf(evaluerAlertes(ctx))).toContain('separation_biens_rp_indivise_remboursement_unilateral');
  });

  it('ne se déclenche pas : régime différent (communauté légale)', () => {
    const ctx = baseContext();
    ctx.regimeMatrimonial = 'Communauté légale';
    ctx.assets = [{ id: 'asset-1', nature: 'Résidence principale', detenteur: 'commun' }];
    ctx.emprunts = [
      {
        id: 'emprunt-1',
        user_id: 'u1',
        nature: 'Prêt immobilier',
        libelle: 'Crédit RP',
        asset_id: 'asset-1',
        contributeur_remboursement: 'utilisateur',
        created_at: '',
        updated_at: '',
      },
    ];

    expect(idsOf(evaluerAlertes(ctx))).not.toContain('separation_biens_rp_indivise_remboursement_unilateral');
  });

  it('ne se déclenche pas : RP détenue exclusivement par un époux (pas d\'indivision)', () => {
    const ctx = baseContext();
    ctx.regimeMatrimonial = 'Séparation de biens';
    ctx.assets = [{ id: 'asset-1', nature: 'Résidence principale', detenteur: 'user' }];
    ctx.emprunts = [
      {
        id: 'emprunt-1',
        user_id: 'u1',
        nature: 'Prêt immobilier',
        libelle: 'Crédit RP',
        asset_id: 'asset-1',
        contributeur_remboursement: 'utilisateur',
        created_at: '',
        updated_at: '',
      },
    ];

    expect(idsOf(evaluerAlertes(ctx))).not.toContain('separation_biens_rp_indivise_remboursement_unilateral');
  });

  it('ne plante pas et ne se déclenche pas à tort : aucun emprunt renseigné pour le bien', () => {
    const ctx = baseContext();
    ctx.regimeMatrimonial = 'Séparation de biens';
    ctx.assets = [{ id: 'asset-1', nature: 'Résidence principale', detenteur: 'commun' }];
    ctx.emprunts = [];

    expect(() => evaluerAlertes(ctx)).not.toThrow();
    expect(idsOf(evaluerAlertes(ctx))).not.toContain('separation_biens_rp_indivise_remboursement_unilateral');
  });
});

describe('participation_acquets_sans_etat_descriptif_signe', () => {
  it('se déclenche : participation aux acquêts + aucun patrimoine originaire signé', () => {
    const ctx = baseContext();
    ctx.regimeMatrimonial = 'Participation aux acquêts';
    ctx.patrimoineOriginaire = [
      { id: 'po-1', epoux: 'user', nature: 'Compte titres', valeur: 10000, bien_professionnel: false, signe: false },
    ];

    expect(idsOf(evaluerAlertes(ctx))).toContain('participation_acquets_sans_etat_descriptif_signe');
  });

  it('ne se déclenche pas : état descriptif signé', () => {
    const ctx = baseContext();
    ctx.regimeMatrimonial = 'Participation aux acquêts';
    ctx.patrimoineOriginaire = [
      { id: 'po-1', epoux: 'user', nature: 'Compte titres', valeur: 10000, bien_professionnel: false, signe: true },
    ];

    expect(idsOf(evaluerAlertes(ctx))).not.toContain('participation_acquets_sans_etat_descriptif_signe');
  });

  it('ne se déclenche pas : régime différent (séparation de biens)', () => {
    const ctx = baseContext();
    ctx.regimeMatrimonial = 'Séparation de biens';
    ctx.patrimoineOriginaire = [];

    expect(idsOf(evaluerAlertes(ctx))).not.toContain('participation_acquets_sans_etat_descriptif_signe');
  });

  it('ne plante pas et se déclenche : patrimoine originaire vide sous participation aux acquêts', () => {
    const ctx = baseContext();
    ctx.regimeMatrimonial = 'Participation aux acquêts';
    ctx.patrimoineOriginaire = [];

    expect(() => evaluerAlertes(ctx)).not.toThrow();
    expect(idsOf(evaluerAlertes(ctx))).toContain('participation_acquets_sans_etat_descriptif_signe');
  });
});

describe('exclusion_biens_professionnels_sans_maintien_divorce', () => {
  it('se déclenche : clause activée sans option de maintien au divorce', () => {
    const ctx = baseContext();
    ctx.clausesContrat = { exclusion_biens_professionnels: { enabled: true, options: { maintienDivorce: false } } };

    expect(idsOf(evaluerAlertes(ctx))).toContain('exclusion_biens_professionnels_sans_maintien_divorce');
  });

  it('ne se déclenche pas : maintien au divorce coché', () => {
    const ctx = baseContext();
    ctx.clausesContrat = { exclusion_biens_professionnels: { enabled: true, options: { maintienDivorce: true } } };

    expect(idsOf(evaluerAlertes(ctx))).not.toContain('exclusion_biens_professionnels_sans_maintien_divorce');
  });

  it('ne se déclenche pas : clause non activée', () => {
    const ctx = baseContext();
    ctx.clausesContrat = { exclusion_biens_professionnels: { enabled: false } };

    expect(idsOf(evaluerAlertes(ctx))).not.toContain('exclusion_biens_professionnels_sans_maintien_divorce');
  });

  it('ne plante pas et ne se déclenche pas à tort : clausesContrat absent', () => {
    const ctx = baseContext();
    ctx.clausesContrat = undefined;

    expect(() => evaluerAlertes(ctx)).not.toThrow();
    expect(idsOf(evaluerAlertes(ctx))).not.toContain('exclusion_biens_professionnels_sans_maintien_divorce');
  });
});

describe('avantage_matrimonial_sans_maintien_divorce', () => {
  it('se déclenche : préciput activé sans option de maintien au divorce', () => {
    const ctx = baseContext();
    ctx.clausesContrat = { preciput: { enabled: true, options: { maintienDivorce: false } } };

    expect(idsOf(evaluerAlertes(ctx))).toContain('avantage_matrimonial_sans_maintien_divorce');
  });

  it('se déclenche : attribution intégrale activée sans option renseignée', () => {
    const ctx = baseContext();
    ctx.clausesContrat = { attribution_integrale: { enabled: true } };

    expect(idsOf(evaluerAlertes(ctx))).toContain('avantage_matrimonial_sans_maintien_divorce');
  });

  it('se déclenche : partage inégal en société d\'acquêts sans maintien', () => {
    const ctx = baseContext();
    ctx.clausesContrat = { societe_acquets: { enabled: true }, partage_inegal_sub: { enabled: true, options: { maintienDivorce: false } } };

    expect(idsOf(evaluerAlertes(ctx))).toContain('avantage_matrimonial_sans_maintien_divorce');
  });

  it('se déclenche : partage inégal des acquêts (participation aux acquêts) sans maintien', () => {
    const ctx = baseContext();
    ctx.regimeMatrimonial = 'Participation aux acquêts';
    ctx.clausesContrat = { partage_inegal_acquets: { enabled: true } };

    expect(idsOf(evaluerAlertes(ctx))).toContain('avantage_matrimonial_sans_maintien_divorce');
  });

  it('ne se déclenche pas : maintien au divorce coché', () => {
    const ctx = baseContext();
    ctx.clausesContrat = { preciput: { enabled: true, options: { maintienDivorce: true } } };

    expect(idsOf(evaluerAlertes(ctx))).not.toContain('avantage_matrimonial_sans_maintien_divorce');
  });

  it('ne se déclenche pas : clause non activée', () => {
    const ctx = baseContext();
    ctx.clausesContrat = { preciput: { enabled: false } };

    expect(idsOf(evaluerAlertes(ctx))).not.toContain('avantage_matrimonial_sans_maintien_divorce');
  });

  it('ne se déclenche pas : clause hors périmètre (modification_recompenses)', () => {
    const ctx = baseContext();
    ctx.clausesContrat = { modification_recompenses: { enabled: true } };

    expect(idsOf(evaluerAlertes(ctx))).not.toContain('avantage_matrimonial_sans_maintien_divorce');
  });

  it('ne plante pas et ne se déclenche pas à tort : clausesContrat absent', () => {
    const ctx = baseContext();
    ctx.clausesContrat = undefined;

    expect(() => evaluerAlertes(ctx)).not.toThrow();
    expect(idsOf(evaluerAlertes(ctx))).not.toContain('avantage_matrimonial_sans_maintien_divorce');
  });
});

describe('enfants_non_communs_sans_ddv', () => {
  it('se déclenche : enfant non commun et aucune donation au dernier vivant', () => {
    const ctx = baseContext();
    ctx.hasNonCommonChildren = true;
    ctx.hasDDV = false;

    expect(idsOf(evaluerAlertes(ctx))).toContain('enfants_non_communs_sans_ddv');
  });

  it('ne se déclenche pas : aucun enfant non commun', () => {
    const ctx = baseContext();
    ctx.hasNonCommonChildren = false;
    ctx.hasDDV = false;

    expect(idsOf(evaluerAlertes(ctx))).not.toContain('enfants_non_communs_sans_ddv');
  });

  it('ne se déclenche pas : donation au dernier vivant présente', () => {
    const ctx = baseContext();
    ctx.hasNonCommonChildren = true;
    ctx.hasDDV = true;

    expect(idsOf(evaluerAlertes(ctx))).not.toContain('enfants_non_communs_sans_ddv');
  });

  it('ne plante pas et ne se déclenche pas à tort : contexte par défaut (aucune donnée renseignée)', () => {
    const ctx = baseContext();

    expect(() => evaluerAlertes(ctx)).not.toThrow();
    expect(idsOf(evaluerAlertes(ctx))).not.toContain('enfants_non_communs_sans_ddv');
  });
});

describe('ddv_enfant_non_commun_substitution_1098', () => {
  it('se déclenche : enfant non commun et donation au dernier vivant présente', () => {
    const ctx = baseContext();
    ctx.hasNonCommonChildren = true;
    ctx.hasDDV = true;

    expect(idsOf(evaluerAlertes(ctx))).toContain('ddv_enfant_non_commun_substitution_1098');
  });

  it('ne se déclenche pas : aucun enfant non commun (tous communs)', () => {
    const ctx = baseContext();
    ctx.hasNonCommonChildren = false;
    ctx.hasDDV = true;

    expect(idsOf(evaluerAlertes(ctx))).not.toContain('ddv_enfant_non_commun_substitution_1098');
  });

  it('ne se déclenche pas : pas de donation au dernier vivant', () => {
    const ctx = baseContext();
    ctx.hasNonCommonChildren = true;
    ctx.hasDDV = false;

    expect(idsOf(evaluerAlertes(ctx))).not.toContain('ddv_enfant_non_commun_substitution_1098');
  });

  it('ne plante pas et ne se déclenche pas à tort : contexte par défaut (aucune donnée renseignée)', () => {
    const ctx = baseContext();

    expect(() => evaluerAlertes(ctx)).not.toThrow();
    expect(idsOf(evaluerAlertes(ctx))).not.toContain('ddv_enfant_non_commun_substitution_1098');
  });
});

describe('enfants_non_communs_avantage_matrimonial', () => {
  it('se déclenche : enfant non commun + communauté universelle + clause d\'attribution intégrale active', () => {
    const ctx = baseContext();
    ctx.hasNonCommonChildren = true;
    ctx.regimeMatrimonial = 'Communauté universelle';
    ctx.clausesContrat = { attribution_integrale: { enabled: true } };

    expect(idsOf(evaluerAlertes(ctx))).toContain('enfants_non_communs_avantage_matrimonial');
  });

  it('se déclenche : enfant non commun + communauté légale + clause de préciput active', () => {
    const ctx = baseContext();
    ctx.hasNonCommonChildren = true;
    ctx.regimeMatrimonial = 'Communauté légale';
    ctx.clausesContrat = { preciput: { enabled: true } };

    expect(idsOf(evaluerAlertes(ctx))).toContain('enfants_non_communs_avantage_matrimonial');
  });

  it('se déclenche : enfant non commun + communauté de meubles et acquêts + partage inégal actif', () => {
    const ctx = baseContext();
    ctx.hasNonCommonChildren = true;
    ctx.regimeMatrimonial = 'Communauté de meubles et acquêts';
    ctx.clausesContrat = { partage_inegal: { enabled: true } };

    expect(idsOf(evaluerAlertes(ctx))).toContain('enfants_non_communs_avantage_matrimonial');
  });

  it('se déclenche : enfant non commun + séparation de biens avec société d\'acquêts + attribution intégrale sub active', () => {
    const ctx = baseContext();
    ctx.hasNonCommonChildren = true;
    ctx.regimeMatrimonial = 'Séparation de biens avec société d\'acquêts';
    ctx.clausesContrat = { societe_acquets: { enabled: true }, attribution_integrale_sub: { enabled: true } };

    expect(idsOf(evaluerAlertes(ctx))).toContain('enfants_non_communs_avantage_matrimonial');
  });

  it('ne se déclenche pas : aucun enfant non commun', () => {
    const ctx = baseContext();
    ctx.hasNonCommonChildren = false;
    ctx.regimeMatrimonial = 'Communauté universelle';
    ctx.clausesContrat = { attribution_integrale: { enabled: true } };

    expect(idsOf(evaluerAlertes(ctx))).not.toContain('enfants_non_communs_avantage_matrimonial');
  });

  it('ne se déclenche pas : seule l\'adjonction de société d\'acquêts est active, sans clause d\'avantage', () => {
    const ctx = baseContext();
    ctx.hasNonCommonChildren = true;
    ctx.regimeMatrimonial = 'Séparation de biens avec société d\'acquêts';
    ctx.clausesContrat = { societe_acquets: { enabled: true } };

    expect(idsOf(evaluerAlertes(ctx))).not.toContain('enfants_non_communs_avantage_matrimonial');
  });

  it('ne se déclenche pas : partage inégal des acquêts en participation aux acquêts (exclu par prudence)', () => {
    const ctx = baseContext();
    ctx.hasNonCommonChildren = true;
    ctx.regimeMatrimonial = 'Participation aux acquêts';
    ctx.clausesContrat = { partage_inegal_acquets: { enabled: true } };

    expect(idsOf(evaluerAlertes(ctx))).not.toContain('enfants_non_communs_avantage_matrimonial');
  });

  it('ne plante pas et ne se déclenche pas à tort : clause d\'attribution intégrale non activée', () => {
    const ctx = baseContext();
    ctx.hasNonCommonChildren = true;
    ctx.regimeMatrimonial = 'Communauté universelle';
    ctx.clausesContrat = { attribution_integrale: { enabled: false } };

    expect(() => evaluerAlertes(ctx)).not.toThrow();
    expect(idsOf(evaluerAlertes(ctx))).not.toContain('enfants_non_communs_avantage_matrimonial');
  });
});

describe('pacse_sans_testament', () => {
  it('se déclenche : pacsé sans testament réalisé', () => {
    const ctx = baseContext();
    ctx.statutCouple = 'Pacsé(e)';
    ctx.liberalites = [];

    expect(idsOf(evaluerAlertes(ctx))).toContain('pacse_sans_testament');
  });

  it('ne se déclenche pas : testament réalisé (legs avec testament_realise = Oui)', () => {
    const ctx = baseContext();
    ctx.statutCouple = 'Pacsé(e)';
    ctx.liberalites = [
      { type: 'legs', denomination: 'Legs partenaire', beneficiaire_nom: 'Partenaire', testament_realise: 'Oui' },
    ];

    expect(idsOf(evaluerAlertes(ctx))).not.toContain('pacse_sans_testament');
  });

  it('ne se déclenche pas : statut couple différent (marié)', () => {
    const ctx = baseContext();
    ctx.statutCouple = 'Marié(e)';
    ctx.liberalites = [];

    expect(idsOf(evaluerAlertes(ctx))).not.toContain('pacse_sans_testament');
  });

  it('ne plante pas et ne se déclenche pas à tort : statutCouple non renseigné', () => {
    const ctx = baseContext();

    expect(() => evaluerAlertes(ctx)).not.toThrow();
    expect(idsOf(evaluerAlertes(ctx))).not.toContain('pacse_sans_testament');
  });
});

describe('concubin_sans_protection', () => {
  it('se déclenche : concubinage, aucun testament, aucune assurance-vie avec clause structurée', () => {
    const ctx = baseContext();
    ctx.statutCouple = 'Concubinage';
    ctx.liberalites = [];
    ctx.avContracts = [];

    expect(idsOf(evaluerAlertes(ctx))).toContain('concubin_sans_protection');
  });

  it('ne se déclenche pas : testament réalisé', () => {
    const ctx = baseContext();
    ctx.statutCouple = 'Concubinage';
    ctx.liberalites = [
      { type: 'legs', denomination: 'Legs concubin', beneficiaire_nom: 'Concubin', testament_realise: 'Oui' },
    ];

    expect(idsOf(evaluerAlertes(ctx))).not.toContain('concubin_sans_protection');
  });

  it(
    "ne se déclenche pas : assurance-vie avec le partenaire (marqueur 'conjoint') désigné bénéficiaire, sans statut renseigné",
    () => {
      const ctx = baseContext();
      ctx.statutCouple = 'Concubinage';
      ctx.liberalites = [];
      ctx.avContracts = [
        {
          assetId: 'av-1',
          operations: [],
          clauseBeneficiaireStructuree: {
            niveaux: [{ beneficiaires: [{ familyLinkId: 'conjoint', pourcentage: 100 }] }],
          },
        },
      ];

      expect(idsOf(evaluerAlertes(ctx))).not.toContain('concubin_sans_protection');
    }
  );

  it('se déclenche : partenaire désigné mais renonçant', () => {
    const ctx = baseContext();
    ctx.statutCouple = 'Concubinage';
    ctx.liberalites = [];
    ctx.avContracts = [
      {
        assetId: 'av-1',
        operations: [],
        clauseBeneficiaireStructuree: {
          niveaux: [{ beneficiaires: [{ familyLinkId: 'conjoint', pourcentage: 100, statut: 'renoncant' }] }],
        },
      },
    ];

    expect(idsOf(evaluerAlertes(ctx))).toContain('concubin_sans_protection');
  });

  it('se déclenche : partenaire désigné mais pourcentage à 0', () => {
    const ctx = baseContext();
    ctx.statutCouple = 'Concubinage';
    ctx.liberalites = [];
    ctx.avContracts = [
      {
        assetId: 'av-1',
        operations: [],
        clauseBeneficiaireStructuree: {
          niveaux: [{ beneficiaires: [{ familyLinkId: 'conjoint', pourcentage: 0 }] }],
        },
      },
    ];

    expect(idsOf(evaluerAlertes(ctx))).toContain('concubin_sans_protection');
  });

  it("se déclenche : bénéficiaire désigné n'est pas le partenaire (ex : un enfant)", () => {
    const ctx = baseContext();
    ctx.statutCouple = 'Concubinage';
    ctx.liberalites = [];
    ctx.avContracts = [
      {
        assetId: 'av-1',
        operations: [],
        clauseBeneficiaireStructuree: {
          niveaux: [{ beneficiaires: [{ familyLinkId: 'enfant-1', pourcentage: 100 }] }],
        },
      },
    ];

    expect(idsOf(evaluerAlertes(ctx))).toContain('concubin_sans_protection');
  });

  it('ne se déclenche pas : statut couple différent (marié)', () => {
    const ctx = baseContext();
    ctx.statutCouple = 'Marié(e)';
    ctx.liberalites = [];
    ctx.avContracts = [];

    expect(idsOf(evaluerAlertes(ctx))).not.toContain('concubin_sans_protection');
  });
});

describe('mariage_avant_1966_sans_contrat', () => {
  it('se déclenche : mariage sans contrat avant le 1er février 1966', () => {
    const ctx = baseContext();
    ctx.statutCouple = 'Marié(e)';
    ctx.pasDeContratMariage = true;
    ctx.dateMariage = '1960-06-15';

    expect(idsOf(evaluerAlertes(ctx))).toContain('mariage_avant_1966_sans_contrat');
  });

  it('ne se déclenche pas : mariage après le 1er février 1966', () => {
    const ctx = baseContext();
    ctx.statutCouple = 'Marié(e)';
    ctx.pasDeContratMariage = true;
    ctx.dateMariage = '1970-01-01';

    expect(idsOf(evaluerAlertes(ctx))).not.toContain('mariage_avant_1966_sans_contrat');
  });

  it('ne se déclenche pas : un contrat de mariage existe', () => {
    const ctx = baseContext();
    ctx.statutCouple = 'Marié(e)';
    ctx.pasDeContratMariage = false;
    ctx.dateMariage = '1960-06-15';

    expect(idsOf(evaluerAlertes(ctx))).not.toContain('mariage_avant_1966_sans_contrat');
  });

  it('ne plante pas et ne se déclenche pas à tort : dateMariage absente', () => {
    const ctx = baseContext();
    ctx.statutCouple = 'Marié(e)';
    ctx.pasDeContratMariage = true;
    ctx.dateMariage = undefined;

    expect(() => evaluerAlertes(ctx)).not.toThrow();
    expect(idsOf(evaluerAlertes(ctx))).not.toContain('mariage_avant_1966_sans_contrat');
  });
});

describe('pacs_avant_2007_sans_convention', () => {
  it('se déclenche : pacs sans convention avant le 1er janvier 2007', () => {
    const ctx = baseContext();
    ctx.statutCouple = 'Pacsé(e)';
    ctx.conventionPacs = undefined;
    ctx.datePacs = '2005-03-10';

    expect(idsOf(evaluerAlertes(ctx))).toContain('pacs_avant_2007_sans_convention');
  });

  it('ne se déclenche pas : pacs après le 1er janvier 2007', () => {
    const ctx = baseContext();
    ctx.statutCouple = 'Pacsé(e)';
    ctx.conventionPacs = undefined;
    ctx.datePacs = '2010-01-01';

    expect(idsOf(evaluerAlertes(ctx))).not.toContain('pacs_avant_2007_sans_convention');
  });

  it('ne se déclenche pas : une convention de pacs existe', () => {
    const ctx = baseContext();
    ctx.statutCouple = 'Pacsé(e)';
    ctx.conventionPacs = 'Séparation de patrimoines';
    ctx.datePacs = '2005-03-10';

    expect(idsOf(evaluerAlertes(ctx))).not.toContain('pacs_avant_2007_sans_convention');
  });

  it('ne plante pas et ne se déclenche pas à tort : datePacs absente', () => {
    const ctx = baseContext();
    ctx.statutCouple = 'Pacsé(e)';
    ctx.conventionPacs = undefined;
    ctx.datePacs = undefined;

    expect(() => evaluerAlertes(ctx)).not.toThrow();
    expect(idsOf(evaluerAlertes(ctx))).not.toContain('pacs_avant_2007_sans_convention');
  });
});

describe('communaute_universelle_double_abattement', () => {
  it('se déclenche : communauté universelle, patrimoine net supérieur à 2x abattement x nombre d\'enfants', () => {
    const ctx = baseContext();
    ctx.regimeMatrimonial = 'Communauté universelle';
    ctx.patrimoineNet = 300000;
    ctx.familyLinks = [{ id: 'e1', lien_familial: 'Enfant', nom: 'TEST', est_decede: false }];

    expect(idsOf(evaluerAlertes(ctx))).toContain('communaute_universelle_double_abattement');
  });

  it('ne se déclenche pas : patrimoine net sous le seuil', () => {
    const ctx = baseContext();
    ctx.regimeMatrimonial = 'Communauté universelle';
    ctx.patrimoineNet = 150000;
    ctx.familyLinks = [{ id: 'e1', lien_familial: 'Enfant', nom: 'TEST', est_decede: false }];

    expect(idsOf(evaluerAlertes(ctx))).not.toContain('communaute_universelle_double_abattement');
  });

  it("ne se déclenche pas : aucun enfant vivant (nombreEnfants = 0)", () => {
    const ctx = baseContext();
    ctx.regimeMatrimonial = 'Communauté universelle';
    ctx.patrimoineNet = 300000;
    ctx.familyLinks = [{ id: 'e1', lien_familial: 'Enfant', nom: 'TEST', est_decede: true }];

    expect(idsOf(evaluerAlertes(ctx))).not.toContain('communaute_universelle_double_abattement');
  });

  it('ne plante pas et ne se déclenche pas à tort : régime différent (communauté légale)', () => {
    const ctx = baseContext();
    ctx.regimeMatrimonial = 'Communauté légale';
    ctx.patrimoineNet = 300000;
    ctx.familyLinks = [{ id: 'e1', lien_familial: 'Enfant', nom: 'TEST', est_decede: false }];

    expect(() => evaluerAlertes(ctx)).not.toThrow();
    expect(idsOf(evaluerAlertes(ctx))).not.toContain('communaute_universelle_double_abattement');
  });
});

describe('parts_non_negociables_souscrites_pendant_mariage', () => {
  it('se déclenche : régime communautaire, parts non négociables souscrites après le mariage', () => {
    const ctx = baseContext();
    ctx.regimeMatrimonial = 'Communauté légale';
    ctx.dateMariage = '2010-01-01';
    ctx.societes = [
      {
        id: 'soc-1',
        user_id: 'u1',
        denomination: 'SCI Test',
        type_societe: 'SCI',
        parts_negociables: false,
        date_souscription: '2015-06-01',
      },
    ];

    expect(idsOf(evaluerAlertes(ctx))).toContain('parts_non_negociables_souscrites_pendant_mariage');
  });

  it('ne se déclenche pas : souscription antérieure au mariage', () => {
    const ctx = baseContext();
    ctx.regimeMatrimonial = 'Communauté légale';
    ctx.dateMariage = '2010-01-01';
    ctx.societes = [
      {
        id: 'soc-1',
        user_id: 'u1',
        denomination: 'SCI Test',
        type_societe: 'SCI',
        parts_negociables: false,
        date_souscription: '2005-06-01',
      },
    ];

    expect(idsOf(evaluerAlertes(ctx))).not.toContain('parts_non_negociables_souscrites_pendant_mariage');
  });

  it('ne se déclenche pas : parts négociables', () => {
    const ctx = baseContext();
    ctx.regimeMatrimonial = 'Communauté légale';
    ctx.dateMariage = '2010-01-01';
    ctx.societes = [
      {
        id: 'soc-1',
        user_id: 'u1',
        denomination: 'SCI Test',
        type_societe: 'SCI',
        parts_negociables: true,
        date_souscription: '2015-06-01',
      },
    ];

    expect(idsOf(evaluerAlertes(ctx))).not.toContain('parts_non_negociables_souscrites_pendant_mariage');
  });

  it('ne plante pas et ne se déclenche pas à tort : régime non communautaire', () => {
    const ctx = baseContext();
    ctx.regimeMatrimonial = 'Séparation de biens';
    ctx.dateMariage = '2010-01-01';
    ctx.societes = [
      {
        id: 'soc-1',
        user_id: 'u1',
        denomination: 'SCI Test',
        type_societe: 'SCI',
        parts_negociables: false,
        date_souscription: '2015-06-01',
      },
    ];

    expect(() => evaluerAlertes(ctx)).not.toThrow();
    expect(idsOf(evaluerAlertes(ctx))).not.toContain('parts_non_negociables_souscrites_pendant_mariage');
  });
});

describe('extraneite_residence_fiscale_etranger', () => {
  it('se déclenche : client résident fiscal à l\'étranger', () => {
    const ctx = baseContext();
    ctx.clientResidenceFiscaleEtranger = true;

    expect(idsOf(evaluerAlertes(ctx))).toContain('extraneite_residence_fiscale_etranger');
  });

  it('se déclenche : conjoint résident fiscal à l\'étranger', () => {
    const ctx = baseContext();
    ctx.conjointResidenceFiscaleEtranger = true;

    expect(idsOf(evaluerAlertes(ctx))).toContain('extraneite_residence_fiscale_etranger');
  });

  it('ne se déclenche pas : ni client ni conjoint résident fiscal à l\'étranger', () => {
    const ctx = baseContext();
    ctx.clientResidenceFiscaleEtranger = false;
    ctx.conjointResidenceFiscaleEtranger = false;

    expect(idsOf(evaluerAlertes(ctx))).not.toContain('extraneite_residence_fiscale_etranger');
  });

  it('ne plante pas et ne se déclenche pas à tort : champs non renseignés', () => {
    const ctx = baseContext();

    expect(() => evaluerAlertes(ctx)).not.toThrow();
    expect(idsOf(evaluerAlertes(ctx))).not.toContain('extraneite_residence_fiscale_etranger');
  });
});

