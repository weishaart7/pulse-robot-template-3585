/**
 * Phase 1 de l'audit « résultat notaire » du 2026-09-29 (docs/transmission.md) :
 * scénarios chiffrés reproduisant chaque écart constaté, avec le résultat
 * qu'établirait le notaire (règles R1-R5 de lib/transmission/partage.ts).
 */
import { describe, it, expect } from 'vitest';
import { computeTransmission, FamilyGraph, Liberalite } from './index';

const REF = '2026-09-29';

function famille(nbEnfants: number, conjoint: boolean): FamilyGraph {
  const enfants = Array.from({ length: nbEnfants }, (_, i) => `E${i + 1}`);
  return {
    persons: [
      { id: 'D', nom: 'D', prenom: 'D', dateNaissance: '1958-01-01' },
      ...(conjoint ? [{ id: 'C', nom: 'C', prenom: 'C', lienFamilial: 'Conjoint', dateNaissance: '1960-01-01' }] : []),
      ...enfants.map(e => ({ id: e, nom: e, prenom: e, lienFamilial: 'Enfant', dateNaissance: '1990-01-01' })),
    ],
    links: enfants.map(e => ({ from: 'D', to: e, relation: 'child' as const })),
    marriages: conjoint ? [{ spouseA: 'D', spouseB: 'C' }] : [],
    decedentId: 'D',
    hasSurvivingSpouse: conjoint,
    survivingSpouseId: conjoint ? 'C' : undefined,
    childrenOfDecedent: enfants,
    childrenCommonWithSpouse: enfants,
    hasDDV: false,
  };
}

function run(family: FamilyGraph, biens: number, liberalites: Liberalite[]) {
  return computeTransmission({
    family,
    patrimony: { date: REF, biensExistants: biens, passifs: 0 },
    liberalites,
    params: {} as any,
    referenceDate: REF,
    conjointOption: 'quart_pp',
    rawAssets: biens > 0
      ? [{ id: 'cpt', denomination: 'Compte', valeur_estimee: biens, nature: 'Compte courant', qualification_bien: 'Bien propre', detenteur: 'user' }]
      : [],
  });
}

const donation = (id: string, beneficiaireId: string, valeur: number, typeImputation: Liberalite['typeImputation'], date = '2020-01-01'): Liberalite =>
  ({ id, type: 'donation', beneficiaireId, valeur, valeurFiscaleActe: valeur, date, typeImputation });
const legs = (id: string, beneficiaireId: string, valeur: number): Liberalite =>
  ({ id, type: 'legs', beneficiaireId, valeur, date: '2026-01-01', typeImputation: 'hors_part', beneficiaireName: 'Tiers' });

type R = ReturnType<typeof run>;
const recu = (r: R, id: string) => Math.round(r.heirs.filter(h => h.personId === id).reduce((s, h) => s + (h.recuSuccession || 0), 0));
const soulte = (r: R, id: string) => Math.round(r.heirs.filter(h => h.personId === id).reduce((s, h) => s + (h.soulte || 0), 0));

