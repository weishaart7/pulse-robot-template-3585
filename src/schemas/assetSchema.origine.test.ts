import { describe, it, expect } from 'vitest';
import { ORIGINE_ACTIF_OPTIONS, getOrigineActifLabel } from './assetSchema';
import { qualifierBien } from '@/lib/patrimoine/qualification';

describe('ORIGINE_ACTIF_OPTIONS', () => {
  it('propose 7 origines, sans Découverte ni Occupation', () => {
    const valeurs = ORIGINE_ACTIF_OPTIONS.map((o) => o.value);
    expect(valeurs).toHaveLength(7);
    expect(valeurs).not.toContain('Découverte');
    expect(valeurs).not.toContain('Acquisition par occupation');
  });

  it('garde les valeurs stockées historiques, seul le libellé change', () => {
    expect(getOrigineActifLabel('Acquisition à titre onéreux')).toBe('Achat');
    expect(getOrigineActifLabel('Donation')).toBe('Donation reçue');
    expect(getOrigineActifLabel('Héritage')).toBe('Héritage ou legs');
  });

  it("affiche encore les valeurs retirées de la liste et retombe sur la valeur brute si elle est inconnue", () => {
    expect(getOrigineActifLabel('Découverte')).toBe('Découverte (trésor)');
    expect(getOrigineActifLabel('Acquisition par occupation')).toBe('Occupation (chasse, pêche…)');
    expect(getOrigineActifLabel('Valeur inconnue')).toBe('Valeur inconnue');
  });

  it("la clause de remploi rend propre un bien reçu en échange, sans changement du moteur", () => {
    const contexte = {
      statutCouple: 'Marié(e)',
      regimeMatrimonial: 'Communauté réduite aux acquêts',
      dateMariage: '2010-01-01',
      dateAcquisition: '2020-06-01T00:00:00.000Z',
      origineActif: ['Échange'],
      natureActif: 'Résidence principale',
    };
    expect(qualifierBien({ ...contexte, clauseRemploi: false }).qualification).toBe('Bien commun');
    expect(qualifierBien({ ...contexte, clauseRemploi: true }).qualification).toBe('Bien propre');
  });
});
