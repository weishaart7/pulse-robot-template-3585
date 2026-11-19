import { describe, expect, it } from 'vitest';
import { JUMELLES_PAC_CADRE_5, REVENUS_NON_SALARIES_VIDE, calculerRevenusNonSalaries } from './calculerRevenusNonSalaries';
import { RevenusNonSalariesInput } from './types';

/**
 * Cadre 5, colonnes « personnes à charge » : sur le simulateur officiel 2026, chaque case PAC donne
 * exactement le même RNI, RFR et impôt (PS compris) que sa jumelle déclarant 1 (63 paires à 5 000 €,
 * 5JY avec un bénéfice agricole PAC).
 */
const calcul = (o: Partial<RevenusNonSalariesInput>) => {
  const { alertes: _alertes, ...r } = calculerRevenusNonSalaries({ ...REVENUS_NON_SALARIES_VIDE, ...o });
  return r;
};

describe('cadre 5, personnes à charge', () => {
  it('75 cases, chacune jumelle d’une case déclarant', () => {
    expect(Object.keys(JUMELLES_PAC_CADRE_5)).toHaveLength(75);
  });
  for (const [pac, jumelle] of Object.entries(JUMELLES_PAC_CADRE_5)) {
    it(`${pac} = ${jumelle}`, () => {
      const base: Partial<RevenusNonSalariesInput> = { case5hc: 20000, case5kc: 20000, case5nc: 20000, case5qc: 20000, case5jg: 20000, case5na: 20000 };
      const cle = jumelle as keyof RevenusNonSalariesInput;
      // Montants agrégés : 5 000 € en PAC équivalent à 5 000 € de plus sur la jumelle (base comprise).
      expect(calcul({ ...base, [pac]: 5000 })).toEqual(calcul({ ...base, [cle]: (base[cle] ?? 0) + 5000 }));
    });
  }
  it('abattement micro et minimum de 305 € propres à la personne à charge', () => {
    const r = calcul({ case5ko: 300, case5mo: 300 });
    expect(r.totalNetImposable).toBe(0);
    expect(calcul({ case5ko: 10000, case5mo: 10000 }).totalNetImposable).toBe(2 * 2900);
  });
  it('seuils micro appréciés par personne', () => {
    const alertes = (o: Partial<RevenusNonSalariesInput>) =>
      calculerRevenusNonSalaries({ ...REVENUS_NON_SALARIES_VIDE, ...o }).alertes;
    expect(alertes({ case5kp: 50000, case5mp: 50000 })).not.toContain('services_au_dela_du_seuil');
    expect(alertes({ case5mp: 80000 })).toContain('services_au_dela_du_seuil');
  });
});
