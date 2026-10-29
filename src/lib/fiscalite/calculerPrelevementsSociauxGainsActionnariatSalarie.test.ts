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

  it('compte réel (1TP=2000, 1TT=15000, 1TZ=8000, 1NX=20000, 1AY=10000, 1MP=5000) : simulateur officiel 7175 hors 1TZ/1AY, écart assumé de 18 000 × 18,6 % (brochure IR 2026)', () => {
    const result = calculerPrelevementsSociauxGainsActionnariatSalarie(makeInput({
      case1tp: 2000, case1tt: 15000, case1tz: 8000, case1nx: 20000, case1ay: 10000, case1mp: 5000,
    }));
    // CSG-CRDS 11,10 % + solidarité 7,5 % + contribution salariale 10 % sur 1NX = 2220 + 1500 + 2000
    expect(result.prelevementsSociauxCarriedInterestNonQualifiant).toBeCloseTo(2220 + 1500 + 2000, 6);
    // CSG 9,2 % + CRDS 0,5 % sur 1TT (1TP exclu) = 1380 + 75
    expect(result.prelevementsSociauxLeveeOptions).toBeCloseTo(1380 + 75, 6);
    // Total du simulateur officiel, qui n'affiche aucune ligne PS pour 1TZ/1AY.
    // Contribution salariale de 10 % sur 1TT absente du simulateur : la brochure prévaut.
    expect(result.contributionSalarialeLeveeOptions).toBeCloseTo(1500, 6);
    expect(result.prelevementsSociaux - result.prelevementsSociauxGainsRevenusPatrimoine
      - result.contributionSalarialeLeveeOptions).toBeCloseTo(7175, 6);
    // 1TZ + 1AY soumis aux PS sur les revenus du patrimoine (brochure p.111-112).
    expect(result.prelevementsSociauxGainsRevenusPatrimoine).toBeCloseTo(18000 * 0.186, 6);
    expect(result.prelevementsSociaux).toBeCloseTo(7175 + 1500 + 3348, 6);
  });

  it('1TT = 100 000 € : 19 700 € de PS, 3VN = 50 000 € en plus : 24 700 € (ClickImpôts)', () => {
    expect(calculerPrelevementsSociauxGainsActionnariatSalarie(makeInput({ case1tt: 100000 })).prelevementsSociaux)
      .toBeCloseTo(19700, 6);
    expect(calculerPrelevementsSociauxGainsActionnariatSalarie(makeInput({ case1tt: 100000, case3vn: 50000 })).prelevementsSociaux)
      .toBeCloseTo(24700, 6);
  });

  it('applique 9,7 % (CSG 9,2 % + CRDS 0,5 %) sur 1TT/1UT uniquement (1TP/1UP exclu)', () => {
    const result = calculerPrelevementsSociauxGainsActionnariatSalarie(makeInput({
      case1tp: 2000, case1up: 1000, case1tt: 15000, case1ut: 1000,
    }));
    expect(result.baseLeveeOptions).toBe(16000);
    expect(result.prelevementsSociauxLeveeOptions).toBeCloseTo(16000 * 0.097, 6);
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

  it('ignore 1TP/1MP (régime PS non modélisé)', () => {
    const result = calculerPrelevementsSociauxGainsActionnariatSalarie(makeInput({
      case1tp: 2000, case1up: 1000, case1mp: 5000, case1mq: 1000,
    }));
    expect(result.prelevementsSociaux).toBe(0);
  });

  it('soumet 1TZ aux PS sur les revenus du patrimoine (18,6 %)', () => {
    const result = calculerPrelevementsSociauxGainsActionnariatSalarie(makeInput({ case1tz: 8000 }));
    expect(result.baseGainsRevenusPatrimoine).toBe(8000);
    expect(result.prelevementsSociaux).toBeCloseTo(1488, 6);
  });

  it('assiette AGA = 1TZ + abattements 1UZ/1WZ/1VZ (gain avant abattements)', () => {
    const result = calculerPrelevementsSociauxGainsActionnariatSalarie(makeInput({
      case1tz: 4000, case1uz: 1000, case1wz: 4000, case1vz: 1000,
    }));
    expect(result.baseGainsRevenusPatrimoine).toBe(10000);
    expect(result.prelevementsSociauxGainsRevenusPatrimoine).toBeCloseTo(1860, 6);
  });

  it('soumet 1AY/1BY (BSPCE) aux PS sur les revenus du patrimoine', () => {
    const result = calculerPrelevementsSociauxGainsActionnariatSalarie(makeInput({ case1ay: 10000, case1by: 5000 }));
    expect(result.baseGainsRevenusPatrimoine).toBe(15000);
    expect(result.prelevementsSociaux).toBeCloseTo(2790, 6);
  });

  it('3VD = 30 000 € : 5 580 € de PS (18,6 %, ClickImpôts)', () => {
    const result = calculerPrelevementsSociauxGainsActionnariatSalarie(makeInput({ case3vd: 30000 }));
    expect(result.baseGainsHistoriquesTauxForfaitaire).toBe(30000);
    expect(result.prelevementsSociaux).toBeCloseTo(5580, 6);
  });

  it('cumule 3VD/3VI/3VF et ignore 3VJ/3VK (régime PS non confirmé)', () => {
    const result = calculerPrelevementsSociauxGainsActionnariatSalarie(makeInput({
      case3vd: 10000, case3vi: 10000, case3vf: 10000, case3vj: 10000, case3vk: 10000,
    }));
    expect(result.baseGainsHistoriquesTauxForfaitaire).toBe(30000);
    expect(result.prelevementsSociaux).toBeCloseTo(5580, 6);
  });

  it('ignore 0XX (système du quotient)', () => {
    const result = calculerPrelevementsSociauxGainsActionnariatSalarie(makeInput({ case0xx: 40000 }));
    expect(result.prelevementsSociaux).toBe(0);
  });

  it('expose la liste des cases hors périmètre', () => {
    const result = calculerPrelevementsSociauxGainsActionnariatSalarie(makeInput());
    expect(result.casesHorsPerimetre).toContain('case1tp');
    expect(result.casesHorsPerimetre).toContain('case1mp');
    expect(result.casesHorsPerimetre).toContain('case3vj');
    expect(result.casesHorsPerimetre).not.toContain('case3vd');
    expect(result.casesHorsPerimetre).not.toContain('case1tz');
    expect(result.casesHorsPerimetre).not.toContain('case1uz');
    expect(result.casesHorsPerimetre).not.toContain('case1ay');
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
        + result.contributionSalarialeLeveeOptions
        + result.prelevementsSociauxCarriedInterestNonQualifiant
        + result.contributionSalariale1NY
        + result.contributionSalariale3VN,
      6,
    );
    expect(result.prelevementsSociaux).toBeGreaterThan(0);
  });
});
