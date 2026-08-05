import { describe, it, expect } from 'vitest';
import { getPartUtilisateurIndivisionTiers } from './utils';

describe('getPartUtilisateurIndivisionTiers', () => {
  it('un seul co-indivisaire (sœur, 30%) → utilisateur 70%', () => {
    expect(getPartUtilisateurIndivisionTiers([{ pourcentage: 30 }])).toBe(70);
  });

  it('plusieurs co-indivisaires → complément à 100% de la somme', () => {
    expect(getPartUtilisateurIndivisionTiers([{ pourcentage: 20 }, { pourcentage: 10 }])).toBe(70);
  });

  it('aucun co-indivisaire → utilisateur détient 100%', () => {
    expect(getPartUtilisateurIndivisionTiers([])).toBe(100);
  });

  it('total des tiers > 100% (saisie incohérente) → clampé à 0, jamais négatif', () => {
    expect(getPartUtilisateurIndivisionTiers([{ pourcentage: 60 }, { pourcentage: 60 }])).toBe(0);
  });
});
