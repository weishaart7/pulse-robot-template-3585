import { describe, it, expect } from 'vitest';
import { qualifierBien } from './qualification';

describe('qualifierBien — participation aux acquêts', () => {
  it('bien acquis pendant le mariage par un seul époux : propre, comme sous séparation de biens (pas "Bien commun")', () => {
    const base = {
      statutCouple: 'Marié(e)',
      dateMariage: '2015-06-01',
      dateAcquisition: '2020-03-10',
      origineActif: ['Achat'],
      detenteur: 'user',
    };

    const participation = qualifierBien({ ...base, regimeMatrimonial: 'Participation aux acquêts' });
    const separation = qualifierBien({ ...base, regimeMatrimonial: 'Séparation de biens' });

    expect(participation.qualification).toBe('Bien propre');
    expect(participation.qualification).toBe(separation.qualification);
  });
});

describe('qualifierBien — biens propres par nature (art. 1404)', () => {
  const base = {
    statutCouple: 'Marié(e)',
    regimeMatrimonial: 'Communauté universelle',
    dateMariage: '2015-06-01',
    dateAcquisition: '2020-03-10',
    origineActif: ['Achat'],
    detenteur: 'user',
    estPropreParNature: true,
  };

  it('instrument de travail nécessaire à la profession : propre même sous communauté universelle', () => {
    const result = qualifierBien(base);

    expect(result.qualification).toBe('Bien propre');
  });
});

describe('qualifierBien — libéralité sous communauté universelle (art. 1526)', () => {
  it('donation reçue pendant le mariage, sans clause d\'exclusion : commune par défaut (art. 1526, inverse du régime légal)', () => {
    const result = qualifierBien({
      statutCouple: 'Marié(e)',
      regimeMatrimonial: 'Communauté universelle',
      dateMariage: '2015-06-01',
      dateAcquisition: '2020-03-10',
      origineActif: ['Donation'],
      detenteur: 'user',
    });

    expect(result.qualification).toBe('Bien commun');
  });

  it('donation reçue pendant le mariage, avec clause d\'exclusion réservant le bien à l\'époux bénéficiaire : propre', () => {
    const result = qualifierBien({
      statutCouple: 'Marié(e)',
      regimeMatrimonial: 'Communauté universelle',
      dateMariage: '2015-06-01',
      dateAcquisition: '2020-03-10',
      origineActif: ['Donation'],
      detenteur: 'user',
      clauseEntreeCommunaute: true,
    });

    expect(result.qualification).toBe('Bien propre');
  });
});

describe('qualifierBien — libéralité sous communauté de meubles et acquêts (art. 1498)', () => {
  it('meuble reçu par donation pendant le mariage, sans clause d\'exclusion : commun par défaut (art. 1498 al. 1)', () => {
    const result = qualifierBien({
      statutCouple: 'Marié(e)',
      regimeMatrimonial: "Communauté de meubles et d'acquêts",
      dateMariage: '2015-06-01',
      dateAcquisition: '2020-03-10',
      origineActif: ['Donation'],
      detenteur: 'user',
      natureActif: 'Livret A',
    });

    expect(result.qualification).toBe('Bien commun');
  });

  it('meuble reçu par donation pendant le mariage, avec clause d\'exclusion : propre', () => {
    const result = qualifierBien({
      statutCouple: 'Marié(e)',
      regimeMatrimonial: "Communauté de meubles et d'acquêts",
      dateMariage: '2015-06-01',
      dateAcquisition: '2020-03-10',
      origineActif: ['Donation'],
      detenteur: 'user',
      natureActif: 'Livret A',
      clauseEntreeCommunaute: true,
    });

    expect(result.qualification).toBe('Bien propre');
  });

  it('immeuble reçu par donation pendant le mariage, sans stipulation d\'entrée en communauté : propre (règle du régime légal transposée)', () => {
    const result = qualifierBien({
      statutCouple: 'Marié(e)',
      regimeMatrimonial: "Communauté de meubles et d'acquêts",
      dateMariage: '2015-06-01',
      dateAcquisition: '2020-03-10',
      origineActif: ['Donation'],
      detenteur: 'user',
      natureActif: 'Résidence principale',
    });

    expect(result.qualification).toBe('Bien propre');
  });

  it('immeuble reçu par donation pendant le mariage, avec stipulation expresse d\'entrée en communauté : commun', () => {
    const result = qualifierBien({
      statutCouple: 'Marié(e)',
      regimeMatrimonial: "Communauté de meubles et d'acquêts",
      dateMariage: '2015-06-01',
      dateAcquisition: '2020-03-10',
      origineActif: ['Donation'],
      detenteur: 'user',
      natureActif: 'Résidence principale',
      clauseEntreeCommunaute: true,
    });

    expect(result.qualification).toBe('Bien commun');
  });
});

