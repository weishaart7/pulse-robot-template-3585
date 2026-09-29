/**
 * Comparaison des options du conjoint (Optimisation) : summarizeOptionConjoint
 * ne fait que lire le résultat chaîné du moteur, sans recalcul. Scénario :
 * couple marié, 2 enfants communs, 394 000 € au 1er décès (cf. secondDeces.test.ts).
 */
import { describe, it, expect, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { summarizeOptionConjoint } from './transmissionOrdreNormal';
import { computeChainedTransmission, ConjointOption, FamilyGraph, TransmissionParams } from '@/lib/transmission';
import transmissionParamsData from '@/data/transmission-params.json';

const params: TransmissionParams = {
  abattements: {
    ...transmissionParamsData.abattements,
    conjoint: transmissionParamsData.abattements.conjoint === 'Infinity' ? Infinity : Number(transmissionParamsData.abattements.conjoint)
  },
  bareme: transmissionParamsData.bareme,
  prelevement990I: transmissionParamsData.prelevement990I
};

const family: FamilyGraph = {
  persons: [
    { id: 'titouan', nom: 'TEST', prenom: 'Titouan' },
    { id: 'julie', nom: 'TEST', prenom: 'Julie', lienFamilial: 'Conjoint', dateNaissance: '1960-01-01' },
    { id: 'romy', nom: 'TEST', prenom: 'Romy', lienFamilial: 'Enfant' },
    { id: 'austin', nom: 'TEST', prenom: 'Austin', lienFamilial: 'Enfant' }
  ],
  links: [
    { from: 'titouan', to: 'romy', relation: 'child' },
    { from: 'titouan', to: 'austin', relation: 'child' }
  ],
  marriages: [{ spouseA: 'titouan', spouseB: 'julie', regime: 'communauté légale' }],
  decedentId: 'titouan',
  hasSurvivingSpouse: true,
  survivingSpouseId: 'julie',
  childrenOfDecedent: ['romy', 'austin'],
  childrenCommonWithSpouse: ['romy', 'austin'],
  hasDDV: false
};
const familyVeuve: FamilyGraph = {
  persons: [
    { id: 'julie', nom: 'TEST', prenom: 'Julie' },
    { id: 'romy', nom: 'TEST', prenom: 'Romy', lienFamilial: 'Enfant' },
    { id: 'austin', nom: 'TEST', prenom: 'Austin', lienFamilial: 'Enfant' }
  ],
  links: [
    { from: 'julie', to: 'romy', relation: 'child' },
    { from: 'julie', to: 'austin', relation: 'child' }
  ],
  marriages: [],
  decedentId: 'julie',
  hasSurvivingSpouse: false,
  childrenOfDecedent: ['romy', 'austin'],
  childrenCommonWithSpouse: [],
  hasDDV: false
};

// Le 2nd décès reprend ce que le conjoint a reçu en pleine propriété (0 en
// usufruit total, 1/4 en quart_pp), comme buildSurvivingSpousePatrimony.
function run(option: ConjointOption, recuPP: number) {
  const propre = 300000 + recuPP;
  return computeChainedTransmission({
    firstDeath: {
      family, params, conjointOption: option, referenceDate: '2026-09-29', liberalites: [],
      patrimony: { date: '2026-09-29', biensExistants: 394000, passifs: 0, assuranceVieTotal: 0 },
      rawAssets: [{ id: 'a1', denomination: 'P', valeur_estimee: 394000, nature: 'valeur_mobiliere', qualification_bien: 'Bien personnel' }]
    },
    secondDeath: {
      family: familyVeuve, params, referenceDate: '2026-09-29', liberalites: [],
      patrimony: { date: '2026-09-29', biensExistants: propre, passifs: 0, assuranceVieTotal: 0 },
      rawAssets: [{ id: 'a2', denomination: 'P', valeur_estimee: propre, nature: 'valeur_mobiliere', qualification_bien: 'Bien personnel' }]
    }
  });
}

describe('summarizeOptionConjoint', () => {
  const usufruit = run('usufruit_total', 0);
  const quart = run('quart_pp', 394000 / 4);

  it('reprend exactement les chiffres du moteur', () => {
    const s = summarizeOptionConjoint(usufruit);
    expect(s.droits1erDeces).toBe(usufruit.firstDeath.dmtg.totals.droitsTotaux);
    expect(s.droits2ndDeces).toBe(usufruit.secondDeath.dmtg.totals.droitsTotaux);
    expect(s.droitsTotaux).toBe(s.droits1erDeces + s.droits2ndDeces);
    const julie = usufruit.firstDeath.netBreakdown.heirs.filter(h => h.personId === 'julie').reduce((a, h) => a + h.netARecevoir, 0);
    expect(s.netConjoint).toBe(julie);
    const net2 = usufruit.transmissionNetteCombinee.reduce((a, e) => a + e.montant, 0);
    expect(s.netHeritiersCumule).toBeCloseTo(s.netAutresHeritiers1erDeces + net2, 6);
  });

  it("l'usufruit réuni au 2nd décès n'est pas taxé : moins de droits qu'avec 1/4 PP retaxé", () => {
    const su = summarizeOptionConjoint(usufruit);
    const sq = summarizeOptionConjoint(quart);
    expect(usufruit.reunionUsufruit.total).toBeGreaterThan(0);
    expect(su.droits2ndDeces).toBeLessThan(sq.droits2ndDeces);
  });

  it('le conjoint est exonéré au 1er décès quelle que soit l\'option (loi TEPA)', () => {
    for (const r of [usufruit, quart]) {
      expect(r.firstDeath.dmtg.perBeneficiary['julie']).toBeDefined();
      expect(r.firstDeath.dmtg.perBeneficiary['julie'].droitsHorsAV).toBe(0);
    }
  });
});
