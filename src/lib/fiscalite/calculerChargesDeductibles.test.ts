import { describe, expect, it } from 'vitest';
import { calculerChargesDeductibles } from './calculerChargesDeductibles';
import { ChargesDeductiblesInput } from './types';

const VIDE: ChargesDeductiblesInput = {
  case6de: null, case6el: null, case6em: null, case6gu: null, case6gi: null, case6gj: null, case6gp: null,
  case6ns: null, case6nt: null, case6rs: null, case6rt: null, case6ps: null, case6pt: null,
  case6qr: false, case6qw: false, case6os: null, case6ot: null, case6qs: null, case6qt: null,
  case6dg: null, case6dd: null, case6ev: null, case6eu: null, case6hp: null, case6hq: null, case6hr: null,
  case6gh: null, case6fa: null, case6fb: null, case6fc: null, case6fd: null, case6fe: null, case6fl: null,
  entretienSeul6el: false, entretienSeul6em: false,
};

describe('calculerChargesDeductibles', () => {
  it('sans saisie : aucune incidence', () => {
    const r = calculerChargesDeductibles(VIDE, 50000);
    expect(r.incidenceRevenuImposable).toBe(0);
    expect(r.epargneRetraiteRetenuePourRFR).toBe(0);
  });

  it('pensions aux enfants majeurs plafonnées par enfant, 6GU en totalité', () => {
    const r = calculerChargesDeductibles({ ...VIDE, case6el: 9000, case6em: 3000, case6gu: 5000 }, 80000);
    expect(r.chargesImputees).toBe(6855 + 3000 + 5000);
  });

  it('enfant entretenu seul : plafond doublé à 13 710 € pour l\'enfant concerné seulement', () => {
    const r = calculerChargesDeductibles({ ...VIDE, case6el: 15000, case6em: 9000, entretienSeul6el: true }, 80000);
    expect(r.chargesImputees).toBe(13710 + 6855);
  });

  it('décision de justice avant 2006 : 6GI/6GJ × 1,25 puis plafond par enfant, 6GP × 1,25 sans plafond', () => {
    const r = calculerChargesDeductibles({ ...VIDE, case6gi: 4000, case6gj: 6000, case6gp: 10000 }, 80000);
    expect(r.chargesImputees).toBe(5000 + 6855 + 12500);
  });

  it('CSG déductible automatique : 6,8 % de 2DF, et de 2BH seulement avec 2OP', () => {
    const cm = { case2bh: 10000, case2df: 5000, case2op: false };
    expect(calculerChargesDeductibles(VIDE, 80000, cm).csgDeductibleAutomatique).toBe(340);
    const r = calculerChargesDeductibles({ ...VIDE, case6de: 100 }, 80000, { ...cm, case2op: true });
    expect(r.csgDeductibleAutomatique).toBe(1020);
    expect(r.chargesImputees).toBe(1120);
  });

  it('CSG déductible automatique limitée au revenu global avec les autres charges', () => {
    const r = calculerChargesDeductibles({ ...VIDE, case6de: 500 }, 800, { case2bh: null, case2df: 10000, case2op: false });
    expect(r.chargesDeductibles).toBe(1180);
    expect(r.chargesImputees).toBe(800);
  });

  it('PER : plafond par déclarant, mutualisé avec 6QR', () => {
    const base = { ...VIDE, case6ns: 8000, case6ps: 5000, case6nt: 1000, case6pt: 6000 };
    expect(calculerChargesDeductibles(base, 100000).epargneRetraiteDeduite).toBe(6000);
    expect(calculerChargesDeductibles({ ...base, case6qr: true }, 100000).epargneRetraiteDeduite).toBe(9000);
  });

  it('PER réintégré au RFR à hauteur de la part effectivement imputée', () => {
    const r = calculerChargesDeductibles({ ...VIDE, case6de: 1000, case6ns: 3000, case6ps: 5000 }, 2500);
    expect(r.chargesImputees).toBe(2500);
    expect(r.epargneRetraiteRetenuePourRFR).toBe(1500);
  });

  it('accueil plafonné par personne ; grosses réparations plafonnées à 25 000 €', () => {
    expect(calculerChargesDeductibles({ ...VIDE, case6eu: 10000, case6ev: 2 }, 90000).chargesImputees).toBe(8150);
    expect(calculerChargesDeductibles({ ...VIDE, case6eu: 10000 }, 90000).chargesImputees).toBe(4075);
    expect(calculerChargesDeductibles({ ...VIDE, case6hp: 20000, case6hr: 10000 }, 90000).chargesImputees).toBe(25000);
  });

  it('6GH ajouté, puis déficits antérieurs, puis charges, sans passer sous 0', () => {
    const r = calculerChargesDeductibles({ ...VIDE, case6gh: 1000, case6fa: 4000, case6fl: 4000, case6de: 5000 }, 10000);
    expect(r.deficitsAnterieursImputes).toBe(8000);
    expect(r.chargesImputees).toBe(3000);
    expect(r.incidenceRevenuImposable).toBe(-10000);
  });
});
