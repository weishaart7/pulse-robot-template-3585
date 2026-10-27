import { describe, expect, it } from 'vitest';
import { PRELEVEMENT_SOURCE_DIVERS_VIDE, calculerPrelevementSourceDivers, calculerSoldeImpot, creditImpotEgalImpotEtranger } from './calculerPrelevementSourceDivers';
import { calculerImpot } from './calculerImpot';
import { calculerPartsFiscales } from './calculerPartsFiscales';
import { FoyerFiscalInput, PrelevementSourceDiversInput } from './types';

const VIDE: PrelevementSourceDiversInput = PRELEVEMENT_SOURCE_DIVERS_VIDE;

const FOYER: FoyerFiscalInput = {
  situationFamille: 'celibataire', lieuResidence: 'metropole', enfantsCharge: [], personnesInvalidesCharge: [],
  enfantsMajeursRattaches: 0, parentIsole: false, ancienParentIsole: false, invaliditeDeclarant1: false,
  invaliditeDeclarant2: false, ancienCombattantDeclarant1: false, ancienCombattantDeclarant2: false,
  veufAncienCombattant: false, veuveDeGuerre: false,
};

describe('calculerPrelevementSourceDivers', () => {
  it('solde : impôt net moins PAS versé, plus remboursements et avance 8EA', () => {
    const r = calculerPrelevementSourceDivers({ ...VIDE, case8hv: 3000, case8iv: 1000, case8hw: 500, case8hy: 200, case8ea: 300, case8hx: 400, case8hz: 50 });
    expect(r.impotDejaPaye).toBe(4300);
    expect(calculerSoldeImpot(r, 5000, 600)).toEqual({ soldeImpot: 1000, soldePrelevementsSociaux: 250 });
  });

  it('8TI au taux effectif, 8TK isolé (déjà dans sa catégorie), 8TF en reprise', () => {
    const r = calculerPrelevementSourceDivers({ ...VIDE, case8ti: 1000, case8tk: 2000, case8tf: 150 });
    expect(r.revenuTauxEffectif).toBe(1000);
    expect(r.revenuCreditImpotEgalImpotFrancais).toBe(2000);
    expect(r.reprises).toBe(150);
  });

  it('exonération de CSG-CRDS : 9,7 % sur 8RF, 11,1 % sur les autres', () => {
    expect(calculerPrelevementSourceDivers({ ...VIDE, case8rf: 1000, case8rc: 1000 }).reductionPrelevementsSociaux).toBe(208);
  });

  it('crédit égal à l\'impôt étranger : moindre de l\'impôt étranger et de l\'impôt français correspondant', () => {
    expect(creditImpotEgalImpotEtranger({ ...VIDE, case8pl: 10000, case8vl: 3000 }, 5000, 50000)).toBe(1000);
    expect(creditImpotEgalImpotEtranger({ ...VIDE, case8pm: 10000, case8vm: 400, case8wm: 100 }, 5000, 50000)).toBe(500);
    expect(creditImpotEgalImpotEtranger({ ...VIDE, case8pl: 10000, case8vl: 3000 }, 0, 50000)).toBe(0);
  });
});

describe('contributions sociales sur revenus étrangers (phase 8.2)', () => {
  it('CSG au taux de la case, CRDS 0,5 %, CASA 0,3 % sur pensions à 8,3 % et 6,6 %', () => {
    expect(calculerPrelevementSourceDivers({ ...VIDE, case8tr: 10000 }).contributionsSocialesRevenusActivite).toBe(970);
    expect(calculerPrelevementSourceDivers({ ...VIDE, case8tv: 10000 }).contributionsSocialesRevenusActivite).toBe(910);
    expect(calculerPrelevementSourceDivers({ ...VIDE, case8th: 10000 }).contributionsSocialesRevenusActivite).toBe(740);
    expect(calculerPrelevementSourceDivers({ ...VIDE, case8tx: 10000, case8sx: 10000 }).contributionsSocialesRevenusActivite).toBe(860);
    expect(calculerPrelevementSourceDivers({ ...VIDE, case8sw: 10000 }).contributionsSocialesRevenusActivite).toBe(670);
  });
});

describe('calculerImpot — cadre 8', () => {
  const parts = calculerPartsFiscales(FOYER);
  it('crédit étranger non restituable, reprise ajoutée', () => {
    const sans = calculerImpot(40000, parts, 'celibataire');
    const avec = calculerImpot(40000, parts, 'celibataire', 0, 'metropole', 0, 0, 0, 0, 0, 0, 0, 0, sans.impotApresDecote + 500, 100);
    expect(avec.creditImpotEtrangerCadre8).toBe(sans.impotApresDecote);
    expect(avec.impotNet).toBe(100);
  });
});
