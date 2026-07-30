import { describe, it, expect } from 'vitest';
import { evaluerAlertes } from './index';
import { AlerteContext } from './types';

// Contexte minimal valide, à surcharger par test. Sert de socle réutilisable
// pour les futures règles du moteur d'alertes de conseil.
const baseContext = (): AlerteContext => ({
  statutCouple: undefined,
  regimeMatrimonial: undefined,
  liberalites: [],
  scenariosRegime: [],
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

describe('enfants_non_communs_communaute_universelle', () => {
  it('se déclenche : enfant non commun + communauté universelle + clause d\'attribution intégrale active', () => {
    const ctx = baseContext();
    ctx.hasNonCommonChildren = true;
    ctx.regimeMatrimonial = 'Communauté universelle';
    ctx.clausesContrat = { attribution_integrale: { enabled: true } };

    expect(idsOf(evaluerAlertes(ctx))).toContain('enfants_non_communs_communaute_universelle');
  });

  it('ne se déclenche pas : aucun enfant non commun', () => {
    const ctx = baseContext();
    ctx.hasNonCommonChildren = false;
    ctx.regimeMatrimonial = 'Communauté universelle';
    ctx.clausesContrat = { attribution_integrale: { enabled: true } };

    expect(idsOf(evaluerAlertes(ctx))).not.toContain('enfants_non_communs_communaute_universelle');
  });

  it('ne se déclenche pas : régime différent (communauté légale)', () => {
    const ctx = baseContext();
    ctx.hasNonCommonChildren = true;
    ctx.regimeMatrimonial = 'Communauté légale';
    ctx.clausesContrat = { attribution_integrale: { enabled: true } };

    expect(idsOf(evaluerAlertes(ctx))).not.toContain('enfants_non_communs_communaute_universelle');
  });

  it('ne plante pas et ne se déclenche pas à tort : clause d\'attribution intégrale non activée', () => {
    const ctx = baseContext();
    ctx.hasNonCommonChildren = true;
    ctx.regimeMatrimonial = 'Communauté universelle';
    ctx.clausesContrat = { attribution_integrale: { enabled: false } };

    expect(() => evaluerAlertes(ctx)).not.toThrow();
    expect(idsOf(evaluerAlertes(ctx))).not.toContain('enfants_non_communs_communaute_universelle');
  });
});

describe('changement_regime_proche_donation', () => {
  it('se déclenche : scénario envisagé et donation en projet séparés de moins de 3 ans', () => {
    const ctx = baseContext();
    ctx.scenariosRegime = [
      { id: 's1', type: 'envisage', regimeCible: 'Communauté universelle', date: '2026-06-01', motivationCivile: undefined },
    ];
    ctx.liberalites = [
      { type: 'donation', denomination: 'Donation appartement', beneficiaire_nom: 'Enfant 1', date_acte: '2027-01-01', statut: 'projet' },
    ];

    expect(idsOf(evaluerAlertes(ctx))).toContain('changement_regime_proche_donation');
  });

  it('ne se déclenche pas : scénario et donation actée séparés de plus de 3 ans', () => {
    const ctx = baseContext();
    ctx.scenariosRegime = [
      { id: 's1', type: 'realise', regimeCible: 'Séparation de biens', date: '2015-01-01' },
    ];
    ctx.liberalites = [
      { type: 'donation', denomination: 'Donation appartement', beneficiaire_nom: 'Enfant 1', date_acte: '2026-01-01', statut: 'acte' },
    ];

    expect(idsOf(evaluerAlertes(ctx))).not.toContain('changement_regime_proche_donation');
  });

  it('ne se déclenche pas : donation antérieure au scénario de régime, même à moins de 3 ans (sens "avant" non respecté)', () => {
    // Le risque d'abus de droit (art. L. 64 LPF) vise un changement de régime
    // organisé en vue de faciliter une donation à venir, pas l'inverse : une
    // donation suivie d'un changement de régime plus tard n'a pas la même
    // charge probatoire et ne doit pas déclencher l'alerte, même à moins de
    // 3 ans d'écart.
    const ctx = baseContext();
    ctx.scenariosRegime = [
      { id: 's1', type: 'realise', regimeCible: 'Communauté universelle', date: '2026-06-01' },
    ];
    ctx.liberalites = [
      { type: 'donation', denomination: 'Donation appartement', beneficiaire_nom: 'Enfant 1', date_acte: '2025-01-01', statut: 'acte' },
    ];

    expect(idsOf(evaluerAlertes(ctx))).not.toContain('changement_regime_proche_donation');
  });

  it('ne plante pas et ne se déclenche pas à tort : aucun scénario et aucune donation', () => {
    const ctx = baseContext();

    expect(() => evaluerAlertes(ctx)).not.toThrow();
    expect(idsOf(evaluerAlertes(ctx))).not.toContain('changement_regime_proche_donation');
  });

  it('message invite à documenter la motivation civile quand elle est déjà renseignée sur le scénario concerné', () => {
    const ctx = baseContext();
    ctx.scenariosRegime = [
      {
        id: 's1',
        type: 'realise',
        regimeCible: 'Communauté universelle',
        date: '2026-03-01',
        motivationCivile: 'Protection du conjoint suite à un changement de situation professionnelle',
      },
    ];
    ctx.liberalites = [
      { type: 'donation', denomination: 'Donation appartement', beneficiaire_nom: 'Enfant 1', date_acte: '2026-06-01', statut: 'acte' },
    ];

    const alerte = evaluerAlertes(ctx).find((a) => a.id === 'changement_regime_proche_donation');
    expect(alerte).toBeDefined();
    expect(alerte!.message).toContain('Vérifiez que la motivation civile déjà renseignée');
    expect(alerte!.message).not.toContain('Documentez la motivation civile');
  });

  it('message invite à saisir la motivation civile quand elle est vide sur le scénario concerné', () => {
    const ctx = baseContext();
    ctx.scenariosRegime = [
      { id: 's1', type: 'envisage', regimeCible: 'Communauté universelle', date: '2026-03-01' },
    ];
    ctx.liberalites = [
      { type: 'donation', denomination: 'Donation appartement', beneficiaire_nom: 'Enfant 1', date_acte: '2026-06-01', statut: 'acte' },
    ];

    const alerte = evaluerAlertes(ctx).find((a) => a.id === 'changement_regime_proche_donation');
    expect(alerte).toBeDefined();
    expect(alerte!.message).toContain('Documentez la motivation civile');
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

describe('extraneite_regime_matrimonial', () => {
  it('se déclenche : pays du premier domicile matrimonial renseigné et différent de la France', () => {
    const ctx = baseContext();
    ctx.paysPremierDomicileMatrimonial = 'Belgique';

    expect(idsOf(evaluerAlertes(ctx))).toContain('extraneite_regime_matrimonial');
  });

  it('se déclenche : loi applicable au régime renseignée', () => {
    const ctx = baseContext();
    ctx.loiApplicableRegime = 'Loi belge';

    expect(idsOf(evaluerAlertes(ctx))).toContain('extraneite_regime_matrimonial');
  });

  it('ne se déclenche pas : pays du premier domicile matrimonial = France, loi applicable non renseignée', () => {
    const ctx = baseContext();
    ctx.paysPremierDomicileMatrimonial = 'France';

    expect(idsOf(evaluerAlertes(ctx))).not.toContain('extraneite_regime_matrimonial');
  });

  it('ne plante pas et ne se déclenche pas à tort : champs non renseignés', () => {
    const ctx = baseContext();

    expect(() => evaluerAlertes(ctx)).not.toThrow();
    expect(idsOf(evaluerAlertes(ctx))).not.toContain('extraneite_regime_matrimonial');
  });
});
