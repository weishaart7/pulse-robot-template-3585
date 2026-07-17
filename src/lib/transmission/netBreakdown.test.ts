import { describe, it, expect } from 'vitest';
import { computeNetPerHeir, NetPerHeirInput } from './netBreakdown';

function heir(overrides: Partial<NetPerHeirInput> & { personId: string }): NetPerHeirInput {
  return {
    nom: 'Héritier',
    lien: 'enfant',
    baseApresFrais: 0,
    droitsTotaux: 0,
    ...overrides
  };
}

describe('computeNetPerHeir — invariant central (section 8 du référentiel)', () => {
  it('1. la somme des net par héritier + la somme des coûts = la somme des parts civiles', () => {
    const heirs = [
      heir({ personId: 'A', baseApresFrais: 400000, droitsTotaux: 60000 }),
      heir({ personId: 'B', baseApresFrais: 300000, droitsTotaux: 40000 }),
      heir({ personId: 'C', baseApresFrais: 300000, droitsTotaux: 40000 })
    ];
    const params = { actifBrut: 1000000, passif: 0, fraisNotaireTotal: 6000 };

    const result = computeNetPerHeir(heirs, params);

    const totalBase = heirs.reduce((s, h) => s + h.baseApresFrais, 0);
    const totalCoutsGlobal = result.heirs.reduce((s, h) => s + h.totalCouts, 0);
    const totalNet = result.heirs.reduce((s, h) => s + h.netARecevoir, 0);

    expect(totalNet + totalCoutsGlobal).toBe(totalBase);
    expect(result.totals.netTotal).toBe(totalNet);
  });

  it("2. les pourcentages de tous les héritiers somment à 100 (± 0.1 d'arrondi)", () => {
    const heirs = [
      heir({ personId: 'A', baseApresFrais: 851000, droitsTotaux: 129900 }),
      heir({ personId: 'B', baseApresFrais: 425500, droitsTotaux: 64950 }),
      heir({ personId: 'C', baseApresFrais: 425500, droitsTotaux: 64950 })
    ];
    const params = { actifBrut: 1702000, passif: 0, fraisNotaireTotal: 8500 };

    const result = computeNetPerHeir(heirs, params);
    const sumPercentages = result.heirs.reduce((s, h) => s + h.percentage, 0);

    expect(sumPercentages).toBeGreaterThan(99.9);
    expect(sumPercentages).toBeLessThan(100.1);
    result.heirs.forEach(h => expect(h.percentage).toBeLessThanOrEqual(100));
  });
});

describe('computeNetPerHeir — droit de partage', () => {
  it("3. l'assiette du droit de partage est l'actif net (brut - passif), pas la transmission déjà nette d'impôts", () => {
    const heirs = [
      heir({ personId: 'A', baseApresFrais: 500000, droitsTotaux: 100000 }),
      heir({ personId: 'B', baseApresFrais: 500000, droitsTotaux: 100000 })
    ];
    const params = { actifBrut: 1000000, passif: 100000, fraisNotaireTotal: 0, partageEnvisage: true };

    const result = computeNetPerHeir(heirs, params);

    expect(result.totals.droitPartage).toBe(22500);
    expect(result.heirs[0].droitPartage).toBe(11250);
    expect(result.heirs[1].droitPartage).toBe(11250);
  });

  it('4. héritier unique → pas de droit de partage (pas d\'indivision à partager)', () => {
    const heirs = [heir({ personId: 'A', baseApresFrais: 500000, droitsTotaux: 80000 })];
    const params = { actifBrut: 500000, passif: 0, fraisNotaireTotal: 3000 };

    const result = computeNetPerHeir(heirs, params);

    expect(result.totals.droitPartage).toBe(0);
    expect(result.heirs[0].droitPartage).toBe(0);
    expect(result.heirs[0].netARecevoir).toBe(500000 - 80000 - 3000);
  });

  it('5. taux réduit à 1,1% (rupture d\'union) appliqué si explicitement demandé', () => {
    const heirs = [
      heir({ personId: 'A', baseApresFrais: 500000, droitsTotaux: 0 }),
      heir({ personId: 'B', baseApresFrais: 500000, droitsTotaux: 0 })
    ];
    const params = { actifBrut: 1000000, passif: 0, fraisNotaireTotal: 0, tauxDroitPartage: 0.011, partageEnvisage: true };

    const result = computeNetPerHeir(heirs, params);

    expect(result.totals.droitPartage).toBe(11000);
  });

  it('12. démembrement (usufruit/nue-propriété) → jamais de droit de partage, même si partageEnvisage est demandé', () => {
    const heirs = [
      heir({ personId: 'conjoint', lien: 'conjoint', baseApresFrais: 500000, droitsTotaux: 0, typeQuotePart: 'usufruit' }),
      heir({ personId: 'enfant', lien: 'enfant', baseApresFrais: 500000, droitsTotaux: 0, typeQuotePart: 'nue_propriete' })
    ];
    const params = { actifBrut: 1000000, passif: 0, fraisNotaireTotal: 0, partageEnvisage: true };

    const result = computeNetPerHeir(heirs, params);

    expect(result.totals.droitPartage).toBe(0);
    result.heirs.forEach(h => expect(h.droitPartage).toBe(0));
  });
});

