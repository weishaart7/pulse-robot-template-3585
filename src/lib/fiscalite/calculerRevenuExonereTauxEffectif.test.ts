import { describe, expect, it } from 'vitest';
import { calculerRevenuExonereTauxEffectif } from './calculerRevenuExonereTauxEffectif';
import { RevenusExoneresTauxEffectifInput } from './types';

function makeInput(overrides: Partial<RevenusExoneresTauxEffectifInput> = {}): RevenusExoneresTauxEffectifInput {
  return {
    case1ac: null, case1bc: null,
    case1ge: false, case1he: false,
    case1ae: null, case1be: null,
    case1ah: null, case1bh: null,
    caseRse: null, caseRsf: null,
    ...overrides,
  };
}

describe('calculerRevenuExonereTauxEffectif — salaires (1AC/1BC)', () => {
  it('foyer sans revenu exonéré : total nul', () => {
    expect(calculerRevenuExonereTauxEffectif(makeInput()).totalRetenu).toBe(0);
  });

  it('applique l\'abattement de 10 % comme un salaire ordinaire', () => {
    const result = calculerRevenuExonereTauxEffectif(makeInput({ case1ac: 30000 }));
    expect(result.salairesNetImposables).toBe(27000);
  });

  it('retient les frais réels (1AE) s\'ils sont plus favorables', () => {
    const result = calculerRevenuExonereTauxEffectif(makeInput({ case1ac: 30000, case1ae: 5000 }));
    expect(result.salairesNetImposables).toBe(25000);
  });

  it('deux déclarants : abattement indépendant pour chacun', () => {
    const result = calculerRevenuExonereTauxEffectif(makeInput({ case1ac: 30000, case1bc: 20000 }));
    expect(result.salairesNetImposables).toBe(27000 + 18000);
  });
});

describe('calculerRevenuExonereTauxEffectif — pensions étrangères (1AH/1BH)', () => {
  it('ajoutées brutes, sans abattement', () => {
    const result = calculerRevenuExonereTauxEffectif(makeInput({ case1ah: 12000, case1bh: 8000 }));
    expect(result.pensionsBrutes).toBe(20000);
  });
});

describe('calculerRevenuExonereTauxEffectif — total', () => {
  it('additionne salaires nets et pensions brutes', () => {
    const result = calculerRevenuExonereTauxEffectif(makeInput({ case1ac: 30000, case1ah: 12000 }));
    expect(result.totalRetenu).toBe(27000 + 12000);
  });

  it('ignore 1GE/1HE et RSE/RSF (purement informatifs)', () => {
    const result = calculerRevenuExonereTauxEffectif(makeInput({ case1ge: true, case1he: true, caseRse: 'Belgique' }));
    expect(result.totalRetenu).toBe(0);
  });
});
