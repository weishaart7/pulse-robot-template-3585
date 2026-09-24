/**
 * Donation au dernier vivant (C. civ. art. 1094-1) en présence d'un enfant non
 * commun : les options de la quotité spéciale entre époux restent ouvertes.
 * Sans DDV, l'art. 757 impose 1/4 PP dès qu'un enfant n'est pas commun.
 */
import { describe, it, expect } from 'vitest';
import { calculateSuccessionLegale } from './successionLegale';
import { computeTransmission, FamilyGraph, PatrimonySnapshot, TransmissionParams, Person } from './index';
import transmissionParamsData from '../../data/transmission-params.json';

const params: TransmissionParams = {
  abattements: {
    ...transmissionParamsData.abattements,
    conjoint: transmissionParamsData.abattements.conjoint === 'Infinity' ? Infinity : Number(transmissionParamsData.abattements.conjoint)
  },
  bareme: transmissionParamsData.bareme,
  prelevement990I: transmissionParamsData.prelevement990I
};

const p = (o: Partial<Person> & { id: string; nom: string }): Person => ({ prenom: '', estDecede: false, ...o });

function famille(opts: { hasDDV: boolean; enfants?: string[]; communs?: string[]; extraPersons?: Person[]; extraLinks?: FamilyGraph['links'] }): FamilyGraph {
  const enfants = opts.enfants ?? ['E1', 'E2'];
  return {
    persons: [
      p({ id: 'D', nom: 'Defunt', lienFamilial: 'decedent' }),
      p({ id: 'C', nom: 'Conjoint', lienFamilial: 'Conjoint', dateNaissance: '1950-01-01' }),
      ...enfants.map(id => p({ id, nom: id, lienFamilial: 'Enfant' })),
      ...(opts.extraPersons ?? [])
    ],
    links: [...enfants.map(id => ({ from: 'D', to: id, relation: 'child' as const })), ...(opts.extraLinks ?? [])],
    marriages: [{ spouseA: 'D', spouseB: 'C' }],
    decedentId: 'D',
    hasSurvivingSpouse: true,
    survivingSpouseId: 'C',
    childrenOfDecedent: enfants,
    childrenCommonWithSpouse: opts.communs ?? ['E1'],
    hasDDV: opts.hasDDV
  };
}

const parts = (r: ReturnType<typeof calculateSuccessionLegale>, id: string) =>
  r.heritiers.filter(h => h.personId === id).map(h => ({ q: h.quotePart, t: h.typeQuotePart }));

const has1098 = (r: { explicationsTexte?: string[] }) => !!r.explicationsTexte?.some(t => t.includes('art. 1098'));

