import { describe, expect, it } from 'vitest';
import { calculerPensionsRetraitesRentes } from './calculerPensionsRetraitesRentes';
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

describe('calculerPensionsRetraitesRentes — abattement de 10 % classique (1AS/1AZ/1AO/1AM)', () => {
  it('foyer sans pension : tout à zéro', () => {
    const result = calculerPensionsRetraitesRentes(makeInput());
    expect(result.pensionsBrutes).toBe(0);
    expect(result.abattementPension).toBe(0);
    expect(result.pensionsNettes).toBe(0);
  });

  it('applique 10 % au-dessus du plancher (454 €)', () => {
    const result = calculerPensionsRetraitesRentes(makeInput({ case1as: 20000 }));
    expect(result.pensionsBrutes).toBe(20000);
    expect(result.abattementPension).toBeCloseTo(2000, 6);
    expect(result.pensionsNettes).toBeCloseTo(18000, 6);
  });

  it('applique le plancher de 454 € quand 10 % est inférieur', () => {
    const result = calculerPensionsRetraitesRentes(makeInput({ case1as: 2000 }));
    expect(result.abattementPension).toBe(454);
    expect(result.pensionsNettes).toBe(1546);
  });

  it("le plancher ne dépasse jamais le montant de la pension elle-même", () => {
    const result = calculerPensionsRetraitesRentes(makeInput({ case1as: 300 }));
    expect(result.abattementPension).toBe(300);
    expect(result.pensionsNettes).toBe(0);
  });

  it('agrège 1AS + 1AZ + 1AO + 1AM pour un même déclarant avant abattement', () => {
    const result = calculerPensionsRetraitesRentes(makeInput({
      case1as: 5000, case1az: 3000, case1ao: 1000, case1am: 1000,
    }));
    expect(result.pensionsBrutes).toBe(10000);
    expect(result.abattementPension).toBeCloseTo(1000, 6);
  });

  it('applique un plancher par déclarant (deux pensionnés du foyer)', () => {
    const result = calculerPensionsRetraitesRentes(makeInput({ case1as: 20000, case1bs: 2000 }));
    // déclarant 1 : 10% de 20000 = 2000 ; déclarant 2 : plancher 454 (10% de 2000 = 200 < 454)
    expect(result.abattementPension).toBeCloseTo(2000 + 454, 6);
  });

  it('plafonne la somme des abattements à 4 439 € pour le foyer', () => {
    const result = calculerPensionsRetraitesRentes(makeInput({ case1as: 100000, case1bs: 100000 }));
    expect(result.abattementPension).toBe(4439);
    expect(result.pensionsNettes).toBe(200000 - 4439);
  });
});

describe('calculerPensionsRetraitesRentes — capital PER (1AI), sans abattement', () => {
  it("s'ajoute au revenu net imposable sans abattement", () => {
    const result = calculerPensionsRetraitesRentes(makeInput({ case1ai: 10000, case1bi: 5000 }));
    expect(result.capitalPER).toBe(15000);
    expect(result.totalNetImposable).toBe(15000);
  });

  it("n'affecte pas l'abattement de 10 % classique (base distincte)", () => {
    const result = calculerPensionsRetraitesRentes(makeInput({ case1as: 20000, case1ai: 10000 }));
    expect(result.abattementPension).toBeCloseTo(2000, 6);
    expect(result.totalNetImposable).toBeCloseTo(18000 + 10000, 6);
  });
});

