import { describe, expect, it } from 'vitest';
import { PRELEVEMENT_SOURCE_DIVERS_VIDE, calculerPrelevementSourceDivers } from './calculerPrelevementSourceDivers';
import { calculerRevenusFonciers2042 } from './calculerRevenusFonciers2042';
import { calculerImpot } from './calculerImpot';
import { calculerPartsFiscales } from './calculerPartsFiscales';
import { FoyerFiscalInput, PrelevementSourceDiversInput, RevenusFonciers2042Input } from './types';

/** Lot 4 : valeurs relevées sur le simulateur officiel 2026 (calc-2026.cgi). */
const COUPLE: FoyerFiscalInput = {
  situationFamille: 'marie', lieuResidence: 'metropole', enfantsCharge: [], personnesInvalidesCharge: [],
  enfantsMajeursRattaches: 0, parentIsole: false, ancienParentIsole: false, invaliditeDeclarant1: false,
  invaliditeDeclarant2: false, ancienCombattantDeclarant1: false, ancienCombattantDeclarant2: false,
  veufAncienCombattant: false, veuveDeGuerre: false,
};
const parts = calculerPartsFiscales(COUPLE);
const cadre8 = (o: Partial<PrelevementSourceDiversInput>) =>
  calculerPrelevementSourceDivers({ ...PRELEVEMENT_SOURCE_DIVERS_VIDE, ...o });
/** Impôt net avec les montants du cadre 8, branchés comme dans useFiscalOverview. */
const impot = (revenu: number, o: Partial<PrelevementSourceDiversInput>) => {
  const r = cadre8(o);
  return calculerImpot(revenu, parts, 'marie', 0, 'metropole', 0, 0, 0, 0, 0, 0,
    r.reductions, r.creditsRestituables, r.creditsNonRestituables, r.reprises).impotNet;
};

describe('crédits et réductions du cadre 8', () => {
  it('base : RNI 92 000 € → 13 808 €', () => {
    expect(impot(92000, {})).toBe(13808);
  });
  it('chaque crédit ou réduction de 1 000 € retranche 1 000 €, 8TP l’ajoute', () => {
    for (const c of ['case8tb', 'case8tc', 'case8wk', 'case8uz', 'case8cv', 'case8ts', 'case8tg', 'case8to',
      'case8wa', 'case8wc', 'case8wh', 'case8wr', 'case8wt', 'case8uy', 'case8py', 'case8pz'] as const) {
      expect(impot(92000, { [c]: 1000 })).toBe(12808);
    }
    expect(impot(92000, { case8tp: 1000 })).toBe(14808);
  });
  it('impôt nul : crédits restitués, sauf 8TC/8TG/8TO et 8PY/8PZ', () => {
    for (const c of ['case8tb', 'case8wk', 'case8uz', 'case8cv', 'case8ts', 'case8wc', 'case8wr', 'case8uy',
      'case8wa', 'case8wh', 'case8wt'] as const) {
      expect(impot(18500, { [c]: 1000 })).toBe(-1000);
    }
    for (const c of ['case8tc', 'case8tg', 'case8to', 'case8py', 'case8pz'] as const) {
      expect(impot(18500, { [c]: 1000 })).toBe(0);
    }
  });
});

describe('4BC saisi dans la 2042', () => {
  const foncier = (o: Partial<RevenusFonciers2042Input>, revenu2044: number | null = null) =>
    calculerRevenusFonciers2042(o as RevenusFonciers2042Input, revenu2044);
  it('retranché du revenu global, sans plafond (simulateur : 15 000 € → RNI 57 000 €)', () => {
    expect(foncier({ case4bc: 15000 }).deficitImputableRevenuGlobal).toBe(15000);
    expect(calculerImpot(72000 - 5000, parts, 'marie').impotNet).toBe(6308);
    expect(calculerImpot(72000 - 15000, parts, 'marie').impotNet).toBe(3718);
  });
  it('ignoré avec une 2044, qui le calcule', () => {
    const r = foncier({ case4bc: 5000 }, 1000);
    expect(r.deficitImputableRevenuGlobal).toBe(0);
    expect(r.alertes).toContain('4bc_ignore_2044');
  });
  it('sans effet sur la base des PS', () => {
    expect(foncier({ case4bc: 5000 }).prelevementsSociaux).toBe(0);
  });
});
