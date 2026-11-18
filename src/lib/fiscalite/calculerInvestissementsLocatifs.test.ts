import { describe, expect, it } from 'vitest';
import { calculerInvestissementsLocatifs } from './calculerInvestissementsLocatifs';
import { calculerReductionsCreditsImpot } from './calculerReductionsCreditsImpot';
import { FoyerFiscalInput, ReductionsCreditsImpotInput } from './types';

/** Valeurs relevées sur le simulateur officiel 2026 (couple, RNI 470 890 €). */
const RNI = 470890;
const FOYER = {
  situationFamille: 'marie', lieuResidence: 'metropole', enfantsCharge: [], personnesInvalidesCharge: [],
  enfantsMajeursRattaches: 0, parentIsole: false, ancienParentIsole: false, invaliditeDeclarant1: false,
  invaliditeDeclarant2: false, ancienCombattantDeclarant1: false, ancienCombattantDeclarant2: false,
  veufAncienCombattant: false, veuveDeGuerre: false,
} as FoyerFiscalInput;
const loc = (o: Partial<ReductionsCreditsImpotInput>) => calculerInvestissementsLocatifs(o as ReductionsCreditsImpotInput);
const cadre7 = (o: Partial<ReductionsCreditsImpotInput>, rni = RNI) => {
  const r = calculerReductionsCreditsImpot(o as ReductionsCreditsImpotInput, FOYER, rni,
    { declarant1: 0, declarant2: 0, personnesCharge: 30000 });
  return r.totalReductions + r.totalCredits;
};

describe('haut du cadre 7 : dons, 7AG, 7WP', () => {
  it.each<[Partial<ReductionsCreditsImpotInput>, number]>([
    [{ case7uo: 1000 }, 750], [{ case7va: 1000 }, 750], [{ case7vm: 1000 }, 750], [{ case7vc: 1000 }, 660],
    [{ case7xs: 1000 }, 660], [{ case7xt: 1000 }, 660], [{ case7xu: 1000 }, 660], [{ case7xw: 1000 }, 660],
    [{ case7xy: 1000 }, 660],
    [{ case7uo: 100000 }, 63657], [{ case7vm: 100000 }, 63657], [{ case7va: 100000 }, 62907],
    [{ case7xs: 100000 }, 62157], [{ case7xs: 50000, case7uf: 50000 }, 62157], [{ case7vc: 50000, case7uf: 50000 }, 62157],
    [{ case7va: 1000, case7ud: 1000 }, 1410], [{ case7vm: 2000, case7uq: 2000 }, 2820], [{ case7uo: 2000, case7uq: 2000 }, 3000],
    [{ case7ag: 100 }, 66], [{ case7ag: 1000 }, 198],
    [{ case7wp: 1000 }, 250], [{ case7wp: 30500 }, 7625],
  ])('%o → %i €', (o, attendu) => {
    expect(cadre7(o)).toBe(attendu);
  });
  it('seul : 20 % du RNI de 285 445 €', () => {
    expect(cadre7({ case7xs: 100000 }, 285445)).toBe(37679);
  });
});

describe('calculerInvestissementsLocatifs', () => {
  it('bornes : crédit de 75 %, 500 € par système', () => {
    expect(loc({ case7zq: 1000 }).credits).toBe(500);
    expect(loc({ case7zq: 400 }).credits).toBe(300);
    expect(loc({ case7zq: 1000, case7zr: 1000, case7zs: 1000, case7zt: 1000 }).credits).toBe(2000);
    expect(loc({ case7zq: 1000 }).avantagesPlafonnesCourants).toBe(500);
  });
  it('Loc’Avantages : taux du montant saisi, compté au plafonnement global', () => {
    expect([loc({ case7bk: 1000 }), loc({ case7bl: 1000 }), loc({ case7bm: 1000 }), loc({ case7bn: 1000 }), loc({ case7bo: 1000 })]
      .map(r => r.reductions)).toEqual([150, 200, 350, 400, 650]);
    expect(loc({ case7bo: 10000, case7bk: 10000 }).avantagesPlafonnesCourants).toBe(8000);
  });
  it('7WR : crédit de 40 % sans plafond, hors plafonnement global', () => {
    expect(loc({ case7wr: 200000 })).toEqual({ reductions: 0, credits: 80000, creditBornes: 0, avantagesPlafonnesCourants: 0 });
  });
  it('Malraux : 400 000 € en commun, 7TX d’abord ; reports', () => {
    expect(loc({ case7tx: 1000 }).reductions).toBe(300);
    expect(loc({ case7ty: 1000 }).reductions).toBe(220);
    expect(loc({ case7tx: 500000 }).reductions).toBe(120000);
    expect(loc({ case7tx: 300000, case7ty: 300000 }).reductions).toBe(112000);
    expect(loc({ case7kw: 1000, case7ky: 1000, case7kx: 1000 })).toEqual({ reductions: 3000, credits: 0, creditBornes: 0, avantagesPlafonnesCourants: 0 });
  });
});
