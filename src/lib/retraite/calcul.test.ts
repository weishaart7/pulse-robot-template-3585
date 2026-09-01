import { describe, it, expect } from 'vitest';
import {
  minimumContributif,
  MINIMUM_CONTRIBUTIF_NON_MAJORE_2026,
  MINIMUM_CONTRIBUTIF_MAJORE_2026,
  PLAFOND_GLOBAL_PENSIONS_2026,
  TRIMESTRES_COTISES_SEUIL_PALIER_2,
  majorationPalier2MICO,
  ecretementMICO,
  decoteSurTrimestresPlafond25,
  decoteSurAge,
  decoteApplicable,
  baremeDependDUneLoiNonVotee,
  FIN_PERIODE_BAREME_LFSS_2026_VOTEE,
  AVERTISSEMENT_BAREME_NON_VOTE,
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
  trimestresCotisesPeriodeSurcoteClassique,
  surcoteParentale,
  surcoteTotale,
  pensionBase,
  tauxProratisation,
  majorationTroisEnfants,
  pensionTotaleConsolideeTousRegimes,
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
    const decote = decoteSurTrimestresPlafond25(trimestresValides, trimestresRequis);

    expect(decote).toBeGreaterThanOrEqual(0);
    expect(minimumContributif(trimestresValides, trimestresRequis, decote)).toBe(
      MINIMUM_CONTRIBUTIF_NON_MAJORE_2026
    );
  });

  it('cas réel Titouan Weishaar : 28/172 trimestres, decote -25% → non éligible, MiCo nul', () => {
    const trimestresValides = 28;
    const trimestresRequis = 172;
    const decote = decoteSurTrimestresPlafond25(trimestresValides, trimestresRequis);

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

describe('Carriere.tsx — combinaison decoteSurTrimestresPlafond25 + decoteSurAge (écart #4, audit-retraite.md §7)', () => {
  // Reproduit exactement le calcul de decoteSurcote dans Carriere.tsx après
  // correction : decoteApplicable(decoteSurTrimestresPlafond25(...), decoteSurAge(...)),
  // même logique que l'onglet Optimisation (Trimestres.tsx) — pas une
  // nouvelle implémentation. Scénario explicite demandé par la mission :
  // assuré de 67 ans ou plus, trimestres incomplets.
  const trimestresValides = 140;
  const trimestresRequis = 172; // génération 1969+, valeur stable
  const ageActuel = 67; // âge du taux plein automatique (référentiel §2.1.4)

  it("« avant correction » (bug reproduit) : décote sur trimestres seule, décote à tort de -25 %", () => {
    const decoteAvantCorrection = decoteSurTrimestresPlafond25(trimestresValides, trimestresRequis);
    expect(decoteAvantCorrection).toBe(-25); // (140-172)*1.25 = -40, plafonné à -25 (20 trimestres)

    // Cascade vers le MICO : minimumContributif() exclut toute pension
    // décotée (decote < 0) — l'éligibilité est donc refusée à tort.
    expect(minimumContributif(trimestresValides, trimestresRequis, decoteAvantCorrection)).toBe(0);
  });

  it('« après correction » : decoteApplicable retient l’âge (0 %, taux plein automatique), pas la décote sur trimestres', () => {
    const decoteTrimestres = decoteSurTrimestresPlafond25(trimestresValides, trimestresRequis);
    const decoteAge = decoteSurAge(ageActuel);
    const decoteApresCorrection = decoteApplicable(decoteTrimestres, decoteAge);

    expect(decoteAge).toBe(0); // 67 ans = âge du taux plein automatique, aucune décote
    expect(decoteApresCorrection).toBe(0); // le plus favorable des deux (max(-25, 0))

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
      decoteSurTrimestresPlafond25(trimestresValides, trimestresRequis),
      decoteSurAge(68)
    );
    expect(decoteApresCorrection).toBe(0);
    expect(minimumContributif(trimestresValides, trimestresRequis, decoteApresCorrection)).toBeGreaterThan(0);
  });

  it('66 ans (avant l’âge du taux plein) : toujours décoté (le plus favorable des deux reste négatif), MICO non éligible', () => {
    const decoteTrimestres = decoteSurTrimestresPlafond25(trimestresValides, trimestresRequis); // -25
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
  const decote = decoteSurTrimestresPlafond25(trimestresValides, trimestresRequis); // inchangée (mission point 4)
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

describe('majorationPalier2MICO — MICO majoré, palier 2 (référentiel §3.5.4, écart #10)', () => {
  // Les exemples 4/5/6 du référentiel utilisent le barème 2025 (747,69 € /
  // 893,65 €, supplément 145,96 €) alors que cette fonction est câblée sur
  // les constantes 2026 (même convention que la reproduction de l'exemple
  // §3.5.3 pour l'écart #9, cf. describe « bascule de dénominateur, palier 1 »
  // ci-dessus) : on reproduit donc la STRUCTURE de chaque exemple (mêmes
  // trimestres, même bascule de dénominateur, même double proratisation),
  // avec un montant « attendu » recalculé à partir du supplément 2026 réel,
  // pas les euros du référentiel tels quels — cf.
  // docs/audit/implementation-mico-majore.md pour la justification complète.
  const SUPPLEMENT_2026 = MINIMUM_CONTRIBUTIF_MAJORE_2026 - MINIMUM_CONTRIBUTIF_NON_MAJORE_2026;

  it('sous le seuil de 120 trimestres cotisés → majoration nulle (non-régression)', () => {
    expect(majorationPalier2MICO(119, 169, 169, 0)).toBe(0);
    expect(majorationPalier2MICO(0, 169, 169, 0)).toBe(0);
  });

  it('decote < 0 (pension décotée) → majoration nulle, même condition d\'éligibilité que le palier 1', () => {
    expect(majorationPalier2MICO(150, 169, 169, -5)).toBe(0);
  });

  it('exemple 4 du référentiel — mono-régime aligné, 169/169 trimestres dont 150 cotisés', () => {
    // référentiel : (893,65 − 747,69) × 150/169 = 130 € (2025)
    const majoration = majorationPalier2MICO(150, 169, 169, 0);
    const attendu = SUPPLEMENT_2026 * (150 / 169);
    expect(majoration).toBeCloseTo(attendu, 6);
    // Même structure que l'exemple référentiel : un seul prorata (mono-régime).
    expect(majoration).toBeCloseTo(SUPPLEMENT_2026 * (150 / 169), 6);
  });

  it('exemple 5 du référentiel — polypensionné, Cas 1 (169 tous régimes = 169 requis), 160 au régime général dont 150 cotisés', () => {
    // référentiel : (893,65 − 747,69) × (150/169) × (160/169) = 123 € (2025)
    const majoration = majorationPalier2MICO(150, 160, 169, 0, 169);
    const attendu = SUPPLEMENT_2026 * (150 / 169) * (160 / 169);
    expect(majoration).toBeCloseTo(attendu, 6);
    // Double proratisation effective : strictement inférieure au résultat
    // mono-régime de l'exemple 4 malgré le même trim_cotisés (150) — c'est
    // la « part du régime général dans le total validé » qui réduit encore.
    expect(majoration).toBeLessThan(SUPPLEMENT_2026 * (150 / 169));
  });

  it('exemple 6 du référentiel — polypensionné, Cas 2 (171 tous régimes > 169 requis) : bascule de dénominateur à 171, comme le palier 1', () => {
    // Le référentiel affiche « (893,65 − 747,69) × 160/171 = 137 € » pour cet
    // exemple — une fraction UNIQUE, alors que la formule générale du
    // référentiel pour un polypensionné prévoit deux facteurs
    // (trim_cotisés/D × trim_RG_alignés/trim_tous_régimes). Reproduire 137 €
    // exactement exigerait un trim_cotisés « tous régimes confondus » (171,
    // pas 160) — une donnée que cet outil ne peut pas calculer pour un
    // polypensionné fonction publique/CNAVPL (aucune distinction cotisé/
    // assimilé n'existe pour ces régimes). Écart documenté en détail dans
    // docs/audit/implementation-mico-majore.md (Étape 1, point a) : ce test
    // vérifie donc la structure réellement implémentable et calculable ici
    // (trim_cotisés scopé au régime général/aligné, seule donnée disponible),
    // volontairement plus prudente (résultat plus bas) que le calcul du
    // référentiel.
    const trimestresCotisesRegimeGeneral = 160; // "tous cotisés" côté régime général
    const trimestresRegimeGeneral = 160;
    const trimestresRequis = 169;
    const trimestresTousRegimes = 171;

    const majoration = majorationPalier2MICO(
      trimestresCotisesRegimeGeneral,
      trimestresRegimeGeneral,
      trimestresRequis,
      0,
      trimestresTousRegimes
    );

    // Dénominateur bascule à 171 (comme le palier 1 pour ce même exemple,
    // cf. describe « bascule de dénominateur, palier 1 » ci-dessus), pas 169.
    const attendu = SUPPLEMENT_2026 * (160 / 171) * (160 / 171);
    expect(majoration).toBeCloseTo(attendu, 6);

    // Non-régression de la bascule : sans dénominateur 171, le résultat
    // serait strictement plus élevé (169 < 171) — la bascule doit réellement
    // changer le résultat.
    const sansBascule = SUPPLEMENT_2026 * (160 / 169) * (160 / 169);
    expect(majoration).toBeLessThan(sansBascule);
  });

  it('mono-régime au sens large : régime général seul égal au total tous régimes (trimestresTousRegimes fourni mais non supérieur) → un seul prorata', () => {
    const majoration = majorationPalier2MICO(150, 169, 169, 0, 169);
    expect(majoration).toBeCloseTo(SUPPLEMENT_2026 * (150 / 169), 6);
  });

  it('trimestres cotisés plafonnés à 100 % du dénominateur (garde-fou, jamais atteint dans les exemples référentiel mais protège contre une saisie incohérente)', () => {
    const majoration = majorationPalier2MICO(250, 169, 169, 0);
    expect(majoration).toBeCloseTo(SUPPLEMENT_2026 * 1, 6);
  });
});

describe('ecretementMICO — réduction du MICO au-delà du plafond global (référentiel §3.5.5, écart #10)', () => {
  it('sous le plafond : majoration inchangée (non-régression, comportement par défaut)', () => {
    const majoration = ecretementMICO(550 * 12, 100 * 12, 0, PLAFOND_GLOBAL_PENSIONS_2026);
    expect(majoration).toBe(100 * 12);
  });

  it('reproduit la structure de l\'exemple référentiel §3.5.5 — reprise de l\'exemple 4 avec 600 €/mois d\'autres pensions', () => {
    // référentiel (barème 2025) : P0=550, majoration_p1=197,69, majoration_p2=130,
    // total pension = 877,69 ; + 600 = 1 477,69 > plafond 2025 (1 394,86) →
    // réduction de 82,83 €, majoration ramenée de 327,69 € à 244,86 €. Même
    // logique reproduite ici avec les montants 2026 (mensuel × 12, cohérent
    // avec la convention annuelle du reste du module) plutôt que les euros
    // 2025 du référentiel — cf. describe majorationPalier2MICO ci-dessus pour
    // la même justification.
    const pensionBaseHorsMicoHorsSurcote = 550 * 12;
    const majorationAvantEcretement = 327.69 * 12; // 197,69 (p1) + 130 (p2), structure de l'exemple 4
    const autresPensionsAnnuelles = 600 * 12;
    const plafondAnnuel = 1394.86 * 12; // plafond 2025, pour coller exactement à l'exemple référentiel

    const majorationApresEcretement = ecretementMICO(
      pensionBaseHorsMicoHorsSurcote,
      majorationAvantEcretement,
      autresPensionsAnnuelles,
      plafondAnnuel
    );

    expect(majorationApresEcretement).toBeCloseTo(244.86 * 12, 1);
    expect(majorationAvantEcretement - majorationApresEcretement).toBeCloseTo(82.83 * 12, 1);
  });

  it('réduction jamais négative : plafonnée à 0, pas de majoration négative même en cas de dépassement massif', () => {
    const majoration = ecretementMICO(550 * 12, 100 * 12, 100000, PLAFOND_GLOBAL_PENSIONS_2026);
    expect(majoration).toBe(0);
  });

  it('utilise PLAFOND_GLOBAL_PENSIONS_2026 par défaut si le plafond n\'est pas fourni explicitement', () => {
    const majoration = ecretementMICO(550 * 12, 100 * 12, 0);
    expect(majoration).toBe(100 * 12);
  });

  it('autres pensions à 0 (défaut, champ non renseigné) : comportement identique à l\'absence du paramètre', () => {
    const avecZero = ecretementMICO(800 * 12, 100 * 12, 0, PLAFOND_GLOBAL_PENSIONS_2026);
    expect(avecZero).toBe(100 * 12); // 800+100=900 < plafond mensuel (1444,89), aucune réduction
  });
});

describe('PLAFOND_GLOBAL_PENSIONS_2026 et MINIMUM_CONTRIBUTIF_MAJORE_2026 — valeurs 2026 (référentiel §3.5.2, §3.5.5)', () => {
  it('MINIMUM_CONTRIBUTIF_MAJORE_2026 vaut 10 847,16 € (903,93 €/mois × 12)', () => {
    expect(MINIMUM_CONTRIBUTIF_MAJORE_2026).toBe(10847.16);
  });

  it('PLAFOND_GLOBAL_PENSIONS_2026 vaut 17 338,68 € (1 444,89 €/mois × 12, revalorisation du 1er juin 2026)', () => {
    expect(PLAFOND_GLOBAL_PENSIONS_2026).toBe(17338.68);
    // Cohérence mensuel/annuel : la constante est bien un montant ANNUEL.
    expect(PLAFOND_GLOBAL_PENSIONS_2026 / 12).toBeCloseTo(1444.89, 2);
    // Régression : ne pas revenir à la valeur du 1er janvier 2026.
    expect(PLAFOND_GLOBAL_PENSIONS_2026).not.toBe(16930.68);
  });

  it('la revalorisation du 1er juin 2026 relève effectivement le plafond (écrêtement moins sévère)', () => {
    // Un profil dont le total de pensions tombe entre les deux plafonds :
    // écrêté sous l'ancien, intact sous le nouveau.
    const PLAFOND_1ER_JANVIER_2026 = 16930.68;
    const pensionBaseHorsMico = 1300 * 12;
    const majoration = 120 * 12; // total 1 420 €/mois : entre 1 410,89 et 1 444,89

    const avecAncienPlafond = ecretementMICO(pensionBaseHorsMico, majoration, 0, PLAFOND_1ER_JANVIER_2026);
    const avecNouveauPlafond = ecretementMICO(pensionBaseHorsMico, majoration, 0, PLAFOND_GLOBAL_PENSIONS_2026);

    expect(avecAncienPlafond).toBeLessThan(majoration); // écrêté
    expect(avecNouveauPlafond).toBe(majoration); // plus écrêté
  });

  it('TRIMESTRES_COTISES_SEUIL_PALIER_2 vaut 120', () => {
    expect(TRIMESTRES_COTISES_SEUIL_PALIER_2).toBe(120);
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
  const decote = decoteSurTrimestresPlafond25(trimestresValides, trimestresRequis);
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

  it('profil avec décote (durée requise non atteinte) : ni surcote ni MICO, pension réduite de 25 %', () => {
    const trimValidesIncomplet = 150; // 22 trimestres manquants
    const tauxIncomplet = Math.min(trimValidesIncomplet / trimestresRequis, 1);
    const p0Incomplet = pensionBase(salaireAnnuelMoyen, tauxIncomplet, 0);
    const decote = decoteSurTrimestresPlafond25(trimValidesIncomplet, trimestresRequis); // -25 % (plafonné à 20 trimestres)
    const mico = minimumContributif(trimValidesIncomplet, trimestresRequis, decote); // 0 € (decote < 0 → inéligible)
    const dureeRequiseAtteinte = trimValidesIncomplet >= trimestresRequis; // false

    expect(decote).toBe(-25);
    expect(mico).toBe(0);

    const surcoteClassiquePct = surcotePourTrimestresCotises(0, true, dureeRequiseAtteinte);
    const surcoteParentalePct = surcoteParentale(true, true, dureeRequiseAtteinte, 0);
    expect(surcoteTotale(surcoteClassiquePct, surcoteParentalePct, true)).toBe(0);

    const pensionFinale = Math.max(p0Incomplet * (1 + decote / 100), mico);
    expect(pensionFinale).toBeCloseTo(p0Incomplet * 0.75, 6);
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

describe('pensionTotaleConsolideeTousRegimes — non-régression docs/audit/audit-fonction-publique-cnavpl.md', () => {
  const pensionTotaleRegimeGeneral = 12000;
  const resultatFonctionPublique = { pensionFinale: 8000, rafpAnnuelle: 500 };
  const resultatCNAVPL = { pensionFinale: 3000 };

  it('inclut fonction publique et CNAVPL quand les deux blocs sont cochés', () => {
    const total = pensionTotaleConsolideeTousRegimes(
      pensionTotaleRegimeGeneral,
      true,
      resultatFonctionPublique,
      true,
      resultatCNAVPL
    );
    expect(total).toBe(12000 + 8500 + 3000);
  });

  it('exclut fonction publique/CNAVPL quand les blocs ne sont pas cochés, même si un résultat résiduel existe', () => {
    const total = pensionTotaleConsolideeTousRegimes(
      pensionTotaleRegimeGeneral,
      false,
      resultatFonctionPublique,
      false,
      resultatCNAVPL
    );
    expect(total).toBe(pensionTotaleRegimeGeneral);
  });

  it('simule un rechargement de page : has_fonction_publique/has_cnavpl relus depuis retraite_data restent à true, le total consolidé ne redescend plus silencieusement au régime général seul', () => {
    // Avant la migration 20260815020000 / le branchement de cette session
    // (cf. docs/audit/audit-fonction-publique-cnavpl.md), aucune colonne
    // has_fonction_publique/has_cnavpl n'existait en base : au rechargement
    // de Carriere.tsx, l'état React repartait systématiquement de
    // useState(false), et ce total retombait silencieusement à
    // pensionTotaleRegimeGeneral seul, quelle que soit la saisie
    // précédente de l'utilisateur.
    const ligneRetraiteDataApresRechargement = {
      has_fonction_publique: true,
      trimestres_liquidables_fp: 60,
      has_cnavpl: true,
      trimestres_cnavpl: 40,
    };

    // Reproduit la sémantique de chargement de Carriere.tsx
    // (`if (data.has_fonction_publique !== undefined) setHasFonctionPublique(...)`) :
    // une ligne déjà enregistrée a toujours ces deux colonnes définies
    // (NOT NULL DEFAULT false en base), donc l'état repart bien de la
    // valeur persistée après la correction, pas du défaut React.
    const hasFonctionPubliqueApresRechargement =
      ligneRetraiteDataApresRechargement.has_fonction_publique !== undefined
        ? ligneRetraiteDataApresRechargement.has_fonction_publique
        : false;
    const hasCNAVPLApresRechargement =
      ligneRetraiteDataApresRechargement.has_cnavpl !== undefined
        ? ligneRetraiteDataApresRechargement.has_cnavpl
        : false;

    const totalAvantRechargement = pensionTotaleConsolideeTousRegimes(
      pensionTotaleRegimeGeneral,
      true,
      resultatFonctionPublique,
      true,
      resultatCNAVPL
    );
    const totalApresRechargement = pensionTotaleConsolideeTousRegimes(
      pensionTotaleRegimeGeneral,
      hasFonctionPubliqueApresRechargement,
      resultatFonctionPublique,
      hasCNAVPLApresRechargement,
      resultatCNAVPL
    );

    expect(totalApresRechargement).toBe(totalAvantRechargement);
    expect(totalApresRechargement).toBeGreaterThan(pensionTotaleRegimeGeneral);
  });
});


describe('Plafond de décote du régime général : -25 % (art. R. 351-27 CSS, 20 trimestres × 1,25 %)', () => {
  const trimestresRequis = 172;

  it('exactement 20 trimestres manquants : -25 %, la borne est atteinte pile', () => {
    // 20 × 1,25 % = 25 % — le plafond légal n'écrête pas encore, il coïncide.
    expect(decoteSurTrimestresPlafond25(trimestresRequis - 20, trimestresRequis)).toBe(-25);
  });

  it('au-delà de 20 trimestres manquants : la décote reste bloquée à -25 %, jamais -20 %', () => {
    // Régression verrouillée : l'ancien plafond -20 % confondait le plafond
    // en NOMBRE de trimestres (20, art. R. 351-27 CSS) avec un plafond en
    // POURCENTAGE, et minorait la décote de 5 points pour tous ces profils.
    for (const manquants of [21, 32, 40, 144]) {
      const decote = decoteSurTrimestresPlafond25(trimestresRequis - manquants, trimestresRequis);
      expect(decote).toBe(-25);
      expect(decote).not.toBe(-20);
    }
  });

  it('19 trimestres manquants : -23,75 %, non plafonné (le plafond ne mord pas avant 20)', () => {
    expect(decoteSurTrimestresPlafond25(trimestresRequis - 19, trimestresRequis)).toBe(-23.75);
  });

  it('decoteApplicable ne masque plus le -25 % : départ anticipé ET trimestres très incomplets', () => {
    // Le point sensible de la bascule. decoteApplicable() retient le moins
    // sévère des deux comptages ; tant que decoteSurAge() plafonnait à -20 %,
    // il écrêtait le résultat commun à -20 % alors que les DEUX comptages
    // dépassaient 20 trimestres manquants — la décote légale est bien -25 %.
    const decoteTrimestres = decoteSurTrimestresPlafond25(140, trimestresRequis); // 32 manquants
    const decoteAge = decoteSurAge(62); // (62-67) × 4 = 20 trimestres d'écart

    expect(decoteTrimestres).toBe(-25);
    expect(decoteAge).toBe(-25);
    expect(decoteApplicable(decoteTrimestres, decoteAge)).toBe(-25);
  });

  it('decoteApplicable reste inchangé quand le comptage sur l’âge est le plus favorable', () => {
    // Non-régression de la règle du plus favorable : elle doit continuer de
    // faire gagner l'assuré, la bascule de plafond ne la durcit pas.
    expect(decoteApplicable(decoteSurTrimestresPlafond25(140, trimestresRequis), decoteSurAge(67))).toBe(0);
    expect(decoteApplicable(decoteSurTrimestresPlafond25(140, trimestresRequis), decoteSurAge(66))).toBe(-5);
  });

  it('cascade métier : 20 trimestres manquants → pension amputée de 25 %, MiCo refusé', () => {
    const trimestresValides = trimestresRequis - 20;
    const decote = decoteSurTrimestresPlafond25(trimestresValides, trimestresRequis);
    const p0 = pensionBase(30000, tauxProratisation(trimestresValides, trimestresRequis), 0);

    expect(p0 * (1 + decote / 100)).toBeCloseTo(p0 * 0.75, 6);
    // Toute décote exclut le MiCo (condition de taux plein), inchangé.
    expect(minimumContributif(trimestresValides, trimestresRequis, decote)).toBe(0);
  });
});


describe('trimestresCotisesPeriodeSurcoteClassique — période propre à la surcote classique (art. L. 351-1-2 CSS)', () => {
  // Génération 1961 (mois 3) : âge légal 62 ans, atteint le 1er mars 2023 →
  // la période de référence s'ouvre en 2024.
  const dateNaissance = { annee: 1961, mois: 3 };
  const ageLegal = ageLegalPourGeneration(dateNaissance, new Date('2026-09-01T00:00:00Z'));
  const dateEffet = new Date('2026-09-01T00:00:00Z');
  const an = (annee: number, cotises: number) => ({ annee, cotises });

  it('somme les trimestres cotisés des années suivant l’âge légal jusqu’à la date d’effet', () => {
    const parAnnee = [an(2024, 4), an(2025, 4), an(2026, 4)];
    expect(trimestresCotisesPeriodeSurcoteClassique(parAnnee, dateNaissance, ageLegal, dateEffet)).toBe(12);
  });

  it('exclut l’année de l’âge légal elle-même et toutes les années antérieures', () => {
    const parAnnee = [an(2021, 4), an(2022, 4), an(2023, 4), an(2024, 4)];
    // Seule 2024 compte : 2023 est l'année de l'âge légal, exclue en entier.
    expect(trimestresCotisesPeriodeSurcoteClassique(parAnnee, dateNaissance, ageLegal, dateEffet)).toBe(4);
  });

  it('écrête chaque année à 4 trimestres', () => {
    const parAnnee = [an(2024, 7), an(2025, 4)];
    expect(trimestresCotisesPeriodeSurcoteClassique(parAnnee, dateNaissance, ageLegal, dateEffet)).toBe(8);
  });

  it('aucun plafond global : la surcote classique n’est pas bornée à 4 trimestres', () => {
    const parAnnee = [an(2024, 4), an(2025, 4), an(2026, 4)];
    const total = trimestresCotisesPeriodeSurcoteClassique(parAnnee, dateNaissance, ageLegal, dateEffet);
    expect(total).toBeGreaterThan(4);
    // C'est la différence de fond avec la surcote parentale, elle plafonnée à 4.
    expect(surcoteParentale(true, true, true, total)).toBe(5); // 4 × 1,25 %
    expect(surcotePourTrimestresCotises(total, true, true)).toBe(15); // 12 × 1,25 %
  });

  it('ignore les années postérieures à la date d’effet', () => {
    const parAnnee = [an(2024, 4), an(2027, 4), an(2030, 4)];
    expect(trimestresCotisesPeriodeSurcoteClassique(parAnnee, dateNaissance, ageLegal, dateEffet)).toBe(4);
  });

  it('date d’effet plus tardive : la période s’étend (scénario de l’onglet Optimisation)', () => {
    const parAnnee = [an(2024, 4), an(2025, 4), an(2026, 4), an(2027, 4)];
    const effet2027 = new Date('2027-06-01T00:00:00Z');
    expect(trimestresCotisesPeriodeSurcoteClassique(parAnnee, dateNaissance, ageLegal, effet2027)).toBe(16);
  });

  it('date de naissance inconnue ou barème non déterminé : 0, jamais une surcote fabriquée', () => {
    const parAnnee = [an(2024, 4), an(2025, 4)];
    expect(trimestresCotisesPeriodeSurcoteClassique(parAnnee, null, ageLegal, dateEffet)).toBe(0);
    expect(trimestresCotisesPeriodeSurcoteClassique(parAnnee, dateNaissance, null, dateEffet)).toBe(0);
    expect(
      trimestresCotisesPeriodeSurcoteClassique(
        parAnnee,
        dateNaissance,
        { stable: false, raison: 'hors barème détaillé' },
        dateEffet
      )
    ).toBe(0);
  });

  it('carrière vide : 0', () => {
    expect(trimestresCotisesPeriodeSurcoteClassique([], dateNaissance, ageLegal, dateEffet)).toBe(0);
  });
});


describe('Décote sur l’âge — arrondi au trimestre supérieur (art. R. 351-27 CSS)', () => {
  it('64 ans 7 mois : 10 trimestres de décote, pas une fraction', () => {
    // 29 mois jusqu'à 67 ans → ceil(29 / 3) = 10 trimestres entiers.
    // L'ancien calcul (67 - 64,5833) × 4 donnait 9,667 trimestres, soit une
    // décote au centime près sur une fraction de trimestre.
    const ageDepart = 64 + 7 / 12;
    expect(decoteSurAge(ageDepart)).toBe(-12.5); // 10 × 1,25 %
    expect(decoteSurAge(ageDepart)).not.toBeCloseTo(-9.6667 * 1.25, 4);
  });

  it('tout trimestre entamé compte pour un trimestre plein', () => {
    // 66 ans pile → 12 mois → 4 trimestres → -5 %.
    expect(decoteSurAge(66)).toBe(-5);
    // 65 ans 11 mois → 13 mois → ceil(13/3) = 5 trimestres → -6,25 %.
    expect(decoteSurAge(65 + 11 / 12)).toBe(-6.25);
    // 65 ans 9 mois → 15 mois → 5 trimestres pile, pas d'arrondi.
    expect(decoteSurAge(65 + 9 / 12)).toBe(-6.25);
    // 65 ans 8 mois → 16 mois → ceil(16/3) = 6 trimestres → -7,5 %.
    expect(decoteSurAge(65 + 8 / 12)).toBe(-7.5);
  });

  it('âges en années entières : valeurs inchangées (non-régression)', () => {
    expect(decoteSurAge(67)).toBe(0);
    expect(decoteSurAge(66)).toBe(-5);
    expect(decoteSurAge(65)).toBe(-10);
    expect(decoteSurAge(64)).toBe(-15);
    expect(decoteSurAge(63)).toBe(-20);
    expect(decoteSurAge(62)).toBe(-25);
    expect(decoteSurAge(60)).toBe(-25); // plafond
  });

  it('le résultat est toujours un multiple de 1,25 %', () => {
    for (const mois of [1, 2, 5, 7, 11, 13, 19, 23]) {
      const decote = decoteSurAge(67 - mois / 12);
      expect(Number.isInteger(Math.round((decote / 1.25) * 1e6) / 1e6)).toBe(true);
    }
  });

  it('le plafond de -25 % reste appliqué après arrondi', () => {
    expect(decoteSurAge(61 + 1 / 12)).toBe(-25);
  });
});

describe('Barème LFSS 2026 prolongé au-delà de 2027 — avertissement', () => {
  it('borne fixée au 31 décembre 2027', () => {
    expect(FIN_PERIODE_BAREME_LFSS_2026_VOTEE).toBe(Date.UTC(2027, 11, 31));
  });

  it('date d’effet dans la période votée : aucun avertissement', () => {
    expect(baremeDependDUneLoiNonVotee(new Date('2026-09-01T00:00:00Z'))).toBe(false);
    expect(baremeDependDUneLoiNonVotee(new Date('2027-06-15T00:00:00Z'))).toBe(false);
    expect(baremeDependDUneLoiNonVotee(new Date('2027-12-31T00:00:00Z'))).toBe(false);
  });

  it('date d’effet au-delà : avertissement', () => {
    expect(baremeDependDUneLoiNonVotee(new Date('2028-01-01T00:00:00Z'))).toBe(true);
    expect(baremeDependDUneLoiNonVotee(new Date('2035-01-01T00:00:00Z'))).toBe(true);
  });

  it('n’altère pas le barème appliqué : seul l’affichage change', () => {
    // Garde-fou : la borne ne doit jamais devenir une bascule de calcul.
    expect(jeuBaremeApplicable(new Date('2027-12-31T00:00:00Z'))).toBe('lfss_2026');
    expect(jeuBaremeApplicable(new Date('2028-01-01T00:00:00Z'))).toBe('lfss_2026');
    expect(jeuBaremeApplicable(new Date('2040-01-01T00:00:00Z'))).toBe('lfss_2026');
  });

  it('message centralisé, non vide, mentionnant la date charnière', () => {
    expect(AVERTISSEMENT_BAREME_NON_VOTE).toContain('31 décembre 2027');
    expect(AVERTISSEMENT_BAREME_NON_VOTE.length).toBeGreaterThan(0);
  });
});
