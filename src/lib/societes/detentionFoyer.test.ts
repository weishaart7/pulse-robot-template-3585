import { describe, it, expect } from 'vitest';
import { computeDetentionsFoyer } from './detentionFoyer';

const part = (id: string, mere: string, fille: string, pourcentage: number) =>
  ({ id, societe_mere_id: mere, societe_fille_id: fille, pourcentage });

describe('computeDetentionsFoyer', () => {
  it('holding détenue à 100 % qui détient deux filiales à 100 %', () => {
    const d = computeDetentionsFoyer(
      [
        { id: 'h', pourcentage_utilisateur: 100, pourcentage_conjoint: 0 },
        { id: 'e', pourcentage_utilisateur: 0, pourcentage_conjoint: 0 },
        { id: 's', pourcentage_utilisateur: 0, pourcentage_conjoint: 0 },
      ],
      [part('p1', 'h', 'e', 100), part('p2', 'h', 's', 100)]
    );
    expect(d.get('h')).toEqual({ directe: 1, indirecte: 0, totale: 1 });
    expect(d.get('e')?.totale).toBe(1);
    expect(d.get('s')).toEqual({ directe: 0, indirecte: 1, totale: 1 });
  });

  it('cascade et détention mixte directe + indirecte', () => {
    // Foyer 60 % de H, H 50 % de F, F 40 % de G ; foyer 10 % de G en direct.
    const d = computeDetentionsFoyer(
      [
        { id: 'H', pourcentage_utilisateur: 60, pourcentage_conjoint: 0 },
        { id: 'F', pourcentage_utilisateur: 0, pourcentage_conjoint: 0 },
        { id: 'G', pourcentage_utilisateur: 5, pourcentage_conjoint: 5 },
      ],
      [part('p1', 'H', 'F', 50), part('p2', 'F', 'G', 40)]
    );
    expect(d.get('F')?.totale).toBeCloseTo(0.3);
    expect(d.get('G')?.indirecte).toBeCloseTo(0.12);
    expect(d.get('G')?.totale).toBeCloseTo(0.22);
  });

  it('quotités jamais saisies : 100 % en direct', () => {
    const d = computeDetentionsFoyer([{ id: 'a' }], []);
    expect(d.get('a')?.totale).toBe(1);
  });
});
