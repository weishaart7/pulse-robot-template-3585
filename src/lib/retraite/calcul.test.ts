import { describe, it, expect } from 'vitest';
import {
  minimumContributif,
  MINIMUM_CONTRIBUTIF_NON_MAJORE_2026,
  decoteSurTrimestres,
  ageLegalPourGeneration,
  trimestresRequisPourGeneration,
  jeuBaremeApplicable,
  dateNaissanceDepuisISO,
  dateEffetSimuleeParAge,
  DateNaissance,
} from './calcul';

const dn = (annee: number, mois: number): DateNaissance => ({ annee, mois });
const D = (annee: number, mois: number, jour = 1) => new Date(Date.UTC(annee, mois - 1, jour));

// Dates d'effet de commodité : une par jeu de barème (référentiel §2.1.3).
const EFFET_ANTERIEUR_2023 = D(2020, 1);
const EFFET_CALENDRIER_2023 = D(2024, 6); // dans la fenêtre 01/09/2023-31/08/2026
const EFFET_LFSS_2026 = D(2027, 1); // à compter du 01/09/2026

describe('jeuBaremeApplicable', () => {
  it('avant le 1er septembre 2023 : anterieur_2023', () => {
    expect(jeuBaremeApplicable(D(2023, 8, 31))).toBe('anterieur_2023');
  });

  it('au 1er septembre 2023 pile : calendrier_2023 (borne incluse)', () => {
    expect(jeuBaremeApplicable(D(2023, 9, 1))).toBe('calendrier_2023');
  });

  it('la veille du 1er septembre 2026 : calendrier_2023', () => {
    expect(jeuBaremeApplicable(D(2026, 8, 31))).toBe('calendrier_2023');
  });

  it('au 1er septembre 2026 pile : lfss_2026 (borne incluse)', () => {
    expect(jeuBaremeApplicable(D(2026, 9, 1))).toBe('lfss_2026');
  });

  it('après le 1er septembre 2026 : lfss_2026', () => {
    expect(jeuBaremeApplicable(D(2030, 1))).toBe('lfss_2026');
  });
});

describe('dateNaissanceDepuisISO', () => {
  it('parse une date ISO sans décalage de fuseau horaire', () => {
    expect(dateNaissanceDepuisISO('1965-04-01')).toEqual({ annee: 1965, mois: 4 });
    expect(dateNaissanceDepuisISO('1965-03-31')).toEqual({ annee: 1965, mois: 3 });
  });
});

describe('dateEffetSimuleeParAge', () => {
  it("anniversaire (mois de naissance) de l'année naissance + âge", () => {
    const resultat = dateEffetSimuleeParAge(dn(1965, 4), 61);
    expect(resultat.getUTCFullYear()).toBe(2026);
    expect(resultat.getUTCMonth()).toBe(3); // avril, 0-indexé
  });
});

