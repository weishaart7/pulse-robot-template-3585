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

  it('instrument de travail nécessaire à la profession : propre même sous communauté universelle, sans clause d\'extension', () => {
    const result = qualifierBien(base);

    expect(result.qualification).toBe('Bien propre');
  });

  it('avec la clause d\'extension de la communauté aux biens propres par nature (art. 1526) : commun', () => {
    const result = qualifierBien({ ...base, extensionProprsParNature: true });

    expect(result.qualification).toBe('Bien commun');
  });
});

describe('qualifierBien — libéralité sous communauté universelle (art. 1405 al. 2)', () => {
  it('donation reçue pendant le mariage, sans stipulation d\'entrée en communauté : propre', () => {
    const result = qualifierBien({
      statutCouple: 'Marié(e)',
      regimeMatrimonial: 'Communauté universelle',
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
      regimeMatrimonial: 'Communauté universelle',
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
