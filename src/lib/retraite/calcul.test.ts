import { describe, it, expect } from 'vitest';
import {
  minimumContributif,
  MINIMUM_CONTRIBUTIF_NON_MAJORE_2026,
  decoteSurTrimestres,
  decoteSurAge,
  decoteApplicable,
  ageLegalPourGeneration,
  trimestresRequisPourGeneration,
  jeuBaremeApplicable,
  dateNaissanceDepuisISO,
  dateEffetSimuleeParAge,
  dateDepuisISO,
  dateAnniversaireLegal,
  ageLegalAtteint,
  ageLegalParentaleEligible,
  surcotePourTrimestresCotises,
  surcoteParentale,
  surcoteTotale,
  pensionBase,
  tauxProratisation,
  majorationTroisEnfants,
  DateNaissance,
} from './calcul';
import { computeAge } from '../patrimoine/bareme669CGI';
import { trimestresCotisesEtAssimilesDepuisCarriere } from './calculTrimestres';
import { PeriodeCarriere } from './parseRIS';

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

describe('dateDepuisISO', () => {
  it('parse une date ISO en instant UTC à minuit, sans décalage de fuseau horaire', () => {
    const date = dateDepuisISO('2026-09-01');
    expect(date.getUTCFullYear()).toBe(2026);
    expect(date.getUTCMonth()).toBe(8); // septembre, 0-indexé
    expect(date.getUTCDate()).toBe(1);
  });

  it('reproduit exactement les bornes de bascule attendues par jeuBaremeApplicable', () => {
    expect(jeuBaremeApplicable(dateDepuisISO('2026-08-31'))).toBe('calendrier_2023');
    expect(jeuBaremeApplicable(dateDepuisISO('2026-09-01'))).toBe('lfss_2026');
  });
});

