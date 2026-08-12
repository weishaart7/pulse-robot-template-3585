import { describe, it, expect } from 'vitest';
import {
  minimumContributif,
  MINIMUM_CONTRIBUTIF_NON_MAJORE_2026,
  decoteSurTrimestres,
  ageLegalPourGeneration,
  trimestresRequisPourGeneration,
} from './calcul';

describe('trimestresRequisPourGeneration', () => {
  // Référentiel §2.1.1 : 1955-1957 → 166, 1958-1960 → 167, 1961 → 168.
  // Couvre la borne 1957/1958 (audit-retraite.md §7, écart #1 : 1958 retournait
  // à tort 166 au lieu de 167) et ses générations voisines, pour s'assurer que
  // l'erreur ne se répète pas ailleurs sur l'intervalle.
  it.each([
    [1957, 166],
    [1958, 167],
    [1959, 167],
    [1960, 167],
    [1961, 168],
  ])('génération %i → %i trimestres requis', (anneeNaissance, trimestresAttendus) => {
    expect(trimestresRequisPourGeneration(anneeNaissance)).toBe(trimestresAttendus);
  });
});

describe('minimumContributif', () => {
  it('cas référentiel PDF : taux plein (192/172 trimestres, decote positive) → MiCo plafonné à 100%', () => {
    const trimestresValides = 192;
    const trimestresRequis = 172;
    const decote = decoteSurTrimestres(trimestresValides, trimestresRequis);

    expect(decote).toBeGreaterThanOrEqual(0);
    expect(minimumContributif(trimestresValides, trimestresRequis, decote)).toBe(
      MINIMUM_CONTRIBUTIF_NON_MAJORE_2026
    );
  });

  it('cas réel Titouan Weishaar : 28/172 trimestres, decote -20% → non éligible, MiCo nul', () => {
    const trimestresValides = 28;
    const trimestresRequis = 172;
    const decote = decoteSurTrimestres(trimestresValides, trimestresRequis);

    expect(decote).toBeLessThan(0);
    expect(minimumContributif(trimestresValides, trimestresRequis, decote)).toBe(0);
  });
});

describe('ageLegalPourGeneration', () => {
  it('avant 1961 : stable, 62 ans', () => {
    expect(ageLegalPourGeneration(1950)).toEqual({ stable: true, age: { ans: 62, mois: 0 } });
  });

  it('1961 avant septembre : stable, 62 ans (moisNaissance explicite)', () => {
    expect(ageLegalPourGeneration(1961, 3)).toEqual({ stable: true, age: { ans: 62, mois: 0 } });
  });

  it('1961 à partir de septembre : stable, 62 ans et 3 mois', () => {
    expect(ageLegalPourGeneration(1961, 9)).toEqual({ stable: true, age: { ans: 62, mois: 3 } });
    expect(ageLegalPourGeneration(1961, 12)).toEqual({ stable: true, age: { ans: 62, mois: 3 } });
  });

  it('1961 sans mois de naissance fourni : repli conservateur sur 62 ans et 3 mois (documenté)', () => {
    expect(ageLegalPourGeneration(1961)).toEqual({ stable: true, age: { ans: 62, mois: 3 } });
  });

  it('1963 : stable, 62 ans et 9 mois', () => {
    expect(ageLegalPourGeneration(1963)).toEqual({ stable: true, age: { ans: 62, mois: 9 } });
  });

  it('1969 : stable, 64 ans (le seuil des 64 ans n’est pas affecté par la suspension pour cette génération)', () => {
    expect(ageLegalPourGeneration(1969)).toEqual({ stable: true, age: { ans: 64, mois: 0 } });
  });

  it('2000 (cas réel Titouan Weishaar) : stable, 64 ans', () => {
    expect(ageLegalPourGeneration(2000)).toEqual({ stable: true, age: { ans: 64, mois: 0 } });
  });

  // Zone d'instabilité LFSS 2026 (générations 1964-1968) : la fonction doit
  // signaler explicitement l'indétermination plutôt que de retourner une
  // valeur numérique — narrowing TypeScript vérifié par la structure même
  // du test (accéder à `.age` sur une branche `stable: false` est une
  // erreur de compilation, pas seulement un risque à l'exécution).
  it.each([1964, 1965, 1966, 1967, 1968])(
    'génération %i : instable, aucune valeur numérique, raison non vide',
    (annee) => {
      const resultat = ageLegalPourGeneration(annee);
      expect(resultat.stable).toBe(false);
      if (resultat.stable) throw new Error('unreachable'); // narrowing pour TS ci-dessous
      expect(resultat.raison.length).toBeGreaterThan(0);
      expect(resultat.raison).toContain(String(annee));
      // @ts-expect-error — `age` n'existe pas sur la branche stable: false.
      expect(resultat.age).toBeUndefined();
    }
  );

  it('génération 1968 : la raison mentionne explicitement les deux issues possibles (64 ans / 63 ans et 9 mois)', () => {
    const resultat = ageLegalPourGeneration(1968);
    expect(resultat.stable).toBe(false);
    if (resultat.stable) throw new Error('unreachable');
    expect(resultat.raison).toContain('64 ans');
    expect(resultat.raison).toContain('63 ans et 9 mois');
  });
});
