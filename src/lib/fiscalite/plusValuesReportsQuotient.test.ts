import { describe, expect, it } from 'vitest';
import { calculerPlusValuesGainsDivers, controlerSaisiePlusValues } from './calculerPlusValuesGainsDivers';
import { arrondirPrelevementsSociaux, BasesPrelevementsSociaux } from './arrondirPrelevementsSociaux';
import { PlusValuesGainsDiversInput } from './types';

/**
 * Lot 3 du cadre 3 : valeurs relevées sur le simulateur officiel 2026 (calc-2026.cgi), couple
 * 1AJ 50 000 € / 1BJ 30 000 €, sans enfant (RNI 72 000 €, impôt 7 808 €).
 */
const pv = (o: Partial<PlusValuesGainsDiversInput>, optionBareme = false) =>
  calculerPlusValuesGainsDivers({ case3cn: false, ...o } as PlusValuesGainsDiversInput, optionBareme);

const BASES_VIDES: BasesPrelevementsSociaux = {
  patrimoine: 0, csgCrdsPatrimoineSeule: 0, foncier: 0, neutralisePatrimoine: 0, neutraliseFoncier: 0,
  exonerationTotaleCsgCrds: false, exonerePatrimoine: 0, exonereFoncier: 0, activite: 0,
  contributionSalariale10: 0, contributionSalariale30: 0,
};
const ps = (r: ReturnType<typeof pv>) => arrondirPrelevementsSociaux({
  ...BASES_VIDES, patrimoine: r.basePrelevementsSociaux, foncier: r.basePrelevementsSociaux172,
  historique155: r.basePrelevementsSociaux155,
}).total;

describe('plus-values en report', () => {
  it('3WI à 24 %, 3WJ à 19 %, au RFR, PS à 15,5 %', () => {
    const wi = pv({ case3wi: 5000 });
    expect(wi.impotForfaitaire).toBe(1200);
    expect(wi.revenuExonereRetenuPourRFR).toBe(5000);
    expect(ps(wi)).toBe(775);
    expect(pv({ case3wj: 5000 }).impotForfaitaire).toBe(950);
  });
  it('PS historiques : trois lignes arrondies séparément', () => {
    expect(ps(pv({ case3wi: 3333 }))).toBe(517);
    expect(ps(pv({ case3wi: 3333, case3wj: 3333 }))).toBe(1033);
    expect(ps(pv({ case3wi: 3333, case3vg: 3333 }))).toBe(1137);
  });
  it('3WN/3XN au RFR, PS 15,5 % / 17,2 %, indépendants de 3WP', () => {
    const r = pv({ case3wn: 5000, case3xn: 5000, case3wp: 10000, case3wr: 1 });
    expect(r.revenuExonereRetenuPourRFR).toBe(10000);
    expect(ps(r)).toBe(1635);
    expect(pv({ case3wn: 5000, case3wp: 2000 }).revenuExonereRetenuPourRFR).toBe(5000);
    expect(ps(pv({ case3xn: 3333, case3wp: 1 }))).toBe(573);
  });
  it('3WR, 3WS, 3WT ajoutés tels quels à l’impôt', () => {
    expect(pv({ case3wn: 5000, case3wp: 5000, case3wr: 1000, case3ws: 500, case3wt: 200 }).impotForfaitaire).toBe(1700);
  });
});

describe('plus-values au quotient', () => {
  it('RVG au quotient, hors revenu imposable, PS 18,6 % sur le brut', () => {
    const r = pv({ caseRvg: 20000, caseNvg: 4 }, true);
    expect(r.revenuExceptionnelQuotient).toBe(20000);
    expect(r.totalNetImposable).toBe(0);
    expect(ps(r)).toBe(3720);
  });
  it('RSG et RSL retranchés du quotient et réintégrés au RFR', () => {
    const r = pv({ caseRvg: 20000, caseNvg: 4, caseRua: 20000, caseNua: 4, caseRsl: 10000 }, true);
    expect(r.revenuExceptionnelQuotient).toBe(30000);
    expect(r.revenuExonereRetenuPourRFR).toBe(10000);
    expect(pv({ caseRua: 20000, caseNua: 4, caseRsl: 20000 }, true).revenuExceptionnelQuotient).toBe(0);
  });
  it('sans option barème : aucun effet', () => {
    expect(pv({ caseRvg: 20000, caseNvg: 4 }).revenuExceptionnelQuotient).toBe(0);
  });
  it('contrôles de saisie (prérequis du simulateur)', () => {
    expect(controlerSaisiePlusValues({ caseRvg: 1, caseNvg: 2 } as PlusValuesGainsDiversInput)).toContain('NVG doit valoir 4 quand RVG est rempli');
    expect(controlerSaisiePlusValues({ case3wp: 1 } as PlusValuesGainsDiversInput)).toContain('3WP exige le montant avant abattement en 3WN, 3XN ou 3YN');
  });
});