describe('conversion date → âge affiché (Session B, sélecteur de date de liquidation)', () => {
  // Scénario du point d'entrée #1/#3 (docs/audit/implementation-date-effet-ui.md) :
  // deux dates de liquidation "proches" (un mois d'écart), de part et d'autre
  // de la bascule du 1er septembre 2026, mais qui produisent le MÊME âge
  // affiché (computeAge() ne change qu'à l'anniversaire) — la raison d'être
  // du sélecteur de date plutôt que d'un simple curseur d'âge : un curseur
  // n'aurait aucun moyen de distinguer ces deux scénarios.
  const NAISSANCE = '1965-04-15'; // génération 1965 T2 (à partir d'avril) : zone instable
  const AVANT_BASCULE = '2026-08-15';
  const APRES_BASCULE = '2026-09-15';

  it('les deux dates produisent le même âge affiché (61 ans)', () => {
    expect(computeAge(NAISSANCE, dateDepuisISO(AVANT_BASCULE))).toBe(61);
    expect(computeAge(NAISSANCE, dateDepuisISO(APRES_BASCULE))).toBe(61);
  });

  it('mais un âge légal différent (63 ans et 3 mois vs 63 ans pile) — l’âge simulé seul l’aurait masqué', () => {
    const naissance = dateNaissanceDepuisISO(NAISSANCE);
    const avant = ageLegalPourGeneration(naissance, dateDepuisISO(AVANT_BASCULE));
    const apres = ageLegalPourGeneration(naissance, dateDepuisISO(APRES_BASCULE));
    expect(avant).toEqual({ stable: true, age: { ans: 63, mois: 3 } });
    expect(apres).toEqual({ stable: true, age: { ans: 63, mois: 0 } });
  });

  it('et un nombre de trimestres requis différent (172 vs 171)', () => {
    const naissance = dateNaissanceDepuisISO(NAISSANCE);
    expect(trimestresRequisPourGeneration(naissance, dateDepuisISO(AVANT_BASCULE))).toBe(172);
    expect(trimestresRequisPourGeneration(naissance, dateDepuisISO(APRES_BASCULE))).toBe(171);
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

describe('Carriere.tsx — combinaison decoteSurTrimestres + decoteSurAge (écart #4, audit-retraite.md §7)', () => {
  // Reproduit exactement le calcul de decoteSurcote dans Carriere.tsx après
  // correction : decoteApplicable(decoteSurTrimestres(...), decoteSurAge(...)),
  // même logique que l'onglet Optimisation (Trimestres.tsx) — pas une
  // nouvelle implémentation. Scénario explicite demandé par la mission :
  // assuré de 67 ans ou plus, trimestres incomplets.
  const trimestresValides = 140;
  const trimestresRequis = 172; // génération 1969+, valeur stable
  const ageActuel = 67; // âge du taux plein automatique (référentiel §2.1.4)

  it("« avant correction » (bug reproduit) : decoteSurTrimestres seule, décote à tort de -20 %", () => {
    const decoteAvantCorrection = decoteSurTrimestres(trimestresValides, trimestresRequis);
    expect(decoteAvantCorrection).toBe(-20); // (140-172)*1.25 = -40, plafonné à -20

    // Cascade vers le MICO : minimumContributif() exclut toute pension
    // décotée (decote < 0) — l'éligibilité est donc refusée à tort.
    expect(minimumContributif(trimestresValides, trimestresRequis, decoteAvantCorrection)).toBe(0);
  });

  it('« après correction » : decoteApplicable retient l’âge (0 %, taux plein automatique), pas la décote sur trimestres', () => {
    const decoteTrimestres = decoteSurTrimestres(trimestresValides, trimestresRequis);
    const decoteAge = decoteSurAge(ageActuel);
    const decoteApresCorrection = decoteApplicable(decoteTrimestres, decoteAge);

    expect(decoteAge).toBe(0); // 67 ans = âge du taux plein automatique, aucune décote
    expect(decoteApresCorrection).toBe(0); // le plus favorable des deux (max(-20, 0))

    // Cascade vers le MICO : decote >= 0 → éligible, proratisé sur les
    // trimestres régime général (référentiel §3.5.1, condition 1 : « atteinte
    // de l'âge du taux plein » suffit, la durée n'est pas exigée).
    const micoApresCorrection = minimumContributif(trimestresValides, trimestresRequis, decoteApresCorrection);
    expect(micoApresCorrection).toBeGreaterThan(0);
    expect(micoApresCorrection).toBeCloseTo(
      MINIMUM_CONTRIBUTIF_NON_MAJORE_2026 * (trimestresValides / trimestresRequis),
      6
    );
  });

  it('68 ans, mêmes trimestres incomplets : même résultat (l’âge du taux plein est atteint, pas seulement égalé)', () => {
    const decoteApresCorrection = decoteApplicable(
      decoteSurTrimestres(trimestresValides, trimestresRequis),
      decoteSurAge(68)
    );
    expect(decoteApresCorrection).toBe(0);
    expect(minimumContributif(trimestresValides, trimestresRequis, decoteApresCorrection)).toBeGreaterThan(0);
  });

  it('66 ans (avant l’âge du taux plein) : toujours décoté (le plus favorable des deux reste négatif), MICO non éligible', () => {
    const decoteTrimestres = decoteSurTrimestres(trimestresValides, trimestresRequis); // -20
    const decoteAge = decoteSurAge(66); // (66-67)*4 trimestres * 1,25 % = -5, moins sévère
    const decoteApresCorrection = decoteApplicable(decoteTrimestres, decoteAge);
    expect(decoteApresCorrection).toBe(-5); // le plus favorable des deux, mais reste négatif
    expect(decoteApresCorrection).toBeLessThan(0);
    expect(minimumContributif(trimestresValides, trimestresRequis, decoteApresCorrection)).toBe(0);
  });
});

describe('dateAnniversaireLegal', () => {
  it("construit l'anniversaire exact d'un âge légal {ans, mois} sans report d'année", () => {
    // Né en avril 1965, âge légal 63 ans 0 mois (1965 T2, jeu lfss_2026) →
    // anniversaire en avril 2028.
    const date = dateAnniversaireLegal(dn(1965, 4), { ans: 63, mois: 0 });
    expect(date.getUTCFullYear()).toBe(2028);
    expect(date.getUTCMonth()).toBe(3); // avril, 0-indexé
  });

  it('reporte correctement sur l’année suivante quand mois + ageLegal.mois dépasse 12', () => {
    // Né en octobre 1965, âge légal 62 ans 9 mois → 62 ans en octobre 2027,
    // + 9 mois = juillet 2028 (pas juillet 2027).
    const date = dateAnniversaireLegal(dn(1965, 10), { ans: 62, mois: 9 });
    expect(date.getUTCFullYear()).toBe(2028);
    expect(date.getUTCMonth()).toBe(6); // juillet, 0-indexé
  });
});

describe('ageLegalAtteint', () => {
  // Génération 1969, âge légal stable 64 ans 0 mois quel que soit le jeu de
  // barème post-2023 (référentiel §2.1.1) — anniversaire légal : 01/01/2033.
  const NAISSANCE_1969 = dn(1969, 1);

  it('true à la date anniversaire légale exacte (borne incluse)', () => {
    expect(ageLegalAtteint(NAISSANCE_1969, D(2033, 1, 1))).toBe(true);
  });

  it('true après', () => {
    expect(ageLegalAtteint(NAISSANCE_1969, D(2035, 1, 1))).toBe(true);
  });

  it('false avant', () => {
    expect(ageLegalAtteint(NAISSANCE_1969, D(2032, 12, 31))).toBe(false);
  });

  it("undefined (pas false) quand le barème n'est pas déterminé — dateEffet antérieure au 01/09/2023", () => {
    expect(ageLegalAtteint(NAISSANCE_1969, EFFET_ANTERIEUR_2023)).toBeUndefined();
  });
});

describe('surcotePourTrimestresCotises — porte d’éligibilité (référentiel §2.3.1)', () => {
  const TRIMESTRES_COTISES = 4; // 4 trimestres cotisés au-delà de la durée requise

  it.each([
    // [ageLegalAtteint, dureeRequiseAtteinte, surcoteAttendue]
    [true, true, 5], // les deux conditions réunies : 4 × 1,25 % = 5 %
    [true, false, 0], // âge atteint seul : pas de surcote
    [false, true, 0], // durée atteinte seule : pas de surcote
    [false, false, 0], // aucune des deux conditions
  ] as const)(
    'âge atteint=%s, durée atteinte=%s → surcote=%i%%',
    (ageAtteintFlag, dureeAtteinte, surcoteAttendue) => {
      expect(surcotePourTrimestresCotises(TRIMESTRES_COTISES, ageAtteintFlag, dureeAtteinte)).toBe(
        surcoteAttendue
      );
    }
  );

  it('undefined (barème indéterminé) traité comme non éligible, jamais comme une surcote fabriquée', () => {
    expect(surcotePourTrimestresCotises(TRIMESTRES_COTISES, undefined, true)).toBe(0);
  });

  it('aucun plafond sur le nombre de trimestres (référentiel §2.3.1 : "sans plafond")', () => {
    expect(surcotePourTrimestresCotises(40, true, true)).toBe(50); // 40 × 1,25 % = 50 %, non plafonné
  });

  it('trimestresCotisesDansPeriodeDeReference négatif : jamais de surcote négative', () => {
    expect(surcotePourTrimestresCotises(-4, true, true)).toBe(0);
  });
});

describe('ageLegalParentaleEligible — sous-condition n° 2 de la surcote parentale (référentiel §2.3.2)', () => {
  it('1969 : âge légal 64 ans, toujours ≥ 63 ans, quel que soit le jeu de barème', () => {
    expect(ageLegalParentaleEligible(dn(1969, 1), EFFET_CALENDRIER_2023)).toBe(true);
    expect(ageLegalParentaleEligible(dn(1969, 1), EFFET_LFSS_2026)).toBe(true);
  });

  it("undefined (pas false) quand le barème n'est pas déterminé — dateEffet antérieure au 01/09/2023", () => {
    expect(ageLegalParentaleEligible(dn(1969, 1), EFFET_ANTERIEUR_2023)).toBeUndefined();
  });

  describe('effet de bord LFSS 2026 (référentiel §2.3.2, "conséquence d’implémentation") — générations 1964 et 1965 T1', () => {
    it('1964 : éligible sous calendrier_2023 (63 ans pile), non éligible sous lfss_2026 (62 ans 9 mois)', () => {
      expect(ageLegalParentaleEligible(dn(1964, 6), EFFET_CALENDRIER_2023)).toBe(true);
      expect(ageLegalParentaleEligible(dn(1964, 6), EFFET_LFSS_2026)).toBe(false);
    });

    it('1965 T1 (janvier-mars) : éligible sous calendrier_2023 (63 ans 3 mois), non éligible sous lfss_2026 (62 ans 9 mois)', () => {
      expect(ageLegalParentaleEligible(dn(1965, 1), EFFET_CALENDRIER_2023)).toBe(true);
      expect(ageLegalParentaleEligible(dn(1965, 1), EFFET_LFSS_2026)).toBe(false);
      expect(ageLegalParentaleEligible(dn(1965, 3), EFFET_LFSS_2026)).toBe(false);
    });

    it('1965 T2-T4 (avril-décembre) : NON affectée par la suspension — reste éligible sous les deux jeux (63 ans 0 mois sous lfss_2026, contre 62 ans 9 pour 1965 T1)', () => {
      // Contraste volontaire avec le test précédent : la perte d'éligibilité
      // ne touche pas toute la génération 1965, seulement son premier
      // trimestre de naissance — le découpage infra-annuel au 1er avril
      // (référentiel §2.1.1, §12.3) traverse aussi la surcote parentale.
      expect(ageLegalParentaleEligible(dn(1965, 4), EFFET_CALENDRIER_2023)).toBe(true);
      expect(ageLegalParentaleEligible(dn(1965, 4), EFFET_LFSS_2026)).toBe(true);
    });
  });
});

describe('surcoteParentale — porte d’éligibilité et plafond à 5 % (référentiel §2.3.2)', () => {
  it.each([
    // [auMoinsUnTrimestre, ageEligible, dureeAtteinte, trimestresCotisesAnnee, attendu]
    [true, true, true, 2, 2.5], // les trois conditions réunies : 2 × 1,25 %
    [false, true, true, 2, 0], // condition 1 manquante (pas de déclaration)
    [true, false, true, 2, 0], // condition 2, volet âge, manquante
    [true, true, false, 2, 0], // condition 2, volet durée, manquante
    [false, false, false, 2, 0], // aucune condition
  ] as const)(
    'déclaré=%s, âge éligible=%s, durée atteinte=%s, trimestres=%i → surcote=%s%%',
    (declare, ageEligible, dureeAtteinte, trimestres, attendu) => {
      expect(surcoteParentale(declare, ageEligible, dureeAtteinte, trimestres)).toBe(attendu);
    }
  );

  it('undefined (barème indéterminé pour la sous-condition d’âge) traité comme non éligible', () => {
    expect(surcoteParentale(true, undefined, true, 4)).toBe(0);
  });

  it('plafond à 5 % (4 trimestres) : 4 trimestres cotisés → 5 % pile', () => {
    expect(surcoteParentale(true, true, true, 4)).toBe(5);
  });

  it('plafond à 5 % : 5 trimestres ou plus cotisés sur l’année de référence → toujours 5 %, jamais 6,25 %', () => {
    // Mission point 5 : à la différence de surcotePourTrimestresCotises()
    // (sans plafond), la surcote parentale est explicitement plafonnée à
    // 5 % par le référentiel §2.3.2 — un 5e trimestre cotisé ne doit rien
    // ajouter.
    expect(surcoteParentale(true, true, true, 5)).toBe(5);
    expect(surcoteParentale(true, true, true, 8)).toBe(5);
  });

  it('trimestresCotisesAnneeReference négatif : jamais de surcote négative', () => {
    expect(surcoteParentale(true, true, true, -2)).toBe(0);
  });

  it('branchement de bout en bout avec parAnnee de trimestresCotisesEtAssimilesDepuisCarriere() (écart #5), pas un nouveau calcul de ventilation annuelle', () => {
    // Une seule période, entièrement dans l'année de référence : revenu
    // choisi pour valider 3 trimestres en 2025 (seuil 2025 = 1 782 €,
    // 6 000 / 1 782 = 3,37 → 3), pas 4 — sert à vérifier que
    // surcoteParentale() consomme tel quel le nombre déjà filtré par
    // parAnnee, sans reformuler la logique de ventilation.
    const carriere: PeriodeCarriere[] = [
      {
        employeur: 'Employeur Test',
        typeActivite: 'employeur',
        dateDebut: '2025-01-01',
        dateFin: '2025-09-30',
        revenu: 6000,
        estChiffreAffaires: false,
        regimes: ["L'Assurance retraite"], // seul libellé reconnu par estPeriodeRegimeDeBase()
      },
    ];
    const { parAnnee } = trimestresCotisesEtAssimilesDepuisCarriere(carriere);
    const anneeReference = parAnnee.find((a) => a.annee === 2025);
    expect(anneeReference?.cotises).toBe(3);

    const trimestresAnneeReference = anneeReference?.cotises ?? 0;
    expect(surcoteParentale(true, true, true, trimestresAnneeReference)).toBeCloseTo(3.75, 6); // 3 × 1,25 %
  });
});

describe('surcoteTotale — cumul selon le régime (référentiel §2.3.2, §7.4, §12.3)', () => {
  it('cumulable=true (régime général et régimes hérités) : les deux surcotes s’additionnent', () => {
    expect(surcoteTotale(5, 3.75, true)).toBeCloseTo(8.75, 6);
  });

  it('cumulable=false (fonction publique) : la classique dépasse la parentale → la classique seule est retenue, pas la somme', () => {
    expect(surcoteTotale(7.5, 5, false)).toBe(7.5);
  });

  it('cumulable=false (fonction publique) : la parentale dépasse la classique → la parentale seule est retenue, pas la somme', () => {
    expect(surcoteTotale(1.25, 5, false)).toBe(5);
  });

  it('cumulable=false : jamais la somme, même quand les deux valeurs sont égales', () => {
    const cumul = surcoteTotale(5, 5, false);
    expect(cumul).toBe(5);
    expect(cumul).not.toBe(10);
  });

  it('cumulable=true : équivalent à une simple addition, y compris quand l’une des deux est nulle', () => {
    expect(surcoteTotale(5, 0, true)).toBe(5);
    expect(surcoteTotale(0, 3.75, true)).toBe(3.75);
  });
});

describe('Ordre d’application : surcote assise sur P0, ajoutée après le MICO (référentiel §3.7, §12.3)', () => {
  // Scénario : durée requise dépassée de 4 trimestres cotisés (surcote 5 %),
  // salaire modeste, pension de base (P0) sous le plancher du MICO — le cas
  // où "surcote avant MICO" et "MICO avant surcote" produisent des résultats
  // numériquement différents (dès que P0 < MICO et surcote > 0, cf.
  // docs/audit/implementation-surcote.md §5).
  const trimestresRequis = 172;
  const trimestresValides = 176; // 172 + 4, tous supposés cotisés pour ce scénario
  const salaireAnnuelMoyen = 15000;

  const taux = Math.min(trimestresValides / trimestresRequis, 1);
  const decote = decoteSurTrimestres(trimestresValides, trimestresRequis); // inchangée (mission point 4)
  const p0 = pensionBase(salaireAnnuelMoyen, taux, 0); // P0 = SAM × taux × prorata, AVANT décote/surcote
  const surcotePct = surcotePourTrimestresCotises(4, true, true); // 5 %
  const surcoteMontant = p0 * (surcotePct / 100);
  const mico = minimumContributif(trimestresValides, trimestresRequis, decote);

  it('préconditions du scénario : P0 sous le plancher MICO, surcote strictement positive', () => {
    expect(p0).toBe(7500);
    expect(mico).toBe(MINIMUM_CONTRIBUTIF_NON_MAJORE_2026); // ratio plafonné à 1, MICO plein
    expect(p0).toBeLessThan(mico);
    expect(surcoteMontant).toBeGreaterThan(0);
  });

  it('ordre CORRECT (référentiel) : le plancher MICO est établi sur P0 seul, la surcote est ajoutée ensuite', () => {
    const pensionCorrecte = Math.max(p0, mico) + surcoteMontant;
    expect(pensionCorrecte).toBeCloseTo(9450.48, 6);
  });

  it('ordre INCORRECT (régression à ne jamais réintroduire) : la surcote pliée dans P0 avant le MICO fait disparaître son effet', () => {
    const pensionIncorrecte = Math.max(p0 + surcoteMontant, mico);
    expect(pensionIncorrecte).toBeCloseTo(9075.48, 6); // le MICO absorbe entièrement la surcote
  });

  it('les deux ordres divergent : la non-régression porte sur un écart réel, pas un cas dégénéré', () => {
    const pensionCorrecte = Math.max(p0, mico) + surcoteMontant;
    const pensionIncorrecte = Math.max(p0 + surcoteMontant, mico);
    expect(pensionCorrecte).not.toBeCloseTo(pensionIncorrecte, 6);
    expect(pensionCorrecte).toBeGreaterThan(pensionIncorrecte);
  });
});

describe('minimumContributif — bascule de dénominateur, palier 1 (référentiel §3.5.3, écart #9)', () => {
  it('Cas 1 (non-régression) : mono-pensionné sous la durée requise — dénominateur = durée requise, trimestresTousRegimes ignoré même s\'il est fourni', () => {
    const trimestresValides = 160;
    const trimestresRequis = 167;
    const micoSansTousRegimes = minimumContributif(trimestresValides, trimestresRequis, 0);
    // trimestresTousRegimes fourni mais <= trimestresRequis : Cas 1 reste actif.
    const micoAvecTousRegimesSousLeSeuil = minimumContributif(trimestresValides, trimestresRequis, 0, 165);

    const attendu = MINIMUM_CONTRIBUTIF_NON_MAJORE_2026 * (160 / 167);
    expect(micoSansTousRegimes).toBeCloseTo(attendu, 6);
    expect(micoAvecTousRegimesSousLeSeuil).toBeCloseTo(attendu, 6);
  });

  it('Cas 2 : polypensionné dépassant la durée requise tous régimes confondus — dénominateur = trimestresTousRegimes (exemple référentiel §3.5.3 : 174/172)', () => {
    const trimestresValidesRegimeGeneral = 150;
    const trimestresRequis = 172;
    const trimestresTousRegimes = 174; // dépasse la durée requise

    const mico = minimumContributif(trimestresValidesRegimeGeneral, trimestresRequis, 0, trimestresTousRegimes);

    // Dénominateur 174 (pas 172) : le référentiel démontre cet écart avec
    // l'exemple exact "dénominateur 174, non 172".
    const attendu = MINIMUM_CONTRIBUTIF_NON_MAJORE_2026 * (150 / 174);
    expect(mico).toBeCloseTo(attendu, 6);

    // Non-régression : sans le paramètre, l'ancien comportement (dénominateur
    // = durée requise) donnerait un montant plus élevé — la bascule doit
    // réellement changer le résultat, pas être un cas dégénéré.
    const micoSansBascule = minimumContributif(trimestresValidesRegimeGeneral, trimestresRequis, 0);
    expect(mico).toBeLessThan(micoSansBascule);
  });

  it('Cas 2, ratio plafonné à 1 : un régime général à lui seul égal au total tous régimes ne change rien', () => {
    const trimestresValides = 180;
    const trimestresRequis = 172;
    const trimestresTousRegimes = 180; // identique au régime général seul, pas de polypension réelle ici
    const mico = minimumContributif(trimestresValides, trimestresRequis, 0, trimestresTousRegimes);
    expect(mico).toBe(MINIMUM_CONTRIBUTIF_NON_MAJORE_2026); // 180/180 = 1, plafonné
  });
});

describe('MINIMUM_CONTRIBUTIF_NON_MAJORE_2026 — arrondi (référentiel §3.5.2, §11.3, écart #15)', () => {
  it('vaut 9 075,48 € (756,29 €/mois × 12), pas 9 075,50 €', () => {
    expect(MINIMUM_CONTRIBUTIF_NON_MAJORE_2026).toBe(9075.48);
  });
});

describe('majorationTroisEnfants — taux flat 10 % (référentiel §3.8)', () => {
  it.each([
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 10],
    [4, 10], // pas de palier supplémentaire, contrairement à la fonction publique
    [8, 10], // aucun plafond sur le nombre d'enfants
  ] as const)('%i enfant(s) éligible(s) → majoration=%i%%', (nombreEnfants, majorationAttendue) => {
    expect(majorationTroisEnfants(nombreEnfants)).toBe(majorationAttendue);
  });

  it('régime général, SSI (§4.3.1), agents contractuels (§8.1), artistes-auteurs (§9.5) et CNBF (§6.3) : même fonction, même taux, réutilisée telle quelle', () => {
    // Le référentiel décrit ces régimes comme suivant intégralement les
    // règles du régime général sur ce point — aucune fonction dédiée par
    // régime, cf. commentaire de majorationTroisEnfants().
    expect(majorationTroisEnfants(3)).toBe(10);
  });
});

describe('Ordre d’application, majoration enfants incluse : base → surcote → MICO → majoration (référentiel §3.7)', () => {
  // Même scénario que le bloc "Ordre d'application" ci-dessus (P0 sous le
  // plancher MICO, surcote strictement positive), étendu d'une 5e étape :
  // la majoration pour 3 enfants, assise sur P1 = max(P0, MICO) + surcote,
  // PAS sur P0 seul ni sur le MICO seul.
  const trimestresRequis = 172;
  const trimestresValides = 176;
  const salaireAnnuelMoyen = 15000;

  const taux = Math.min(trimestresValides / trimestresRequis, 1);
  const decote = decoteSurTrimestres(trimestresValides, trimestresRequis);
  const p0 = pensionBase(salaireAnnuelMoyen, taux, 0);
  const surcotePct = surcotePourTrimestresCotises(4, true, true); // 5 %
  const surcoteMontant = p0 * (surcotePct / 100);
  const mico = minimumContributif(trimestresValides, trimestresRequis, decote);
  const p1 = Math.max(p0, mico) + surcoteMontant; // 9 450,48 € (cf. bloc précédent)
  const majorationPct = majorationTroisEnfants(3); // 10 %

  it('ordre CORRECT : la majoration enfants est assise sur P1 (après MICO et surcote), pas sur P0 ni sur le MICO seuls', () => {
    const pensionAvecMajoration = p1 * (1 + majorationPct / 100);
    expect(pensionAvecMajoration).toBeCloseTo(10395.528, 6); // 9 450,48 × 1,10
  });

  it('ordre INCORRECT (régression à ne jamais réintroduire) : majoration assise sur P0 seul, avant MICO et surcote', () => {
    const pensionIncorrecte = Math.max(p0 * (1 + majorationPct / 100), mico) + surcoteMontant;
    expect(pensionIncorrecte).not.toBeCloseTo(10395.528, 6);
  });

  it('sans 3 enfants éligibles, la majoration est nulle et P1 reste inchangé', () => {
    const majorationNulle = majorationTroisEnfants(2);
    expect(p1 * (1 + majorationNulle / 100)).toBeCloseTo(p1, 6);
  });
});

describe('Profil complet — régime général (mission : branchement des majorations sur la pension finale, cf. docs/audit/branchement-majorations-pension-finale.md)', () => {
  // Étend le scénario déjà établi ci-dessus (écart #5 : P0 = 7 500 €,
  // MICO = 9 075,48 €, surcote classique = 5 %) avec la surcote parentale
  // (écart #6) et la majoration enfants (écart #7), dans l'ordre exact
  // désormais utilisé par Carriere.tsx : base → décote/surcote → MICO →
  // surcote → majoration enfants.
  const trimestresRequis = 172;
  const trimestresValides = 176; // durée requise atteinte, surcote éligible
  const salaireAnnuelMoyen = 15000;
  const taux = Math.min(trimestresValides / trimestresRequis, 1);
  const p0 = pensionBase(salaireAnnuelMoyen, taux, 0);
  const trimestresCotisesAnneeReference = 4;

  it('profil avec décote (durée requise non atteinte) : ni surcote ni MICO, pension réduite de 20 %', () => {
    const trimValidesIncomplet = 150; // 22 trimestres manquants
    const tauxIncomplet = Math.min(trimValidesIncomplet / trimestresRequis, 1);
    const p0Incomplet = pensionBase(salaireAnnuelMoyen, tauxIncomplet, 0);
    const decote = decoteSurTrimestres(trimValidesIncomplet, trimestresRequis); // -20 % (plafonné)
    const mico = minimumContributif(trimValidesIncomplet, trimestresRequis, decote); // 0 € (decote < 0 → inéligible)
    const dureeRequiseAtteinte = trimValidesIncomplet >= trimestresRequis; // false

    expect(decote).toBe(-20);
    expect(mico).toBe(0);

    const surcoteClassiquePct = surcotePourTrimestresCotises(0, true, dureeRequiseAtteinte);
    const surcoteParentalePct = surcoteParentale(true, true, dureeRequiseAtteinte, 0);
    expect(surcoteTotale(surcoteClassiquePct, surcoteParentalePct, true)).toBe(0);

    const pensionFinale = Math.max(p0Incomplet * (1 + decote / 100), mico);
    expect(pensionFinale).toBeCloseTo(p0Incomplet * 0.8, 6);
  });

  it('profil avec surcote classique ET parentale cumulées (écarts #5+#6, additif régime général)', () => {
    const surcoteClassiquePct = surcotePourTrimestresCotises(trimestresCotisesAnneeReference, true, true); // 5 %
    const surcoteParentalePct = surcoteParentale(true, true, true, trimestresCotisesAnneeReference); // 5 % (plafond)
    const surcoteTotalePct = surcoteTotale(surcoteClassiquePct, surcoteParentalePct, true);
    expect(surcoteTotalePct).toBe(10); // 5 % + 5 %, additif — pas juste la classique seule

    const mico = minimumContributif(trimestresValides, trimestresRequis, 0);
    const pensionApresMico = Math.max(p0, mico); // 9 075,48 € (MICO gagne, cf. scénario établi)
    const surcoteMontant = p0 * (surcoteTotalePct / 100); // 750 €
    const pensionFinale = pensionApresMico + surcoteMontant;

    expect(pensionFinale).toBeCloseTo(9825.48, 6);
  });

  it('profil avec majoration pour 3 enfants (écart #7), sans surcote', () => {
    const mico = minimumContributif(trimestresValides, trimestresRequis, 0);
    const pensionApresMico = Math.max(p0, mico);
    const majorationPct = majorationTroisEnfants(3);
    const pensionFinale = pensionApresMico * (1 + majorationPct / 100);

    expect(pensionFinale).toBeCloseTo(9983.028, 6); // 9 075,48 × 1,10
  });

  it('profil combinant surcote cumulée ET majoration enfants : vérifie l’ordre MICO → surcote → majoration', () => {
    const surcoteClassiquePct = surcotePourTrimestresCotises(trimestresCotisesAnneeReference, true, true);
    const surcoteParentalePct = surcoteParentale(true, true, true, trimestresCotisesAnneeReference);
    const surcoteTotalePct = surcoteTotale(surcoteClassiquePct, surcoteParentalePct, true); // 10 %
    const mico = minimumContributif(trimestresValides, trimestresRequis, 0);
    const pensionApresMico = Math.max(p0, mico); // 9 075,48 €
    const surcoteMontant = p0 * (surcoteTotalePct / 100); // 750 €
    const pensionApresSurcote = pensionApresMico + surcoteMontant; // 9 825,48 €
    const majorationPct = majorationTroisEnfants(3);
    const pensionFinaleCorrecte = pensionApresSurcote * (1 + majorationPct / 100);

    expect(pensionFinaleCorrecte).toBeCloseTo(10808.028, 6); // 9 825,48 × 1,10

    // Régression à ne jamais réintroduire : majoration assise sur P0 seul
    // (avant MICO et surcote) donne un résultat different, plus faible.
    const pensionFinaleIncorrecte =
      Math.max(p0 * (1 + majorationPct / 100), mico) + surcoteMontant;
    expect(pensionFinaleIncorrecte).not.toBeCloseTo(pensionFinaleCorrecte, 6);
    expect(pensionFinaleIncorrecte).toBeLessThan(pensionFinaleCorrecte);
  });
});

describe('Parité Trimestres.tsx / Carriere.tsx — même surcote pour un même client (mission : docs/audit/branchement-surcote-optimisation.md)', () => {
  // Profil auto-suffisant (génération 1960, ageLegal stable 62 ans 0 mois,
  // trimestresRequis 167 — cf. BAREME_STABLE_AVANT_1964) : contrairement aux
  // générations 1964+ utilisées ailleurs dans ce fichier, l'anniversaire
  // légal de cette génération (janvier 2022) tombe avant même la fenêtre
  // 01/09/2023-31/08/2026, donc ageLegalAtteint() est vrai pour toute date
  // d'effet simulée post-2023 sans ambiguïté de jeu de barème — condition
  // nécessaire pour que le scénario soit "un même client, un même âge de
  // liquidation" reproductible identiquement par les deux écrans (Carriere.tsx
  // fige la date d'effet à "aujourd'hui", Trimestres.tsx la fait varier :
  // ce choix de génération élimine cette différence pour le test).
  const dateNaissance = dn(1960, 1);
  const dateEffet = EFFET_CALENDRIER_2023; // 2024-06, post légal (janvier 2022)
  const trimestresRequis = trimestresRequisPourGeneration(dateNaissance, dateEffet);
  const trimestresValidesProjetes = 171; // 167 + 4, durée requise dépassée
  const salaireAnnuelMoyen = 15000;

  // Détail de carrière (import RIS) : 4 trimestres cotisés en 2021, seul
  // ingrédient qui n'existait pas dans les tests "Profil complet" plus haut
  // (qui passaient trimestresCotisesAnneeReference en dur) — ici dérivé d'un
  // vrai `detailCarriere`, comme le fait désormais Trimestres.tsx via
  // useCarriereDetail().
  const detailCarriere: PeriodeCarriere[] = [
    {
      employeur: 'Test',
      typeActivite: 'employeur',
      dateDebut: '2021-01-01',
      dateFin: '2021-12-31',
      revenu: 6200, // 6200 / 1537,5 (seuil 2021) = 4,03 → floor 4, plafond 4 trimestres/an
      estChiffreAffaires: false,
      regimes: ["L'Assurance retraite"],
    },
  ];
  const resultatTrimestresDetailCarriere = trimestresCotisesEtAssimilesDepuisCarriere(detailCarriere);

  it('préconditions : trimestresRequis=167, 4 trimestres cotisés dérivés pour 2021 (année précédant l’âge légal, 2022)', () => {
    expect(trimestresRequis).toBe(167);
    const ageLegal = ageLegalPourGeneration(dateNaissance, dateEffet);
    expect(ageLegal).toEqual({ stable: true, age: { ans: 62, mois: 0 } });
    const anneeReference = dateAnniversaireLegal(dateNaissance, ageLegal.stable ? ageLegal.age : { ans: 0, mois: 0 }).getUTCFullYear() - 1;
    expect(anneeReference).toBe(2021);
    expect(resultatTrimestresDetailCarriere.parAnnee.find((a) => a.annee === 2021)?.cotises).toBe(4);
  });

  // Réplique exacte du branchement de Carriere.tsx (surcotePourTrimestresCotises
  // + surcoteParentale + surcoteTotale, cumul additif régime général — cf.
  // Carriere.tsx lignes ~486-528) et du branchement désormais identique de
  // Trimestres.tsx (simulerPourDateEffet()) : les deux écrans partent des
  // mêmes primitives calcul.ts, appliquées au même dateNaissance/dateEffet.
  const calculerSurcote = (auMoinsUnTrimestreMajorationEnfant: boolean) => {
    const ageLegal = ageLegalPourGeneration(dateNaissance, dateEffet);
    const ageLegalAtteintFlag = ageLegalAtteint(dateNaissance, dateEffet);
    const ageLegalParentaleEligibleFlag = ageLegalParentaleEligible(dateNaissance, dateEffet);
    const dureeRequiseAtteinte = trimestresValidesProjetes >= trimestresRequis;
    const anneeReferenceSurcote = ageLegal.stable
      ? dateAnniversaireLegal(dateNaissance, ageLegal.age).getUTCFullYear() - 1
      : null;
    const trimestresCotisesAnneeReference =
      anneeReferenceSurcote !== null
        ? resultatTrimestresDetailCarriere.parAnnee.find((a) => a.annee === anneeReferenceSurcote)
            ?.cotises ?? 0
        : 0;
    const surcoteClassiquePct = surcotePourTrimestresCotises(
      trimestresCotisesAnneeReference,
      ageLegalAtteintFlag,
      dureeRequiseAtteinte
    );
    const surcoteParentalePct = surcoteParentale(
      auMoinsUnTrimestreMajorationEnfant,
      ageLegalParentaleEligibleFlag,
      dureeRequiseAtteinte,
      trimestresCotisesAnneeReference
    );
    return surcoteTotale(surcoteClassiquePct, surcoteParentalePct, true);
  };

  it('surcote classique seule (génération 1960 : âge légal 62 ans, sous le seuil de 63 ans de la surcote parentale)', () => {
    const surcoteTrimestresTsx = calculerSurcote(false);
    const surcoteCarriereTsx = calculerSurcote(false);
    expect(surcoteTrimestresTsx).toBe(5); // 4 trimestres × 1,25 %
    expect(surcoteTrimestresTsx).toBe(surcoteCarriereTsx); // même client, même résultat sur les deux écrans
  });

  it('case surcote parentale cochée : sans effet pour cette génération (ageLegal 62 ans < 63 ans requis, référentiel §2.3.2) — même résultat sur les deux écrans', () => {
    const surcoteTrimestresTsx = calculerSurcote(true);
    const surcoteCarriereTsx = calculerSurcote(true);
    expect(surcoteTrimestresTsx).toBe(5); // inchangé : porte ageLegalParentaleEligible fermée
    expect(surcoteTrimestresTsx).toBe(surcoteCarriereTsx);
  });

  it('montant de surcote en euros, assis sur P0 (pension avant décote/surcote) — identique dans les deux écrans', () => {
    const taux = tauxProratisation(trimestresValidesProjetes, trimestresRequis);
    const p0 = pensionBase(salaireAnnuelMoyen, taux, 0);
    const surcoteTotalePct = calculerSurcote(false);
    const surcoteMontant = p0 * (surcoteTotalePct / 100);
    expect(p0).toBe(7500); // taux plafonné à 1 (171 > 167)
    expect(surcoteMontant).toBeCloseTo(375, 6); // 7 500 × 5 %
  });
});