describe('qualifierBien — libéralité sous régime légal (art. 1405 al. 2)', () => {
  it('donation reçue pendant le mariage, sans stipulation d\'entrée en communauté : propre', () => {
    const result = qualifierBien({
      statutCouple: 'Marié(e)',
      regimeMatrimonial: 'Communauté réduite aux acquêts',
      dateMariage: '2015-06-01',
      dateAcquisition: '2020-03-10',
      origineActif: ['Donation'],
      detenteur: 'user',
    });

    expect(result.qualification).toBe('Bien propre');
  });

  it('donation reçue pendant le mariage, avec stipulation expresse d\'entrée en communauté : commun', () => {
    const result = qualifierBien({
      statutCouple: 'Marié(e)',
      regimeMatrimonial: 'Communauté réduite aux acquêts',
      dateMariage: '2015-06-01',
      dateAcquisition: '2020-03-10',
      origineActif: ['Donation'],
      detenteur: 'user',
      clauseEntreeCommunaute: true,
    });

    expect(result.qualification).toBe('Bien commun');
  });
});

describe('qualifierBien — stipulation testamentaire d\'entrée en communauté (art. 1405 al. 2, héritage)', () => {
  it('héritage avec stipulation testamentaire d\'entrée en communauté, sous communauté réduite aux acquêts : commun', () => {
    const result = qualifierBien({
      statutCouple: 'Marié(e)',
      regimeMatrimonial: 'Communauté réduite aux acquêts',
      dateMariage: '2015-06-01',
      dateAcquisition: '2020-03-10',
      origineActif: ['Héritage'],
      detenteur: 'user',
      clauseEntreeCommunaute: true,
    });

    expect(result.qualification).toBe('Bien commun');
  });

  it('même cas sans stipulation testamentaire : propre (non-régression)', () => {
    const result = qualifierBien({
      statutCouple: 'Marié(e)',
      regimeMatrimonial: 'Communauté réduite aux acquêts',
      dateMariage: '2015-06-01',
      dateAcquisition: '2020-03-10',
      origineActif: ['Héritage'],
      detenteur: 'user',
    });

    expect(result.qualification).toBe('Bien propre');
  });
});

describe('qualifierBien — date du PACS (art. 515-5)', () => {
  const base = {
    statutCouple: 'Pacsé(e)',
    dateAcquisition: '2020-03-10',
    origineActif: ['Achat'],
    detenteur: 'user',
  };

  it('PACS conclu avant le 1er janvier 2007, sans convention renseignée : indivision par défaut', () => {
    const result = qualifierBien({ ...base, datePacs: '2003-05-12' });

    expect(result.qualification).toBe('Indivision');
  });

  it('PACS conclu après le 1er janvier 2007, sans convention renseignée : bien propre (comportement actuel, non-régression)', () => {
    const result = qualifierBien({ ...base, datePacs: '2015-09-01' });

    expect(result.qualification).toBe('Bien propre');
  });

  it('convention explicite "Indivision", quelle que soit la date : indivision (la convention prime)', () => {
    const result = qualifierBien({ ...base, datePacs: '2015-09-01', conventionPacs: 'Indivision' });

    expect(result.qualification).toBe('Indivision');
  });

  it('convention explicite "Régime de la séparation des biens", avant 2007 : bien propre (la convention prime même quand la date suggérerait l\'indivision)', () => {
    const result = qualifierBien({ ...base, datePacs: '2003-05-12', conventionPacs: 'Régime de la séparation des biens' });

    expect(result.qualification).toBe('Bien propre');
  });
});

