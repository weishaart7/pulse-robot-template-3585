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
