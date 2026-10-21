/**
 * 2nd décès : la part du conjoint dans un GFI garde son type et sa part forestière, sinon
 * l'exonération des 3/4 s'appliquait à 100 % de la valeur au lieu de la seule part forestière.
 */
import { describe, it, expect, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { buildSpouseRawAssets } from './transmissionHelpers';
import { getFractionEligibleRurale } from '@/constants/assetTypes';
import type { Asset } from '@/services/assetService';

describe('buildSpouseRawAssets — GFI', () => {
  it('conserve le type de groupement et la part forestière', () => {
    const gfi = {
      id: 'g1', nature: 'Parts de groupements fonciers', type_groupement: 'GFI', valeur_estimee: 15_000,
      qualification_bien: 'Bien commun', detenteur: 'common', regime_exoneration_rural: 'forestier',
      conditions_exoneration_rural: true, fraction_eligible_rural: 80,
    } as unknown as Asset;
    const [ligne] = buildSpouseRawAssets([gfi]);
    expect(ligne.valeur_estimee).toBe(7_500);
    expect(getFractionEligibleRurale(ligne)).toBe(0.8);
  });
});
