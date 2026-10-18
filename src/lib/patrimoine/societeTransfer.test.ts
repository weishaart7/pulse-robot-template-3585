import { describe, it, expect } from 'vitest';
import { isPartsSocieteNature, natureActifPourSociete } from './societeTransfer';

describe('isPartsSocieteNature', () => {
  it('ne rattache à une société que des titres', () => {
    expect(isPartsSocieteNature('Droits sociaux')).toBe(true);
    expect(isPartsSocieteNature('Parts de holding')).toBe(true);
    expect(isPartsSocieteNature('Parts de SCI')).toBe(true);
    expect(isPartsSocieteNature("Compte courant d'associé")).toBe(false);
    expect(isPartsSocieteNature('Entreprise individuelle')).toBe(false);
    expect(isPartsSocieteNature('Autres biens professionnels')).toBe(false);
    expect(isPartsSocieteNature(null)).toBe(false);
  });
});

describe('natureActifPourSociete', () => {
  it('SCI et SCI familiale → Parts de SCI', () => {
    expect(natureActifPourSociete({ type_societe: 'societe-civile', forme_societe_civile: 'sci', holding: 'Non' })).toBe('Parts de SCI');
    expect(natureActifPourSociete({ type_societe: 'societe-civile', forme_societe_civile: 'sci-familiale' })).toBe('Parts de SCI');
  });

  it('autre société civile, SARL, SAS → Droits sociaux', () => {
    expect(natureActifPourSociete({ type_societe: 'societe-civile', forme_societe_civile: 'sc-portefeuille' })).toBe('Droits sociaux');
    expect(natureActifPourSociete({ type_societe: 'sarl', holding: 'Non' })).toBe('Droits sociaux');
    expect(natureActifPourSociete({ type_societe: 'sas' })).toBe('Droits sociaux');
  });

  it('holding passive ou animatrice → Parts de holding', () => {
    expect(natureActifPourSociete({ type_societe: 'societe-civile', forme_societe_civile: 'sci', holding: 'Passive' })).toBe('Parts de holding');
    expect(natureActifPourSociete({ type_societe: 'sarl', holding: 'Animatrice' })).toBe('Parts de holding');
  });

  it('entreprise individuelle → Entreprise individuelle (non rattachée)', () => {
    const nature = natureActifPourSociete({ type_societe: 'entreprise-individuelle' });
    expect(nature).toBe('Entreprise individuelle');
    expect(isPartsSocieteNature(nature)).toBe(false);
  });
});
