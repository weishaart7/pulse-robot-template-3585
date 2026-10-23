import { describe, expect, it } from 'vitest';
import { calculerReductionsCreditsImpot } from './calculerReductionsCreditsImpot';
import { calculerImpot } from './calculerImpot';
import { calculerPartsFiscales } from './calculerPartsFiscales';
import { FoyerFiscalInput, ReductionsCreditsImpotInput } from './types';

const VIDE: ReductionsCreditsImpotInput = {
  case7ud: null, case7uq: null, case7uj: null, case7uf: null,
  case7db: null, case7dr: null, case7dl: null, case7dq: false, case7dg: false, membresPlus65Ans: null,
};

const FOYER: FoyerFiscalInput = {
  situationFamille: 'celibataire', lieuResidence: 'metropole', enfantsCharge: [], personnesInvalidesCharge: [],
  enfantsMajeursRattaches: 0, parentIsole: false, ancienParentIsole: false, invaliditeDeclarant1: false,
  invaliditeDeclarant2: false, ancienCombattantDeclarant1: false, ancienCombattantDeclarant2: false,
  veufAncienCombattant: false, veuveDeGuerre: false,
};

describe('calculerReductionsCreditsImpot', () => {
  it('dons à 75 % plafonnés, excédent basculé à 66 %', () => {
    const r = calculerReductionsCreditsImpot({ ...VIDE, case7ud: 1500, case7uq: 1000, case7uf: 500 }, FOYER, 50000);
    // 75 % sur 1 000 + 1 000 ; 66 % sur 500 (7UD au-delà de 1 000) + 500 (7UF)
    expect(r.reductionDons75).toBe(1500);
    expect(r.reductionDons66).toBe(660);
  });

  it('dons à 66 % limités à 20 % du revenu imposable, excédent reportable', () => {
    const r = calculerReductionsCreditsImpot({ ...VIDE, case7uf: 5000 }, FOYER, 20000);
    expect(r.reductionDons66).toBe(2640);
    expect(r.donsExcedentaires).toBe(1000);
  });

  it('services à la personne : 50 % net des aides, plafond majoré par enfant', () => {
    const foyer = { ...FOYER, enfantsCharge: [{ anneeNaissance: 2015, invalide: false, residenceAlternee: false }, { anneeNaissance: 2018, invalide: false, residenceAlternee: true }] };
    const r = calculerReductionsCreditsImpot({ ...VIDE, case7db: 20000, case7dr: 2000 }, foyer, 50000);
    expect(r.plafondServicesPersonne).toBe(14250);
    expect(r.creditServicesPersonne).toBe(7125);
  });

  it('plafond 15 000 € maximum, 18 000 € la 1re année, 20 000 € en invalidité', () => {
    const base = { ...VIDE, case7db: 30000, membresPlus65Ans: 4 };
    expect(calculerReductionsCreditsImpot(base, FOYER, 0).plafondServicesPersonne).toBe(15000);
    expect(calculerReductionsCreditsImpot({ ...base, case7dq: true }, FOYER, 0).plafondServicesPersonne).toBe(18000);
    expect(calculerReductionsCreditsImpot({ ...base, case7dg: true }, FOYER, 0).plafondServicesPersonne).toBe(20000);
  });
});

describe('calculerImpot — cadre 7', () => {
  const parts = calculerPartsFiscales(FOYER);
  it('réductions plafonnées à l\'impôt, crédit restituable au-delà', () => {
    const sans = calculerImpot(40000, parts, 'celibataire');
    const avec = calculerImpot(40000, parts, 'celibataire', 0, 'metropole', 0, 0, 0, 0, 0, 0, sans.impotApresDecote + 1000, 2000);
    expect(avec.reductionsImpot).toBe(sans.impotApresDecote);
    expect(avec.impotNet).toBe(-2000);
  });
});
