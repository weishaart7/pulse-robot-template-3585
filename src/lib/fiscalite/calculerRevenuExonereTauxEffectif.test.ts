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
  it('applique l\'abattement de 10 % standard', () => {
    const result = calculerRevenuExonereTauxEffectif(makeInput({ case1ah: 40000 }));
    expect(result.abattementPension).toBe(4000);
    expect(result.pensionsNettes).toBe(36000);
  });

  it('applique le plancher de 454 €/pensionné sur une petite pension', () => {
    const result = calculerRevenuExonereTauxEffectif(makeInput({ case1ah: 3000 }));
    expect(result.abattementPension).toBe(454);
    expect(result.pensionsNettes).toBe(3000 - 454);
  });

  it('le plancher ne dépasse jamais la pension elle-même', () => {
    const result = calculerRevenuExonereTauxEffectif(makeInput({ case1ah: 200 }));
    expect(result.abattementPension).toBe(200);
    expect(result.pensionsNettes).toBe(0);
  });

  it('applique le plafond global de 4 439 € pour tout le foyer (deux pensionnés)', () => {
    const result = calculerRevenuExonereTauxEffectif(makeInput({ case1ah: 40000, case1bh: 40000 }));
    // 4000 + 4000 = 8000 > plafond foyer 4439
    expect(result.abattementPension).toBe(4439);
    expect(result.pensionsNettes).toBe(80000 - 4439);
  });

  it('le plancher s\'applique par pensionné avant le plafond global', () => {
    const result = calculerRevenuExonereTauxEffectif(makeInput({ case1ah: 1000, case1bh: 1000 }));
    // chacun : max(454, 100) = 454, total = 908 < plafond foyer
    expect(result.abattementPension).toBe(908);
    expect(result.pensionsNettes).toBe(2000 - 908);
  });
});

describe('calculerRevenuExonereTauxEffectif — total', () => {
  it('additionne salaires nets et pensions nettes', () => {
    const result = calculerRevenuExonereTauxEffectif(makeInput({ case1ac: 30000, case1ah: 40000 }));
    expect(result.totalRetenu).toBe(27000 + 36000);
  });

  it('ignore 1GE/1HE et RSE/RSF (purement informatifs)', () => {
    const result = calculerRevenuExonereTauxEffectif(makeInput({ case1ge: true, case1he: true, caseRse: 'Belgique' }));
    expect(result.totalRetenu).toBe(0);
  });
});
