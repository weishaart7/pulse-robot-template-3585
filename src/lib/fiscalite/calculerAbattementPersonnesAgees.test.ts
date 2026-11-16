import { describe, expect, it } from 'vitest';
import { calculerAbattementPersonnesAgees } from './calculerAbattementPersonnesAgees';
import type { FoyerFiscalInput } from './types';

const foyer = (patch: Partial<FoyerFiscalInput> = {}): FoyerFiscalInput => ({
  situationFamille: 'celibataire', lieuResidence: 'metropole', enfantsCharge: [], personnesInvalidesCharge: [],
  enfantsMajeursRattaches: 0, parentIsole: false, ancienParentIsole: false, invaliditeDeclarant1: false,
  invaliditeDeclarant2: false, ancienCombattantDeclarant1: false, ancienCombattantDeclarant2: false,
  veufAncienCombattant: false, veuveDeGuerre: false, ...patch,
});

describe('calculerAbattementPersonnesAgees (art. 157 bis, revenus 2025)', () => {
  it('seul, né en 1950, RNG 13 500 : 2 822 € (simulateur officiel : RNI 10 678)', () => {
    expect(calculerAbattementPersonnesAgees(foyer({ anneeNaissanceDeclarant1: 1950 }), 13500, 2025).abattement).toBe(2822);
  });

  it('seul, RNG 22 500 : 1 411 € (simulateur officiel : RNI 21 089)', () => {
    expect(calculerAbattementPersonnesAgees(foyer({ anneeNaissanceDeclarant1: 1950 }), 22500, 2025).abattement).toBe(1411);
  });

  it('couple de deux bénéficiaires, RNG 27 000 : 2 × 1 411 € (simulateur officiel : RNI 24 178)', () => {
    const r = calculerAbattementPersonnesAgees(
      foyer({ situationFamille: 'marie', anneeNaissanceDeclarant1: 1950, anneeNaissanceDeclarant2: 1952 }), 27000, 2025);
    expect(r).toEqual({ abattement: 2822, beneficiaires: 2, anneeNaissanceManquante: false });
  });

  it('couple de deux bénéficiaires sous le premier seuil : 5 644 €', () => {
    const r = calculerAbattementPersonnesAgees(
      foyer({ situationFamille: 'pacse', anneeNaissanceDeclarant1: 1950, anneeNaissanceDeclarant2: 1952 }), 17670, 2025);
    expect(r.abattement).toBe(5644);
  });

  it('au-delà de 28 430 € : aucun abattement', () => {
    expect(calculerAbattementPersonnesAgees(foyer({ anneeNaissanceDeclarant1: 1950 }), 28431, 2025).abattement).toBe(0);
    expect(calculerAbattementPersonnesAgees(foyer({ anneeNaissanceDeclarant1: 1950 }), 28430, 2025).abattement).toBe(1411);
  });

  it('condition d\'âge au 31 décembre : né en 1960 oui, en 1961 non', () => {
    expect(calculerAbattementPersonnesAgees(foyer({ anneeNaissanceDeclarant1: 1960 }), 15000, 2025).beneficiaires).toBe(1);
    expect(calculerAbattementPersonnesAgees(foyer({ anneeNaissanceDeclarant1: 1961 }), 15000, 2025).beneficiaires).toBe(0);
  });

  it('invalide (case P) quel que soit l\'âge, compté une seule fois s\'il est aussi âgé', () => {
    expect(calculerAbattementPersonnesAgees(foyer({ invaliditeDeclarant1: true, anneeNaissanceDeclarant1: 1990 }), 15000, 2025).abattement).toBe(2822);
    expect(calculerAbattementPersonnesAgees(foyer({ invaliditeDeclarant1: true, anneeNaissanceDeclarant1: 1940 }), 15000, 2025).beneficiaires).toBe(1);
  });

  it('déclarant 2 ignoré hors couple ; année manquante signalée', () => {
    const r = calculerAbattementPersonnesAgees(foyer({ anneeNaissanceDeclarant2: 1940 }), 15000, 2025);
    expect(r).toEqual({ abattement: 0, beneficiaires: 0, anneeNaissanceManquante: true });
  });

  it('jamais au-delà du revenu net global', () => {
    expect(calculerAbattementPersonnesAgees(foyer({ anneeNaissanceDeclarant1: 1950 }), 1000, 2025).abattement).toBe(1000);
    expect(calculerAbattementPersonnesAgees(foyer({ anneeNaissanceDeclarant1: 1950 }), -500, 2025).abattement).toBe(0);
  });
});
