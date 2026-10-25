import { describe, expect, it } from 'vitest';
import { calculerPlusValuesGainsDivers, controlerSaisiePlusValues } from './calculerPlusValuesGainsDivers';
import { PlusValuesGainsDiversInput } from './types';

const VIDE: PlusValuesGainsDiversInput = {
  case3vg: null, case3sg: null, case3vh: null, case3ua: null, case3sl: null, case3va: null,
  case3vt: null, case3pi: null, case3sb: null, case3sz: null, case3we: null,
  case3an: null, case3bn: null, case3cn: false,
  case3vz: null, case3vw: null,
  case3sj: null, case3tj: null, case3tk: null, case3sk: null, case3tl: null, case3tm: null, case3pc: null, case3pe: null,
  case3vq: null, case3vr: null, case3vc: null, case3ex: null,
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

  it('3PI : taxé à 50 % quelle que soit 2OP, au RFR, hors PS', () => {
    for (const option of [false, true]) {
      const r = calculerPlusValuesGainsDivers({ ...VIDE, case3pi: 4000 }, option);
      expect(r.totalNetImposable).toBe(0);
      expect(r.impotForfaitaire).toBeCloseTo(2000);
      expect(r.revenuExonereRetenuPourRFR).toBe(4000);
      expect(r.prelevementsSociaux).toBe(0);
    }
  });

  it('3AN suit 3CN, indépendamment de 2OP', () => {
    expect(calculerPlusValuesGainsDivers({ ...VIDE, case3an: 1000 }, true).impotForfaitaire).toBeCloseTo(128);
    expect(calculerPlusValuesGainsDivers({ ...VIDE, case3an: 1000, case3cn: true }, false).totalNetImposable).toBe(1000);
  });

  it('3VZ au RFR, 3VW hors RFR ; 3VH/3BN sans effet', () => {
    const r = calculerPlusValuesGainsDivers({ ...VIDE, case3vz: 30000, case3vw: 20000, case3vh: 5000, case3bn: 800 }, false);
    expect(r.totalNetImposable).toBe(0);
    expect(r.impotForfaitaire).toBe(0);
    expect(r.prelevementsSociaux).toBe(0);
    expect(r.revenuExonereRetenuPourRFR).toBe(30000);
  });

  it('BSPCE ≥ 3 ans : 3TJ − 3TK, 3TL − 3TM et 3PC à 12,8 %, 3SJ à 19 % ; abattements fixes au RFR ; PS sur le brut', () => {
    const r = calculerPlusValuesGainsDivers({ ...VIDE, case3sj: 1000, case3tj: 3000, case3tk: 1000, case3tl: 2000, case3tm: 500, case3pc: 1500 }, false);
    expect(r.impotForfaitaire).toBeCloseTo(5000 * 0.128 + 1000 * 0.19);
    expect(r.revenuExonereRetenuPourRFR).toBe(6000 + 1500);
    expect(r.basePrelevementsSociaux).toBe(7500);
  });

  it('option 2OP : 3TJ − 3TK au barème, mais 3SJ (19 %) et 3PC (12,8 %) restent à taux fixe', () => {
    const r = calculerPlusValuesGainsDivers({ ...VIDE, case3tj: 2000, case3tk: 500, case3sj: 1000, case3pc: 500 }, true);
    expect(r.totalNetImposable).toBe(1500);
    expect(r.impotForfaitaire).toBeCloseTo(1000 * 0.19 + 500 * 0.128);
    expect(r.revenuExonereRetenuPourRFR).toBe(500 + 1000 + 500);
  });

  it('BSPCE < 3 ans (3SK, 3PE) : 30 % même sur option 2OP, au RFR et aux PS', () => {
    const r = calculerPlusValuesGainsDivers({ ...VIDE, case3sk: 1000, case3pe: 1000 }, true);
    expect(r.totalNetImposable).toBe(0);
    expect(r.impotForfaitaire).toBeCloseTo(600);
    expect(r.revenuExonereRetenuPourRFR).toBe(2000);
    expect(r.prelevementsSociaux).toBeCloseTo(2000 * 0.186);
  });

  it('3VQ, 3VC et 3EX au RFR ; 3VQ seul soumis aux PS (3VC déjà prélevé à la source) ; 3VR déduit des deux', () => {
    const r = calculerPlusValuesGainsDivers({ ...VIDE, case3vq: 4000, case3vc: 1000, case3vr: 700, case3ex: 300 }, false);
    expect(r.impotForfaitaire).toBe(0);
    expect(r.revenuExonereRetenuPourRFR).toBe(4600);
    expect(r.basePrelevementsSociaux).toBe(3300);
  });

  it('3SB et 3SZ suivent 2OP comme 3VG, au RFR et aux PS', () => {
    const pfu = calculerPlusValuesGainsDivers({ ...VIDE, case3sb: 1000, case3sz: 500 }, false);
    expect(pfu.totalNetImposable).toBe(0);
    expect(pfu.impotForfaitaire).toBeCloseTo(1500 * 0.128);
    expect(pfu.revenuExonereRetenuPourRFR).toBe(1500);
    expect(pfu.basePrelevementsSociaux).toBe(1500);

    const bareme = calculerPlusValuesGainsDivers({ ...VIDE, case3sb: 1000, case3sz: 500 }, true);
    expect(bareme.totalNetImposable).toBe(1500);
    expect(bareme.impotForfaitaire).toBe(0);
    expect(bareme.revenuExonereRetenuPourRFR).toBe(0);
  });

  it('3VR ne rend ni la base des PS ni le RFR négatifs', () => {
    const r = calculerPlusValuesGainsDivers({ ...VIDE, case3vg: 500, case3vr: 2000 }, false);
    expect(r.basePrelevementsSociaux).toBe(0);
    expect(r.revenuExonereRetenuPourRFR).toBe(0);
  });
});

describe('controlerSaisiePlusValues', () => {
  it('aucune alerte sur une saisie cohérente', () => {
    expect(controlerSaisiePlusValues({ ...VIDE, case3ua: 600000, case3va: 500000 })).toEqual([]);
  });

  it('non-cumul 3VA / 3SL', () => {
    expect(controlerSaisiePlusValues({ ...VIDE, case3ua: 100000, case3va: 50000, case3sl: 10000 })).toHaveLength(1);
  });

  it('3VA supérieur à 3UA', () => {
    expect(controlerSaisiePlusValues({ ...VIDE, case3ua: 1000, case3va: 2000 })).toHaveLength(1);
  });

  it('plafond 500 000 € sur 3VA + 3TK + 3TM', () => {
    expect(controlerSaisiePlusValues({ ...VIDE, case3ua: 400000, case3va: 400000, case3tk: 150000 })).toHaveLength(1);
  });
});
