import { describe, expect, it } from 'vitest';
import { calculerPrelevementsSociauxGainsActionnariatSalarie } from './calculerPrelevementsSociauxGainsActionnariatSalarie';
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

describe('calculerPrelevementsSociauxGainsActionnariatSalarie', () => {
  it('foyer sans gains : PS nuls', () => {
    const result = calculerPrelevementsSociauxGainsActionnariatSalarie(makeInput());
    expect(result.prelevementsSociaux).toBe(0);
  });

  it('reproduit à l\'euro près le détail du calcul du simulateur officiel sur le compte réel (1NX=20000, 1TT=15000)', () => {
    const result = calculerPrelevementsSociauxGainsActionnariatSalarie(makeInput({ case1nx: 20000, case1tt: 15000 }));
    // CSG-CRDS 11,10 % + solidarité 7,5 % + contribution salariale 10 % sur 1NX = 2220 + 1500 + 2000
    expect(result.prelevementsSociauxCarriedInterestNonQualifiant).toBeCloseTo(2220 + 1500 + 2000, 6);
    // CSG 9,2 % + CRDS 0,5 % sur 1TT = 1380 + 75
    expect(result.prelevementsSociauxLeveeOptions).toBeCloseTo(1380 + 75, 6);
  });

  it('applique 9,7 % (CSG 9,2 % + CRDS 0,5 %) sur 1TP/1UP + 1TT/1UT', () => {
    const result = calculerPrelevementsSociauxGainsActionnariatSalarie(makeInput({
      case1tp: 2000, case1up: 1000, case1tt: 15000, case1ut: 1000,
    }));
    expect(result.baseLeveeOptions).toBe(19000);
    expect(result.prelevementsSociauxLeveeOptions).toBeCloseTo(19000 * 0.097, 6);
  });

  it('applique 28,6 % (11,10 % + 7,5 % + 10 %) sur 1NX/1OX', () => {
    const result = calculerPrelevementsSociauxGainsActionnariatSalarie(makeInput({ case1nx: 10000, case1ox: 5000 }));
    expect(result.baseCarriedInterestNonQualifiant).toBe(15000);
    expect(result.prelevementsSociauxCarriedInterestNonQualifiant).toBeCloseTo(15000 * 0.286, 6);
  });

  it('applique 30 % sur 1NY/1OY (contribution salariale carried-interest)', () => {
    const result = calculerPrelevementsSociauxGainsActionnariatSalarie(makeInput({ case1ny: 10000, case1oy: 5000 }));
    expect(result.baseCarriedInterest1NY).toBe(15000);
    expect(result.contributionSalariale1NY).toBeCloseTo(15000 * 0.30, 6);
  });

  it('applique 10 % sur 3VN (contribution salariale options/AGA)', () => {
    const result = calculerPrelevementsSociauxGainsActionnariatSalarie(makeInput({ case3vn: 10000 }));
    expect(result.base3VN).toBe(10000);
    expect(result.contributionSalariale3VN).toBeCloseTo(1000, 6);
  });

  it('ignore 1TZ/1AY/1MP (déjà prélevés hors du calcul de l\'IR, confirmé empiriquement)', () => {
    const result = calculerPrelevementsSociauxGainsActionnariatSalarie(makeInput({
      case1tz: 8000, case1ay: 10000, case1mp: 5000,
    }));
    expect(result.prelevementsSociaux).toBe(0);
  });

  it('ignore les gains historiques 3VD/3VI/3VF/3VJ/3VK (régime PS non confirmé)', () => {
    const result = calculerPrelevementsSociauxGainsActionnariatSalarie(makeInput({
      case3vd: 10000, case3vi: 10000, case3vf: 10000, case3vj: 10000, case3vk: 10000,
    }));
    expect(result.prelevementsSociaux).toBe(0);
  });

  it('ignore 0XX (système du quotient)', () => {
    const result = calculerPrelevementsSociauxGainsActionnariatSalarie(makeInput({ case0xx: 40000 }));
    expect(result.prelevementsSociaux).toBe(0);
  });

  it('expose la liste des cases hors périmètre', () => {
    const result = calculerPrelevementsSociauxGainsActionnariatSalarie(makeInput());
    expect(result.casesHorsPerimetre).toContain('case1tz');
    expect(result.casesHorsPerimetre).toContain('case1ay');
    expect(result.casesHorsPerimetre).toContain('case1mp');
    expect(result.casesHorsPerimetre).not.toContain('case1tt');
    expect(result.casesHorsPerimetre).not.toContain('case1nx');
    expect(result.casesHorsPerimetre).not.toContain('case1ny');
    expect(result.casesHorsPerimetre).not.toContain('case3vn');
  });

  it('cumule les 4 mécanismes simultanément', () => {
    const result = calculerPrelevementsSociauxGainsActionnariatSalarie(makeInput({
      case1tt: 15000, case1nx: 20000, case1ny: 10000, case3vn: 10000,
    }));
    expect(result.prelevementsSociaux).toBeCloseTo(
      result.prelevementsSociauxLeveeOptions
        + result.prelevementsSociauxCarriedInterestNonQualifiant
        + result.contributionSalariale1NY
        + result.contributionSalariale3VN,
      6,
    );
    expect(result.prelevementsSociaux).toBeGreaterThan(0);
  });
});