describe('Partage — audit « résultat notaire » 2026-09-29, phase 1', () => {
  it('R1 — donation hors part : le donataire la garde en plus d\'une part égale des biens', () => {
    const r = run(famille(2, false), 200000, [donation('d1', 'E1', 50000, 'hors_part')]);
    expect(recu(r, 'E1')).toBe(100000);
    expect(recu(r, 'E2')).toBe(100000);
    expect(r.heirs.find(h => h.personId === 'E1')?.partFinale).toBe(150000);
  });

  it('R1 — donation-partage inégale : jamais rapportée, les biens restants se partagent à égalité', () => {
    const r = run(famille(2, false), 200000, [donation('d1', 'E1', 100000, 'partage'), donation('d2', 'E2', 20000, 'partage')]);
    expect(recu(r, 'E1')).toBe(100000);
    expect(recu(r, 'E2')).toBe(100000);
  });

  it('R1 — la base DMTG suit ce qui est reçu : droits de E1 avec rappel de sa donation', () => {
    // Actif 200 000 + forfait mobilier 10 000 − frais funéraires 1 500 = 208 500 → 104 250 par enfant.
    // E1 : 104 250 − 50 000 (abattement résiduel) = 54 250 taxables → 9 044 €. E2 : 4 250 → 213 €.
    const r = run(famille(2, false), 200000, [donation('d1', 'E1', 50000, 'hors_part')]);
    expect(Math.abs(r.dmtg.perBeneficiary['E1'].droitsHorsAV - 9044)).toBeLessThanOrEqual(2);
    expect(Math.abs(r.dmtg.perBeneficiary['E2'].droitsHorsAV - 213)).toBeLessThanOrEqual(2);
  });

  it('R2 — deux donations au même enfant : sa réserve individuelle n\'est consommée qu\'une fois', () => {
    // Masse 200 000, réserve 2/3 → 66 667 par enfant, QD 66 667.
    // d1 : 66 667 sur la réserve de E1 + 33 333 sur la QD ; d2 : 100 000 sur la QD.
    const r = run(famille(2, false), 0, [
      donation('d1', 'E1', 100000, 'avance_part', '2015-01-01'),
      donation('d2', 'E1', 100000, 'avance_part', '2018-01-01'),
    ]);
    expect(r.details.reductions.reduce((s, x) => s + x.montantReduit, 0)).toBeCloseTo(66667, 0);
    // E2 est rempli de ses droits : 100 000 (indemnité 66 667 + soulte 33 333).
    expect(recu(r, 'E2') + soulte(r, 'E2')).toBe(100000);
  });

  it('R3 — donation au conjoint imputée sur ses droits (art. 758-6)', () => {
    // Droits 1/4 × 400 000 = 100 000, donation 100 000 → complément nul.
    const r = run(famille(2, true), 400000, [donation('d1', 'conjoint', 100000, 'hors_part')]);
    expect(recu(r, 'C')).toBe(0);
    expect(recu(r, 'E1')).toBe(200000);
    expect(recu(r, 'E2')).toBe(200000);
  });

  it('R3 — legs à un tiers : le quart du conjoint ne peut pas entamer la réserve (art. 758-5)', () => {
    // Masse 400 000, réserve 266 667, QD 133 333 ; legs 100 000 → QD restante 33 333.
    const r = run(famille(2, true), 400000, [legs('l1', 'tiers', 100000)]);
    expect(recu(r, 'C')).toBe(33333);
    expect(recu(r, 'E1')).toBe(133333);
    expect(recu(r, 'E2')).toBe(133333);
    expect(r.legataires[0].montant).toBe(100000);
  });

  it('R4 — donation rapportable excédant la part : soulte due au cohéritier', () => {
    // Masse égalitaire 100 000 + 200 000 = 300 000 → 150 000 chacun.
    const r = run(famille(2, false), 100000, [donation('d1', 'E1', 200000, 'avance_part')]);
    expect(recu(r, 'E2')).toBe(100000);
    expect(soulte(r, 'E2')).toBe(50000);
    expect(soulte(r, 'E1')).toBe(-50000);
    expect(r.heirs.find(h => h.personId === 'E1')?.partFinale).toBe(150000);
  });

  it('R5 — donation réduite : l\'indemnité revient à l\'héritier réservataire', () => {
    const r = run(famille(1, false), 0, [donation('d1', 'tiers', 100000, 'hors_part')]);
    expect(recu(r, 'E1')).toBe(50000);
    expect(r.heirs[0].indemniteReduction).toBeCloseTo(50000, 0);
  });

  it('R5 — legs réduit : la réduction n\'est plus comptée deux fois', () => {
    const r = run(famille(1, false), 100000, [legs('l1', 'tiers', 80000)]);
    expect(r.legataires[0].montant).toBe(50000);
    expect(r.heirs[0].partFinale).toBe(50000);
    expect(recu(r, 'E1')).toBe(50000);
  });
});
