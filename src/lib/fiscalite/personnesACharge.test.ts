import { describe, expect, it } from 'vitest';
import { calculerRevenuSalaires } from './calculerRevenuSalaires';
import { calculerPensionsRetraitesRentes } from './calculerPensionsRetraitesRentes';
import { PensionsRetraitesRentesInput, RevenusSalairesInput } from './types';

/**
 * Personnes à charge (cadre 1, colonnes C/D et I/J). Valeurs attendues relevées
 * sur le simulateur officiel 2026 (calc-2026.cgi), couple 1AJ 50 000 € / 1BJ 30 000 €
 * (RNI de base 72 000 €).
 */
const salaires = (o: Partial<RevenusSalairesInput>) =>
  calculerRevenuSalaires({ case1aj: 50000, case1bj: 30000, ...o } as RevenusSalairesInput);
const rni = (o: Partial<RevenusSalairesInput>) => Math.round(salaires(o).totalNetImposable);

describe('salaires des personnes à charge', () => {
  it('abattement de 10 % propre à la PAC, plancher 509 €', () => {
    expect(rni({ case1cj: 5000 })).toBe(76491);
    expect(rni({ case1cj: 3000 })).toBe(74491);
  });
  it('plafond de 14 555 € propre à la PAC', () => {
    expect(rni({ case1cj: 200000 })).toBe(257445);
  });
  it('un abattement par PAC', () => {
    expect(rni({ case1cj: 5000, case1dj: 5000 })).toBe(80982);
  });
  it('frais réels 1CK retenus seulement s’ils dépassent les 10 %', () => {
    expect(rni({ case1cj: 5000, case1ck: 2000 })).toBe(75000);
    expect(rni({ case1cj: 5000, case1ck: 200 })).toBe(76491);
  });
  it('1CA, 1CP, 1CG, 1IB, 1IF rejoignent le pool de 1CJ', () => {
    for (const c of ['case1ca', 'case1cp', 'case1cg', 'case1ib', 'case1if'] as const) {
      expect(rni({ [c]: 5000 })).toBe(76491);
    }
  });
  it('1CD : PPV exonérée jusqu’à 3 000 €, excédent imposable', () => {
    expect(rni({ case1cd: 5000 })).toBe(73491);
  });
  it('1IH et 1PD : RFR seulement', () => {
    for (const c of ['case1ih', 'case1pd'] as const) {
      const r = salaires({ [c]: 5000 });
      expect(Math.round(r.totalNetImposable)).toBe(72000);
      expect(Math.round(r.revenuExonereRetenuPourRFR)).toBe(4491);
    }
  });
  it('1CC : exonéré retenu pour le taux effectif, net d’abattement', () => {
    const r = calculerRevenuSalaires({ case1aj: 50000, case1bj: 30000 } as RevenusSalairesInput,
      { case1ac: null, case1bc: null, case1ae: null, case1be: null, case1cc: 5000, case1dc: null, case1ce: null, case1de: null });
    expect(Math.round(r.totalNetImposable)).toBe(72000);
    expect(Math.round(r.salairesNetImposablesExoneresTauxEffectif)).toBe(4491);
  });
});

describe('pensions des personnes à charge', () => {
  const pensions = (o: Partial<PensionsRetraitesRentesInput>) =>
    calculerPensionsRetraitesRentes(o as PensionsRetraitesRentesInput).totalNetImposable;
  it('1CS, 1CZ, 1CO, 1CM : abattement de 10 %', () => {
    for (const c of ['case1cs', 'case1cz', 'case1co', 'case1cm'] as const) {
      expect(Math.round(pensions({ [c]: 5000 }))).toBe(4500);
    }
  });
  it('plafond de 4 439 € commun au foyer', () => {
    expect(Math.round(pensions({ case1as: 60000 }))).toBe(55561);
    expect(Math.round(pensions({ case1as: 60000, case1cs: 20000 }))).toBe(75561);
  });
  it('1CI sans abattement, 1CT en prélèvement forfaitaire comme 1AT', () => {
    expect(pensions({ case1ci: 5000 })).toBe(5000);
    const r = calculerPensionsRetraitesRentes({ case1ct: 5000 } as PensionsRetraitesRentesInput);
    expect(r.totalNetImposable).toBe(0);
    expect(r.revenuExonereRetenuPourRFR).toBe(4500);
  });
});