describe('calculerPensionsRetraitesRentes — rentes viagères à titre onéreux (1AW), fraction par âge', () => {
  it('moins de 50 ans : 70 % imposable', () => {
    const result = calculerPensionsRetraitesRentes(makeInput({ case1aw: 5500 }));
    expect(result.rentesViageresImposables).toBeCloseTo(3850, 6);
  });

  it('50 à 59 ans : 50 % imposable', () => {
    const result = calculerPensionsRetraitesRentes(makeInput({ case1bw: 4000 }));
    expect(result.rentesViageresImposables).toBeCloseTo(2000, 6);
  });

  it('60 à 69 ans : 40 % imposable (exemple brochure DGFiP)', () => {
    const result = calculerPensionsRetraitesRentes(makeInput({ case1cw: 2000 }));
    expect(result.rentesViageresImposables).toBeCloseTo(800, 6);
  });

  it('à partir de 70 ans : 30 % imposable', () => {
    const result = calculerPensionsRetraitesRentes(makeInput({ case1dw: 3000 }));
    expect(result.rentesViageresImposables).toBeCloseTo(900, 6);
  });

  it('cumule les 4 tranches', () => {
    const result = calculerPensionsRetraitesRentes(makeInput({
      case1aw: 1000, case1bw: 1000, case1cw: 1000, case1dw: 1000,
    }));
    expect(result.rentesViageresImposables).toBeCloseTo(700 + 500 + 400 + 300, 6);
  });

  it("n'est pas soumise à l'abattement de 10 % classique", () => {
    const result = calculerPensionsRetraitesRentes(makeInput({ case1aw: 5500 }));
    expect(result.abattementPension).toBe(0);
    expect(result.totalNetImposable).toBeCloseTo(3850, 6);
  });
});

describe('calculerPensionsRetraitesRentes — impôt forfaitaire (1AT, option 7,5 %)', () => {
  it('sans capital retraite : impôt forfaitaire nul', () => {
    expect(calculerPensionsRetraitesRentes(makeInput()).impotForfaitaire).toBe(0);
  });

  it('applique un abattement de 10 % non plafonné puis 7,5 %', () => {
    const result = calculerPensionsRetraitesRentes(makeInput({ case1at: 100000 }));
    expect(result.impotForfaitaire).toBeCloseTo(100000 * 0.9 * 0.075, 6);
  });

  it("n'entre pas dans le revenu net imposable (barème)", () => {
    const result = calculerPensionsRetraitesRentes(makeInput({ case1at: 100000 }));
    expect(result.totalNetImposable).toBe(0);
  });

  it('cumule déclarant 1 et 2', () => {
    const result = calculerPensionsRetraitesRentes(makeInput({ case1at: 50000, case1bt: 50000 }));
    expect(result.impotForfaitaire).toBeCloseTo(100000 * 0.9 * 0.075, 6);
  });
});

describe('calculerPensionsRetraitesRentes — cases exclues du calcul', () => {
  it('ignore 1AL/1BL (crédit d\'impôt égal à l\'impôt français)', () => {
    const result = calculerPensionsRetraitesRentes(makeInput({ case1al: 50000, case1bl: 50000 }));
    expect(result.totalNetImposable).toBe(0);
  });

  it('ignore 1AR/1BR/1CR/1DR (rentes non-résidents, même mécanisme)', () => {
    const result = calculerPensionsRetraitesRentes(makeInput({ case1ar: 5000, case1br: 5000, case1cr: 5000, case1dr: 5000 }));
    expect(result.rentesViageresImposables).toBe(0);
    expect(result.totalNetImposable).toBe(0);
  });

  it('ignore 1HK/1HL (case informative)', () => {
    const result = calculerPensionsRetraitesRentes(makeInput({ case1hk: true, case1hl: true }));
    expect(result.totalNetImposable).toBe(0);
    expect(result.impotForfaitaire).toBe(0);
  });

  it('expose la liste des cases exclues', () => {
    const result = calculerPensionsRetraitesRentes(makeInput());
    expect(result.casesExclues).toContain('case1al');
    expect(result.casesExclues).toContain('case1ar');
    expect(result.casesExclues).toContain('case1hk');
    expect(result.casesExclues).not.toContain('case1as');
    expect(result.casesExclues).not.toContain('case1aw');
  });
});

describe('calculerPensionsRetraitesRentes — total net imposable', () => {
  it('additionne pensions nettes, capital PER et rentes viagères imposables', () => {
    const result = calculerPensionsRetraitesRentes(makeInput({
      case1as: 20000, case1ai: 5000, case1aw: 1000,
    }));
    expect(result.totalNetImposable).toBeCloseTo(18000 + 5000 + 700, 6);
  });
});
