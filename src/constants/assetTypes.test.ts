import { describe, it, expect } from 'vitest';
import { ASSET_CATEGORIES, NATURE_SOUS_GROUPES, isContratSouscrit, isCreance, isPrevoyanceSansRachat } from './assetTypes';

describe('NATURE_SOUS_GROUPES', () => {
  it.each(Object.entries(NATURE_SOUS_GROUPES))('couvre exactement les natures de « %s »', (categorie, sousGroupes) => {
    const affichees = sousGroupes!.flatMap((sg) => sg.natures);
    const attendues = ASSET_CATEGORIES[categorie as keyof typeof ASSET_CATEGORIES] as readonly string[];
    expect(new Set(affichees).size).toBe(affichees.length);
    expect([...affichees].sort()).toEqual([...attendues].sort());
  });
});

describe('contrats souscrits et prévoyance', () => {
  it('isContratSouscrit couvre assurance-vie, retraite et prévoyance, pas les livrets', () => {
    expect(isContratSouscrit("Contrat d'assurance-vie")).toBe(true);
    expect(isContratSouscrit('PER individuel')).toBe(true);
    expect(isContratSouscrit('Temporaire décès')).toBe(true);
    expect(isContratSouscrit('Livret A')).toBe(false);
  });

  it('isPrevoyanceSansRachat exclut le contrat vie entière', () => {
    expect(isPrevoyanceSansRachat('Temporaire décès')).toBe(true);
    expect(isPrevoyanceSansRachat('Contrat prévoyance individuelle')).toBe(true);
    expect(isPrevoyanceSansRachat('Vie entière')).toBe(false);
  });
});

describe('isCreance', () => {
  it('reconnaît les natures de créance, dépôt de garantie compris (créance sur le bailleur)', () => {
    expect(isCreance('Prêt consenti à un proche')).toBe(true);
    expect(isCreance('Soulte ou prix de vente à recevoir')).toBe(true);
    expect(isCreance('Dépôt de garantie')).toBe(true);
    expect(isCreance('Livret A')).toBe(false);
  });
});
