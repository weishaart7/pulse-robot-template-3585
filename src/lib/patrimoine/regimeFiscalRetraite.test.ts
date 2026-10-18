import { describe, it, expect } from 'vitest';
import { computeRetraiteRegime } from './regimeFiscalRetraite';
import { resolveAssetFiscalRegime } from './assetFiscalRegime';

describe('computeRetraiteRegime', () => {
  it('PER en capital, versements non déduits : gains au PFU 31,4 %', () => {
    const r = computeRetraiteRegime({ nature: 'PER individuel', plusValue: 10000, valeurAcquisition: 50000, modeSortie: 'Capital', versementsDeduitsPct: 0 })!;
    expect(r.total).toBeCloseTo(3140, 6);
    expect(r.totalDetail).toBeUndefined();
  });

  it('PER en capital, versements déduits : gains chiffrés, capital au barème signalé', () => {
    const r = computeRetraiteRegime({ nature: 'PER individuel', plusValue: 10000, valeurAcquisition: 50000, modeSortie: 'Capital', versementsDeduitsPct: 100 })!;
    expect(r.total).toBeCloseTo(3140, 6);
    expect(r.totalDetail).toBe('Hors capital imposé au barème');
  });

  it('PER sans part déduite renseignée : non déterminé ; en rente : informatif', () => {
    expect(computeRetraiteRegime({ nature: 'PER individuel', plusValue: 10000, modeSortie: 'Capital' })?.tone).toBe('non_determine');
    expect(computeRetraiteRegime({ nature: 'PER individuel', plusValue: 10000, modeSortie: 'Rente' })?.tone).toBe('informatif');
    expect(computeRetraiteRegime({ nature: 'PER entreprise obligatoire', plusValue: 10000 })?.tone).toBe('informatif');
  });

  it('PERCO en capital : IR exonéré, PS 18,6 %', () => {
    const r = computeRetraiteRegime({ nature: 'PERCO/PERCOI', plusValue: 1000 })!;
    expect(r.ir).toBe(0);
    expect(r.total).toBeCloseTo(186, 6);
  });

  it('contrats de retraite par rente : informatif', () => {
    for (const nature of ['PERP', 'Contrat loi Madelin', 'Contrat article 83', 'Contrat Préfon-retraite']) {
      expect(computeRetraiteRegime({ nature, plusValue: 1000 })?.tone).toBe('informatif');
    }
  });

  it('régimes étrangers : hors moteur (non déterminé via resolve)', () => {
    expect(computeRetraiteRegime({ nature: 'Régimes de retraite étrangers', plusValue: 1000 })).toBeNull();
    expect(resolveAssetFiscalRegime({ nature: 'Régimes de retraite étrangers', plusValue: 1000, valeurEstimee: 5000 }).tone).toBe('non_determine');
  });
});
