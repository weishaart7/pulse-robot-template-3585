import { describe, it, expect } from 'vitest';
import { computeRachatsAssuranceVie, psDecesAssuranceVie } from './regimeFiscalAssuranceVie';

const REF = new Date(2026, 9, 18);
const v = (date: string, montant: number) => ({ type_operation: 'versement', montant, date_operation: date });
const contrat = (over: Partial<Parameters<typeof computeRachatsAssuranceVie>[0][number]> = {}) => ({
  id: 'c1', souscripteur: 'user' as const, plusValue: 20000, dateSouscription: '2018-01-10',
  operations: [v('2018-01-10', 100000)], partUniteCompte: 100, dateReference: REF, ...over,
});

describe('computeRachatsAssuranceVie', () => {
  it('< 8 ans : PFU 12,8 % + PS 17,2 %', () => {
    const r = computeRachatsAssuranceVie([contrat({ dateSouscription: '2020-01-10', operations: [v('2020-01-10', 100000)] })], false).c1;
    expect(r.ir).toBeCloseTo(2560, 6);
    expect(r.ps).toBeCloseTo(3440, 6);
  });

  it('≥ 8 ans : abattement du foyer puis 7,5 %', () => {
    const seul = computeRachatsAssuranceVie([contrat()], false).c1;
    expect(seul.ir).toBeCloseTo((20000 - 4600) * 0.075, 6);
    const couple = computeRachatsAssuranceVie([contrat()], true).c1;
    expect(couple.ir).toBeCloseTo((20000 - 9200) * 0.075, 6);
  });

  it('abattement réparti entre les contrats de 8 ans ou plus du foyer', () => {
    const r = computeRachatsAssuranceVie([contrat(), contrat({ id: 'c2', souscripteur: 'spouse' })], true);
    expect(r.c1.ir).toBeCloseTo((20000 - 4600) * 0.075, 6);
    expect(r.c2.ir).toBeCloseTo((20000 - 4600) * 0.075, 6);
  });

  it('primes au-delà de 150 000 € par souscripteur : 12,8 % sur la fraction excédentaire', () => {
    const r = computeRachatsAssuranceVie([contrat({ operations: [v('2018-01-10', 300000)], plusValue: 40000 })], false).c1;
    expect(r.ir).toBeCloseTo((40000 - 4600) * (0.5 * 0.075 + 0.5 * 0.128), 6);
  });

  it('primes antérieures au 27/09/2017 : ancien barème au prorata', () => {
    const r = computeRachatsAssuranceVie([contrat({
      dateSouscription: '2015-01-10', operations: [v('2015-01-10', 50000), v('2019-01-10', 50000)], plusValue: 20000,
    })], false).c1;
    // 11 ans : 7,5 % sur les deux fractions après abattement.
    expect(r.ir).toBeCloseTo((20000 - 4600) * 0.075, 6);
    const recent = computeRachatsAssuranceVie([contrat({
      dateSouscription: '2017-01-10', operations: [v('2017-01-10', 50000), v('2019-01-10', 50000)], plusValue: 20000, dateReference: new Date(2022, 0, 15),
    })], false).c1;
    // 5 ans : 15 % (ancien) et 12,8 % (nouveau), sans abattement.
    expect(recent.ir).toBeCloseTo(10000 * 0.15 + 10000 * 0.128, 6);
  });

  it('PS sur la seule part en unités de compte', () => {
    expect(computeRachatsAssuranceVie([contrat({ partUniteCompte: 40 })], false).c1.ps).toBeCloseTo(20000 * 0.4 * 0.172, 6);
  });

  it('contrat ancien sans versements saisis : non déterminé', () => {
    expect(computeRachatsAssuranceVie([contrat({ dateSouscription: '2010-01-10', operations: [] })], false).c1.tone).toBe('non_determine');
  });
});

describe('psDecesAssuranceVie', () => {
  it('17,2 % des produits de la part en unités de compte, 0 sans répartition', () => {
    expect(psDecesAssuranceVie(120000, 100000, 50)).toBeCloseTo(1720, 6);
    expect(psDecesAssuranceVie(120000, 100000, null)).toBe(0);
  });
});
