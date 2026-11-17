import { describe, expect, it } from 'vitest';
import { calculerReductionsCreditsImpot } from './calculerReductionsCreditsImpot';
import { FoyerFiscalInput, ReductionsCreditsImpotInput } from './types';

/** Valeurs relevées sur le simulateur officiel 2026 (baisse d'impôt ou restitution). */
const foyer = (situationFamille: 'marie' | 'celibataire', enfants = 0) => ({
  situationFamille, lieuResidence: 'metropole',
  enfantsCharge: Array.from({ length: enfants }, () => ({ residenceAlternee: false })),
  personnesInvalidesCharge: [], enfantsMajeursRattaches: 0, parentIsole: false, ancienParentIsole: false,
  invaliditeDeclarant1: false, invaliditeDeclarant2: false, ancienCombattantDeclarant1: false,
  ancienCombattantDeclarant2: false, veufAncienCombattant: false, veuveDeGuerre: false,
}) as unknown as FoyerFiscalInput;
const r = (o: Partial<ReductionsCreditsImpotInput>, f = foyer('marie')) => {
  const x = calculerReductionsCreditsImpot(o as ReductionsCreditsImpotInput, f, 470890);
  return x.totalReductions + x.totalCredits;
};

describe('bas du cadre 7', () => {
  it('7WL : crédit de 40 %, 20 000 € par foyer', () => {
    expect(r({ case7wl: 1000 })).toBe(400);
    expect(r({ case7wl: 100000 })).toBe(8000);
    expect(r({ case7wl: 100000 }, foyer('celibataire'))).toBe(8000);
  });
  it('7GZ : 25 % de 1 525 € + 300 € par enfant', () => {
    expect(r({ case7gz: 1000 })).toBe(250);
    expect([0, 1, 2, 3].map(n => r({ case7gz: 100000 }, foyer('marie', n)))).toEqual([381, 456, 531, 606]);
  });
  it('7CD/7CE : 25 %, 10 000 € par personne', () => {
    expect(r({ case7cd: 1000 })).toBe(250);
    expect(r({ case7cd: 100000 })).toBe(2500);
    expect(r({ case7ce: 100000 })).toBe(2500);
    expect(r({ case7cd: 5000, case7ce: 5000 })).toBe(2500);
  });
  it('7WI : 25 %, 5 000 € / 10 000 €, sous condition de RFR 2023 ou 2024', () => {
    const seul = foyer('celibataire');
    expect(r({ case7wi: 1000, case8ys: 30000, case8yu: 30000 }, seul)).toBe(250);
    expect(r({ case7wi: 10000, case8ys: 30000 }, seul)).toBe(1250);
    expect(r({ case7wi: 10000, case8ys: 60000, case8yu: 30000 }, seul)).toBe(1250);
    expect(r({ case7wi: 10000, case8ys: 30000, case8yu: 60000 }, seul)).toBe(1250);
    expect(r({ case7wi: 10000, case8ys: 40000, case8yu: 40000 }, seul)).toBe(0);
    expect(r({ case7wi: 100000 })).toBe(0);
    expect(r({ case7wi: 20000, case8ys: 40000, case8yu: 40000 })).toBe(2500);
    expect(r({ case7wi: 20000, case8ys: 60000, case8yu: 60000 })).toBe(0);
  });
  it.each<[number, number]>([[0, 49995], [1, 56971], [2, 63947]])('seuil couple + %i enfant(s) : %i €', (n, seuil) => {
    const f = foyer('marie', n);
    expect(r({ case7wi: 20000, case8yu: seuil }, f)).toBe(2500);
    expect(r({ case7wi: 20000, case8yu: seuil + 1 }, f)).toBe(0);
  });
  it('seuil personne seule : 31 393 €', () => {
    expect(r({ case7wi: 10000, case8yu: 31393 }, foyer('celibataire'))).toBe(1250);
    expect(r({ case7wi: 10000, case8yu: 31394 }, foyer('celibataire'))).toBe(0);
  });
  it('7WI : plafond diminué des dépenses antérieures (loi, non vérifiable sur le simulateur)', () => {
    expect(r({ case7wi: 10000, case8yu: 30000, case7zz: 3000 }, foyer('celibataire'))).toBe(500);
  });
});
