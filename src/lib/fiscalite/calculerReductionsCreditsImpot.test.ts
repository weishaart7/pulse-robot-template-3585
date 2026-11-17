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

/** Lot 2 du cadre 7 : valeurs relevées sur le simulateur officiel 2026 (calc-2026.cgi). */
describe('cadre 7 courant (lot 2)', () => {
  const COUPLE: FoyerFiscalInput = { ...FOYER, situationFamille: 'marie' };
  const r = (o: Partial<ReductionsCreditsImpotInput>, revenu = 72000, foyer = COUPLE) =>
    calculerReductionsCreditsImpot({ ...VIDE, ...o }, foyer, revenu, { declarant1: 50000, declarant2: 30000 });

  it('frais de garde : 50 % dans la limite de 3 500 € par enfant, 1 750 € en résidence alternée', () => {
    expect(r({ case7ga: 2000 }).creditGardeEnfants).toBe(1000);
    expect(r({ case7ga: 5000 }).creditGardeEnfants).toBe(1750);
    expect(r({ case7ga: 5000, case7gb: 5000 }).creditGardeEnfants).toBe(3500);
    expect(r({ case7ge: 5000 }).creditGardeEnfants).toBe(875);
    expect(r({ case7ga: 5000 }).totalCredits).toBe(1750);
  });
  it('scolarité : 61 / 153 / 183 € par enfant, moitié en résidence alternée', () => {
    expect(r({ case7ea: 2 }).reductionScolarite).toBe(122);
    expect(r({ case7ec: 1 }).reductionScolarite).toBe(153);
    expect(r({ case7ef: 1 }).reductionScolarite).toBe(183);
    expect(r({ case7eb: 1 }).reductionScolarite).toBe(31);
    expect(r({ case7ed: 1 }).reductionScolarite).toBe(77);
    expect(r({ case7eg: 1 }).reductionScolarite).toBe(92);
  });
  it('cotisations syndicales : 66 % dans la limite de 1 % des salaires et pensions de chaque déclarant', () => {
    expect(r({ case7ac: 500 }).creditCotisationsSyndicales).toBe(330);
    expect(r({ case7ac: 1000 }).creditCotisationsSyndicales).toBe(330);
    expect(r({ case7ae: 200 }).creditCotisationsSyndicales).toBe(132);
  });
  it('prestations compensatoires : 25 %, proratisées au-delà de 30 500 € ; 7WM sans effet', () => {
    expect(r({ case7wn: 5000, case7wo: 5000 }).reductionPrestationCompensatoire).toBe(1250);
    expect(r({ case7wn: 5000, case7wo: 50000 }).reductionPrestationCompensatoire).toBe(763);
    expect(r({ case7wn: 40000, case7wo: 40000 }).reductionPrestationCompensatoire).toBe(7625);
    expect(r({ case7wn: 40000, case7wo: 60000, case7wm: 40000 }).reductionPrestationCompensatoire).toBe(5083);
  });
  it('partis politiques : 66 %, 15 000 € par foyer, limite de 20 % commune avec 7UF', () => {
    expect(r({ case7uh: 1000 }).reductionDons66).toBe(660);
    expect(r({ case7uh: 20000 }, 470890).reductionDons66).toBe(9900);
    expect(r({ case7uh: 8000, case7uf: 8000 }, 54000, FOYER).reductionDons66).toBe(7128);
  });
  it('les réductions s’additionnent', () => {
    expect(r({ case7ea: 1, case7uh: 1000 }, 470890).totalReductions).toBe(721);
  });
});
