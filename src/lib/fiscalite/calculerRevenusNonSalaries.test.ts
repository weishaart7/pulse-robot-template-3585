import { describe, expect, it } from 'vitest';
import { calculerRevenusNonSalaries, netMicro } from './calculerRevenusNonSalaries';
import { RevenusNonSalariesInput } from './types';

const VIDE: RevenusNonSalariesInput = { case5ta: null, case5ua: null, case5tb: null, case5ub: null, case5te: null, case5ue: null, case5ko: null, case5lo: null, case5kp: null, case5lp: null, case5no: null, case5oo: null, case5np: null, case5op: null, case5ng: null, case5og: null, case5nh: null, case5oh: null, case5ni: null, case5oi: null, case5nj: null, case5oj: null, case5nk: null, case5ok: null, case5nl: null, case5ol: null, case5hq: null, case5iq: null, case5ku: null, case5lu: null, case5hy: null, case5iy: null };

describe('calculerRevenusNonSalaries', () => {
  it('abattements micro : 71 % ventes, 50 % services, 34 % BNC, minimum 305 €', () => {
    const r = calculerRevenusNonSalaries({ ...VIDE, case5ko: 10000, case5lp: 10000, case5hq: 10000 });
    expect(r.totalNetImposable).toBe(2900 + 5000 + 6600);
    expect(netMicro(400, 0.34)).toBe(95);
    expect(netMicro(200, 0.71)).toBe(0);
  });

  it('LMNP 5NG/5NH/5NI : barème et PS 18,6 % sur le net ; 5NJ/5NK/5NL sans PS', () => {
    const r = calculerRevenusNonSalaries({ ...VIDE, case5ng: 10000, case5nh: 10000, case5ni: 10000, case5nj: 10000 });
    expect(r.totalNetImposable).toBe(5000 + 7000 + 5000 + 5000);
    expect(r.basePrelevementsSociaux).toBe(17000);
    expect(r.prelevementsSociaux).toBe(Math.round(17000 * 0.186));
  });

  it('BIC/BNC non professionnels : PS seulement via 5HY/5IY', () => {
    expect(calculerRevenusNonSalaries({ ...VIDE, case5np: 10000, case5ku: 10000 }).prelevementsSociaux).toBe(0);
    expect(calculerRevenusNonSalaries({ ...VIDE, case5hy: 5000, case5iy: 1000 }).basePrelevementsSociaux).toBe(6000);
  });

  it('versement libératoire : hors barème, net retenu pour le taux effectif', () => {
    const r = calculerRevenusNonSalaries({ ...VIDE, case5ta: 10000, case5ub: 10000, case5te: 10000 });
    expect(r.totalNetImposable).toBe(0);
    expect(r.revenuExonereTauxEffectif).toBe(2900 + 5000 + 6600);
  });

  it('alertes de seuil : activités par déclarant, meublés au niveau du foyer', () => {
    expect(calculerRevenusNonSalaries({ ...VIDE, case5kp: 40000, case5lp: 40000 }).alertes).toEqual([]);
    expect(calculerRevenusNonSalaries({ ...VIDE, case5kp: 40000, case5hq: 40000 }).alertes).toEqual(['services_au_dela_du_seuil']);
    expect(calculerRevenusNonSalaries({ ...VIDE, case5nh: 8000, case5oh: 8000 }).alertes).toEqual(['meubles_non_classes_au_dela_du_seuil']);
    expect(calculerRevenusNonSalaries({ ...VIDE, case5ko: 190000 }).alertes).toEqual(['ventes_au_dela_du_seuil']);
  });
});