describe('DDV + enfant non commun (art. 1094-1)', () => {
  it('T1 — usufruit_total : conjoint 100 % US, enfants 50 % NP chacun, message art. 1098', () => {
    const r = calculateSuccessionLegale(famille({ hasDDV: true }), false, 'usufruit_total');
    expect(parts(r, 'C')).toEqual([{ q: 1, t: 'usufruit' }]);
    expect(parts(r, 'E1')).toEqual([{ q: 0.5, t: 'nue_propriete' }]);
    expect(parts(r, 'E2')).toEqual([{ q: 0.5, t: 'nue_propriete' }]);
    expect(r.optionConjoint?.usufruitTotal).toBe(true);
    expect(r.optionConjoint?.enfantsCommuns).toBe(false);
    expect(has1098(r)).toBe(true);
  });

  it('T2 — quart_pp_3quarts_us : conjoint 1/4 PP + 3/4 US, enfants 37,5 % NP chacun', () => {
    const r = calculateSuccessionLegale(famille({ hasDDV: true }), false, 'quart_pp_3quarts_us');
    expect(parts(r, 'C')).toEqual([{ q: 0.25, t: 'pleine_propriete' }, { q: 0.75, t: 'usufruit' }]);
    expect(parts(r, 'E1')[0].q).toBeCloseTo(0.375);
    expect(parts(r, 'E1')[0].t).toBe('nue_propriete');
    expect(parts(r, 'E2')[0].q).toBeCloseTo(0.375);
    expect(has1098(r)).toBe(true);
  });

  it('T3 — qd_pp avec 2 enfants : conjoint 1/3 PP, enfants 1/3 PP chacun', () => {
    const r = calculateSuccessionLegale(famille({ hasDDV: true }), false, 'qd_pp');
    expect(parts(r, 'C')[0].q).toBeCloseTo(1 / 3);
    expect(parts(r, 'C')[0].t).toBe('pleine_propriete');
    expect(parts(r, 'E1')[0].q).toBeCloseTo(1 / 3);
    expect(parts(r, 'E2')[0].q).toBeCloseTo(1 / 3);
    expect(has1098(r)).toBe(false);
  });

  it('T4 — quart_pp : conjoint 1/4 PP, enfants 3/8 chacun, pas de message art. 1098', () => {
    const r = calculateSuccessionLegale(famille({ hasDDV: true }), false, 'quart_pp');
    expect(parts(r, 'C')).toEqual([{ q: 0.25, t: 'pleine_propriete' }]);
    expect(parts(r, 'E1')[0].q).toBeCloseTo(0.375);
    expect(parts(r, 'E2')[0].q).toBeCloseTo(0.375);
    expect(has1098(r)).toBe(false);
  });

  it('T5 — qd_pp avec 3 enfants dont 1 non commun : conjoint 1/4 PP', () => {
    const r = calculateSuccessionLegale(
      famille({ hasDDV: true, enfants: ['E1', 'E2', 'E3'], communs: ['E1', 'E3'] }),
      false,
      'qd_pp'
    );
    expect(parts(r, 'C')).toEqual([{ q: 0.25, t: 'pleine_propriete' }]);
  });

  it('T6 — représentation de l\'enfant non commun prédécédé : sa souche reçoit 50 % NP (25 % par petit-enfant)', () => {
    const g = famille({
      hasDDV: true,
      extraPersons: [
        p({ id: 'PE1', nom: 'PetitEnfant1' }),
        p({ id: 'PE2', nom: 'PetitEnfant2' })
      ],
      extraLinks: [
        { from: 'E2', to: 'PE1', relation: 'child' },
        { from: 'E2', to: 'PE2', relation: 'child' }
      ]
    });
    g.persons.find(x => x.id === 'E2')!.estDecede = true;
    const r = calculateSuccessionLegale(g, false, 'usufruit_total');
    expect(parts(r, 'C')).toEqual([{ q: 1, t: 'usufruit' }]);
    expect(parts(r, 'E1')).toEqual([{ q: 0.5, t: 'nue_propriete' }]);
    expect(parts(r, 'PE1')).toEqual([{ q: 0.25, t: 'nue_propriete' }]);
    expect(parts(r, 'PE2')).toEqual([{ q: 0.25, t: 'nue_propriete' }]);
  });
});

describe('Non-régression', () => {
  it('T7 — sans DDV, enfant non commun, usufruit_total demandé → 1/4 PP imposé', () => {
    const r = calculateSuccessionLegale(famille({ hasDDV: false }), false, 'usufruit_total');
    expect(parts(r, 'C')).toEqual([{ q: 0.25, t: 'pleine_propriete' }]);
    expect(parts(r, 'E1')).toEqual([{ q: 0.375, t: 'pleine_propriete' }]);
    expect(r.optionConjoint?.usufruitTotal).toBe(false);
    expect(r.explicationsTexte.some(t => t.includes('au moins un enfant non commun'))).toBe(true);
    expect(has1098(r)).toBe(false);
  });

  it('T8 — enfants tous communs avec DDV : usufruit_total inchangé, pas de message art. 1098', () => {
    const r = calculateSuccessionLegale(famille({ hasDDV: true, communs: ['E1', 'E2'] }), false, 'usufruit_total');
    expect(parts(r, 'C')).toEqual([{ q: 1, t: 'usufruit' }]);
    expect(r.optionConjoint?.enfantsCommuns).toBe(true);
    expect(has1098(r)).toBe(false);
  });
});

describe('Bout en bout (computeTransmission)', () => {
  it('T9 — 800 k€, conjoint 76 ans, usufruit_total : US 30 %, NP 280 k€ par enfant, aucune réduction', () => {
    const patrimony: PatrimonySnapshot = { date: '2026-07-17', biensExistants: 800000, passifs: 0, assuranceVieTotal: 0 };
    const result = computeTransmission({
      family: famille({ hasDDV: true }),
      patrimony,
      liberalites: [],
      params,
      conjointOption: 'usufruit_total',
      referenceDate: '2026-07-17'
    });

    const conjoint = result.heirs.filter(h => h.lien === 'conjoint').reduce((s, h) => s + h.partFinale, 0);
    expect(conjoint).toBeCloseTo(240000, 0);
    for (const id of ['E1', 'E2']) {
      const e = result.heirs.find(h => h.personId === id)!;
      expect(e.partFinale).toBeCloseTo(280000, 0);
    }
    expect(result.details.reductions).toEqual([]);
    expect(has1098(result)).toBe(true);
  });
});