describe('computeNetPerHeir — prorata des frais entre héritiers inégaux', () => {
  it('6. le prorata des frais de notaire et du droit de partage suit la part civile, pas le net déjà taxé', () => {
    const heirs = [
      heir({ personId: 'conjoint', lien: 'conjoint', baseApresFrais: 500000, droitsTotaux: 0 }),
      heir({ personId: 'enfant', lien: 'enfant', baseApresFrais: 500000, droitsTotaux: 150000 })
    ];
    const params = { actifBrut: 1000000, passif: 0, fraisNotaireTotal: 10000, partageEnvisage: true };

    const result = computeNetPerHeir(heirs, params);

    const conjointRow = result.heirs.find(h => h.personId === 'conjoint')!;
    const enfantRow = result.heirs.find(h => h.personId === 'enfant')!;
    expect(conjointRow.fraisNotaire).toBe(enfantRow.fraisNotaire);
    expect(conjointRow.fraisNotaire).toBe(5000);
  });

  it('7. parts civiles inégales → prorata proportionnel exact', () => {
    const heirs = [
      heir({ personId: 'A', baseApresFrais: 750000, droitsTotaux: 0 }),
      heir({ personId: 'B', baseApresFrais: 250000, droitsTotaux: 0 })
    ];
    const params = { actifBrut: 1000000, passif: 0, fraisNotaireTotal: 4000, partageEnvisage: true };

    const result = computeNetPerHeir(heirs, params);

    expect(result.heirs[0].fraisNotaire).toBe(3000);
    expect(result.heirs[1].fraisNotaire).toBe(1000);
  });
});

describe('computeNetPerHeir — cas limites', () => {
  it('8. aucun héritier (déshérence, État hérite) → ne plante pas, renvoie une répartition vide', () => {
    const result = computeNetPerHeir([], { actifBrut: 500000, passif: 0, fraisNotaireTotal: 3000 });

    expect(result.heirs).toEqual([]);
    expect(result.totals).toEqual({ droitsDMTG: 0, fraisNotaire: 0, droitPartage: 0, netTotal: 0 });
  });

  it('9. base civile totale nulle (tous les héritiers à 0) → ne divise pas par zéro', () => {
    const heirs = [
      heir({ personId: 'A', baseApresFrais: 0, droitsTotaux: 0 }),
      heir({ personId: 'B', baseApresFrais: 0, droitsTotaux: 0 })
    ];

    const result = computeNetPerHeir(heirs, { actifBrut: 0, passif: 0, fraisNotaireTotal: 0 });

    expect(result.heirs.every(h => Number.isFinite(h.fraisNotaire))).toBe(true);
    expect(result.totals.netTotal).toBe(0);
  });

  it("10. un héritier ne reçoit jamais un net négatif même si droits + frais dépassent sa part civile (cas extrême)", () => {
    const heirs = [heir({ personId: 'A', baseApresFrais: 1000, droitsTotaux: 5000 })];
    const params = { actifBrut: 1000, passif: 0, fraisNotaireTotal: 500 };

    const result = computeNetPerHeir(heirs, params);

    expect(result.heirs[0].netARecevoir).toBe(0);
    expect(result.heirs[0].netARecevoir).toBeGreaterThanOrEqual(0);
  });
});

describe('computeNetPerHeir — non-régression du bug original (Synthese.tsx)', () => {
  it("11. reproduit fidèlement l'exemple du diagnostic initial et vérifie qu'aucun pourcentage ne dépasse 100%", () => {
    const heirs = [
      heir({ personId: 'julie', nom: 'Julie Cartier', baseApresFrais: 851000, droitsTotaux: 121368 }),
      heir({ personId: 'h2', baseApresFrais: 425500, droitsTotaux: 60684 }),
      heir({ personId: 'h3', baseApresFrais: 425500, droitsTotaux: 60684 })
    ];
    const params = { actifBrut: 1702000, passif: 0, fraisNotaireTotal: 0, partageEnvisage: true };

    const result = computeNetPerHeir(heirs, params);

    result.heirs.forEach(h => {
      expect(h.percentage).toBeLessThanOrEqual(100);
      expect(h.percentage).toBeGreaterThanOrEqual(0);
    });
    const sum = result.heirs.reduce((s, h) => s + h.percentage, 0);
    expect(sum).toBeGreaterThan(99.9);
    expect(sum).toBeLessThan(100.1);
  });
});
