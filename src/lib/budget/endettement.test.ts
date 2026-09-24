import { describe, it, expect } from 'vitest';
import { computeEndettement, ponderationRevenu } from './endettement';

const REF = new Date(2026, 8, 24);

describe('ponderationRevenu', () => {
  it('pondère selon la nature', () => {
    expect(ponderationRevenu({ nature: 'Salaire net', periodicite: 'mensuel' })).toBe(1);
    expect(ponderationRevenu({ nature: 'Pension de retraite', periodicite: 'mensuel' })).toBe(1);
    expect(ponderationRevenu({ nature: 'Revenus fonciers de location nue', periodicite: 'mensuel' })).toBe(0.7);
    expect(ponderationRevenu({ nature: 'Loyer libre', source: 'immobilier', periodicite: 'mensuel' })).toBe(0.7);
    expect(ponderationRevenu({ nature: 'Allocations familiales', periodicite: 'mensuel' })).toBe(0);
    expect(ponderationRevenu({ nature: 'Coupons d\'obligations', periodicite: 'annuel' })).toBe(0);
    expect(ponderationRevenu({ nature: 'Primes et bonus', periodicite: 'ponctuel' })).toBe(0);
  });
});

describe('computeEndettement', () => {
  it('calcule le taux d\'effort et la capacité sur revenus pondérés', () => {
    const r = computeEndettement(
      [
        { nature: 'Salaire net', montant: 4000, periodicite: 'mensuel' },
        { nature: 'Revenus fonciers de location nue', montant: 1000, periodicite: 'mensuel' },
        { nature: 'Allocations familiales', montant: 300, periodicite: 'mensuel' },
      ],
      [
        { nature: 'Crédit immobilier (résidence principale, secondaire, locatif)', montant: 1400, periodicite: 'mensuel' },
        { nature: 'Loyer de la résidence principale (location)', montant: 900, periodicite: 'mensuel' },
      ],
      REF
    );
    expect(r.revenusPonderesAnnuel).toBe(4700 * 12);
    expect(r.mensualitesCreditsAnnuel).toBe(1400 * 12);
    expect(r.tauxEffort).toBeCloseTo(29.79, 2);
    expect(r.capaciteAnnuel).toBeCloseTo((4700 * 0.35 - 1400) * 12, 6);
  });
  it('taux nul sans revenu retenu', () => {
    expect(computeEndettement([], [{ nature: 'Autres emprunts', montant: 100, periodicite: 'mensuel' }], REF).tauxEffort).toBe(0);
  });
});
