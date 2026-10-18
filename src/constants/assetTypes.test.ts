import { describe, it, expect } from 'vitest';
import { ASSET_CATEGORIES, NATURE_SOUS_GROUPES } from './assetTypes';

describe('NATURE_SOUS_GROUPES', () => {
  it.each(Object.entries(NATURE_SOUS_GROUPES))('couvre exactement les natures de « %s »', (categorie, sousGroupes) => {
    const affichees = sousGroupes!.flatMap((sg) => sg.natures);
    const attendues = ASSET_CATEGORIES[categorie as keyof typeof ASSET_CATEGORIES] as readonly string[];
    expect(new Set(affichees).size).toBe(affichees.length);
    expect([...affichees].sort()).toEqual([...attendues].sort());
  });
});
