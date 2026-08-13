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
  surcotePourTrimestresCotises,
  pensionBase,
  DateNaissance,
} from './calcul';
import { computeAge } from '../patrimoine/bareme669CGI';

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
    expect(pensionCorrecte).toBeCloseTo(9450.5, 6);
  });

  it('ordre INCORRECT (régression à ne jamais réintroduire) : la surcote pliée dans P0 avant le MICO fait disparaître son effet', () => {
    const pensionIncorrecte = Math.max(p0 + surcoteMontant, mico);
    expect(pensionIncorrecte).toBeCloseTo(9075.5, 6); // le MICO absorbe entièrement la surcote
  });

  it('les deux ordres divergent : la non-régression porte sur un écart réel, pas un cas dégénéré', () => {
    const pensionCorrecte = Math.max(p0, mico) + surcoteMontant;
    const pensionIncorrecte = Math.max(p0 + surcoteMontant, mico);
    expect(pensionCorrecte).not.toBeCloseTo(pensionIncorrecte, 6);
    expect(pensionCorrecte).toBeGreaterThan(pensionIncorrecte);
  });
});