describe('qualifierBien — exclusions art. 515-5-2 sous PACS-indivision', () => {
  const base = {
    statutCouple: 'Pacsé(e)',
    conventionPacs: 'Indivision',
    dateAcquisition: '2020-03-10',
    detenteur: 'user',
  };

  it('bien propre par nature (art. 1404 par analogie) : bien personnel', () => {
    const result = qualifierBien({ ...base, origineActif: ['Achat'], estPropreParNature: true });

    expect(result.qualification).toBe('Bien personnel');
  });

  it('bien reçu par donation : bien personnel', () => {
    const result = qualifierBien({ ...base, origineActif: ['Donation'] });

    expect(result.qualification).toBe('Bien personnel');
  });

  it('bien reçu par succession (héritage) : bien personnel', () => {
    const result = qualifierBien({ ...base, origineActif: ['Héritage'] });

    expect(result.qualification).toBe('Bien personnel');
  });

  it('bien créé : bien personnel', () => {
    const result = qualifierBien({ ...base, origineActif: ['Création'] });

    expect(result.qualification).toBe('Bien personnel');
  });

  it('bien acquis en remploi de fonds propres : bien personnel', () => {
    const result = qualifierBien({ ...base, origineActif: ['Achat'], clauseRemploi: true });

    expect(result.qualification).toBe('Bien personnel');
  });

  it('bien ordinaire acquis pendant le PACS, sans aucune exception : indivision (non-régression)', () => {
    const result = qualifierBien({ ...base, origineActif: ['Achat'] });

    expect(result.qualification).toBe('Indivision');
  });
});

describe('qualifierBien — regime_matrimonial périmé après un changement de statut (Option A, non effacé en base)', () => {
  it('statut Pacsé(e) avec un regime_matrimonial resté en base d\'un mariage précédent : ignoré, reste propre', () => {
    const result = qualifierBien({
      statutCouple: 'Pacsé(e)',
      regimeMatrimonial: 'Communauté universelle',
      datePacs: '2015-09-01',
      dateAcquisition: '2020-03-10',
      origineActif: ['Achat'],
      detenteur: 'user',
      estPropreParNature: true,
    });

    expect(result.qualification).toBe('Bien propre');
  });
});

describe('qualifierBien — concubinage (art. 515-8, aucune masse commune)', () => {
  const base = {
    statutCouple: 'Concubinage',
    dateAcquisition: '2020-03-10',
    origineActif: ['Achat'],
  };

  it('bien détenu par l\'utilisateur seul : bien personnel (jamais "Bien commun")', () => {
    const result = qualifierBien({ ...base, detenteur: 'user' });

    expect(result.qualification).toBe('Bien personnel');
  });

  it('bien détenu par le concubin seul : bien personnel', () => {
    const result = qualifierBien({ ...base, detenteur: 'spouse' });

    expect(result.qualification).toBe('Bien personnel');
  });

  it('bien détenu par le couple : indivision de droit commun', () => {
    const result = qualifierBien({ ...base, detenteur: 'common' });

    expect(result.qualification).toBe('Indivision');
  });

  it('bien détenu par le couple, valeur d\'affichage "Le couple" : indivision (les deux conventions de détenteur cohabitent selon l\'appelant)', () => {
    const result = qualifierBien({ ...base, detenteur: 'Le couple' });

    expect(result.qualification).toBe('Indivision');
  });

  it('origine gratuite ou remploi ne font pas revenir la notion de "Bien propre", inexistante hors régime communautaire', () => {
    const donation = qualifierBien({ ...base, origineActif: ['Donation'], detenteur: 'user' });
    const remploi = qualifierBien({ ...base, clauseRemploi: true, detenteur: 'user' });

    expect(donation.qualification).toBe('Bien personnel');
    expect(remploi.qualification).toBe('Bien personnel');
  });
});

