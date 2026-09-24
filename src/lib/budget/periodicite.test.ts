import { describe, it, expect } from 'vitest';
import { toAnnual, isActiveOn, sumAnnualActive, parseLocalDate } from './periodicite';

const REF = new Date(2026, 8, 24); // 24/09/2026

describe('toAnnual', () => {
  it('gère les deux graphies et la casse', () => {
    expect(toAnnual(100, 'mensuel')).toBe(1200);
    expect(toAnnual(100, 'Mensuelle')).toBe(1200);
    expect(toAnnual(100, 'trimestrielle')).toBe(400);
    expect(toAnnual(100, 'semestriel')).toBe(200);
    expect(toAnnual(100, 'annuelle')).toBe(100);
    expect(toAnnual(100, 'ponctuel')).toBe(100);
  });
  it('traite une périodicité inconnue ou absente comme mensuelle', () => {
    expect(toAnnual(100, 'bizarre')).toBe(1200);
    expect(toAnnual(100, undefined)).toBe(1200);
    expect(toAnnual(undefined, 'mensuel')).toBe(0);
  });
});

describe('isActiveOn', () => {
  it('exclut une ligne terminée ou pas encore démarrée', () => {
    expect(isActiveOn({ periodicite: 'mensuel', date_fin: '2026-09-23' }, REF)).toBe(false);
    expect(isActiveOn({ periodicite: 'mensuel', date_debut: '2026-09-25' }, REF)).toBe(false);
  });
  it('inclut une ligne qui démarre ou se termine le jour même (dates en heure locale)', () => {
    expect(isActiveOn({ periodicite: 'mensuel', date_debut: '2026-09-24' }, REF)).toBe(true);
    expect(isActiveOn({ periodicite: 'mensuel', date_fin: '2026-09-24' }, REF)).toBe(true);
  });
  it("ne compte un ponctuel que dans l'année de sa date", () => {
    expect(isActiveOn({ periodicite: 'ponctuel', date_debut: '2025-09-01' }, REF)).toBe(false);
    expect(isActiveOn({ periodicite: 'ponctuel', date_debut: '2026-02-01', date_fin: '2026-02-01' }, REF)).toBe(true);
    expect(isActiveOn({ periodicite: 'ponctuel', date_debut: '2026-12-01' }, REF)).toBe(true);
    expect(isActiveOn({ periodicite: 'ponctuel' }, REF)).toBe(true);
  });
});

describe('sumAnnualActive', () => {
  it('ne somme que les lignes actives', () => {
    const lines = [
      { montant: 1200, periodicite: 'mensuel' },
      { montant: 800, periodicite: 'mensuel', date_fin: '2026-01-31' },
      { montant: 5000, periodicite: 'ponctuel', date_debut: '2024-05-01' },
    ];
    expect(sumAnnualActive(lines, REF)).toBe(14400);
  });
});

describe('parseLocalDate', () => {
  it('lit la date en heure locale', () => {
    const d = parseLocalDate('2026-09-24');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 8, 24, 0]);
  });
});
