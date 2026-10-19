import { describe, it, expect } from 'vitest';
import { renvoisImmobilier } from './LocationFields';

describe('renvoisImmobilier', () => {
  it('ne renvoie rien pour une nature non immobilière', () => {
    expect(renvoisImmobilier({ nature: 'Compte bancaire', finance_par_credit: true })).toEqual([]);
  });

  it('résidence financée : seulement le crédit', () => {
    const r = renvoisImmobilier({ nature: 'Résidence principale', finance_par_credit: true });
    expect(r).toHaveLength(1);
    expect(r[0]).toContain('Passifs');
  });

  it('location nue : déficits fonciers et revenus et charges', () => {
    const r = renvoisImmobilier({ nature: 'Immeubles locatifs (loués nus)', type_location: 'Location nue' });
    expect(r.some((x) => x.includes('Synthèse foncière'))).toBe(true);
    expect(r.some((x) => x.includes('Revenus et charges'))).toBe(true);
    expect(r.some((x) => x.includes('amortissement'))).toBe(false);
  });

  it('LMNP : amortissement dans la fiche du bien', () => {
    const r = renvoisImmobilier({ nature: 'Immeubles locatifs (LMNP)', type_location: 'Location meublée non professionnelle (LMNP)' });
    expect(r.some((x) => x.includes('amortissement'))).toBe(true);
    expect(r.some((x) => x.includes('Synthèse foncière'))).toBe(false);
  });
});
