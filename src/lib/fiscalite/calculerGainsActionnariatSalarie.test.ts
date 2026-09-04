import { describe, expect, it } from 'vitest';
import { calculerGainsActionnariatSalarie } from './calculerGainsActionnariatSalarie';
import { GainsActionnariatSalarieInput } from './types';

function makeInput(overrides: Partial<GainsActionnariatSalarieInput> = {}): GainsActionnariatSalarieInput {
  return {
    case1tp: null, case1up: null,
    case1tt: null, case1ut: null,
    case1tz: null, case1uz: null, case1wz: null, case1vz: null,
    case1nx: null, case1ox: null,
    case1ny: null, case1oy: null,
    case3vd: null, case3vi: null, case3vf: null,
    case3vj: null, case3vk: null,
    case3vn: null,
    ...overrides,
  };
}

describe('calculerGainsActionnariatSalarie — cases imposables au barème', () => {
  it('foyer sans gains : net imposable nul', () => {
    expect(calculerGainsActionnariatSalarie(makeInput()).totalNetImposable).toBe(0);
  });

  it('agrège 1TP/1UP (rabais excédentaire)', () => {
    const result = calculerGainsActionnariatSalarie(makeInput({ case1tp: 1000, case1up: 2000 }));
    expect(result.totalNetImposable).toBe(3000);
  });

  it('agrège 1TT/1UT (gains post-28.9.2012)', () => {
    const result = calculerGainsActionnariatSalarie(makeInput({ case1tt: 5000, case1ut: 6000 }));
    expect(result.totalNetImposable).toBe(11000);
  });

  it('ajoute 1TZ tel quel (déjà net des abattements)', () => {
    const result = calculerGainsActionnariatSalarie(makeInput({ case1tz: 4000 }));
    expect(result.totalNetImposable).toBe(4000);
  });

  it('agrège 3VJ/3VK (option barème pré-28.9.2012)', () => {
    const result = calculerGainsActionnariatSalarie(makeInput({ case3vj: 1500, case3vk: 2500 }));
    expect(result.totalNetImposable).toBe(4000);
  });

  it('additionne toutes les cases barème simultanément', () => {
    const result = calculerGainsActionnariatSalarie(makeInput({
      case1tp: 100, case1up: 100, case1tt: 100, case1ut: 100,
      case1tz: 100, case3vj: 100, case3vk: 100,
    }));
    expect(result.totalNetImposable).toBe(700);
  });
});

describe('calculerGainsActionnariatSalarie — cases exclues du calcul', () => {
  it('ignore les montants d\'abattement 1UZ/1WZ/1VZ', () => {
    const result = calculerGainsActionnariatSalarie(makeInput({ case1tz: 4000, case1uz: 1000, case1wz: 500, case1vz: 300 }));
    expect(result.totalNetImposable).toBe(4000);
  });

  it('ignore le carried-interest (1NX/1OX/1NY/1OY)', () => {
    const result = calculerGainsActionnariatSalarie(makeInput({ case1nx: 50000, case1ox: 50000, case1ny: 20000, case1oy: 20000 }));
    expect(result.totalNetImposable).toBe(0);
  });

  it('ignore les gains à taux forfaitaire (3VD/3VI/3VF/3VN)', () => {
    const result = calculerGainsActionnariatSalarie(makeInput({ case3vd: 10000, case3vi: 10000, case3vf: 10000, case3vn: 10000 }));
    expect(result.totalNetImposable).toBe(0);
  });

  it('expose la liste des cases exclues', () => {
    const result = calculerGainsActionnariatSalarie(makeInput());
    expect(result.casesExclues).toContain('case1nx');
    expect(result.casesExclues).toContain('case3vd');
    expect(result.casesExclues).toContain('case3vn');
    expect(result.casesExclues).not.toContain('case1tz');
  });
});
