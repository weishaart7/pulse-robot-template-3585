import { describe, it, expect } from 'vitest';
import { ParticipationEdge } from './types';
import { buildParticipationGraph, computeTotalParticipations, computeTotalParticipation } from './graph';

function edge(id: string, mere: string, fille: string, pourcentage: number): ParticipationEdge {
  return { id, societeMereId: mere, societeFilleId: fille, pourcentage };
}

describe('computeTotalParticipation', () => {
  it('participation directe simple', () => {
    const graph = buildParticipationGraph([edge('e1', 'holding', 'sci', 60)]);
    const result = computeTotalParticipation(graph, 'holding', 'sci');
    expect(result.pourcentageTotal).toBe(60);
    expect(result.paths).toHaveLength(1);
    expect(result.paths[0].path).toEqual(['holding', 'sci']);
    expect(result.depasse100).toBe(false);
  });

  it('participation indirecte sur 2 niveaux (holding 60% sci, sci 40% sarl => 24% indirect)', () => {
    const graph = buildParticipationGraph([
      edge('e1', 'holding', 'sci', 60),
      edge('e2', 'sci', 'sarl', 40),
    ]);
    const result = computeTotalParticipation(graph, 'holding', 'sarl');
    expect(result.pourcentageTotal).toBeCloseTo(24);
    expect(result.paths).toHaveLength(1);
    expect(result.paths[0].path).toEqual(['holding', 'sci', 'sarl']);
  });

  it('agrège plusieurs chemins vers la même cible sans double-compte', () => {
    // holding -> sci1 -> cible (60% * 50% = 30%)
    // holding -> sci2 -> cible (40% * 50% = 20%)
    // total attendu vers cible = 50%
    const graph = buildParticipationGraph([
      edge('e1', 'holding', 'sci1', 60),
      edge('e2', 'holding', 'sci2', 40),
      edge('e3', 'sci1', 'cible', 50),
      edge('e4', 'sci2', 'cible', 50),
    ]);
    const result = computeTotalParticipation(graph, 'holding', 'cible');
    expect(result.pourcentageTotal).toBeCloseTo(50);
    expect(result.paths).toHaveLength(2);
    expect(result.depasse100).toBe(false);
  });

  it('signale un dépassement de 100% sans jamais plafonner', () => {
    // holding détient directement 70% de cible, et indirectement encore 60% via une filiale
    // (scénario de sur-déclaration délibérément incohérent, à détecter, pas à corriger)
    const graph = buildParticipationGraph([
      edge('e1', 'holding', 'cible', 70),
      edge('e2', 'holding', 'relais', 100),
      edge('e3', 'relais', 'cible', 60),
    ]);
    const result = computeTotalParticipation(graph, 'holding', 'cible');
    expect(result.pourcentageTotal).toBeCloseTo(130);
    expect(result.depasse100).toBe(true);
    expect(result.paths).toHaveLength(2);
  });

  it('gère plusieurs sociétés mères différentes pour une même fille', () => {
    // sci est détenue à la fois par mere1 (80%) et mere2 (20%) : depuis mere1,
    // seule la part détenue par mere1 doit apparaître (pas celle de mere2).
    const graph = buildParticipationGraph([
      edge('e1', 'mere1', 'sci', 80),
      edge('e2', 'mere2', 'sci', 20),
    ]);
    const resultDepuisMere1 = computeTotalParticipation(graph, 'mere1', 'sci');
    expect(resultDepuisMere1.pourcentageTotal).toBeCloseTo(80);

    const resultDepuisMere2 = computeTotalParticipation(graph, 'mere2', 'sci');
    expect(resultDepuisMere2.pourcentageTotal).toBeCloseTo(20);
  });

  it('retourne un résultat à 0% pour une cible non atteignable', () => {
    const graph = buildParticipationGraph([edge('e1', 'holding', 'sci', 60)]);
    const result = computeTotalParticipation(graph, 'holding', 'inconnue');
    expect(result.pourcentageTotal).toBe(0);
    expect(result.paths).toHaveLength(0);
    expect(result.depasse100).toBe(false);
  });

  it('computeTotalParticipations retourne une entrée par société atteignable', () => {
    const graph = buildParticipationGraph([
      edge('e1', 'holding', 'sci', 60),
      edge('e2', 'sci', 'sarl', 40),
    ]);
    const results = computeTotalParticipations(graph, 'holding');
    const cibles = results.map(r => r.societeCibleId).sort();
    expect(cibles).toEqual(['sarl', 'sci']);
  });
});
