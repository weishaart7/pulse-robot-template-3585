import { describe, expect, it } from 'vitest';
import { basesGainsSalariaux, calculerGainsActionnariatSalarie } from './calculerGainsActionnariatSalarie';
import { GainsActionnariatSalarieInput } from './types';

function makeInput(overrides: Partial<GainsActionnariatSalarieInput> = {}): GainsActionnariatSalarieInput {
  return {
    case1tp: null, case1up: null,
    case1tt: null, case1ut: null,
    case1tz: null, case1uz: null, case1wz: null, case1vz: null,
    case1nx: null, case1ox: null,
    case1ny: null, case1oy: null,
    case1ay: null, case1by: null,
    case1mp: null, case1mq: null,
    case3vd: null, case3vi: null, case3vf: null,
    case3vj: null, case3vk: null,
    case3vn: null,
    case0xx: null,
    ...overrides,
  };
}

describe('basesGainsSalariaux — gains rejoignant le pool salaires', () => {
  it('foyer sans gains : bases nulles', () => {
    expect(basesGainsSalariaux(makeInput())).toEqual({ declarant1: 0, declarant2: 0 });
  });

  it('agrège 1TP/1TT/1NX/1AY/1MP/3VJ (déclarant 1) et leurs symétriques (déclarant 2), en brut', () => {
    const bases = basesGainsSalariaux(makeInput({
      case1tp: 100, case1tt: 200, case1nx: 300, case1ay: 400, case1mp: 500, case3vj: 600,
      case1up: 1, case1ut: 2, case1ox: 3, case1by: 4, case1mq: 5, case3vk: 6,
    }));
    expect(bases).toEqual({ declarant1: 2100, declarant2: 21 });
  });

  it('exclut 1TZ (pas de déduction 10 %/frais réels, BOFiP BOI-RSA-ES-20-20-20 §43)', () => {
    expect(basesGainsSalariaux(makeInput({ case1tz: 4000 }))).toEqual({ declarant1: 0, declarant2: 0 });
  });
});

describe('calculerGainsActionnariatSalarie — net imposable au barème', () => {
  it('foyer sans gains : net imposable nul', () => {
    expect(calculerGainsActionnariatSalarie(makeInput(), 0).totalNetImposable).toBe(0);
  });

  it('reprend la part nette arbitrée dans le pool salaires', () => {
    expect(calculerGainsActionnariatSalarie(makeInput({ case1tt: 5000 }), 4500).totalNetImposable).toBe(4500);
  });

  it('ajoute 1TZ tel quel (déjà net des abattements, sans 10 %)', () => {
    expect(calculerGainsActionnariatSalarie(makeInput({ case1tz: 4000 }), 0).totalNetImposable).toBe(4000);
  });

  it('additionne part nette du pool et 1TZ', () => {
    expect(calculerGainsActionnariatSalarie(makeInput({ case1tt: 1000, case1tz: 100 }), 900).totalNetImposable).toBe(1000);
  });
});

describe('calculerGainsActionnariatSalarie — cases exclues du calcul', () => {
  it('ignore les montants d\'abattement 1UZ/1WZ/1VZ', () => {
    const result = calculerGainsActionnariatSalarie(makeInput({ case1tz: 4000, case1uz: 1000, case1wz: 500, case1vz: 300 }), 0);
    expect(result.totalNetImposable).toBe(4000);
  });

  it('ignore la contribution salariale du carried-interest (1NY/1OY) dans le net imposable au barème', () => {
    const result = calculerGainsActionnariatSalarie(makeInput({ case1ny: 20000, case1oy: 20000 }), 0);
    expect(result.totalNetImposable).toBe(0);
  });

  it('ignore les gains à taux forfaitaire (3VD/3VI/3VF) et leur contribution salariale (3VN) dans le net imposable au barème', () => {
    const result = calculerGainsActionnariatSalarie(makeInput({ case3vd: 10000, case3vi: 10000, case3vf: 10000, case3vn: 10000 }), 0);
    expect(result.totalNetImposable).toBe(0);
  });

  it('ignore 0XX (système du quotient) dans le net imposable au barème', () => {
    const result = calculerGainsActionnariatSalarie(makeInput({ case0xx: 40000 }), 0);
    expect(result.totalNetImposable).toBe(0);
  });

  it('expose 0XX comme revenuExceptionnelQuotient', () => {
    const result = calculerGainsActionnariatSalarie(makeInput({ case0xx: 40000 }), 0);
    expect(result.revenuExceptionnelQuotient).toBe(40000);
  });

  it('revenuExceptionnelQuotient nul par défaut', () => {
    expect(calculerGainsActionnariatSalarie(makeInput(), 0).revenuExceptionnelQuotient).toBe(0);
  });

  it('expose la liste des cases exclues', () => {
    const result = calculerGainsActionnariatSalarie(makeInput(), 0);
    expect(result.casesExclues).toContain('case1ny');
    expect(result.casesExclues).toContain('case3vn');
    expect(result.casesExclues).toContain('case0xx');
    expect(result.casesExclues).not.toContain('case1tz');
    expect(result.casesExclues).not.toContain('case1nx');
    expect(result.casesExclues).not.toContain('case3vd');
  });
});

describe('calculerGainsActionnariatSalarie — impôt à taux forfaitaire', () => {
  it('foyer sans gains forfaitaires : impôt forfaitaire nul', () => {
    expect(calculerGainsActionnariatSalarie(makeInput(), 0).impotForfaitaire).toBe(0);
  });

  it('3VD taxé à 18 %', () => {
    const result = calculerGainsActionnariatSalarie(makeInput({ case3vd: 10000 }), 0);
    expect(result.impotForfaitaire).toBeCloseTo(1800, 6);
  });

  it('3VI taxé à 30 %', () => {
    const result = calculerGainsActionnariatSalarie(makeInput({ case3vi: 10000 }), 0);
    expect(result.impotForfaitaire).toBeCloseTo(3000, 6);
  });

  it('3VF taxé à 41 %', () => {
    const result = calculerGainsActionnariatSalarie(makeInput({ case3vf: 10000 }), 0);
    expect(result.impotForfaitaire).toBeCloseTo(4100, 6);
  });

  it('cumule les trois taux historiques', () => {
    const result = calculerGainsActionnariatSalarie(makeInput({
      case3vd: 10000, case3vi: 10000, case3vf: 10000,
    }), 0);
    expect(result.impotForfaitaire).toBeCloseTo(1800 + 3000 + 4100, 6);
  });

  it('1NY/1OY (contribution salariale carried-interest) et 3VN (contribution salariale 10 %) n\'affectent pas l\'impôt forfaitaire', () => {
    const result = calculerGainsActionnariatSalarie(makeInput({ case1ny: 50000, case1oy: 50000, case3vn: 50000 }), 0);
    expect(result.impotForfaitaire).toBe(0);
  });

  it('3VD/3VI/3VF (taux forfaitaire) n\'affectent pas le net imposable au barème', () => {
    const result = calculerGainsActionnariatSalarie(makeInput({ case3vd: 10000, case1tz: 500 }), 0);
    expect(result.totalNetImposable).toBe(500);
  });
});
