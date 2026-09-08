import { describe, expect, it } from 'vitest';
import { calculerPrelevementsSociauxPensionsRetraitesRentes } from './calculerPrelevementsSociauxPensionsRetraitesRentes';
import { PensionsRetraitesRentesInput } from './types';

function makeInput(overrides: Partial<PensionsRetraitesRentesInput> = {}): PensionsRetraitesRentesInput {
  return {
    case1as: null, case1bs: null,
    case1at: null, case1bt: null,
    case1ai: null, case1bi: null,
    case1az: null, case1bz: null,
    case1ao: null, case1bo: null,
    case1al: null, case1bl: null,
    case1am: null, case1bm: null,
    case1aw: null, case1bw: null, case1cw: null, case1dw: null,
    case1ar: null, case1br: null, case1cr: null, case1dr: null,
    case1hk: false, case1hl: false,
    ...overrides,
  };
}

describe('calculerPrelevementsSociauxPensionsRetraitesRentes — rentes viagères à titre onéreux', () => {
  it('foyer sans rente : PS nuls', () => {
    const result = calculerPrelevementsSociauxPensionsRetraitesRentes(makeInput());
    expect(result.prelevementsSociaux).toBe(0);
  });

  it('applique 18,6 % sur la fraction imposable selon la tranche d\'âge', () => {
    const result = calculerPrelevementsSociauxPensionsRetraitesRentes(makeInput({ case1aw: 10000 }));
    expect(result.baseImposableRentesViageres).toBe(7000); // 70 % avant 50 ans
    expect(result.prelevementsSociauxRentesViageres).toBeCloseTo(7000 * 0.186, 6);
  });

  it('reproduit à l\'euro près le total officiel sur le compte réel (1CW=12000, tranche 60-69 ans -> 4800 imposable)', () => {
    const result = calculerPrelevementsSociauxPensionsRetraitesRentes(makeInput({ case1cw: 12000 }));
    expect(result.baseImposableRentesViageres).toBe(4800);
    expect(result.prelevementsSociaux).toBeCloseTo(893, 0); // 4800 * 0.186 = 892.8 ≈ 893
  });

  it('applique la bonne fraction pour chaque tranche d\'âge (1BW/1CW/1DW)', () => {
    const result = calculerPrelevementsSociauxPensionsRetraitesRentes(makeInput({
      case1bw: 1000, case1cw: 1000, case1dw: 1000,
    }));
    expect(result.baseImposableRentesViageres).toBe(500 + 400 + 300);
  });

  it('agrège aussi 1AR/1BR/1CR/1DR (rentes étrangères, même fraction et même taux)', () => {
    const result = calculerPrelevementsSociauxPensionsRetraitesRentes(makeInput({ case1ar: 10000 }));
    expect(result.baseImposableRentesViageres).toBe(7000);
    expect(result.prelevementsSociauxRentesViageres).toBeCloseTo(7000 * 0.186, 6);
  });
});

describe('calculerPrelevementsSociauxPensionsRetraitesRentes — cases hors périmètre', () => {
  it('ignore les pensions classiques (1AS/1AZ/1AO/1AM, RFR N-2 non modélisé)', () => {
    const result = calculerPrelevementsSociauxPensionsRetraitesRentes(makeInput({
      case1as: 18000, case1bs: 10000, case1az: 6000, case1ao: 4800, case1am: 3000,
    }));
    expect(result.prelevementsSociaux).toBe(0);
  });

  it('ignore 1AL/1BL (pensions étrangères, même régime RFR-dépendant)', () => {
    const result = calculerPrelevementsSociauxPensionsRetraitesRentes(makeInput({ case1al: 10000, case1bl: 10000 }));
    expect(result.prelevementsSociaux).toBe(0);
  });

  it('ignore 1AI/1BI (capital PER, déjà prélevé à l\'entrée)', () => {
    const result = calculerPrelevementsSociauxPensionsRetraitesRentes(makeInput({ case1ai: 50000, case1bi: 50000 }));
    expect(result.prelevementsSociaux).toBe(0);
  });

  it('ignore 1AT/1BT (capital retraite 163 bis, confirmé par le compte réel : 40000€ sans effet sur le total officiel)', () => {
    const result = calculerPrelevementsSociauxPensionsRetraitesRentes(makeInput({ case1at: 40000, case1bt: 50000 }));
    expect(result.prelevementsSociaux).toBe(0);
  });

  it('reproduit exactement le cas du compte réel : pensions classiques + 1AT + 1AI + rente -> seule la rente contribue', () => {
    const result = calculerPrelevementsSociauxPensionsRetraitesRentes(makeInput({
      case1as: 18000, case1bs: 10000, case1at: 40000, case1ai: 15000,
      case1az: 6000, case1ao: 4800, case1am: 3000, case1cw: 12000,
    }));
    expect(result.prelevementsSociaux).toBeCloseTo(893, 0);
  });

  it('expose la liste des cases hors périmètre', () => {
    const result = calculerPrelevementsSociauxPensionsRetraitesRentes(makeInput());
    expect(result.casesHorsPerimetre).toContain('case1as');
    expect(result.casesHorsPerimetre).toContain('case1al');
    expect(result.casesHorsPerimetre).toContain('case1ai');
    expect(result.casesHorsPerimetre).toContain('case1at');
    expect(result.casesHorsPerimetre).not.toContain('case1aw');
    expect(result.casesHorsPerimetre).not.toContain('case1ar');
  });
});
