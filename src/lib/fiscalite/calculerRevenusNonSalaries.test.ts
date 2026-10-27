import { describe, expect, it } from 'vitest';
import { calculerRevenusNonSalaries, netMicro, REVENUS_NON_SALARIES_VIDE } from './calculerRevenusNonSalaries';

const VIDE = REVENUS_NON_SALARIES_VIDE;

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

  it('forfait forestier 5HD/5ID : ajouté au BA, avant les déficits agricoles antérieurs, sans PS', () => {
    const r = calculerRevenusNonSalaries({ ...VIDE, case5hd: 3000, case5id: 1000, case5qq: 1500 });
    expect(r.totalNetImposable).toBe(2500);
    expect(r.basePrelevementsSociaux).toBe(0);
  });

  it('inventeurs non professionnels : 10 % avec PS (5QJ/5RJ), 10 % sans PS (5TC/5UC), retenus au RFR', () => {
    const r = calculerRevenusNonSalaries({ ...VIDE, case5qj: 10000, case5rj: 2000, case5tc: 5000, case5uc: 1000 });
    expect(r.totalNetImposable).toBe(0);
    expect(r.impotForfaitaire).toBeCloseTo(1800);
    expect(r.basePrelevementsSociaux).toBe(12000);
    expect(r.revenuExonereRetenuPourRFR).toBe(18000);
  });

  it('5HG/5IG : prélèvements sociaux seuls, retenus au RFR, sans impôt', () => {
    const r = calculerRevenusNonSalaries({ ...VIDE, case5hg: 40000, case5ig: 10000 });
    expect(r.totalNetImposable).toBe(0);
    expect(r.impotForfaitaire).toBe(0);
    expect(r.prelevementsSociaux).toBe(Math.round(50000 * 0.186));
    expect(r.revenuExonereRetenuPourRFR).toBe(50000);
  });

  it('5XT/5XU : hors barème, transmis pour le taux marginal et retenu au RFR', () => {
    const r = calculerRevenusNonSalaries({ ...VIDE, case5hc: 30000, case5xt: 20000, case5xu: 5000 });
    expect(r.totalNetImposable).toBe(30000);
    expect(r.revenuImposableTauxMarginal).toBe(25000);
    expect(r.revenuExonereRetenuPourRFR).toBe(25000);
    expect(r.basePrelevementsSociaux).toBe(0);
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

  it('réel professionnel : bénéfices et déficits sur le revenu global, PV court terme au barème', () => {
    const r = calculerRevenusNonSalaries({ ...VIDE, case5kc: 30000, case5qe: 40000, case5kx: 1000, case5kj: 500 });
    expect(r.totalNetImposable).toBe(30000 - 40000 + 1000 - 500);
  });

  it('non professionnel : déficits et déficits antérieurs limités à la catégorie, plancher 0', () => {
    expect(calculerRevenusNonSalaries({ ...VIDE, case5nc: 5000, case5nf: 3000, case5rw: 4000 }).totalNetImposable).toBe(0);
    expect(calculerRevenusNonSalaries({ ...VIDE, case5jg: 8000, case5jj: 3000 }).totalNetImposable).toBe(5000);
  });

  it('LMNP réel : déficits sur les revenus LMNP, PS sur le net hors cotisations', () => {
    const r = calculerRevenusNonSalaries({ ...VIDE, case5na: 10000, case5ny: 4000, case5nm: 3000 });
    expect(r.totalNetImposable).toBe(9000);
    expect(r.basePrelevementsSociaux).toBe(6000);
  });

  it('BA : micro 87 %, déficits antérieurs sur les BA, déficit de l\'année transmis à part', () => {
    const r = calculerRevenusNonSalaries({ ...VIDE, case5xb: 20000, case5hc: 10000, case5qq: 3000, case5if: 7000 });
    expect(r.totalNetImposable).toBe(2600 + 10000 - 3000);
    expect(r.deficitAgricole).toBe(7000);
  });

  it('PV long terme 12,8 % avec PS 18,6 % ; brevets 10 % sans PS ; exonérés zonés au RFR', () => {
    const r = calculerRevenusNonSalaries({ ...VIDE, case5ke: 10000, case5ui: 5000, case5kn: 2000, case5kr: 900 });
    expect(r.totalNetImposable).toBe(0);
    expect(r.impotForfaitaire).toBeCloseTo(1280 + 500);
    expect(r.basePrelevementsSociaux).toBe(10000);
    expect(r.revenuExonereRetenuPourRFR).toBe(17000);
  });

  it('source étrangère avec crédit d\'impôt : hors barème, au taux effectif', () => {
    expect(calculerRevenusNonSalaries({ ...VIDE, case5df: 4000, case5xs: 1000 }).revenuCreditImpotEgalImpotFrancais).toBe(5000);
  });
});
