/**
 * Valeurs au jour du partage (C. civ. art. 860, 924-2), règles R25 à R29
 * validées le 2026-09-29 — exemples chiffrés du référentiel Successions §9.9.
 */
import { describe, it, expect } from 'vitest';
import { computeTransmission, FamilyGraph, Liberalite, CLAUSE_EVALUATION_DECES } from './index';

const REF = '2026-09-29';

function enfants(n: number): FamilyGraph {
  const ids = ['aurelien', 'blandine', 'claire'].slice(0, n);
  return {
    persons: [{ id: 'D', nom: 'Marie', prenom: 'Marie' }, ...ids.map(id => ({ id, nom: id, prenom: id, lienFamilial: 'Enfant' }))],
    links: ids.map(id => ({ from: 'D', to: id, relation: 'child' as const })),
    marriages: [], decedentId: 'D', hasSurvivingSpouse: false,
    childrenOfDecedent: ids, childrenCommonWithSpouse: [], hasDDV: false,
  };
}
function run(family: FamilyGraph, biens: number, liberalites: Liberalite[], valeurBiensPartage?: number) {
  return computeTransmission({
    family, patrimony: { date: REF, biensExistants: biens, passifs: 0 }, liberalites, params: {} as any,
    referenceDate: REF, valeurBiensPartage,
    rawAssets: [{ id: 'c', denomination: 'Biens', valeur_estimee: biens, nature: 'Compte courant', qualification_bien: 'Bien propre', detenteur: 'user' }],
  });
}
const total = (r: ReturnType<typeof run>, id: string, champ: 'recuSuccession' | 'soulte' | 'dejaDetenu') =>
  r.heirs.filter(h => h.personId === id).reduce((s, h) => s + (h[champ] || 0), 0);

// §9.9.4 : Aurélien en avancement de part (300 000 € au décès, 350 000 € au
// partage) ; Blandine hors part (175 000 € / 250 000 €) ; biens existants
// 125 000 € au décès, 50 000 € au partage.
const aurelien = (clauses?: string[]): Liberalite => ({
  id: 'a', type: 'donation', beneficiaireId: 'aurelien', valeur: 300000, valeurPartage: 350000,
  valeurFiscaleActe: 180000, date: '2010-01-01', typeImputation: 'avance_part', clauses,
});
const blandine: Liberalite = {
  id: 'b', type: 'donation', beneficiaireId: 'blandine', valeur: 175000, valeurPartage: 250000,
  valeurFiscaleActe: 150000, date: '2015-01-01', typeImputation: 'hors_part',
};

describe('Valeurs au jour du partage', () => {
  it('§9.9.4 — réduction de 75 000 € au décès, réévaluée à 107 143 € au partage', () => {
    const r = run(enfants(2), 125000, [aurelien(), blandine], 50000);
    expect(r.masseCalcul).toBe(600000);
    expect(Math.round(r.details.reductions.find(x => x.liberaliteId === 'b')!.montantReduit)).toBe(75000);
    // Masse à partager 50 000 + 350 000 + 107 143 = 507 143 → 253 571,50 € chacun.
    expect(total(r, 'aurelien', 'soulte')).toBeCloseTo(-96428.5, 0);
    expect(total(r, 'blandine', 'recuSuccession')).toBeCloseTo(50000 + 107142.86, 0);
    expect(total(r, 'blandine', 'recuSuccession') + total(r, 'blandine', 'soulte')).toBeCloseTo(253571.5, 0);
  });

  it('clause d\'évaluation au jour du décès : rapport de 300 000 € au lieu de 350 000 €', () => {
    const r = run(enfants(2), 125000, [aurelien([CLAUSE_EVALUATION_DECES]), blandine], 50000);
    // Masse à partager 50 000 + 300 000 + 107 143 = 457 143 → 228 571,50 € chacun.
    expect(total(r, 'aurelien', 'soulte')).toBeCloseTo(-71428.5, 0);
  });

  it('§9.9.2 — rapport de 500 000 € : indemnité de rapport de 100 000 €', () => {
    const don: Liberalite = { id: 'a', type: 'donation', beneficiaireId: 'aurelien', valeur: 500000, valeurFiscaleActe: 180000, date: '2010-01-01', typeImputation: 'avance_part' };
    const r = run(enfants(3), 700000, [don]);
    expect(r.masseCalcul).toBe(1200000);
    expect(total(r, 'aurelien', 'soulte')).toBeCloseTo(-100000, 0);
    expect(total(r, 'blandine', 'recuSuccession') + total(r, 'blandine', 'soulte')).toBeCloseTo(400000, 0);
  });

  it('sans valeur au partage saisie : résultat identique au calcul au décès', () => {
    const sans = run(enfants(2), 125000, [{ ...aurelien(), valeurPartage: undefined }, { ...blandine, valeurPartage: undefined }]);
    // Masse à partager 125 000 + 300 000 + 75 000 = 500 000 → 250 000 € chacun.
    expect(total(sans, 'aurelien', 'soulte')).toBeCloseTo(-50000, 0);
  });

  it('les droits de succession restent calculés sur l\'actif au décès', () => {
    const r = run(enfants(2), 125000, [aurelien(), blandine], 50000);
    const base = Object.values(r.dmtg.perBeneficiary).reduce((s, b) => s + b.baseHorsAV, 0);
    // Actif au décès 125 000 + indemnité 75 000 − frais funéraires 1 500.
    expect(Math.abs(base - 198500)).toBeLessThanOrEqual(2);
  });
});