describe('qualifierBien — parité entre appelants (AssetDetailsDialog vs useAssetForm)', () => {
  it('PACS conclu avant 2007 sans convention renseignée : même qualification affichée que calculée au formulaire (Indivision)', () => {
    const maritalStatus = {
      statut_couple: 'Pacsé(e)',
      regime_matrimonial: undefined,
      date_mariage: undefined,
      convention_pacs: undefined,
      date_pacs: '2003-05-12',
    };
    const asset = {
      date_acquisition: '2020-03-10',
      origine_actif: ['Achat'],
      mode_detention: 'Pleine propriété',
      detenteur: 'user',
      clause_entree_communaute: false,
      clause_remploi: false,
      nature: 'Compte titres',
      id: 'asset-1',
    };

    // Reproduit le mapping de AssetDetailsDialog.tsx
    const fromDialog = qualifierBien({
      statutCouple: maritalStatus.statut_couple,
      regimeMatrimonial: maritalStatus.regime_matrimonial,
      dateMariage: maritalStatus.date_mariage,
      conventionPacs: maritalStatus.convention_pacs,
      datePacs: maritalStatus.date_pacs,
      dateAcquisition: asset.date_acquisition,
      origineActif: asset.origine_actif,
      modeDetention: asset.mode_detention,
      detenteur: asset.detenteur,
      clauseEntreeCommunaute: asset.clause_entree_communaute,
      clauseRemploi: asset.clause_remploi,
      natureActif: asset.nature,
      assetId: asset.id,
    });

    // Reproduit le mapping de useAssetForm.ts (recompute)
    const fromForm = qualifierBien({
      statutCouple: maritalStatus.statut_couple,
      regimeMatrimonial: maritalStatus.regime_matrimonial,
      dateMariage: maritalStatus.date_mariage,
      conventionPacs: maritalStatus.convention_pacs,
      datePacs: maritalStatus.date_pacs,
      dateAcquisition: new Date(asset.date_acquisition).toISOString(),
      origineActif: asset.origine_actif,
      modeDetention: asset.mode_detention,
      detenteur: asset.detenteur,
      clauseEntreeCommunaute: asset.clause_entree_communaute,
      clauseRemploi: asset.clause_remploi,
      natureActif: asset.nature,
      assetId: asset.id,
    });

    expect(fromDialog.qualification).toBe('Indivision');
    expect(fromDialog.qualification).toBe(fromForm.qualification);
  });
});

describe('qualifierBien — financement mixte (art. 1436) : frais d\'acquisition inclus (Cass. 1re civ., 7 oct. 2018, n°17-25965)', () => {
  const base = {
    statutCouple: 'Marié(e)',
    regimeMatrimonial: 'Communauté réduite aux acquêts',
    dateMariage: '2015-06-01',
    dateAcquisition: '2020-03-10',
    origineActif: ['Achat'],
    detenteur: 'user',
    valeurAcquisition: 200000,
    apportFondsPropres: 100000,
  };

  it('apport = 50% du prix seul, mais < 50% une fois les frais d\'acquisition inclus : bien commun', () => {
    const result = qualifierBien({ ...base, fraisAcquisition: 20000 });

    expect(result.qualification).toBe('Bien commun');
  });

  it('sans frais d\'acquisition renseignés, apport = 50% du prix : bien propre (non-régression)', () => {
    const result = qualifierBien(base);

    expect(result.qualification).toBe('Bien propre');
  });
});

describe('qualifierBien — bien acquis par les deux époux hors communauté (art. 1538)', () => {
  const base = {
    statutCouple: 'Marié(e)',
    dateMariage: '2010-06-01',
    dateAcquisition: '2015-03-01',
    origineActif: ['Achat'],
  };

  it.each(['Séparation de biens', 'Participation aux acquêts'])('%s : détenu par le couple → indivision', (regime) => {
    expect(qualifierBien({ ...base, regimeMatrimonial: regime, detenteur: 'Le couple' }).qualification).toBe('Indivision');
    expect(qualifierBien({ ...base, regimeMatrimonial: regime, detenteur: 'common' }).qualification).toBe('Indivision');
  });

  it.each(['Séparation de biens', 'Participation aux acquêts'])('%s : un seul détenteur → propre', (regime) => {
    expect(qualifierBien({ ...base, regimeMatrimonial: regime, detenteur: 'user' }).qualification).toBe('Bien propre');
  });
});

