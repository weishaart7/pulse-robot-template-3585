import { describe, it, expect } from 'vitest';
import { buildFamilyGraph } from './buildFamilyGraph';
import type { FamilyLink, MaritalStatus } from '@/services/familyService';

const married = { statut_couple: 'Marié(e)', prenom_conjoint: 'B', nom_conjoint: 'X' } as MaritalStatus;
const child = (enfant_de: string | null): FamilyLink =>
  ({ id: 'c1', nom: 'X', lien_familial: 'Enfant', enfant_de } as FamilyLink);

const sourcesOf = (links: FamilyLink[], marital: MaritalStatus | null) =>
  buildFamilyGraph(null, marital, links).edges
    .filter(e => e.target === 'c1')
    .map(e => e.source)
    .sort();

describe('buildFamilyGraph — rattachement des enfants', () => {
  it('enfant commun (both_parents) relié aux deux parents', () => {
    expect(sourcesOf([child('both_parents')], married)).toEqual(['main', 'spouse']);
  });

  it('enfant du conjoint seul relié au conjoint', () => {
    expect(sourcesOf([child('spouse')], married)).toEqual(['spouse']);
  });

  it('rattachement absent : enfant du seul client, comme le moteur de transmission', () => {
    expect(sourcesOf([child(null)], married)).toEqual(['main']);
    expect(sourcesOf([child('')], married)).toEqual(['main']);
  });

  it('both_parents sans partenaire actif : relié au client seul', () => {
    expect(sourcesOf([child('both_parents')], { statut_couple: 'Divorcé(e)' } as MaritalStatus)).toEqual(['main']);
  });
});
