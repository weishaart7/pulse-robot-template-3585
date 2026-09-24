import { describe, it, expect } from 'vitest';
import { partFoyerEmprunt, estimateEmpruntFin } from './emprunts';

describe('partFoyerEmprunt', () => {
  it('exclut un prêt de société', () => {
    expect(partFoyerEmprunt({ societe_id: 'x', detenteur: 'user', qualification_bien: 'Bien propre' })).toBeNull();
  });
  it('exclut un emprunt non qualifié', () => {
    expect(partFoyerEmprunt({ detenteur: 'user', qualification_bien: 'À qualifier' })).toBeNull();
  });
  it('compte un emprunt commun au couple à 100 %', () => {
    expect(partFoyerEmprunt({ detenteur: 'common', qualification_bien: 'Bien commun' })).toBeCloseTo(1);
  });
});

describe('estimateEmpruntFin', () => {
  it('fin = dernier jour du mois N mois après la dernière modification', () => {
    expect(estimateEmpruntFin('2026-09-10T12:00:00Z', 1)).toBe('2026-10-31');
    expect(estimateEmpruntFin('2026-01-15T12:00:00Z', 24)).toBe('2028-01-31');
  });
  it('sans durée, pas de fin estimée', () => {
    expect(estimateEmpruntFin('2026-09-10T12:00:00Z', null)).toBeUndefined();
    expect(estimateEmpruntFin(null, 12)).toBeUndefined();
  });
});
