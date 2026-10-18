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

describe('buildFamilyGraph — membre rattaché à un autre membre', () => {
  const enfants: FamilyLink[] = [
    { id: 'e1', nom: 'A', lien_familial: 'Enfant', enfant_de: 'user' } as FamilyLink,
    { id: 'e2', nom: 'B', lien_familial: 'Enfant', enfant_de: 'user' } as FamilyLink,
  ];

  it('relié au membre réellement saisi', () => {
    const pe = { id: 'pe', nom: 'C', lien_familial: 'Petit-enfant', enfant_de: 'e2' } as FamilyLink;
    const graph = buildFamilyGraph(null, married, [...enfants, pe]);
    expect(graph.edges.filter(e => e.target === 'pe').map(e => e.source)).toEqual(['e2']);
    expect(graph.nodes.find(n => n.id === 'pe')?.aRattacher).toBe(false);
  });

  it('sans rattachement : aucune arête et signalé à rattacher, comme le moteur', () => {
    const pe = { id: 'pe', nom: 'C', lien_familial: 'Petit-enfant', enfant_de: null } as FamilyLink;
    const graph = buildFamilyGraph(null, married, [...enfants, pe]);
    expect(graph.edges.filter(e => e.target === 'pe')).toEqual([]);
    expect(graph.nodes.find(n => n.id === 'pe')?.aRattacher).toBe(true);
  });
});
