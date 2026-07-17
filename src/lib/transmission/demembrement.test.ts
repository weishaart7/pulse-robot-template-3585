import { describe, it, expect } from 'vitest';
import {
  computeTransmission,
  getConjointAge,
  getDemembrementPct,
  FamilyGraph,
  PatrimonySnapshot,
  TransmissionParams
} from './index';
import transmissionParamsData from '../../data/transmission-params.json';

const params: TransmissionParams = {
  abattements: {
    ...transmissionParamsData.abattements,
    conjoint: transmissionParamsData.abattements.conjoint === 'Infinity' ? Infinity : Number(transmissionParamsData.abattements.conjoint)
  },
  bareme: transmissionParamsData.bareme,
  prelevement990I: transmissionParamsData.prelevement990I
};

function buildFamily(conjointDateNaissance: string): FamilyGraph {
  return {
    persons: [
      { id: 'defunt', nom: 'Cartier', prenom: 'Jean' },
      { id: 'conjoint', nom: 'Cartier', prenom: 'Julie', lienFamilial: 'Conjoint', dateNaissance: conjointDateNaissance },
      { id: 'enfant1', nom: 'Weishaar', prenom: 'Romy', lienFamilial: 'Enfant' },
      { id: 'enfant2', nom: 'Weishaar', prenom: 'Austin', lienFamilial: 'Enfant' }
    ],
    links: [
      { from: 'defunt', to: 'enfant1', relation: 'child' },
      { from: 'defunt', to: 'enfant2', relation: 'child' }
    ],
    marriages: [{ spouseA: 'defunt', spouseB: 'conjoint' }],
    decedentId: 'defunt',
    hasSurvivingSpouse: true,
    survivingSpouseId: 'conjoint',
    childrenOfDecedent: ['enfant1', 'enfant2'],
    childrenCommonWithSpouse: ['enfant1', 'enfant2'],
    hasDDV: true
  };
}

describe('getDemembrementPct — barème art. 669 CGI', () => {
  it('65 ans → usufruit 40% / nue-propriété 60%', () => {
    expect(getDemembrementPct(65, 'usufruit')).toBe(0.4);
    expect(getDemembrementPct(65, 'nue_propriete')).toBe(0.6);
  });

  it('25 ans → usufruit 80% / nue-propriété 20%', () => {
    expect(getDemembrementPct(25, 'usufruit')).toBe(0.8);
    expect(getDemembrementPct(25, 'nue_propriete')).toBe(0.2);
  });

  it('lève une erreur pour un âge hors barème', () => {
    expect(() => getDemembrementPct(-1, 'usufruit')).toThrow();
    expect(() => getDemembrementPct(1000, 'usufruit')).toThrow();
  });
});

describe('getConjointAge', () => {
  it('calcule correctement l\'âge quand l\'anniversaire est déjà passé dans l\'année de référence', () => {
    expect(getConjointAge(buildFamily('1960-01-15'), '2026-07-17')).toBe(66);
  });

  it('calcule correctement l\'âge quand l\'anniversaire n\'est pas encore passé dans l\'année de référence', () => {
    expect(getConjointAge(buildFamily('1960-12-15'), '2026-07-17')).toBe(65);
  });

  it('lève une erreur si la date de naissance du conjoint est absente', () => {
    const family = buildFamily('1960-01-15');
    family.persons.find(p => p.id === 'conjoint')!.dateNaissance = undefined;
    expect(() => getConjointAge(family, '2026-07-17')).toThrow();
  });
});

describe('computeTransmission — non-régression : usufruit + nue-propriété ne doublent plus la masse', () => {
  it('usufruit_total : Σ partFinale ≈ patrimoine réel (pas 2x)', () => {
    const family = buildFamily('1961-01-01'); // 65 ans au 17/07/2026 → tranche 61-70
    const patrimony: PatrimonySnapshot = { date: '2026-07-17', biensExistants: 840000, passifs: 0, assuranceVieTotal: 0 };

    const result = computeTransmission({
      family,
      patrimony,
      liberalites: [],
      params,
      conjointOption: 'usufruit_total',
      referenceDate: '2026-07-17'
    });

    const sumPartFinale = result.heirs.reduce((s, h) => s + h.partFinale, 0);
    expect(sumPartFinale).toBeCloseTo(840000, 0);

    const conjoint = result.heirs.find(h => h.lien === 'conjoint')!;
    expect(conjoint.partFinale).toBeCloseTo(840000 * 0.4, 0); // usufruit 40% à 65 ans
    const enfants = result.heirs.filter(h => h.lien === 'enfant');
    const sumEnfants = enfants.reduce((s, h) => s + h.partFinale, 0);
    expect(sumEnfants).toBeCloseTo(840000 * 0.6, 0); // nue-propriété 60% à 65 ans
  });

  it('quart_pp_3quarts_us : Σ partFinale ≈ patrimoine réel (pas 1.75x)', () => {
    const family = buildFamily('1996-01-01'); // 30 ans au 17/07/2026 → tranche 21-30
    const patrimony: PatrimonySnapshot = { date: '2026-07-17', biensExistants: 500000, passifs: 0, assuranceVieTotal: 0 };

    const result = computeTransmission({
      family,
      patrimony,
      liberalites: [],
      params,
      conjointOption: 'quart_pp_3quarts_us',
      referenceDate: '2026-07-17'
    });

    const sumPartFinale = result.heirs.reduce((s, h) => s + h.partFinale, 0);
    expect(sumPartFinale).toBeCloseTo(500000, 0);

    // Conjoint : 1/4 PP (100% valeur) + 3/4 usufruit (80% valeur à 30 ans)
    const conjointTotal = result.heirs
      .filter(h => h.lien === 'conjoint')
      .reduce((s, h) => s + h.partFinale, 0);
    expect(conjointTotal).toBeCloseTo(500000 * 0.25 + 500000 * 0.75 * 0.8, 0);

    // Enfants : 3/4 nue-propriété (20% valeur à 30 ans)
    const enfantsTotal = result.heirs
      .filter(h => h.lien === 'enfant')
      .reduce((s, h) => s + h.partFinale, 0);
    expect(enfantsTotal).toBeCloseTo(500000 * 0.75 * 0.2, 0);
  });

  it('quart_pp (pleine propriété simple) : partFinale inchangé, pas de démembrement', () => {
    const family = buildFamily('1961-01-01');
    const patrimony: PatrimonySnapshot = { date: '2026-07-17', biensExistants: 840000, passifs: 0, assuranceVieTotal: 0 };

    const result = computeTransmission({
      family,
      patrimony,
      liberalites: [],
      params,
      conjointOption: 'quart_pp',
      referenceDate: '2026-07-17'
    });

    expect(result.heirs.every(h => h.typeQuotePart === 'pleine_propriete')).toBe(true);
    const sumPartFinale = result.heirs.reduce((s, h) => s + h.partFinale, 0);
    expect(sumPartFinale).toBeCloseTo(840000, 0);

    const conjoint = result.heirs.find(h => h.lien === 'conjoint')!;
    expect(conjoint.partFinale).toBeCloseTo(840000 * 0.25, 0);
  });
});
