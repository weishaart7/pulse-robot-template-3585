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

describe('calculerPrelevementsSociauxPensionsRetraitesRentes — pensions classiques', () => {
  it('foyer sans pension : PS nuls', () => {
    const result = calculerPrelevementsSociauxPensionsRetraitesRentes(makeInput(), 0, 1);
    expect(result.baseImposablePensions).toBe(0);
    expect(result.prelevementsSociauxPensions).toBe(0);
  });

  it('RFR sous le seuil d\'exonération (1 part) : taux nul', () => {
    const result = calculerPrelevementsSociauxPensionsRetraitesRentes(makeInput({ case1as: 10000 }), 13000, 1);
    expect(result.tauxCsgPension).toBe(0);
    expect(result.prelevementsSociauxPensions).toBe(0);
  });

  it('RFR dans la tranche taux réduit (1 part) : 4,3 %', () => {
    const result = calculerPrelevementsSociauxPensionsRetraitesRentes(makeInput({ case1as: 10000 }), 15000, 1);
    expect(result.tauxCsgPension).toBeCloseTo(0.043, 6);
    expect(result.prelevementsSociauxPensions).toBeCloseTo(10000 * 0.043, 6);
  });

  it('RFR dans la tranche taux médian (1 part) : 7,4 %', () => {
    const result = calculerPrelevementsSociauxPensionsRetraitesRentes(makeInput({ case1as: 10000 }), 20000, 1);
    expect(result.tauxCsgPension).toBeCloseTo(0.074, 6);
  });

  it('RFR au-delà du seuil taux médian (1 part) : taux plein 9,1 %', () => {
    const result = calculerPrelevementsSociauxPensionsRetraitesRentes(makeInput({ case1as: 10000 }), 40000, 1);
    expect(result.tauxCsgPension).toBeCloseTo(0.091, 6);
  });

  it('les seuils se relèvent avec le nombre de parts (couple, 2 parts)', () => {
    // 20000 € de RFR : taux plein pour 1 part, mais sous le seuil d'exonération à 2 parts (20015)
    const uneParte = calculerPrelevementsSociauxPensionsRetraitesRentes(makeInput({ case1as: 10000 }), 20000, 1);
    const deuxParts = calculerPrelevementsSociauxPensionsRetraitesRentes(makeInput({ case1as: 10000 }), 20000, 2);
    expect(uneParte.tauxCsgPension).toBeGreaterThan(0);
    expect(deuxParts.tauxCsgPension).toBe(0);
  });

  it('agrège 1AS/1AZ/1AO/1AM des deux déclarants et 1AL/1BL (pensions étrangères)', () => {
    const result = calculerPrelevementsSociauxPensionsRetraitesRentes(makeInput({
      case1as: 1000, case1az: 1000, case1ao: 1000, case1am: 1000,
      case1bs: 1000, case1bz: 1000, case1bo: 1000, case1bm: 1000,
      case1al: 1000, case1bl: 1000,
    }), 100000, 1);
    expect(result.baseImposablePensions).toBe(10000);
  });

  it('assiette PS sur le montant brut, sans l\'abattement de 10 % (spécifique à l\'IR)', () => {
    const result = calculerPrelevementsSociauxPensionsRetraitesRentes(makeInput({ case1as: 10000 }), 100000, 1);
    expect(result.baseImposablePensions).toBe(10000); // pas 9000
  });
});

describe('calculerPrelevementsSociauxPensionsRetraitesRentes — rentes viagères à titre onéreux', () => {
  it('applique 17,2 % sur la fraction imposable selon la tranche d\'âge, indépendamment du RFR', () => {
    const result = calculerPrelevementsSociauxPensionsRetraitesRentes(makeInput({ case1aw: 10000 }), 0, 1);
    expect(result.baseImposableRentesViageres).toBe(7000); // 70 % avant 50 ans
    expect(result.prelevementsSociauxRentesViageres).toBeCloseTo(7000 * 0.172, 6);
  });

  it('applique la bonne fraction pour chaque tranche d\'âge (1BW/1CW/1DW)', () => {
    const result = calculerPrelevementsSociauxPensionsRetraitesRentes(makeInput({
      case1bw: 1000, case1cw: 1000, case1dw: 1000,
    }), 0, 1);
    expect(result.baseImposableRentesViageres).toBe(500 + 400 + 300);
  });

  it('agrège aussi 1AR/1BR/1CR/1DR (rentes étrangères, même fraction)', () => {
    const result = calculerPrelevementsSociauxPensionsRetraitesRentes(makeInput({ case1ar: 10000 }), 0, 1);
    expect(result.baseImposableRentesViageres).toBe(7000);
  });

  it('n\'est pas affecté par le RFR (contrairement aux pensions classiques)', () => {
    const bas = calculerPrelevementsSociauxPensionsRetraitesRentes(makeInput({ case1aw: 10000 }), 0, 1);
    const haut = calculerPrelevementsSociauxPensionsRetraitesRentes(makeInput({ case1aw: 10000 }), 200000, 1);
    expect(bas.prelevementsSociauxRentesViageres).toBe(haut.prelevementsSociauxRentesViageres);
  });
});

describe('calculerPrelevementsSociauxPensionsRetraitesRentes — cases hors périmètre', () => {
  it('ignore 1AI/1BI (capital PER, déjà prélevé à l\'entrée)', () => {
    const result = calculerPrelevementsSociauxPensionsRetraitesRentes(makeInput({ case1ai: 50000, case1bi: 50000 }), 200000, 1);
    expect(result.prelevementsSociaux).toBe(0);
  });

  it('ignore 1AT/1BT (capital retraite 163 bis, taux PS non confirmé)', () => {
    const result = calculerPrelevementsSociauxPensionsRetraitesRentes(makeInput({ case1at: 50000, case1bt: 50000 }), 200000, 1);
    expect(result.prelevementsSociaux).toBe(0);
  });

  it('expose la liste des cases hors périmètre', () => {
    const result = calculerPrelevementsSociauxPensionsRetraitesRentes(makeInput(), 0, 1);
    expect(result.casesHorsPerimetre).toContain('case1ai');
    expect(result.casesHorsPerimetre).toContain('case1at');
    expect(result.casesHorsPerimetre).not.toContain('case1as');
  });
});

describe('calculerPrelevementsSociauxPensionsRetraitesRentes — total', () => {
  it('cumule PS pensions classiques et PS rentes viagères', () => {
    const result = calculerPrelevementsSociauxPensionsRetraitesRentes(makeInput({ case1as: 10000, case1aw: 10000 }), 40000, 1);
    expect(result.prelevementsSociaux).toBeCloseTo(
      result.prelevementsSociauxPensions + result.prelevementsSociauxRentesViageres,
      6,
    );
    expect(result.prelevementsSociaux).toBeGreaterThan(0);
  });
});
