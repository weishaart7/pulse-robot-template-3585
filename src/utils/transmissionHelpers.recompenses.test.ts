import { describe, it, expect } from 'vitest';
import { buildRecompensesCalcInput } from './transmissionHelpers';
import { computeSoldeRecompenses } from '@/lib/patrimoine/recompensesCreances';
import type { Recompense } from '@/types/recompense';

const ligne = (depense_necessaire: boolean): Recompense => ({
  id: 'r1',
  sens: 'communaute_vers_epoux',
  epoux: 'user',
  depense_faite: 40000,
  valeur_bien_acquisition: 200000,
  valeur_bien_liquidation: 150000,
  nature_depense: 'conservation',
  depense_necessaire,
});

describe('buildRecompensesCalcInput', () => {
  it('transmet depense_necessaire : plancher = dépense faite (art. 1469 al. 2)', () => {
    // Profit subsistant 150000 × 40000/200000 = 30000 < dépense 40000.
    const solde = computeSoldeRecompenses(buildRecompensesCalcInput([ligne(true)]));
    expect(solde.parEpoux.user.communauteDoitA).toBe(40000);
  });

  it('dépense non nécessaire : profit subsistant (art. 1469 al. 3)', () => {
    const solde = computeSoldeRecompenses(buildRecompensesCalcInput([ligne(false)]));
    expect(solde.parEpoux.user.communauteDoitA).toBe(30000);
  });
});
