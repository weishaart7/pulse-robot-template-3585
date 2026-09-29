import { describe, it, expect } from 'vitest';
import {
  estRegimeAgircArrco,
  pointsAgircArrcoAnnuels,
  coefficientAnticipationAgircArrco,
  pensionAgircArrco,
  coefficientMajorationRAFP,
  coefficientConversionCapitalRAFP,
  prestationRAFP,
  separerRegimesPoints,
} from './calculAgircArrco';

describe('pointsAgircArrcoAnnuels — taux contractuels 6,20 % / 17 %, prix d\'achat 20,1877 €', () => {
  it('salaire sous le PASS : tranche 1 seule', () => {
    expect(pointsAgircArrcoAnnuels(30000)).toBeCloseTo((30000 * 0.062) / 20.1877, 6);
  });
  it('salaire de cadre : tranche 1 + tranche 2', () => {
    expect(pointsAgircArrcoAnnuels(90000)).toBeCloseTo((48060 * 0.062 + 41940 * 0.17) / 20.1877, 6);
  });
  it('tranche 2 plafonnée à 8 PASS', () => {
    expect(pointsAgircArrcoAnnuels(1000000)).toBeCloseTo(pointsAgircArrcoAnnuels(8 * 48060), 6);
  });
  it('salaire nul : aucun point', () => {
    expect(pointsAgircArrcoAnnuels(0)).toBe(0);
  });
});

describe('coefficientAnticipationAgircArrco', () => {
  it('retraite de base non décotée : aucun abattement', () => {
    expect(coefficientAnticipationAgircArrco(false, 62, 20)).toBe(1);
  });
  it('âge en années révolues : 64 ans 8 mois → 0,88', () => {
    expect(coefficientAnticipationAgircArrco(true, 64 + 8 / 12, 30)).toBe(0.88);
  });
  it('plus favorable des deux grilles : 4 trimestres manquants (0,96) contre 62 ans (0,78)', () => {
    expect(coefficientAnticipationAgircArrco(true, 62, 4)).toBe(0.96);
  });
  it('au-delà de 20 trimestres manquants : grille par âge seule', () => {
    expect(coefficientAnticipationAgircArrco(true, 63, 21)).toBe(0.83);
  });
  it('13 trimestres : -1,25 % au-delà de 12', () => {
    expect(coefficientAnticipationAgircArrco(true, 57, 13)).toBe(0.8675);
  });
});

describe('pensionAgircArrco', () => {
  it('majoration enfants : 10 % des droits avant coefficient, non minorée', () => {
    const r = pensionAgircArrco({ pointsAcquis: 5000, pointsProjetes: 0, coefficientAnticipation: 0.88, nombreEnfantsEligibles: 3 });
    const brut = 5000 * 1.4386;
    expect(r.majorationEnfants).toBeCloseTo(brut * 0.1, 6);
    expect(r.pensionAnnuelle).toBeCloseTo(brut * 0.88 + brut * 0.1, 6);
  });
  it('majoration enfants plafonnée à 2 367,48 €/an', () => {
    const r = pensionAgircArrco({ pointsAcquis: 30000, pointsProjetes: 0, coefficientAnticipation: 1, nombreEnfantsEligibles: 4 });
    expect(r.majorationEnfants).toBe(2367.48);
  });
  it('moins de 3 enfants : pas de majoration', () => {
    expect(pensionAgircArrco({ pointsAcquis: 5000, pointsProjetes: 0, coefficientAnticipation: 1, nombreEnfantsEligibles: 2 }).majorationEnfants).toBe(0);
  });
});

describe('RAFP — rente ou capital (barèmes ERAFP)', () => {
  it('coefficient de majoration : 1 jusqu\'à 62 ans, 1,08 à 64 ans, 1,80 à 75 ans et plus', () => {
    expect(coefficientMajorationRAFP(61)).toBe(1);
    expect(coefficientMajorationRAFP(64.9)).toBe(1.08);
    expect(coefficientMajorationRAFP(80)).toBe(1.8);
  });
  it('conversion en capital interpolée au mois (exemple ERAFP : 62 ans 7 mois → 26,66)', () => {
    expect(coefficientConversionCapitalRAFP(62 + 7 / 12)).toBeCloseTo(26.66, 2);
  });
  it('exemple rafp.fr : 4 448 points à 64 ans → capital de 6 965,93 €', () => {
    const r = prestationRAFP(4448, 64);
    expect(r.forme).toBe('capital');
    if (r.forme === 'capital') expect(r.capital).toBeCloseTo(6965.93, 1);
  });
  it('5 125 points ou plus : rente majorée', () => {
    const r = prestationRAFP(6000, 64);
    expect(r.forme).toBe('rente');
    if (r.forme === 'rente') expect(r.renteAnnuelle).toBeCloseTo(6000 * 0.05671 * 1.08, 6);
  });
});

describe('separerRegimesPoints', () => {
  it('isole Agirc-Arrco des autres régimes à points', () => {
    const r = separerRegimesPoints([
      { nom: 'Agirc-Arrco', type: 'points', points: 1000 },
      { nom: 'RCI', type: 'points', points: 50, valeurPoint: 1.2 },
    ]);
    expect(r.pointsAgircArrco).toBe(1000);
    expect(r.aUnRegimeAgircArrco).toBe(true);
    expect(r.autresRegimes.map((x) => x.nom)).toEqual(['RCI']);
    expect(estRegimeAgircArrco('ARRCO')).toBe(true);
  });
});
