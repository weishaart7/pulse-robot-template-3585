// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePatrimoineCalculations } from './usePatrimoineCalculations';
import { Asset } from '@/services/assetService';
import { AssetDemembrement } from '@/services/assetDemembrementService';

const assets = [
  { id: 'np1', nature: 'Appartement', valeur_estimee: 100000, qualification_bien: 'Bien propre', detenteur: 'user', mode_detention: 'Nue-propriété' },
] as unknown as Asset[];
const ctx = { familyProfile: { date_naissance: '1980-06-01' }, familyLinks: [{ id: 'parent-1', date_naissance: '1950-06-01' }] };

const run = (demembrements: AssetDemembrement[]) =>
  renderHook(() => usePatrimoineCalculations({
    assets, passifs: [], emprunts: [], assetDemembrements: demembrements, demembrementCtx: ctx,
  })).result.current.unqualifiedItems;

const ligne = (d: Partial<AssetDemembrement>) =>
  ({ asset_id: 'np1', role: 'Usufruitier', type_partie: 'famille', ...d }) as AssetDemembrement;

describe('usePatrimoineCalculations — motif d\'exclusion d\'un actif démembré', () => {
  it('membre de la famille supprimé (family_link_id NULL) : motif contrepartie', () => {
    expect(run([ligne({ family_link_id: null })])).toEqual([
      expect.objectContaining({ id: 'np1', reason: 'demembrement_contrepartie' }),
    ]);
  });

  it('tiers sans date de naissance : motif âge non renseigné', () => {
    expect(run([ligne({ type_partie: 'tiers', nom_libre: 'X' })])).toEqual([
      expect.objectContaining({ id: 'np1', reason: 'demembrement' }),
    ]);
  });

  it('contrepartie valide : actif compté, aucune exclusion', () => {
    expect(run([ligne({ family_link_id: 'parent-1' })])).toEqual([]);
  });
});
