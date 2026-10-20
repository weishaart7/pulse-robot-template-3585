import { describe, it, expect } from 'vitest';
import { actifDepuisSociete, dateEntreeSociete, detenteurDepuisQuotites, qualifierPartsSociete } from './partsFoyer';

const communaute = { statutCouple: 'Marié(e)', regimeMatrimonial: 'Communauté réduite aux acquêts', dateMariage: '2015-06-01' };
const separation = { ...communaute, regimeMatrimonial: 'Séparation de biens' };

describe('detenteurDepuisQuotites', () => {
  it('déduit le détenteur des parts du capital', () => {
    expect(detenteurDepuisQuotites(60, 0)).toBe('user');
    expect(detenteurDepuisQuotites(0, 40)).toBe('spouse');
    expect(detenteurDepuisQuotites(30, 30)).toBe('common');
    expect(detenteurDepuisQuotites(0, 0)).toBeNull();
  });
});

describe('dateEntreeSociete', () => {
  it('création : date de création ; sinon date de souscription', () => {
    expect(dateEntreeSociete({ origine: 'Création', dateCreation: '2020-01-01', dateSouscription: '2022-01-01' })).toBe('2020-01-01');
    expect(dateEntreeSociete({ origine: 'Donation', dateCreation: '2020-01-01', dateSouscription: '2022-01-01' })).toBe('2022-01-01');
  });
});

describe('qualifierPartsSociete', () => {
  it('création pendant le mariage en communauté : commun', () => {
    expect(qualifierPartsSociete(communaute, { origine: 'Création', dateCreation: '2020-01-01' }, 100, 0).qualification).toBe('Bien commun');
  });
  it('création pendant le mariage avec remploi : propre', () => {
    expect(qualifierPartsSociete(communaute, { origine: 'Création', dateCreation: '2020-01-01', remploi: true }, 100, 0).qualification).toBe('Bien propre');
  });
  it('parts reçues par donation : propres', () => {
    expect(qualifierPartsSociete(communaute, { origine: 'Donation', dateSouscription: '2020-01-01' }, 100, 0).qualification).toBe('Bien propre');
  });
  it('achat avant le mariage : propre', () => {
    expect(qualifierPartsSociete(communaute, { origine: 'Acquisition à titre onéreux', dateSouscription: '2010-01-01' }, 100, 0).qualification).toBe('Bien propre');
  });
  it('les deux époux associés en séparation de biens : indivision', () => {
    const r = qualifierPartsSociete(separation, { origine: 'Création', dateCreation: '2020-01-01' }, 50, 50);
    expect(r.qualification).toBe('Indivision');
    expect(r.detenteur).toBe('common');
  });
});

describe('actifDepuisSociete', () => {
  const base = { valeur_estimee: 500_000, origine_entree: 'Création', montant_entree: 1_000, date_creation: '2020-01-01' };

  it('valeur des seules parts du foyer', () => {
    const a = actifDepuisSociete({ ...base, pourcentage_utilisateur: 60, pourcentage_conjoint: 0, qualification_bien: 'Bien propre', detenteur: 'user' });
    expect(a.valeur_estimee).toBe(300_000);
    expect(a.pourcentage_utilisateur).toBe(100);
    expect(a.pourcentage_conjoint).toBe(0);
    expect(a.origine_actif).toEqual(['Création']);
    expect(a.date_acquisition).toBe('2020-01-01');
    expect(a.valeur_acquisition).toBe(1_000);
  });
  it('bien commun : 50/50 de droit', () => {
    const a = actifDepuisSociete({ ...base, pourcentage_utilisateur: 60, pourcentage_conjoint: 0, qualification_bien: 'Bien commun', detenteur: 'common' });
    expect(a.valeur_estimee).toBe(300_000);
    expect([a.pourcentage_utilisateur, a.pourcentage_conjoint]).toEqual([50, 50]);
    expect(a.detenteur).toBe('common');
  });
  it('indivision : répartition au prorata des parts de chaque époux', () => {
    const a = actifDepuisSociete({ ...base, pourcentage_utilisateur: 30, pourcentage_conjoint: 10, qualification_bien: 'Indivision', detenteur: 'common' });
    expect(a.valeur_estimee).toBe(200_000);
    expect([a.pourcentage_utilisateur, a.pourcentage_conjoint]).toEqual([75, 25]);
  });
});