describe('qualifierBien — séparation de corps (art. 302)', () => {
  const base = {
    statutCouple: 'Marié(e)',
    regimeMatrimonial: 'Communauté réduite aux acquêts',
    dateMariage: '2000-06-01',
    origineActif: ['Achat'],
    dateJugementSeparationCorps: '2020-01-15',
  };

  it('bien acquis avant le jugement : garde la qualification du régime (commun)', () => {
    expect(qualifierBien({ ...base, dateAcquisition: '2019-05-01', detenteur: 'user' }).qualification).toBe('Bien commun');
  });

  it('bien acquis à la date du jugement ou après par un époux : propre', () => {
    expect(qualifierBien({ ...base, dateAcquisition: '2020-01-15', detenteur: 'user' }).qualification).toBe('Bien propre');
  });

  it('bien acquis après le jugement par les deux : indivision', () => {
    expect(qualifierBien({ ...base, dateAcquisition: '2021-01-01', detenteur: 'Le couple' }).qualification).toBe('Indivision');
  });

  it('sans date de jugement : aucun effet', () => {
    expect(qualifierBien({ ...base, dateJugementSeparationCorps: undefined, dateAcquisition: '2021-01-01', detenteur: 'user' }).qualification).toBe('Bien commun');
  });
});

describe("qualifierBien — périmètre de la société d'acquêts", () => {
  const perimetre = (p: Partial<{ tousAcquets: boolean; categories: any[]; biensDesignes: string[]; biensExclus: string[] }>) => ({
    tousAcquets: false, categories: [], biensDesignes: [], biensExclus: [], ...p,
  });
  const base = {
    statutCouple: 'Marié(e)',
    regimeMatrimonial: "Séparation de biens avec société d'acquêts",
    dateMariage: '2010-06-01',
    dateAcquisition: '2015-03-01',
    origineActif: ['Achat'],
    detenteur: 'user',
    assetId: 'a1',
  };

  it('immeuble acquis pendant le mariage, catégorie Immeubles → commun même acheté par un seul', () => {
    const r = qualifierBien({ ...base, natureActif: 'Résidences secondaires', societeAcquets: perimetre({ categories: ['immeubles'] }) });
    expect(r.qualification).toBe('Bien commun');
  });

  it('meuble hors catégorie Immeubles → propre', () => {
    expect(qualifierBien({ ...base, natureActif: 'Montres', societeAcquets: perimetre({ categories: ['immeubles'] }) }).qualification).toBe('Bien propre');
  });

  it('catégorie Meubles couvre un meuble', () => {
    expect(qualifierBien({ ...base, natureActif: 'Montres', societeAcquets: perimetre({ categories: ['meubles'] }) }).qualification).toBe('Bien commun');
  });

  it('ancienne case résidence principale toujours prise en compte', () => {
    expect(qualifierBien({ ...base, natureActif: 'Résidence principale', societeAcquets: perimetre({ categories: ['residence_principale'] }) }).qualification).toBe('Bien commun');
  });

  it('tous les acquêts → commun', () => {
    expect(qualifierBien({ ...base, natureActif: 'Montres', societeAcquets: perimetre({ tousAcquets: true }) }).qualification).toBe('Bien commun');
  });

  it('bien acquis avant le mariage → hors société, sauf désignation nommée (apport)', () => {
    const avant = { ...base, dateAcquisition: '2005-01-01', natureActif: 'Montres' };
    expect(qualifierBien({ ...avant, societeAcquets: perimetre({ tousAcquets: true }) }).qualification).toBe('Bien propre');
    expect(qualifierBien({ ...avant, societeAcquets: perimetre({ biensDesignes: ['a1'] }) }).qualification).toBe('Bien commun');
  });

  it('bien reçu par donation → hors société même désigné ou couvert', () => {
    expect(qualifierBien({ ...base, origineActif: ['Donation'], natureActif: 'Montres', societeAcquets: perimetre({ tousAcquets: true, biensDesignes: ['a1'] }) }).qualification).toBe('Bien propre');
  });

  it('exclusion nommée prime sur la catégorie ; détenu par les deux → indivision', () => {
    const r = qualifierBien({ ...base, detenteur: 'Le couple', natureActif: 'Résidences secondaires', societeAcquets: perimetre({ categories: ['immeubles'], biensExclus: ['a1'] }) });
    expect(r.qualification).toBe('Indivision');
  });

  it('remploi → propre même dans le périmètre', () => {
    expect(qualifierBien({ ...base, clauseRemploi: true, natureActif: 'Résidences secondaires', societeAcquets: perimetre({ tousAcquets: true }) }).qualification).toBe('Bien propre');
  });

  it('hors périmètre, détenu par les deux → indivision', () => {
    expect(qualifierBien({ ...base, detenteur: 'Le couple', natureActif: 'Montres', societeAcquets: perimetre({}) }).qualification).toBe('Indivision');
  });
});
