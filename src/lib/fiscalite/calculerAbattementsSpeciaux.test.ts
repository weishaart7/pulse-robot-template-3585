import { describe, expect, it } from 'vitest';
import { calculerAbattementPersonnesAgees, calculerAbattementsSpeciaux } from './calculerAbattementsSpeciaux';
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

describe('calculerAbattementsSpeciaux (art. 157 bis + 196 B, revenus 2025)', () => {
  it('case N = 2, revenu 72 000 : 13 710 € (simulateur officiel : RNI 58 290)', () => {
    expect(calculerAbattementsSpeciaux(foyer({ situationFamille: 'marie', personnesRattacheesFoyerDistinct: 2 }), 72000, 2025).total).toBe(13710);
  });

  it('case N = 3 : 20 565 € (simulateur officiel : RNI 51 435)', () => {
    expect(calculerAbattementsSpeciaux(foyer({ personnesRattacheesFoyerDistinct: 3 }), 72000, 2025).rattachement).toBe(20565);
  });

  it('seuil 157 bis apprécié avant le rattachement : 1 411 + 13 710 (simulateur officiel : 15 121)', () => {
    const r = calculerAbattementsSpeciaux(foyer({ anneeNaissanceDeclarant1: 1950, personnesRattacheesFoyerDistinct: 2 }), 27000, 2025);
    expect([r.personnesAgees.abattement, r.rattachement, r.total]).toEqual([1411, 13710, 15121]);
  });

  it('plafonné au revenu net global (simulateur officiel : 10 800 → 0)', () => {
    expect(calculerAbattementsSpeciaux(foyer({ personnesRattacheesFoyerDistinct: 2 }), 10800, 2025).total).toBe(10800);
  });

  it('petit-enfant en résidence alternée : demi-abattement de 3 428 €, P borné par N', () => {
    expect(calculerAbattementsSpeciaux(foyer({ personnesRattacheesFoyerDistinct: 2, petitsEnfantsRattachesAlternee: 1 }), 50000, 2025).rattachement).toBe(6855 + 3428);
    expect(calculerAbattementsSpeciaux(foyer({ personnesRattacheesFoyerDistinct: 1, petitsEnfantsRattachesAlternee: 3 }), 50000, 2025).rattachement).toBe(3428);
  });

  it('sans rattachement ni condition d\'âge : rien', () => {
    expect(calculerAbattementsSpeciaux(foyer(), 50000, 2025).total).toBe(0);
  });
});
