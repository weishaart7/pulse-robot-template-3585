/**
 * Quotité disponible spéciale entre époux (art. 1094-1 C. civ.), règles R16 à
 * R20 validées le 2026-09-29. Conjoint né en 1955 : 71 ans au décès, usufruit
 * à 30 % (barème art. 669 CGI).
 */
import { describe, it, expect } from 'vitest';
import { computeTransmission, computeChainedTransmission, FamilyGraph, Liberalite, RawAssetInput, ConjointOption } from './index';

const REF = '2026-09-29';
const compte = (valeur: number): RawAssetInput[] => valeur > 0
  ? [{ id: 'c', denomination: 'Compte', valeur_estimee: valeur, nature: 'Compte courant', qualification_bien: 'Bien propre', detenteur: 'user' }]
  : [];

function famille(n: number, opts: { ddv?: boolean; nonCommun?: boolean; conjoint?: boolean } = {}): FamilyGraph {
  const ids = Array.from({ length: n }, (_, i) => `E${i + 1}`);
  const conjoint = opts.conjoint !== false;
  return {
    persons: [
      { id: 'D', nom: 'D', prenom: 'D', dateNaissance: '1950-01-01' },
      ...(conjoint ? [{ id: 'C', nom: 'C', prenom: 'C', lienFamilial: 'Conjoint', dateNaissance: '1955-01-01' }] : []),
      ...ids.map(id => ({ id, nom: id, prenom: id, lienFamilial: 'Enfant', dateNaissance: '1985-01-01' })),
    ],
    links: ids.map(id => ({ from: 'D', to: id, relation: 'child' as const })),
    marriages: conjoint ? [{ spouseA: 'D', spouseB: 'C' }] : [], decedentId: 'D',
    hasSurvivingSpouse: conjoint, survivingSpouseId: conjoint ? 'C' : undefined,
    childrenOfDecedent: ids,
    childrenCommonWithSpouse: opts.nonCommun ? ids.slice(1) : ids,
    hasDDV: !!opts.ddv,
  };
}

function ctx(family: FamilyGraph, biens: number, liberalites: Liberalite[], conjointOption: ConjointOption = 'quart_pp') {
  return {
    family, patrimony: { date: REF, biensExistants: biens, passifs: 0 }, liberalites, params: {} as any,
    referenceDate: REF, conjointOption, rawAssets: compte(biens),
  };
}
const run = (...a: Parameters<typeof ctx>) => computeTransmission(ctx(...a));
const recu = (r: ReturnType<typeof run>, id: string) =>
  Math.round(r.heirs.filter(h => h.personId === id).reduce((s, h) => s + (h.recuSuccession || 0), 0));
const reduit = (r: ReturnType<typeof run>, id: string) =>
  Math.round(r.details.reductions.filter(x => x.liberaliteId === id).reduce((s, x) => s + x.montantReduit, 0));

const legsConjoint = (valeur: number, usufruit = false): Liberalite => ({
  id: 'lc', type: 'legs', beneficiaireId: 'conjoint', valeur, date: '2026-01-01', typeImputation: 'hors_part',
  ...(usufruit ? { droitTransmis: 'usufruit' as const } : {}),
});

describe('Quotité spéciale entre époux (art. 1094-1)', () => {
  it('R17 — legs de l\'usufruit de tout, 3 enfants : jamais réduit, enfants en nue-propriété', () => {
    const r = run(famille(3), 600000, [legsConjoint(600000, true)]);
    expect(r.details.reductions).toEqual([]);
    // Usufruit 600 000 × 30 % = 180 000 (≥ son quart légal de 150 000 : aucun complément, art. 758-6).
    expect(recu(r, 'C')).toBe(180000);
    ['E1', 'E2', 'E3'].forEach(e => expect(recu(r, e)).toBe(140000));
  });

  it('R17 — le même legs en usufruit est taxé zéro pour le conjoint, en nue-propriété pour les enfants', () => {
    const r = run(famille(3), 600000, [legsConjoint(600000, true)]);
    expect(r.dmtg.perBeneficiary['C'].droitsTotaux).toBe(0);
    expect(r.netBreakdown.heirs.find(h => h.personId === 'E1')!.valeurRecue).toBe(140000);
  });

  it('R18 — legs de 200 k€ en pleine propriété : réduit à la QDO (133 333 €)', () => {
    const r = run(famille(2), 400000, [legsConjoint(200000)]);
    expect(reduit(r, 'lc')).toBe(66667);
    expect(recu(r, 'C')).toBe(133333);
    expect(recu(r, 'E1')).toBe(133333);
  });

  it('R20/R23 — donation hors part épuisant la QDO + DDV 1/4 PP + 3/4 US : plus de PP, usufruit sur tout le reste (contrôle en assiette)', () => {
    const don: Liberalite = { id: 'd', type: 'donation', beneficiaireId: 'E1', valeur: 133333.34, valeurFiscaleActe: 133333, date: '2020-01-01', typeImputation: 'hors_part' };
    const r = run(famille(2, { ddv: true }), 266666.66, [don], 'quart_pp_3quarts_us');
    // QDO épuisée : aucune pleine propriété ; usufruit sur les 266 667 € restants
    // (assiette ≤ 400 000 − 133 333), soit 80 000 € ; enfants en nue-propriété.
    expect(recu(r, 'C')).toBe(80000);
    expect(recu(r, 'E1')).toBe(93333);
    expect(recu(r, 'E2')).toBe(93333);
    expect(r.explicationsTexte?.some(t => t.includes('sont limités'))).toBe(true);
  });

  it('R19/R23 — legs à un tiers + DDV usufruit total (enfant non commun) : usufruit sur les biens non légués', () => {
    const legsTiers: Liberalite = { id: 'lt', type: 'legs', beneficiaireId: 'tiers', valeur: 133333.34, date: '2026-01-01', typeImputation: 'hors_part', beneficiaireName: 'Ami' };
    const r = run(famille(2, { ddv: true, nonCommun: true }), 400000, [legsTiers], 'usufruit_total');
    // En assiette : usufruit sur les 266 667 € non légués (≤ 400 000 − 133 333), 80 000 €.
    expect(recu(r, 'C')).toBe(80000);
    expect(Math.abs(recu(r, 'E1') + recu(r, 'E2') - 186667)).toBeLessThanOrEqual(1); // arrondi par héritier
  });

  it('usufruit légal (art. 757, sans DDV) : non plafonné par la quotité spéciale', () => {
    const legsTiers: Liberalite = { id: 'lt', type: 'legs', beneficiaireId: 'tiers', valeur: 133333.34, date: '2026-01-01', typeImputation: 'hors_part', beneficiaireName: 'Ami' };
    const r = run(famille(2), 400000, [legsTiers], 'usufruit_total');
    expect(recu(r, 'C')).toBe(80000);
  });

  it('sans descendant : règle ordinaire, legs au conjoint en PP jamais soumis à la quotité spéciale', () => {
    const r = run(famille(0), 400000, [legsConjoint(400000)]);
    expect(r.details.reductions).toEqual([]);
    expect(recu(r, 'C')).toBe(400000);
  });

  it('2nd décès : l\'usufruit légué au conjoint se réunit aux enfants, hors taxation', () => {
    const chained = computeChainedTransmission({
      firstDeath: ctx(famille(3), 600000, [legsConjoint(600000, true)]),
      secondDeath: ctx(famille(3, { conjoint: false }), 100000, []),
    });
    expect(chained.reunionUsufruit.total).toBe(180000);
    expect(chained.reunionUsufruit.parNuProprietaire.map(p => p.montant)).toEqual([60000, 60000, 60000]);
  });
});
