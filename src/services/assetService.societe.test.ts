/**
 * Biens détenus par une société du foyer (assets.societe_proprietaire_id) : exclus à la source de
 * toutes les lectures du patrimoine direct, lus à part pour la fiche société.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const appels: [string, unknown[]][] = [];
const requete: Record<string, unknown> = {};
for (const m of ['select', 'eq', 'is', 'in', 'order', 'gt']) {
  requete[m] = (...args: unknown[]) => { appels.push([m, args]); return requete; };
}
(requete as { then: unknown }).then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null });

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    from: () => requete,
  },
}));

import { assetService } from './assetService';

const exclutBiensDeSociete = () =>
  appels.some(([m, args]) => m === 'is' && args[0] === 'societe_proprietaire_id' && args[1] === null);

describe('assetService — biens de société', () => {
  beforeEach(() => { appels.length = 0; });

  it.each([
    ['getAssets', () => assetService.getAssets()],
    ['getBiensLocationNue', () => assetService.getBiensLocationNue()],
    ['getPartsRevenusFonciers', () => assetService.getPartsRevenusFonciers()],
  ])('%s exclut les biens détenus par une société', async (_, lire) => {
    await lire();
    expect(exclutBiensDeSociete()).toBe(true);
  });

  it('getBiensSociete lit les biens de la société', async () => {
    await assetService.getBiensSociete('s1');
    expect(appels).toContainEqual(['eq', ['societe_proprietaire_id', 's1']]);
  });
});