describe('trimestresRequisPourGeneration', () => {
  // Référentiel §2.1.1 : 1955-1957 → 166, 1958-1960 → 167, 1961 (avant
  // septembre) → 168. Couvre la borne 1957/1958 (audit-retraite.md §7, écart
  // #1) et ses générations voisines — hors zone instable, donc résultat
  // identique quel que soit le jeu de barème (calendrier_2023 ou lfss_2026).
  it.each([
    [dn(1957, 6), 166],
    [dn(1958, 1), 167],
    [dn(1959, 6), 167],
    [dn(1960, 12), 167],
    [dn(1961, 3), 168],
  ])('génération %o → %i trimestres requis (stable, indépendant du jeu)', (dateNaissance, attendu) => {
    expect(trimestresRequisPourGeneration(dateNaissance, EFFET_CALENDRIER_2023)).toBe(attendu);
    expect(trimestresRequisPourGeneration(dateNaissance, EFFET_LFSS_2026)).toBe(attendu);
  });

  describe('découpage infra-annuel 1951 (1er juillet)', () => {
    it('avant le 1er juillet 1951 : 60 ans, 163 trimestres (valeur de repli, référentiel "—")', () => {
      expect(trimestresRequisPourGeneration(dn(1951, 6), EFFET_LFSS_2026)).toBe(163);
    });

    it('à partir du 1er juillet 1951 : 163 trimestres', () => {
      expect(trimestresRequisPourGeneration(dn(1951, 7), EFFET_LFSS_2026)).toBe(163);
      expect(trimestresRequisPourGeneration(dn(1951, 12), EFFET_LFSS_2026)).toBe(163);
    });
  });

  describe('découpage infra-annuel 1961 (1er septembre)', () => {
    it('01/01 – 31/08/1961 : 168 trimestres', () => {
      expect(trimestresRequisPourGeneration(dn(1961, 1), EFFET_LFSS_2026)).toBe(168);
      expect(trimestresRequisPourGeneration(dn(1961, 8), EFFET_LFSS_2026)).toBe(168);
    });

    it('01/09 – 31/12/1961 : 169 trimestres', () => {
      expect(trimestresRequisPourGeneration(dn(1961, 9), EFFET_LFSS_2026)).toBe(169);
      expect(trimestresRequisPourGeneration(dn(1961, 12), EFFET_LFSS_2026)).toBe(169);
    });
  });

  describe('bascule LFSS 2026, générations 1964-1968 (référentiel §2.1.1 vs §2.1.2, §12.1)', () => {
    it('1964 : 171 (calendrier_2023) vs 170 (lfss_2026)', () => {
      expect(trimestresRequisPourGeneration(dn(1964, 6), EFFET_CALENDRIER_2023)).toBe(171);
      expect(trimestresRequisPourGeneration(dn(1964, 6), EFFET_LFSS_2026)).toBe(170);
    });

    it('1965 T1 (janvier-mars) : 172 (calendrier_2023) vs 170 (lfss_2026)', () => {
      expect(trimestresRequisPourGeneration(dn(1965, 1), EFFET_CALENDRIER_2023)).toBe(172);
      expect(trimestresRequisPourGeneration(dn(1965, 3), EFFET_LFSS_2026)).toBe(170);
    });

    it('1965 T2-T4 (avril-décembre) : 172 (calendrier_2023) vs 171 (lfss_2026) — découpage au 1er avril, écart #3', () => {
      expect(trimestresRequisPourGeneration(dn(1965, 4), EFFET_CALENDRIER_2023)).toBe(172);
      expect(trimestresRequisPourGeneration(dn(1965, 4), EFFET_LFSS_2026)).toBe(171);
      expect(trimestresRequisPourGeneration(dn(1965, 12), EFFET_LFSS_2026)).toBe(171);
    });

    it('1966 : 172 dans les deux jeux (seul l’âge légal diffère)', () => {
      expect(trimestresRequisPourGeneration(dn(1966, 6), EFFET_CALENDRIER_2023)).toBe(172);
      expect(trimestresRequisPourGeneration(dn(1966, 6), EFFET_LFSS_2026)).toBe(172);
    });

    it('1968 : 172 dans les deux jeux (seul l’âge légal diffère)', () => {
      expect(trimestresRequisPourGeneration(dn(1968, 6), EFFET_CALENDRIER_2023)).toBe(172);
      expect(trimestresRequisPourGeneration(dn(1968, 6), EFFET_LFSS_2026)).toBe(172);
    });

    it('un départ quelques semaines avant le 01/09/2026 change le résultat pour 1965 T2 (référentiel §12.3)', () => {
      const juste_avant = trimestresRequisPourGeneration(dn(1965, 6), D(2026, 8, 31));
      const juste_apres = trimestresRequisPourGeneration(dn(1965, 6), D(2026, 9, 1));
      expect(juste_avant).toBe(172);
      expect(juste_apres).toBe(171);
    });
  });

  it('1969 et après : 172, stable', () => {
    expect(trimestresRequisPourGeneration(dn(1969, 1), EFFET_LFSS_2026)).toBe(172);
    expect(trimestresRequisPourGeneration(dn(2000, 1), EFFET_LFSS_2026)).toBe(172);
  });

  describe('dateEffet antérieure au 01/09/2023 : repli documenté (pas de régression)', () => {
    it('zone instable (1964) : replie sur la valeur lfss_2026, comme le comportement historique', () => {
      expect(trimestresRequisPourGeneration(dn(1964, 6), EFFET_ANTERIEUR_2023)).toBe(170);
    });

    it('génération stable (1958) : résultat inchangé, un seul barème existe de toute façon', () => {
      expect(trimestresRequisPourGeneration(dn(1958, 1), EFFET_ANTERIEUR_2023)).toBe(167);
    });
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
  it('avant le 1er juillet 1951 : stable, 60 ans (référentiel §2.1.1)', () => {
    expect(ageLegalPourGeneration(dn(1950, 1), EFFET_LFSS_2026)).toEqual({
      stable: true,
      age: { ans: 60, mois: 0 },
    });
  });

  it('1961 avant septembre : stable, 62 ans', () => {
    expect(ageLegalPourGeneration(dn(1961, 3), EFFET_LFSS_2026)).toEqual({
      stable: true,
      age: { ans: 62, mois: 0 },
    });
  });

  it('1961 à partir de septembre : stable, 62 ans et 3 mois', () => {
    expect(ageLegalPourGeneration(dn(1961, 9), EFFET_LFSS_2026)).toEqual({
      stable: true,
      age: { ans: 62, mois: 3 },
    });
    expect(ageLegalPourGeneration(dn(1961, 12), EFFET_LFSS_2026)).toEqual({
      stable: true,
      age: { ans: 62, mois: 3 },
    });
  });

  it('1963 : stable, 62 ans et 9 mois', () => {
    expect(ageLegalPourGeneration(dn(1963, 1), EFFET_LFSS_2026)).toEqual({
      stable: true,
      age: { ans: 62, mois: 9 },
    });
  });

  it('1969 : stable, 64 ans (le seuil des 64 ans n’est pas affecté par la suspension pour cette génération)', () => {
    expect(ageLegalPourGeneration(dn(1969, 1), EFFET_LFSS_2026)).toEqual({
      stable: true,
      age: { ans: 64, mois: 0 },
    });
  });

  it('2000 (cas réel Titouan Weishaar) : stable, 64 ans', () => {
    expect(ageLegalPourGeneration(dn(2000, 1), EFFET_LFSS_2026)).toEqual({
      stable: true,
      age: { ans: 64, mois: 0 },
    });
  });

  describe('zone instable 1964-1968 : désormais résolue par la date d’effet, plus jamais indéterminée', () => {
    it('1964 : 63 ans (calendrier_2023) vs 62 ans et 9 mois (lfss_2026)', () => {
      expect(ageLegalPourGeneration(dn(1964, 6), EFFET_CALENDRIER_2023)).toEqual({
        stable: true,
        age: { ans: 63, mois: 0 },
      });
      expect(ageLegalPourGeneration(dn(1964, 6), EFFET_LFSS_2026)).toEqual({
        stable: true,
        age: { ans: 62, mois: 9 },
      });
    });

    it('1968 : 64 ans (calendrier_2023) vs 63 ans et 9 mois (lfss_2026) — les deux issues autrefois documentées comme "indéterminées"', () => {
      expect(ageLegalPourGeneration(dn(1968, 6), EFFET_CALENDRIER_2023)).toEqual({
        stable: true,
        age: { ans: 64, mois: 0 },
      });
      expect(ageLegalPourGeneration(dn(1968, 6), EFFET_LFSS_2026)).toEqual({
        stable: true,
        age: { ans: 63, mois: 9 },
      });
    });

    it('1965 T1 vs T2 : l’âge légal lfss_2026 diffère selon le mois de naissance (écart #3)', () => {
      expect(ageLegalPourGeneration(dn(1965, 3), EFFET_LFSS_2026)).toEqual({
        stable: true,
        age: { ans: 62, mois: 9 },
      });
      expect(ageLegalPourGeneration(dn(1965, 4), EFFET_LFSS_2026)).toEqual({
        stable: true,
        age: { ans: 63, mois: 0 },
      });
    });
  });

  describe('dateEffet antérieure au 01/09/2023 : indétermination explicite (pas de valeur fabriquée)', () => {
    it.each([dn(1958, 1), dn(1964, 6), dn(2000, 1)])(
      'naissance %o : stable=false, raison non vide',
      (dateNaissance) => {
        const resultat = ageLegalPourGeneration(dateNaissance, EFFET_ANTERIEUR_2023);
        expect(resultat.stable).toBe(false);
        if (resultat.stable) throw new Error('unreachable');
        expect(resultat.raison.length).toBeGreaterThan(0);
        expect(resultat.raison).toContain('1er septembre 2023');
      }
    );
  });
});
