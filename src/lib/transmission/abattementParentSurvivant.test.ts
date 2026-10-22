import { describe, expect, it } from 'vitest';
import { abattementParentSurvivant } from './abattementParentSurvivant';
import type { Liberalite } from './types';

const don = (p: Partial<Liberalite>): Liberalite => ({
  id: Math.random().toString(), type: 'donation', beneficiaireId: 'romy', valeur: 0, date: '2024-01-01', ...p,
} as Liberalite);

describe('abattementParentSurvivant', () => {
  it('sans donation : abattement plein', () => {
    expect(abattementParentSurvivant({ liberalites: [], parent: 'spouse', beneficiaireId: 'romy', referenceDate: '2026-10-22' }))
      .toEqual({ base: 100000, consommeDonations: 0, nbDonations: 0, restant: 100000 });
  });

  it('donation du conjoint consommée, donation de biens communs pour moitié, donation du défunt ignorée', () => {
    const r = abattementParentSurvivant({
      liberalites: [
        don({ donateur: 'spouse', valeur: 30000 }),
        don({ donateur: 'communaute', valeur: 40000 }),
        don({ donateur: 'user', valeur: 50000 }),
      ],
      parent: 'spouse', beneficiaireId: 'romy', referenceDate: '2026-10-22',
    });
    expect(r).toEqual({ base: 100000, consommeDonations: 50000, nbDonations: 2, restant: 50000 });
  });

  it('donation de plus de 15 ans et don familial 790 G sans effet sur l’abattement', () => {
    const r = abattementParentSurvivant({
      liberalites: [
        don({ donateur: 'spouse', valeur: 80000, date: '2008-01-01' }),
        don({ donateur: 'spouse', valeur: 31865, nature: "Dons familiaux de sommes d'argent" }),
      ],
      parent: 'spouse', beneficiaireId: 'romy', referenceDate: '2026-10-22',
    });
    expect(r.consommeDonations).toBe(0);
    expect(r.restant).toBe(100000);
  });

  it('handicap : abattement de 159 325 € en plus', () => {
    expect(abattementParentSurvivant({ liberalites: [], parent: 'spouse', beneficiaireId: 'romy', isHandicapped: true, referenceDate: '2026-10-22' }).base)
      .toBe(259325);
  });
});
