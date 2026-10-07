import { describe, it, expect } from 'vitest';
import { qualifierDette } from './qualification';

const marie = (regimeMatrimonial: string) => ({ statutCouple: 'Marié(e)', regimeMatrimonial, dateMariage: '2015-06-01' });
const AVANT = '2012-01-01';
const PENDANT = '2020-01-01';

describe('qualifierDette', () => {
  it('hors couple : personnelle', () => {
    expect(qualifierDette({ statutCouple: 'Célibataire', detenteur: 'user' }).qualification).toBe('Bien personnel');
  });

  describe('R1 — dette liée à un actif', () => {
    it('suit la qualification de l\'actif, prioritaire sur la date', () => {
      const r = qualifierDette({ ...marie('Communauté réduite aux acquêts'), detenteur: 'Le couple', dateSouscription: PENDANT, qualificationActifLie: 'Bien propre' });
      expect(r.qualification).toBe('Bien propre');
    });
    it('ignore un actif "À qualifier" et retombe sur les règles générales', () => {
      const r = qualifierDette({ ...marie('Communauté réduite aux acquêts'), detenteur: 'Le couple', qualificationActifLie: 'À qualifier' });
      expect(r.qualification).toBe('Bien commun');
    });
  });

  describe('régime légal / meubles et acquêts', () => {
    for (const regime of ['Communauté réduite aux acquêts', 'Communauté de meubles et acquêts']) {
      it(`${regime} : dette antérieure au mariage propre (art. 1410)`, () => {
        expect(qualifierDette({ ...marie(regime), detenteur: 'user', dateSouscription: AVANT }).qualification).toBe('Bien propre');
      });
      it(`${regime} : dette pendant le mariage commune (art. 1409)`, () => {
        expect(qualifierDette({ ...marie(regime), detenteur: 'Le couple', dateSouscription: PENDANT }).qualification).toBe('Bien commun');
      });
    }
    it('sans date : présumée pendant l\'union, raison explicite', () => {
      const r = qualifierDette({ ...marie('Communauté réduite aux acquêts'), detenteur: 'Le couple' });
      expect(r.qualification).toBe('Bien commun');
      expect(r.raison).toContain('date de souscription non renseignée');
    });
    it('régime non renseigné : traité comme régime légal', () => {
      expect(qualifierDette({ statutCouple: 'Marié(e)', dateMariage: '2015-06-01', detenteur: 'Le couple' }).qualification).toBe('Bien commun');
    });
    it('R4 — dette successorale propre même contractée pendant le mariage', () => {
      const r = qualifierDette({ ...marie('Communauté réduite aux acquêts'), detenteur: 'user', dateSouscription: PENDANT, natureDette: 'Dettes successorales (droits de succession restant dus)' });
      expect(r.qualification).toBe('Bien propre');
    });
  });

  describe('communauté universelle', () => {
    it('dette antérieure : commune (art. 1526)', () => {
      expect(qualifierDette({ ...marie('Communauté universelle'), detenteur: 'user', dateSouscription: AVANT }).qualification).toBe('Bien commun');
    });
    it('dette successorale : commune', () => {
      expect(qualifierDette({ ...marie('Communauté universelle'), detenteur: 'user', natureDette: 'Dettes successorales (droits de succession restant dus)' }).qualification).toBe('Bien commun');
    });
  });

  describe('R3 — hors communauté', () => {
    for (const regime of ['Séparation de biens', 'Participation aux acquêts', 'Séparation de biens avec société d\'acquêts']) {
      it(`${regime} : co-emprunt en indivision`, () => {
        expect(qualifierDette({ ...marie(regime), detenteur: 'Le couple', dateSouscription: PENDANT }).qualification).toBe('Indivision');
      });
      it(`${regime} : dette d'un seul époux personnelle`, () => {
        expect(qualifierDette({ ...marie(regime), detenteur: 'user', dateSouscription: PENDANT }).qualification).toBe('Bien propre');
      });
    }
    it('PACS séparatiste : co-emprunt en indivision', () => {
      expect(qualifierDette({ statutCouple: 'Pacsé(e)', datePacs: '2015-01-01', conventionPacs: 'Séparation de patrimoines', detenteur: 'Le couple', dateSouscription: PENDANT }).qualification).toBe('Indivision');
    });
    it('PACS en indivision : dette d\'un seul partenaire personnelle', () => {
      expect(qualifierDette({ statutCouple: 'Pacsé(e)', datePacs: '2015-01-01', conventionPacs: 'Indivision', detenteur: 'user' }).qualification).toBe('Bien propre');
    });
    it('PACS : dette antérieure d\'un partenaire personnelle', () => {
      expect(qualifierDette({ statutCouple: 'Pacsé(e)', datePacs: '2015-01-01', detenteur: 'user', dateSouscription: AVANT }).qualification).toBe('Bien propre');
    });
  });

  it('dette contractée par les deux avant le mariage : indivision', () => {
    expect(qualifierDette({ ...marie('Communauté réduite aux acquêts'), detenteur: 'Le couple', dateSouscription: AVANT }).qualification).toBe('Indivision');
  });

  describe('concubinage', () => {
    it('par les deux : indivision ; par un seul : personnelle', () => {
      expect(qualifierDette({ statutCouple: 'Concubinage', detenteur: 'Le couple' }).qualification).toBe('Indivision');
      expect(qualifierDette({ statutCouple: 'Concubinage', detenteur: 'user' }).qualification).toBe('Bien personnel');
    });
  });
});
