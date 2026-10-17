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
    const at = (d: string) => points.find((p) => p.date === d)!;
    expect(at('2025-01-01')).toMatchObject({ actifs: 350000 + 60000, passifs: 0, net: 410000, valorisation: true });
    expect(at('2026-09-24')).toMatchObject({ actifs: 400000 + 90000, net: 490000, valorisation: false });
  });

  it("actif démembré : barème appliqué selon l'âge de l'usufruitier à la date du point", () => {
    // Usufruitier (client) né en 1966 : 58 ans au 01/01/2025 (tranche < 61 → NP 50 %),
    // 60 ans au 24/09/2026 (même tranche) ; né en 1965 : 61 ans en 2026 → NP 60 %.
    const assets = [{ id: 'np', nature: 'Résidences secondaires', valeur_estimee: 100000, qualification_bien: 'Bien propre', detenteur: 'user', mode_detention: 'Nue-propriété' }] as unknown as Asset[];
    const demembrements = [{ asset_id: 'np', type_partie: 'tiers', date_naissance_tiers: '1965-06-01' }] as never[];
    const points = computeEvolutionPatrimoine(assets, [val('np', '2025-01-01', 100000)], { today, assetDemembrements: demembrements });
    expect(points[0].net).toBeCloseTo(50000);
    expect(points[points.length - 1].net).toBeCloseTo(60000);
  });

  it("actif démembré sans âge d'usufruitier : exclu", () => {
    const assets = [{ id: 'np', nature: 'Résidences secondaires', valeur_estimee: 100000, qualification_bien: 'Bien propre', detenteur: 'user', mode_detention: 'Nue-propriété' }] as unknown as Asset[];
    const points = computeEvolutionPatrimoine(assets, [val('np', '2025-01-01', 100000)], { today });
    expect(points.every((p) => p.net === 0)).toBe(true);
  });

  it('points mensuels entre la première valorisation et aujourd\'hui', () => {
    const assets = [{ id: 'a', nature: 'Livret A', valeur_estimee: 1000, qualification_bien: 'Bien propre', detenteur: 'user' }] as unknown as Asset[];
    const points = computeEvolutionPatrimoine(assets, [val('a', '2026-06-15', 900)], { today });
    expect(points.map((p) => p.date)).toEqual(['2026-06-15', '2026-07-01', '2026-08-01', '2026-09-01', '2026-09-24']);
  });

  it("actif valorisé tardivement : première valeur reprise dès l'acquisition, 0 avant", () => {
    const assets = [
      { id: 'a', nature: 'Livret A', valeur_estimee: 1000, qualification_bien: 'Bien propre', detenteur: 'user' },
      { id: 'b', nature: 'Livret A', valeur_estimee: 5000, qualification_bien: 'Bien propre', detenteur: 'user', date_acquisition: '2026-08-10' },
      { id: 'c', nature: 'Livret A', valeur_estimee: 2000, qualification_bien: 'Bien propre', detenteur: 'user' },
    ] as unknown as Asset[];
    const points = computeEvolutionPatrimoine(
      assets,
      [val('a', '2026-07-01', 1000), val('b', '2026-09-01', 4000), val('c', '2026-09-01', 2000)],
      { today }
    );
    const at = (d: string) => points.find((p) => p.date === d)!;
    // c sans date d'acquisition : sa première valeur dès le début ; b : 0 avant le 10/08, 4000 ensuite.
    expect(at('2026-07-01').actifs).toBe(1000 + 2000);
    expect(at('2026-08-01').actifs).toBe(1000 + 2000);
    expect(at('2026-09-01').actifs).toBe(1000 + 4000 + 2000);
  });

  it('passifs : dette constante depuis sa souscription, emprunt amorti selon son contrat, emprunt de société exclu', () => {
    const assets = [{ id: 'a', nature: 'Livret A', valeur_estimee: 100000, qualification_bien: 'Bien propre', detenteur: 'user' }] as unknown as Asset[];
    const passifs = [{ id: 'p', nature: 'Dette', montant_du: 5000, date_souscription: '2026-08-15', qualification_bien: 'Bien propre', detenteur: 'user' }] as never[];
    const emprunts = [
      { id: 'e', nature: 'Prêt', capital_restant_du: 9000, qualification_bien: 'Bien propre', detenteur: 'user',
        capital_initial: 12000, date_premiere_echeance: '2026-01-01', duree_totale_mois: 12, taux_interet: 0 },
      { id: 's', nature: 'Prêt', capital_restant_du: 50000, societe_id: 'soc', qualification_bien: 'Bien propre', detenteur: 'user' },
    ] as never[];
    const points = computeEvolutionPatrimoine(assets, [val('a', '2026-07-01', 100000)], { today, passifs, emprunts });
    const at = (d: string) => points.find((p) => p.date === d)!;
    // Taux 0, 12 échéances de 1000 € : après l'échéance de juillet, 5000 € restants.
    expect(at('2026-07-01').passifs).toBe(5000);
    expect(at('2026-09-01').passifs).toBe(3000 + 5000);
    expect(at('2026-09-01').net).toBe(100000 - 8000);
    // Point final : capitaux restants dus courants (déjà actualisés au chargement).
    expect(at('2026-09-24').passifs).toBe(9000 + 5000);
  });
});
