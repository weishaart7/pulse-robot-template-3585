import { describe, it, expect } from 'vitest';
import { computeEvolutionPatrimoine } from './evolutionPatrimoine';
import { Asset } from '@/services/assetService';
import { AssetValorisation } from '@/services/assetValorisationService';

const today = new Date('2026-09-24');
const val = (asset_id: string, date_valorisation: string, valeur: number) =>
  ({ asset_id, date_valorisation, valeur }) as AssetValorisation;

describe('computeEvolutionPatrimoine', () => {
  it('sans historique : aucun point (état vide conservé)', () => {
    const assets = [{ id: 'a', nature: 'Livret A', valeur_estimee: 1000, qualification_bien: 'Bien propre', detenteur: 'user' }] as unknown as Asset[];
    expect(computeEvolutionPatrimoine(assets, [], { today })).toEqual([]);
  });

  it('part du foyer, exclusion des non qualifiés et point final aux valeurs courantes', () => {
    const assets = [
      { id: 'a', nature: 'Résidence principale', valeur_estimee: 400000, qualification_bien: 'Bien commun', detenteur: 'common' },
      { id: 'b', nature: 'Résidences secondaires', valeur_estimee: 300000, qualification_bien: 'Indivision', detenteur: 'Indivision', pourcentage_utilisateur: 30, pourcentage_conjoint: 0 },
      { id: 'c', nature: 'Livret A', valeur_estimee: 20000, qualification_bien: null, detenteur: 'user' },
    ] as unknown as Asset[];
    const points = computeEvolutionPatrimoine(assets, [val('a', '2025-01-01', 350000), val('b', '2025-01-01', 200000)], { today });
    expect(points).toEqual([
      { date: '2025-01-01', total: 350000 + 60000 },
      { date: '2026-09-24', total: 400000 + 90000 },
    ]);
  });

  it("actif démembré : barème appliqué selon l'âge de l'usufruitier à la date du point", () => {
    // Usufruitier (client) né en 1966 : 58 ans au 01/01/2025 (tranche < 61 → NP 50 %),
    // 60 ans au 24/09/2026 (même tranche) ; né en 1965 : 61 ans en 2026 → NP 60 %.
    const assets = [{ id: 'np', nature: 'Résidences secondaires', valeur_estimee: 100000, qualification_bien: 'Bien propre', detenteur: 'user', mode_detention: 'Nue-propriété' }] as unknown as Asset[];
    const demembrements = [{ asset_id: 'np', type_partie: 'tiers', date_naissance_tiers: '1965-06-01' }] as never[];
    const points = computeEvolutionPatrimoine(assets, [val('np', '2025-01-01', 100000)], { today, assetDemembrements: demembrements });
    expect(points[0].total).toBeCloseTo(50000);
    expect(points[1].total).toBeCloseTo(60000);
  });

  it("actif démembré sans âge d'usufruitier : exclu", () => {
    const assets = [{ id: 'np', nature: 'Résidences secondaires', valeur_estimee: 100000, qualification_bien: 'Bien propre', detenteur: 'user', mode_detention: 'Nue-propriété' }] as unknown as Asset[];
    const points = computeEvolutionPatrimoine(assets, [val('np', '2025-01-01', 100000)], { today });
    expect(points.map((p) => p.total)).toEqual([0, 0]);
  });
});
