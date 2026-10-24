import { describe, expect, it } from 'vitest';
import { calculerRevenuExonereTauxEffectif } from './calculerRevenuExonereTauxEffectif';
import { calculerPensionsRetraitesRentes } from './calculerPensionsRetraitesRentes';
import { PensionsRetraitesRentesInput, RevenusExoneresTauxEffectifInput } from './types';

const PENSIONS_VIDES: PensionsRetraitesRentesInput = {
  case1as: null, case1bs: null, case1at: null, case1bt: null, case1ai: null, case1bi: null,
  case1az: null, case1bz: null, case1ao: null, case1bo: null, case1al: null, case1bl: null,
  case1am: null, case1bm: null, case1aw: null, case1bw: null, case1cw: null, case1dw: null,
  case1ar: null, case1br: null, case1cr: null, case1dr: null, case1hk: false, case1hl: false,
};

/** 1AH/1BH arbitrés dans le pool pensions, comme useFiscalOverview. */
function calculerAvecPool(input: RevenusExoneresTauxEffectifInput, salaires: number, pensions = PENSIONS_VIDES) {
  return calculerRevenuExonereTauxEffectif(
    input,
    salaires,
    calculerPensionsRetraitesRentes(pensions, input).pensionsExonereesTauxEffectifNettes,
  );
}

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

describe('calculerRevenuExonereTauxEffectif — salaires (montant déjà arbitré par calculerRevenuSalaires)', () => {
  it('foyer sans revenu exonéré : total nul', () => {
    expect(calculerAvecPool(makeInput(), 0).totalRetenu).toBe(0);
  });

  it('reprend tel quel le montant transmis (le choix 10 %/frais réels est déjà arbitré en amont)', () => {
    const result = calculerAvecPool(makeInput({ case1ac: 30000 }), 27000);
    expect(result.salairesNetImposables).toBe(27000);
  });
});

describe('calculerRevenuExonereTauxEffectif — pensions étrangères (1AH/1BH)', () => {
  it('applique l\'abattement de 10 % standard', () => {
    const result = calculerAvecPool(makeInput({ case1ah: 40000 }), 0);
    expect(result.abattementPension).toBe(4000);
    expect(result.pensionsNettes).toBe(36000);
  });

  it('applique le plancher de 454 €/pensionné sur une petite pension', () => {
    const result = calculerAvecPool(makeInput({ case1ah: 3000 }), 0);
    expect(result.abattementPension).toBe(454);
    expect(result.pensionsNettes).toBe(3000 - 454);
  });

  it('le plancher ne dépasse jamais la pension elle-même', () => {
    const result = calculerAvecPool(makeInput({ case1ah: 200 }), 0);
    expect(result.abattementPension).toBe(200);
    expect(result.pensionsNettes).toBe(0);
  });

  it('applique le plafond global de 4 439 € pour tout le foyer (deux pensionnés)', () => {
    const result = calculerAvecPool(makeInput({ case1ah: 40000, case1bh: 40000 }), 0);
    // 4000 + 4000 = 8000 > plafond foyer 4439
    expect(result.abattementPension).toBe(4439);
    expect(result.pensionsNettes).toBe(80000 - 4439);
  });

  it('le plancher s\'applique par pensionné avant le plafond global', () => {
    const result = calculerAvecPool(makeInput({ case1ah: 1000, case1bh: 1000 }), 0);
    // chacun : max(454, 100) = 454, total = 908 < plafond foyer
    expect(result.abattementPension).toBe(908);
    expect(result.pensionsNettes).toBe(2000 - 908);
  });
});

describe('calculerRevenuExonereTauxEffectif — plafond 4 439 € commun avec les pensions imposables', () => {
  it('1AS et 1AH partagent un seul plafond foyer', () => {
    const pensions = { ...PENSIONS_VIDES, case1as: 40000 };
    const exoneres = makeInput({ case1ah: 20000 });
    const result = calculerAvecPool(exoneres, 0, pensions);
    const imposables = calculerPensionsRetraitesRentes(pensions, exoneres);
    // abattement brut 6000 > 4439 : un seul plafond, réparti au prorata 40/60 → 20/60
    expect(result.abattementPension + imposables.abattementPension).toBeCloseTo(4439, 6);
    expect(result.pensionsNettes).toBeCloseTo(20000 - 4439 / 3, 6);
    expect(imposables.pensionsNettes).toBeCloseTo(40000 - 4439 * 2 / 3, 6);
  });

  it('sous le plafond : abattement 10 % inchangé de part et d\'autre', () => {
    const pensions = { ...PENSIONS_VIDES, case1as: 20000 };
    const exoneres = makeInput({ case1ah: 10000 });
    expect(calculerAvecPool(exoneres, 0, pensions).pensionsNettes).toBeCloseTo(9000, 6);
    expect(calculerPensionsRetraitesRentes(pensions, exoneres).pensionsNettes).toBeCloseTo(18000, 6);
  });

  it('1AS, 1AL et 1AH ensemble : trois parts isolées, un seul plafond', () => {
    const pensions = { ...PENSIONS_VIDES, case1as: 30000, case1al: 30000 };
    const exoneres = makeInput({ case1ah: 30000 });
    const r = calculerPensionsRetraitesRentes(pensions, exoneres);
    const net = 90000 - 4439;
    expect(r.pensionsNettes).toBeCloseTo(net / 3, 6);
    expect(r.revenuCreditImpotEgalImpotFrancais).toBeCloseTo(net / 3, 6);
    expect(r.pensionsExonereesTauxEffectifNettes).toBeCloseTo(net / 3, 6);
  });
});

describe('calculerRevenuExonereTauxEffectif — total', () => {
  it('additionne salaires nets et pensions nettes', () => {
    const result = calculerAvecPool(makeInput({ case1ah: 40000 }), 27000);
    expect(result.totalRetenu).toBe(27000 + 36000);
  });

  it('ignore 1GE/1HE et RSE/RSF (purement informatifs)', () => {
    const result = calculerAvecPool(makeInput({ case1ge: true, case1he: true, caseRse: 'Belgique' }), 0);
    expect(result.totalRetenu).toBe(0);
  });
});
