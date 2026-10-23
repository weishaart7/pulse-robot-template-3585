import { describe, expect, it } from 'vitest';
import { calculerPlusValuesGainsDivers } from './calculerPlusValuesGainsDivers';
import { PlusValuesGainsDiversInput } from './types';

const VIDE: PlusValuesGainsDiversInput = {
  case3vg: null, case3sg: null, case3vh: null, case3ua: null, case3sl: null, case3va: null,
  case3vt: null, case3pi: null, case3sb: null, case3we: null,
  case3an: null, case3bn: null, case3cn: false,
  case3vz: null, case3vw: null,
};

describe('calculerPlusValuesGainsDivers', () => {
  it('PFU par défaut : 3VG taxé à 12,8 % sans abattement, PS 18,6 %, base au RFR', () => {
    const r = calculerPlusValuesGainsDivers({ ...VIDE, case3vg: 10000, case3sg: 5000 }, false);
    expect(r.totalNetImposable).toBe(0);
    expect(r.impotForfaitaire).toBeCloseTo(1280);
    expect(r.prelevementsSociaux).toBeCloseTo(1860);
    expect(r.revenuExonereRetenuPourRFR).toBe(10000);
  });

  it('option 2OP : 3VG − 3SG au barème, abattement réintégré au RFR, PS sur le brut', () => {
    const r = calculerPlusValuesGainsDivers({ ...VIDE, case3vg: 10000, case3sg: 5000 }, true);
    expect(r.totalNetImposable).toBe(5000);
    expect(r.impotForfaitaire).toBe(0);
    expect(r.revenuExonereRetenuPourRFR).toBe(5000);
    expect(r.basePrelevementsSociaux).toBe(10000);
  });

  it('abattement fixe 3VA appliqué même au PFU, 3SL seulement sur option barème', () => {
    const pfu = calculerPlusValuesGainsDivers({ ...VIDE, case3ua: 600000, case3va: 500000, case3sl: 50000 }, false);
    expect(pfu.impotForfaitaire).toBeCloseTo(100000 * 0.128);
    expect(pfu.revenuExonereRetenuPourRFR).toBe(600000);
    expect(pfu.basePrelevementsSociaux).toBe(600000);

    const bareme = calculerPlusValuesGainsDivers({ ...VIDE, case3ua: 600000, case3va: 500000, case3sl: 50000 }, true);
    expect(bareme.totalNetImposable).toBe(50000);
    expect(bareme.revenuExonereRetenuPourRFR).toBe(550000);
  });

  it('3VT suit 2OP, sans PS (prélevés à la source sur le PEA)', () => {
    const r = calculerPlusValuesGainsDivers({ ...VIDE, case3vt: 2000 }, false);
    expect(r.impotForfaitaire).toBeCloseTo(256);
    expect(r.prelevementsSociaux).toBe(0);
  });

  it('3PI : moitié imposable', () => {
    expect(calculerPlusValuesGainsDivers({ ...VIDE, case3pi: 4000 }, true).totalNetImposable).toBe(2000);
  });

  it('3AN suit 3CN, indépendamment de 2OP', () => {
    expect(calculerPlusValuesGainsDivers({ ...VIDE, case3an: 1000 }, true).impotForfaitaire).toBeCloseTo(128);
    expect(calculerPlusValuesGainsDivers({ ...VIDE, case3an: 1000, case3cn: true }, false).totalNetImposable).toBe(1000);
  });

  it('3VZ/3VW : RFR seulement ; 3VH/3BN sans effet', () => {
    const r = calculerPlusValuesGainsDivers({ ...VIDE, case3vz: 30000, case3vw: 20000, case3vh: 5000, case3bn: 800 }, false);
    expect(r.totalNetImposable).toBe(0);
    expect(r.impotForfaitaire).toBe(0);
    expect(r.prelevementsSociaux).toBe(0);
    expect(r.revenuExonereRetenuPourRFR).toBe(50000);
  });
});
