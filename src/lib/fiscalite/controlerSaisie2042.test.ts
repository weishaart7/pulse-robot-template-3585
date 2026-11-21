import { describe, expect, it } from 'vitest';
import { controlerSaisie2042, type Saisie2042 } from './controlerSaisie2042';
import { controlerSaisiePlusValues } from './calculerPlusValuesGainsDivers';
import type { FoyerFiscalInput, PlusValuesGainsDiversInput } from './types';

const FOYER: FoyerFiscalInput = {
  situationFamille: 'marie', lieuResidence: 'metropole', enfantsCharge: [{ anneeNaissance: 2012, invalide: false, residenceAlternee: false }],
  personnesInvalidesCharge: [], enfantsMajeursRattaches: 0, parentIsole: false, ancienParentIsole: false, invaliditeDeclarant1: false,
  invaliditeDeclarant2: false, ancienCombattantDeclarant1: false, ancienCombattantDeclarant2: false, veufAncienCombattant: false,
  veuveDeGuerre: false,
};
const controler = (saisie: Partial<Saisie2042>) => controlerSaisie2042({ foyer: FOYER, anneeRevenus: 2026, ...saisie });
const contient = (alertes: string[], code: string) => alertes.some(a => a.includes(code));

describe('controlerSaisie2042 — saisies refusées par le simulateur officiel', () => {
  it('saisie cohérente : aucune alerte', () => {
    expect(controler({
      salaires: { case1aj: 50000, case1sm: 2000 }, charges: { case6qs: 2000, case6ns: 3000, case6ps: 10000 },
      reductions: { case7ea: 1, case7wn: 10000, case7wo: 20000 }, prelevementSource: { case8vl: 100, case8pl: 1000 },
    })).toEqual([]);
  });

  it('cadre 1 : 1SM sans 6QS, 1NY > 1NX, 1AR sans 8TK', () => {
    const a = controler({ salaires: { case1sm: 2000 }, gains: { case1ny: 5000, case1nx: 1000 }, pensions: { case1ar: 6000 } });
    expect(contient(a, '1SM')).toBe(true);
    expect(contient(a, '1NY')).toBe(true);
    expect(contient(a, '1AR')).toBe(true);
  });

  it('cadres 2 à 6 : 2TT avec pertes, abattements et quotient sans 2OP, 4BY avec micro, 5HY seul, PER sans plafond', () => {
    const a = controler({
      capitauxMobiliers: { case2tt: 3000, case2tu: 1000, case2op: false }, plusValues: { case3vg: 30000, case3sg: 15000, caseRvg: 10000 },
      fonciers: { case4be: 7000, case4by: 1000 }, nonSalaries: { case5hy: 10000 }, charges: { case6nt: 3000 },
    });
    for (const code of ['2TT', '3SG', 'RVG', '4BY', '5HY', '6NT']) expect(contient(a, code)).toBe(true);
  });

  it('cadre 4 : déficit foncier 4BB/4BC incompatible avec 4BA et 4BE (refus du simulateur)', () => {
    const a = controler({ fonciers: { case4ba: 5000, case4be: 3000, case4bb: 2000, case4bc: 8000 } });
    expect(a.filter(t => t.includes('4BB, 4BC'))).toHaveLength(2);
    expect(controler({ fonciers: { case4bb: 2000, case4bc: 8000 } })).toEqual([]);
  });

  it('cadre 3 : 3VH avec 3VG ou 3VT (refus du simulateur)', () => {
    expect(controler({ plusValues: { case3vg: 20000, case3vt: 1000, case3vh: 4000 } }).filter(a => a.includes('3VH'))).toHaveLength(1);
    expect(controler({ plusValues: { case3vh: 4000 } })).toEqual([]);
  });

  it('cadre 6 : 6QR sans plafond pour les deux déclarants (refus du simulateur)', () => {
    const avec = (charges: Record<string, unknown>) => controler({ charges }).filter(a => a.includes('6QR'));
    expect(avec({ case6qr: true, case6ps: 12000 })).toHaveLength(1);
    expect(avec({ case6qr: true, case6ps: 12000, case6pt: 12000 })).toEqual([]);
  });

  it('cadre 7 : prestation compensatoire incohérente, scolarité et garde au-delà des enfants', () => {
    const a = controler({ reductions: { case7wn: 20000, case7wo: 10000, case7wm: 5000, case7ea: 1, case7ec: 1, case7eb: 1, case7ga: 3000 } });
    for (const code of ['7WN ne peut', '7WM', '7EA', '7EB', '7GA']) expect(contient(a, code)).toBe(true);
  });

  it('cadre 7 : garde admise pour un enfant de moins de 6 ans au 1er janvier', () => {
    const foyer = { ...FOYER, enfantsCharge: [{ anneeNaissance: 2021, invalide: false, residenceAlternee: false }] };
    expect(controlerSaisie2042({ foyer, anneeRevenus: 2026, reductions: { case7ga: 3000 } })).toEqual([]);
  });

  it('cadre 8 : 8VL sans 8PL, plusieurs taux de pension étrangère, crédits sans revenu professionnel, 8UY sans micro', () => {
    const a = controler({ prelevementSource: { case8vl: 300, case8tv: 1000, case8th: 1000, case8tb: 2000, case8wa: 1000, case8uy: 600 } });
    for (const code of ['8VL', '8TV', '8TB', '8WA', '8UY']) expect(contient(a, code)).toBe(true);
  });

  it('cadre 8 : crédits admis avec un revenu professionnel', () => {
    const a = controler({ nonSalaries: { case5kc: 30000, case5hc: 20000, case5ko: 10000 }, prelevementSource: { case8tb: 2000, case8wa: 1000, case8uy: 600 } });
    expect(a).toEqual([]);
  });
});

describe('controlerSaisiePlusValues — cadre 3', () => {
  const pv = (v: Partial<PlusValuesGainsDiversInput>) => controlerSaisiePlusValues(v as PlusValuesGainsDiversInput);
  it('3SL sans 3UA, 3SG sans 3VG, double imposition au quotient, moins-values à compenser', () => {
    const a = pv({ case3sl: 1000, case3sg: 1000, case3an: 3000, case3bn: 1000 });
    for (const code of ['3SL', '3SG', '3BN']) expect(a.some(m => m.includes(code))).toBe(true);
    const b = pv({ caseRvg: 5000, case3vg: 5000, case3vh: 2000 });
    for (const code of ['RVG égal', '3VH']) expect(b.some(m => m.includes(code))).toBe(true);
    expect(pv({ case3vg: 30000, case3sg: 15000 })).toEqual([]);
  });
});
