import { describe, expect, it } from 'vitest';
import { CapitauxMobiliersCSG, calculerChargesDeductibles, csgDeductibleAnticipee } from './calculerChargesDeductibles';
import { ChargesDeductiblesInput } from './types';

const VIDE: ChargesDeductiblesInput = {
  case6de: null, case6el: null, case6em: null, case6gu: null, case6gi: null, case6gj: null, case6gp: null,
  case6ns: null, case6nt: null, case6rs: null, case6rt: null, case6ps: null, case6pt: null,
  case6qr: false, case6qw: false, case6os: null, case6ot: null, case6qs: null, case6qt: null,
  case6nu: null, case6ru: null, case6pu: null, case6ou: null, case6qu: null,
  case6dg: null, case6dd: null, case6ev: null, case6eu: null, case6hp: null, case6hq: null, case6hr: null,
  case6gh: null, case6fa: null, case6fb: null, case6fc: null, case6fd: null, case6fe: null, case6fl: null,
  entretienSeul6el: false, entretienSeul6em: false,
};

const CM_VIDE: CapitauxMobiliersCSG = {
  case2bh: null, case2df: null, case2op: false, case2dc: null, case2ch: null, case2ts: null, case2tr: null,
  case2tz: null, case2tt: null, case2dm: null, case2vv: null, case2ww: null, case2yy: null, case2zz: null,
  case2vn: null, case2vo: null, case2vp: null,
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

  it('CSG déductible automatique avec 2OP : 6,8 % de 2BH + 2DF, limité aux revenus imposés au barème', () => {
    const cm = { ...CM_VIDE, case2bh: 10000, case2df: 5000, case2op: true, case2dc: 12000, case2tr: 3000 };
    const r = calculerChargesDeductibles({ ...VIDE, case6de: 100 }, 80000, cm);
    expect(r.csgDeductibleAutomatique).toBe(1020);
    expect(r.chargesImputees).toBe(1120);
    expect(calculerChargesDeductibles(VIDE, 80000, { ...cm, case2dc: 4000 }).csgDeductibleAutomatique).toBe(476);
  });

  it('CSG déductible automatique sans 2OP : 2BH ignoré, 2DF limité à l\'assurance-vie au barème de plein droit', () => {
    const cm = { ...CM_VIDE, case2bh: 10000, case2df: 5000, case2dc: 20000 };
    expect(calculerChargesDeductibles(VIDE, 80000, cm).csgDeductibleAutomatique).toBe(0);
    expect(calculerChargesDeductibles(VIDE, 80000, { ...cm, case2ch: 2000, case2yy: 1000 }).csgDeductibleAutomatique).toBe(204);
    expect(calculerChargesDeductibles(VIDE, 80000, { ...cm, case2ch: 9000 }).csgDeductibleAutomatique).toBe(340);
  });

  it('CSG déductible automatique limitée au revenu global avec les autres charges', () => {
    const r = calculerChargesDeductibles({ ...VIDE, case6de: 500 }, 800, { ...CM_VIDE, case2df: 10000, case2ch: 10000 });
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

  it('brochure : couple salarié, plafonds séparés puis mutualisés (6QR)', () => {
    const base = { ...VIDE, case6ns: 1500, case6ps: 2837, case6nt: 5200, case6pt: 4637 };
    const sans = calculerChargesDeductibles(base, 100000);
    expect(sans.epargneRetraiteDeduite).toBe(1500 + 4637);
    expect(sans.epargneRetraiteDeclarant1.plafondNonUtilise).toBe(1337);
    expect(sans.epargneRetraiteDeclarant2.cotisationsPerdues).toBe(563);
    expect(sans.gainMutualisation).toBe(563);
    const avec = calculerChargesDeductibles({ ...base, case6qr: true }, 100000);
    expect(avec.epargneRetraiteDeduite).toBe(6700);
    expect(avec.epargneRetraiteDeclarant1.plafondNonUtilise).toBe(774);
    expect(avec.epargneRetraiteDeclarant2).toEqual({ deduit: 5200, plafondNonUtilise: 0, cotisationsPerdues: 0 });
    expect(avec.gainMutualisation).toBe(0);
  });

  it('brochure : non-salarié, cotisations PER au-delà du plafond perdues', () => {
    const r = calculerChargesDeductibles({ ...VIDE, case6ns: 3000, case6ps: 1545 }, 50000);
    expect(r.epargneRetraiteDeduite).toBe(1545);
    expect(r.epargneRetraiteDeclarant1.cotisationsPerdues).toBe(1455);
  });

  it('déficits : reliquat 6FA perdu, années suivantes reportables', () => {
    const r = calculerChargesDeductibles({ ...VIDE, case6fa: 3000, case6fb: 2000, case6fe: 1000 }, 1000);
    expect(r.deficitsAnterieursImputes).toBe(1000);
    expect(r.deficitPerdu).toBe(2000);
    expect(r.deficitsReportables).toEqual([{ annee: 2020, montant: 2000 }, { annee: 2023, montant: 1000 }]);
  });

  it('grosses réparations : 25 000 € imputés les plus anciens d\'abord, reliquat 6HP expiré', () => {
    const r = calculerChargesDeductibles({ ...VIDE, case6hp: 10000, case6hq: 12000, case6hr: 8000 }, 100000);
    expect(r.chargesImputees).toBe(25000);
    expect(r.grossesReparationsPerdues).toBe(0);
    expect(r.grossesReparationsReportables).toEqual([{ annee: 2017, montant: 5000 }]);
    const faible = calculerChargesDeductibles({ ...VIDE, case6hp: 10000, case6hq: 2000 }, 6000);
    expect(faible.grossesReparationsPerdues).toBe(4000);
    expect(faible.grossesReparationsReportables).toEqual([{ annee: 2016, montant: 2000 }]);
  });

  it('revenu insuffisant : grosses réparations imputées après l\'épargne retraite', () => {
    const r = calculerChargesDeductibles({ ...VIDE, case6de: 1000, case6ns: 2000, case6ps: 5000, case6hq: 3000 }, 4000);
    expect(r.epargneRetraiteRetenuePourRFR).toBe(2000);
    expect(r.grossesReparationsReportables).toEqual([{ annee: 2016, montant: 2000 }]);
  });

  it('personne à charge : 6NU + 6RU plafonnés à 6PU, hors mutualisation 6QR', () => {
    const r = calculerChargesDeductibles({ ...VIDE, case6nu: 3000, case6ru: 1000, case6pu: 3500,
      case6ns: 1000, case6ps: 5000, case6qr: true }, 100000);
    expect(r.epargneRetraitePersonneCharge).toEqual({ deduit: 3500, plafondNonUtilise: 0, cotisationsPerdues: 500 });
    expect(r.epargneRetraiteDeduite).toBe(4500);
    expect(r.epargneRetraiteRetenuePourRFR).toBe(4500);
  });
});

describe('csgDeductibleAnticipee', () => {
  const cm = (v: Partial<CapitauxMobiliersCSG>): CapitauxMobiliersCSG => ({
    case2bh: null, case2df: null, case2op: null, case2dc: null, case2ch: null, case2ts: null, case2tr: null,
    case2tz: null, case2tt: null, case2dm: null, case2vv: null, case2ww: null, case2yy: null, case2zz: null,
    case2vn: null, case2vo: null, case2vp: null, ...v,
  });

  it('6,8 % des revenus imposés au barème par l\'option (ClickImpôts : 20 000 € → 1 360 €)', () => {
    expect(csgDeductibleAnticipee(cm({ case2dc: 20000 }))).toBe(1360);
  });

  it('hors 2CH (barème de plein droit) et diminuée de 2BH/2DF', () => {
    expect(csgDeductibleAnticipee(cm({ case2ch: 10000 }))).toBe(0);
    expect(csgDeductibleAnticipee(cm({ case2tr: 10000, case2bh: 4000 }))).toBe(408);
  });
});
