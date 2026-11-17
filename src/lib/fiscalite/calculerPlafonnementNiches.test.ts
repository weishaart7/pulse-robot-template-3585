import { describe, expect, it } from 'vitest';
import { calculerPlafonnementNiches } from './calculerPlafonnementNiches';
import { calculerReductionsCreditsImpot } from './calculerReductionsCreditsImpot';
import { calculerImpot } from './calculerImpot';
import { calculerPartsFiscales } from './calculerPartsFiscales';
import { FoyerFiscalInput, ReductionsCreditsImpotInput } from './types';

/** Valeurs relevées sur le simulateur officiel 2026 (calc-2026.cgi). */
describe('calculerPlafonnementNiches', () => {
  it('10 000 € pour les avantages courants', () => {
    expect(calculerPlafonnementNiches({ courants: 11750, esus: 0, outreMer: 0 }).excedent).toBe(1750);
  });
  it('13 000 € avec ESUS', () => {
    expect(calculerPlafonnementNiches({ courants: 0, esus: 25000, outreMer: 0 }).excedent).toBe(12000);
    expect(calculerPlafonnementNiches({ courants: 10000, esus: 10000, outreMer: 0 }).excedent).toBe(7000);
    expect(calculerPlafonnementNiches({ courants: 6000, esus: 5000, outreMer: 0 }).excedent).toBe(0);
  });
  it('18 000 € avec l’outre-mer, 21 000 € avec ESUS et outre-mer', () => {
    expect(calculerPlafonnementNiches({ courants: 10000, esus: 0, outreMer: 10000 }).excedent).toBe(2000);
    // HGS 30 000 € retenu à 44 % : 10 000 + 13 200 − 18 000 = 5 200 (baisse simulateur 34 800 €).
    expect(calculerPlafonnementNiches({ courants: 10000, esus: 0, outreMer: 30000 * 0.44 }).excedent).toBe(5200);
    expect(calculerPlafonnementNiches({ courants: 0, esus: 10000, outreMer: 20000 }).excedent).toBe(9000);
  });
});

describe('plafonnement branché sur le cadre 7', () => {
  const FOYER: FoyerFiscalInput = {
    situationFamille: 'marie', lieuResidence: 'metropole',
    enfantsCharge: [{ residenceAlternee: false } as FoyerFiscalInput['enfantsCharge'][number], { residenceAlternee: false } as FoyerFiscalInput['enfantsCharge'][number]],
    personnesInvalidesCharge: [], enfantsMajeursRattaches: 0, parentIsole: false, ancienParentIsole: false,
    invaliditeDeclarant1: false, invaliditeDeclarant2: false, ancienCombattantDeclarant1: false,
    ancienCombattantDeclarant2: false, veufAncienCombattant: false, veuveDeGuerre: false,
  };
  const VIDE = {
    case7ud: null, case7uq: null, case7uj: null, case7uf: null, case7db: null, case7dr: null, case7dl: null,
    case7dq: false, case7dg: false, membresPlus65Ans: null,
  } as ReductionsCreditsImpotInput;
  const parts = calculerPartsFiscales(FOYER);
  const impotNet = (revenu: number, o: Partial<ReductionsCreditsImpotInput>) => {
    const r = calculerReductionsCreditsImpot({ ...VIDE, ...o }, FOYER, revenu);
    const p = calculerPlafonnementNiches({ courants: r.avantagesPlafonnesCourants, esus: 0, outreMer: 0 });
    return calculerImpot(revenu, parts, 'marie', 0, 'metropole', 0, 0, 0, 0, 0, 0,
      r.totalReductions, r.totalCredits, 0, p.excedent).impotNet;
  };
  const base = impotNet(450000, {});
  it('7DB 10 000 € + 7GA 1 750 € → baisse de 10 000 €', () => {
    expect(base - impotNet(450000, { case7db: 20000, case7dg: true, case7ga: 3500 })).toBe(10000);
  });
  it('foyer non imposable : remboursement limité à 10 000 €', () => {
    expect(impotNet(13500, { case7db: 20000, case7dg: true, case7ga: 3500 })).toBe(-10000);
  });
  it('dons et cotisations syndicales hors plafond', () => {
    expect(base - impotNet(450000, { case7db: 20000, case7dg: true, case7uh: 15000 })).toBe(10000 + 9900);
  });
});
