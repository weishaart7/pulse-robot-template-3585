import { describe, expect, it } from 'vitest';
import { calculerCDHR, type CDHRInput } from './calculerCDHR';

const base: CDHRInput = {
  revenuFiscalReference: 0, revenuExceptionnelQuotient: 0, abattementDividendes: 0, produitsBrevets: 0,
  impotRetenu: 0, cehr: 0, prelevementsLiberatoires: 0, situationFamille: 'celibataire', personnesCharge: 0,
};
const cdhr = (overrides: Partial<CDHRInput>) => calculerCDHR({ ...base, ...overrides });

// Valeurs du simulateur officiel calc-2026.cgi (novembre 2026), sauf mention.
describe('calculerCDHR', () => {
  it('sous le seuil de 250 000 € : non assujetti', () => {
    const r = cdhr({ revenuFiscalReference: 250_000, impotRetenu: 0 });
    expect(r.assujetti).toBe(false);
    expect(r.cdhr).toBe(0);
  });

  it('célibataire, 400 000 € de dividendes au PFU : 80 000 − 51 200 − 4 500 = 24 300 €', () => {
    expect(cdhr({ revenuFiscalReference: 400_000, impotRetenu: 51_200, cehr: 4_500 }).cdhr).toBe(24_300);
  });

  it('crédit non réintégré (emploi à domicile 5 000 €) : IR1 diminué, CDHR + 5 000 €', () => {
    expect(cdhr({ revenuFiscalReference: 400_000, impotRetenu: 46_200, cehr: 4_500 }).cdhr).toBe(29_300);
  });

  it('une personne à charge, résidence alternée comprise : − 1 500 €', () => {
    expect(cdhr({ revenuFiscalReference: 400_000, impotRetenu: 51_200, cehr: 4_500, personnesCharge: 1 }).cdhr).toBe(22_800);
  });

  it('couple, 800 000 € au PFU : majoration de 12 500 €, seuil doublé', () => {
    const r = cdhr({ situationFamille: 'marie', revenuFiscalReference: 800_000, impotRetenu: 102_400, cehr: 9_000 });
    expect(r.majorations).toBe(12_500);
    expect(r.cdhr).toBe(36_100);
  });

  it('décote entre 250 000 et 330 000 € : RREF 300 000 € → 1 350 €', () => {
    const r = cdhr({ revenuFiscalReference: 300_000, impotRetenu: 38_400, cehr: 1_500 });
    expect(r.decote).toBeCloseTo(18_750, 6);
    expect(r.cdhr).toBe(1_350);
  });

  it('salaire et PFU : 78 000 − 20 701 − 38 400 − 4 200 = 14 699 €', () => {
    expect(cdhr({ revenuFiscalReference: 390_000, impotRetenu: 59_101, cehr: 4_200 }).cdhr).toBe(14_699);
  });

  it("abattement de 40 % retiré du revenu de référence : dividendes au barème non assujettis", () => {
    const r = cdhr({ revenuFiscalReference: 400_000, abattementDividendes: 240_000, impotRetenu: 49_401, cehr: 4_500 });
    expect(r.revenuReference).toBe(160_000);
    expect(r.cdhr).toBe(0);
  });

  it('revenus au quotient retenus pour leur montant total', () => {
    expect(cdhr({ revenuFiscalReference: 300_000, revenuExceptionnelQuotient: 100_000 }).revenuReference).toBe(375_000);
  });

  it('exemple BOI-IR-CDHR-10 §380 : couple, 1 enfant, brevets exclus → 31 074 €', () => {
    const r = cdhr({
      situationFamille: 'marie', personnesCharge: 1, revenuFiscalReference: 800_000, produitsBrevets: 60_000,
      impotRetenu: 94_601, cehr: 8_325,
    });
    expect(r.revenuReference).toBe(740_000);
    expect(r.cdhr).toBe(31_074);
  });
});
