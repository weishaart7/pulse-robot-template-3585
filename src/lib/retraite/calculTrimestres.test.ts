import { describe, it, expect } from 'vitest';
import { PeriodeCarriere } from './parseRIS';
import { trimestresCotisesEtAssimilesDepuisCarriere } from './calculTrimestres';

const periode = (overrides: Partial<PeriodeCarriere>): PeriodeCarriere => ({
  employeur: 'Test',
  typeActivite: 'employeur',
  dateDebut: '2023-01-01',
  dateFin: '2023-12-31',
  revenu: null,
  estChiffreAffaires: false,
  regimes: ["L'Assurance retraite"],
  ...overrides,
});

// Les 27 lignes réelles de retraite_carriere_detail pour Titouan Weishaar
// (lues en base le 2026-08-11, user_id fa1dedda-c4f1-43c4-b67f-7a02b2efddf6),
// périmètre complet incluant les 13 lignes micro_entrepreneur et les
// chevauchements 2025 déjà repérés dans comparatif-retraite.md. Hissé au
// niveau du module (plutôt que local à un seul test) pour être réutilisé par
// le test de l'indicateur de cohérence RIS ↔ carrière saisie en bas de
// fichier, sans dupliquer ce jeu de données.
const periodesReellesTitouanWeishaar2018a2025: PeriodeCarriere[] = [
  periode({ employeur: 'TITANE MOTOR', dateDebut: '2018-07-17', dateFin: '2018-07-28', revenu: 966 }),
  periode({ employeur: 'AUCHAN HYPERMARCHE', dateDebut: '2018-11-10', dateFin: '2018-12-29', revenu: 716 }),
  periode({ employeur: 'TITANE MOTOR', dateDebut: '2019-05-21', dateFin: '2019-08-21', revenu: 6585 }),
  periode({ employeur: 'ADECCO', dateDebut: '2019-06-08', dateFin: '2019-06-09', revenu: 212 }),
  periode({ employeur: 'TITANE MOTOR', dateDebut: '2020-06-16', dateFin: '2020-09-05', revenu: 5858 }),
  periode({ employeur: 'TITANE MOTOR', dateDebut: '2021-05-04', dateFin: '2021-08-31', revenu: 8056 }),
  periode({ employeur: 'TITANE MOTOR', dateDebut: '2021-09-04', dateFin: '2021-12-31', revenu: 1647 }),
  periode({ employeur: 'TITANE MOTOR', dateDebut: '2022-01-01', dateFin: '2022-08-31', revenu: 10457, regimes: ["L'Assurance retraite"] }),
  periode({ employeur: 'TITANE MOTOR', dateDebut: '2022-01-01', dateFin: '2022-08-31', revenu: 10456, regimes: ['Agirc-Arrco'] }),
  periode({ employeur: 'MALADIE, ACCIDENT DU TRAVAIL', typeActivite: 'maladie', dateDebut: '2022-01-24', dateFin: '2022-01-31', regimes: ['Agirc-Arrco'] }),
  periode({ employeur: 'L ATELIER IMMOBILIER', dateDebut: '2022-08-31', dateFin: '2022-12-31', revenu: 3900 }),
  periode({ employeur: 'L ATELIER IMMOBILIER', dateDebut: '2023-01-01', dateFin: '2023-07-06', revenu: 6194 }),
  periode({ employeur: 'IMERIS PATRIMOINE SOCIATY', dateDebut: '2023-11-01', dateFin: '2023-12-31', revenu: 2239 }),
  periode({ employeur: 'IMERIS PATRIMOINE SOCIATY', dateDebut: '2024-01-01', dateFin: '2024-08-01', revenu: 8728 }),
  periode({ employeur: 'CHÔMAGE NON INDEMNISÉ', typeActivite: 'chomage', dateDebut: '2024-09-01', dateFin: '2024-09-07', regimes: ["L'Assurance retraite"] }),
  periode({ employeur: 'MICRO-ENTREPRENEUR - Prestation de service BIC', typeActivite: 'micro_entrepreneur', dateDebut: '2024-09-02', dateFin: '2024-12-31', regimes: ["L'Assurance retraite", 'RCI'] }),
  periode({ employeur: 'MICRO-ENTREPRENEUR - Prestation de service BNC', typeActivite: 'micro_entrepreneur', dateDebut: '2024-09-02', dateFin: '2024-12-31', regimes: ["L'Assurance retraite", 'RCI'] }),
  periode({ employeur: 'MICRO-ENTREPRENEUR - Activité de vente BIC', typeActivite: 'micro_entrepreneur', dateDebut: '2024-09-02', dateFin: '2024-12-31', regimes: ["L'Assurance retraite", 'RCI'] }),
  periode({ employeur: 'CHÔMAGE', typeActivite: 'chomage', dateDebut: '2024-09-08', dateFin: '2024-12-31' }),
  periode({ employeur: 'MICRO-ENTREPRENEUR - Prestation de service BIC', typeActivite: 'micro_entrepreneur', dateDebut: '2025-01-01', dateFin: '2025-05-31', revenu: 2922, estChiffreAffaires: true, regimes: ["L'Assurance retraite", 'RCI'] }),
  periode({ employeur: 'MICRO-ENTREPRENEUR - Activité de vente BIC', typeActivite: 'micro_entrepreneur', dateDebut: '2025-01-01', dateFin: '2025-04-30', regimes: ["L'Assurance retraite", 'RCI'] }),
  periode({ employeur: 'MICRO-ENTREPRENEUR - Prestation de service BNC', typeActivite: 'micro_entrepreneur', dateDebut: '2025-01-01', dateFin: '2025-04-30', regimes: ["L'Assurance retraite", 'RCI'] }),
  periode({ employeur: 'CHÔMAGE', typeActivite: 'chomage', dateDebut: '2025-01-01', dateFin: '2025-04-30' }),
  periode({ employeur: 'MICRO-ENTREPRENEUR - Prestation de service BNC', typeActivite: 'micro_entrepreneur', dateDebut: '2025-06-01', dateFin: '2025-12-31', revenu: 2824, estChiffreAffaires: true, regimes: ["L'Assurance retraite", 'RCI'] }),
  periode({ employeur: 'CHÔMAGE', typeActivite: 'chomage', dateDebut: '2025-07-01', dateFin: '2025-12-31' }),
  periode({ employeur: 'MICRO-ENTREPRENEUR - Activité de vente BIC', typeActivite: 'micro_entrepreneur', dateDebut: '2025-07-01', dateFin: '2025-12-31', regimes: ["L'Assurance retraite", 'RCI'] }),
  periode({ employeur: 'MICRO-ENTREPRENEUR - Prestation de service BIC', typeActivite: 'micro_entrepreneur', dateDebut: '2025-07-01', dateFin: '2025-12-31', regimes: ["L'Assurance retraite", 'RCI'] }),
];

describe('trimestresCotisesEtAssimilesDepuisCarriere', () => {
  // Cas référentiel PDF : le référentiel externe (referentiel-retraite-externe.md,
  // cité dans docs/audit/comparatif-retraite.md mais ABSENT de ce dépôt) annonce
  // 66 trimestres cotisés / 170 assimilés pour ce client (total cité 192 — à
  // noter, 66 + 170 = 236 ≠ 192, incohérence arithmétique déjà présente dans le
  // texte du comparatif, non résolue ici faute de source consultable). Sans le
  // tableau de carrière ligne à ligne du référentiel (qui projette jusqu'en 2067
  // et inclut des micro-entrepreneurs), une reproduction exacte de ces chiffres
  // est IMPOSSIBLE depuis ce dépôt — ce test ne cherche donc pas à forcer cette
  // correspondance. Il documente l'écart en calculant, sur les seules données
  // réelles disponibles (2018-2025, retraite_carriere_detail — ce jeu de
  // données ne contient ici aucune ligne micro_entrepreneur, cf. le test
  // suivant pour ce cas), ce que produit la fonction, et constate que l'écart
  // avec 66/170 est structurel (périmètre temporel, carrière projetée jusqu'en
  // 2067 dans le référentiel), pas un signe de bug.
  it('cas référentiel PDF : comparaison non reproductible depuis ce dépôt (documentation de l’écart, pas de correspondance forcée)', () => {
    const periodesReelles2018a2025: PeriodeCarriere[] = [
      periode({ employeur: 'TITANE MOTOR', dateDebut: '2018-07-17', dateFin: '2018-07-28', revenu: 966 }),
      periode({ employeur: 'AUCHAN HYPERMARCHE', dateDebut: '2018-11-10', dateFin: '2018-12-29', revenu: 716 }),
      periode({ employeur: 'TITANE MOTOR', dateDebut: '2019-05-21', dateFin: '2019-08-21', revenu: 6585 }),
      periode({ employeur: 'ADECCO', dateDebut: '2019-06-08', dateFin: '2019-06-09', revenu: 212 }),
      periode({ employeur: 'TITANE MOTOR', dateDebut: '2020-06-16', dateFin: '2020-09-05', revenu: 5858 }),
      periode({ employeur: 'TITANE MOTOR', dateDebut: '2021-05-04', dateFin: '2021-08-31', revenu: 8056 }),
      periode({ employeur: 'TITANE MOTOR', dateDebut: '2021-09-04', dateFin: '2021-12-31', revenu: 1647 }),
      periode({ employeur: 'TITANE MOTOR', dateDebut: '2022-01-01', dateFin: '2022-08-31', revenu: 10457, regimes: ["L'Assurance retraite"] }),
      periode({ employeur: 'TITANE MOTOR', dateDebut: '2022-01-01', dateFin: '2022-08-31', revenu: 10456, regimes: ['Agirc-Arrco'] }),
      periode({ employeur: 'MALADIE, ACCIDENT DU TRAVAIL', typeActivite: 'maladie', dateDebut: '2022-01-24', dateFin: '2022-01-31', regimes: ['Agirc-Arrco'] }),
      periode({ employeur: 'L ATELIER IMMOBILIER', dateDebut: '2022-08-31', dateFin: '2022-12-31', revenu: 3900 }),
      periode({ employeur: 'L ATELIER IMMOBILIER', dateDebut: '2023-01-01', dateFin: '2023-07-06', revenu: 6194 }),
      periode({ employeur: 'IMERIS PATRIMOINE SOCIATY', dateDebut: '2023-11-01', dateFin: '2023-12-31', revenu: 2239 }),
      periode({ employeur: 'IMERIS PATRIMOINE SOCIATY', dateDebut: '2024-01-01', dateFin: '2024-08-01', revenu: 8728 }),
      periode({ employeur: 'CHÔMAGE NON INDEMNISÉ', typeActivite: 'chomage', dateDebut: '2024-09-01', dateFin: '2024-09-07', regimes: ["L'Assurance retraite"] }),
      periode({ employeur: 'CHÔMAGE', typeActivite: 'chomage', dateDebut: '2024-09-08', dateFin: '2024-12-31' }),
      periode({ employeur: 'CHÔMAGE', typeActivite: 'chomage', dateDebut: '2025-01-01', dateFin: '2025-04-30' }),
      periode({ employeur: 'CHÔMAGE', typeActivite: 'chomage', dateDebut: '2025-07-01', dateFin: '2025-12-31' }),
    ];

    const resultat = trimestresCotisesEtAssimilesDepuisCarriere(periodesReelles2018a2025);

    // Valeurs recalculées à la main (cf. corps du test), plafond combiné
    // cotisé+assimilé à 4/an avec priorité cotisés : 24 cotisés, 4 assimilés.
    // Détail assimilé : 2022 maladie 0 ; 2024 chômage brut 2, mais cotisé
    // brut 2024 = 4 (déjà au plafond) → 0 place restante, assimilé cède
    // entièrement ; 2025 chômage brut 6 plafonné à 4 (aucun cotisé cette
    // année-là, toute la place reste disponible).
    expect(resultat).toEqual({ cotises: 24, assimiles: 4, total: 28 });
    // Écart avec le référentiel (66 cotisés / 170 assimilés) : massif et attendu,
    // pas un signe de défaut de la fonction — le référentiel couvre une carrière
    // projetée jusqu'en 2067 (dont d'importantes périodes hypothétiques de
    // micro-entreprise, exclues de cette phase) ; ce calcul ne couvre que les 8
    // années réelles 2018-2025 effectivement enregistrées en base.
    expect(resultat.cotises).toBeLessThan(66);
    expect(resultat.assimiles).toBeLessThan(170);
  });

  // Cas réel Titouan Weishaar : les 27 lignes réelles de retraite_carriere_detail
  // (lues en base le 2026-08-11, user_id fa1dedda-c4f1-43c4-b67f-7a02b2efddf6),
  // périmètre complet incluant les 13 lignes micro_entrepreneur et les
  // chevauchements 2025 déjà repérés dans comparatif-retraite.md (plusieurs
  // micro-entreprises simultanées, elles-mêmes chevauchant des périodes de
  // chômage). Seules 2 des 13 lignes micro_entrepreneur portent un revenu
  // (CA) non nul : "Prestation de service BIC" 2025-01-01→05-31 (2 922 €) et
  // "Prestation de service BNC" 2025-06-01→12-31 (2 824 €) — les autres ont
  // `revenu: null` (aucun CA déclaré sur la période) et ne contribuent donc
  // rien, même une fois leur sous-type identifié.
  //
  // Calcul à la main pour 2025 (seule année concernée) :
  // - revenu retenu service BIC = 2 922 × (1 − 0,50) = 1 461 €
  // - revenu retenu service BNC = 2 824 × (1 − 0,34) = 1 863,84 €
  // - total revenu cotisé 2025 = 1 461 + 1 863,84 = 3 324,84 € (aucun revenu
  //   `employeur` sur 2025) ; seuil 2025 = 1 782 € → floor(3 324,84 / 1 782)
  //   = 1 trimestre cotisé.
  // - jours chômage 2025 (3 périodes : 01/01→30/04 = 120j, 01/07→31/12 =
  //   184j) = 304j → floor(304 / 50) = 6 bruts.
  // - plafond combiné 2025 : 1 cotisé retenu, place restante 4 − 1 = 3 →
  //   assimilé 2025 = min(6, 3) = 3 (au lieu de 4 sans le cotisé
  //   micro-entrepreneur : le trimestre gagné en cotisé déplace un
  //   trimestre d'assimilé, le total annuel 2025 reste à 4).
  // - Années 2018-2024 : inchangées par rapport au test précédent (aucune
  //   ligne micro_entrepreneur avec revenu non nul avant 2025 dans ce jeu de
  //   données) → 24 cotisés / 0 assimilé cumulés sur cette période.
  // - Total : cotises = 24 + 1 = 25, assimiles = 0 + 3 = 3, total = 28
  //   (le total annuel plafonné à 4/an ne change pas, seule sa répartition
  //   cotisé/assimilé se déplace pour 2025).
  it('cas réel Titouan Weishaar : 27 lignes réelles avec chevauchements micro-entrepreneur/chômage en 2025, micro-entrepreneur abattu et cumulé au cotisé', () => {
    const resultatComplet = trimestresCotisesEtAssimilesDepuisCarriere(periodesReellesTitouanWeishaar2018a2025);
    const periodesSansMicroEntrepreneur = periodesReellesTitouanWeishaar2018a2025.filter(
      (p) => p.typeActivite !== 'micro_entrepreneur'
    );
    const resultatSansMicroEntrepreneur = trimestresCotisesEtAssimilesDepuisCarriere(periodesSansMicroEntrepreneur);

    expect(resultatComplet).toEqual({ cotises: 25, assimiles: 3, total: 28 });
    // Sans les lignes micro_entrepreneur, on retrouve le résultat du test
    // précédent (24 cotisés / 4 assimilés) — le micro-entrepreneur déplace 1
    // trimestre d'assimilé vers du cotisé sur 2025, sans changer le total.
    expect(resultatSansMicroEntrepreneur).toEqual({ cotises: 24, assimiles: 4, total: 28 });
  });

  // Cas de chevauchement 'employeur' isolé : deux périodes employeur distinctes
  // (deux employeurs différents) se chevauchant sur la même année civile.
  // Chacune, prise isolément, est sous le seuil de validation d'un trimestre —
  // seule leur somme dépasse le seuil. Isole la règle "chevauchement : sommer
  // les revenus avant de diviser par le seuil" indépendamment de toute autre
  // logique (une seule année, aucun assimilé, pas de plafond 4/an atteint).
  it('chevauchement employeur isolé : deux périodes se chevauchant sur la même année s’additionnent avant division par le seuil', () => {
    const periodes: PeriodeCarriere[] = [
      periode({ employeur: 'Employeur A', dateDebut: '2023-01-01', dateFin: '2023-06-30', revenu: 900 }),
      periode({ employeur: 'Employeur B', dateDebut: '2023-04-01', dateFin: '2023-09-30', revenu: 1000 }),
    ];

    // Seuil 2023 = 1690,50 €. Isolément : 900/1690,50 = 0 trimestre, 1000/1690,50
    // = 0 trimestre. Sommés : 1900/1690,50 = 1,124 → 1 trimestre.
    expect(trimestresCotisesEtAssimilesDepuisCarriere([periodes[0]]).cotises).toBe(0);
    expect(trimestresCotisesEtAssimilesDepuisCarriere([periodes[1]]).cotises).toBe(0);
    expect(trimestresCotisesEtAssimilesDepuisCarriere(periodes)).toEqual({ cotises: 1, assimiles: 0, total: 1 });
  });

  it('micro_entrepreneur avec sous-type non identifiable dans le libellé : période exclue (ni cotisée, ni comptée)', () => {
    const resultat = trimestresCotisesEtAssimilesDepuisCarriere([
      periode({
        employeur: 'MICRO-ENTREPRENEUR - Libellé inconnu',
        typeActivite: 'micro_entrepreneur',
        dateDebut: '2026-01-01',
        dateFin: '2026-12-31',
        revenu: 100000,
        estChiffreAffaires: true,
      }),
    ]);
    expect(resultat).toEqual({ cotises: 0, assimiles: 0, total: 0 });
  });

  // Cas test du diagnostic (docs/audit/micro-entrepreneur-trimestres.md) :
  // 12 100 € de CA en 2026 (seuil 2026 = 1 803 €), un test isolé par
  // sous-type, chacun sur sa propre carrière d'une seule période.
  // - vente BIC (71 %) : revenu retenu = 12 100 × 0,29 = 3 509 € →
  //   floor(3 509 / 1 803) = 1.
  // - service BIC (50 %) : revenu retenu = 12 100 × 0,50 = 6 050 € →
  //   floor(6 050 / 1 803) = 3.
  // - service BNC (34 %) : revenu retenu = 12 100 × 0,66 = 7 986 € →
  //   floor(7 986 / 1 803) = 4 (plafonné, déjà atteint avant le plafond).
  it('cas test diagnostic : 12 100 € de CA en 2026 par sous-type micro-entrepreneur', () => {
    const carrierePour = (employeur: string) =>
      trimestresCotisesEtAssimilesDepuisCarriere([
        periode({
          employeur,
          typeActivite: 'micro_entrepreneur',
          dateDebut: '2026-01-01',
          dateFin: '2026-12-31',
          revenu: 12100,
          estChiffreAffaires: true,
        }),
      ]);

    expect(carrierePour('MICRO-ENTREPRENEUR - Activité de vente BIC').cotises).toBe(1);
    expect(carrierePour('MICRO-ENTREPRENEUR - Prestation de service BIC').cotises).toBe(3);
    expect(carrierePour('MICRO-ENTREPRENEUR - Prestation de service BNC').cotises).toBe(4);
  });

  it('année hors barème connu (avant 2018) : aucun trimestre cotisé, pas d’extrapolation', () => {
    const resultat = trimestresCotisesEtAssimilesDepuisCarriere([
      periode({ dateDebut: '2017-01-01', dateFin: '2017-12-31', revenu: 30000 }),
    ]);
    expect(resultat).toEqual({ cotises: 0, assimiles: 0, total: 0 });
  });

  it('plafond de 4 trimestres/an : un revenu très élevé sur une seule année ne dépasse jamais 4 cotisés', () => {
    const resultat = trimestresCotisesEtAssimilesDepuisCarriere([
      periode({ dateDebut: '2023-01-01', dateFin: '2023-12-31', revenu: 1000000 }),
    ]);
    expect(resultat.cotises).toBe(4);
  });

  // Isole les deux seuils désormais distincts : une même durée de 100 jours
  // ne donne pas le même nombre de trimestres selon qu'elle est classée
  // chômage (÷ 50 jours) ou maladie (÷ 60 jours).
  it('seuils distincts chômage (50 jours) vs maladie (60 jours) pour une même durée', () => {
    const resultatChomage = trimestresCotisesEtAssimilesDepuisCarriere([
      periode({ typeActivite: 'chomage', dateDebut: '2023-01-01', dateFin: '2023-04-10' }), // 100 jours
    ]);
    const resultatMaladie = trimestresCotisesEtAssimilesDepuisCarriere([
      periode({ typeActivite: 'maladie', dateDebut: '2023-01-01', dateFin: '2023-04-10' }), // 100 jours
    ]);

    // 100 / 50 = 2 trimestres chômage ; 100 / 60 = 1,67 → 1 trimestre maladie.
    expect(resultatChomage).toEqual({ cotises: 0, assimiles: 2, total: 2 });
    expect(resultatMaladie).toEqual({ cotises: 0, assimiles: 1, total: 1 });
  });

  // Isole le plafond COMBINÉ 4/an (cotisé + assimilé confondus) avec priorité
  // cotisés : une même année 2023 avec 3 trimestres cotisés bruts (employeur)
  // et 3 trimestres assimilés bruts (chômage), combiné 6 > 4. Sans plafond
  // combiné, on obtiendrait {cotises: 3, assimiles: 3, total: 6} — ce test
  // vérifie que le total reste bien plafonné à 4, avec le cotisé conservé en
  // entier et l'assimilé réduit à la place restante (4 - 3 = 1).
  it('plafond combiné 4/an (cotisé + assimilé) avec priorité cotisés, cas isolé', () => {
    const seuil2023 = 1690.5;
    const resultat = trimestresCotisesEtAssimilesDepuisCarriere([
      // Revenu 2023 = 3 × seuil + 100 → 3 trimestres cotisés bruts (floor).
      periode({ employeur: 'Employeur A', dateDebut: '2023-01-01', dateFin: '2023-12-31', revenu: 3 * seuil2023 + 100 }),
      // 150 jours de chômage 2023 → 150 / 50 = 3 trimestres assimilés bruts.
      periode({ typeActivite: 'chomage', dateDebut: '2023-01-01', dateFin: '2023-05-30' }), // 150 jours
    ]);

    expect(resultat).toEqual({ cotises: 3, assimiles: 1, total: 4 });
  });

  // Première période de chômage non indemnisé de la carrière, art. R351-12
  // CSS : plafonnée à 547 jours ET 6 trimestres au total. Période unique
  // 2020-01-01 → 2022-12-31 (1096 jours, largement au-delà des deux
  // plafonds). Calcul à la main :
  // - jours retenus = min(1096, 547) = 547, tronqués à partir du
  //   2020-01-01 → fin tronquée 2021-06-30 (2020 = 366 jours restants dans
  //   le plafond : 547 - 366 = 181 jours en 2021, soit jusqu'au 30/06/2021).
  // - trimestres bruts par année : 2020 → floor(366/50) = 7 ; 2021 →
  //   floor(181/50) = 3. Total brut = 10 > 6 → excédent de 4, retiré en
  //   partant de l'année la plus récente (2021 d'abord) : 2021 (3 → 0,
  //   excédent restant 1), puis 2020 (7 → 6, excédent épuisé).
  // - Résultat par année avant plafond 4/an : {2020: 6, 2021: 0}.
  // - Plafond 4/an (aucun cotisé, aucun autre assimilé cette année-là) :
  //   2020 → min(6, 4) = 4 ; 2021 → 0.
  // - Total : cotises = 0, assimiles = 4 + 0 = 4, total = 4. Ce test
  //   vérifie donc À LA FOIS le plafond de carrière (10 → 6) ET le plafond
  //   annuel 4/an qui s'applique en plus, séparément (6 → 4 sur 2020).
  it('chômage non indemnisé, première période de carrière : plafonnée à 547 jours et 6 trimestres, plus le plafond annuel 4/an', () => {
    const resultat = trimestresCotisesEtAssimilesDepuisCarriere([
      periode({
        employeur: 'CHÔMAGE NON INDEMNISÉ',
        typeActivite: 'chomage',
        dateDebut: '2020-01-01',
        dateFin: '2022-12-31',
      }),
    ]);

    expect(resultat).toEqual({ cotises: 0, assimiles: 4, total: 4 });
  });

  // Période ultérieure de chômage non indemnisé, ADJACENTE (aucun jour de
  // vide) à une période de chômage indemnisé immédiatement précédente : art.
  // R351-12 CSS, plafond 365 jours, même ratio 50 jours/trimestre.
  // - Période A (non indemnisée, 2018-01-01 → 2018-01-01, 1 jour) : établit
  //   le statut de "première période de la carrière" (résultat trivial, 0
  //   trimestre) pour que la période B ci-dessous soit bien traitée comme
  //   "ultérieure", pas comme la première.
  // - Période indemnisée 2023-01-01 → 2023-03-31 (90 jours).
  // - Période B (non indemnisée, ultérieure) 2023-04-01 → 2023-06-30 (91
  //   jours), démarre le lendemain exact de la fin de la période indemnisée
  //   → adjacente, sous le plafond de 365 jours (pas de troncature).
  // Calcul : jours chômage indemnisé 2023 = 90 → floor(90/50) = 1.
  // Jours chômage non indemnisé retenus (période B) = 91 → floor(91/50) = 1.
  // Total assimilé 2023 = 1 + 1 = 2 (bien sous le plafond 4/an).
  it('chômage non indemnisé ultérieur, adjacent à une période indemnisée : compté au même ratio 50 jours, sous le plafond de 365 jours', () => {
    const resultat = trimestresCotisesEtAssimilesDepuisCarriere([
      periode({ employeur: 'CHÔMAGE NON INDEMNISÉ', typeActivite: 'chomage', dateDebut: '2018-01-01', dateFin: '2018-01-01' }),
      periode({ employeur: 'CHÔMAGE', typeActivite: 'chomage', dateDebut: '2023-01-01', dateFin: '2023-03-31' }),
      periode({ employeur: 'CHÔMAGE NON INDEMNISÉ', typeActivite: 'chomage', dateDebut: '2023-04-01', dateFin: '2023-06-30' }),
    ]);

    expect(resultat).toEqual({ cotises: 0, assimiles: 2, total: 2 });
  });

  // Période ultérieure de chômage non indemnisé NON adjacente à une période
  // indemnisée (ici : précédée uniquement d'une autre période non
  // indemnisée, jamais d'une période indemnisée) : condition légale non
  // remplie ("à condition qu'elle succède [...] à une période de chômage
  // indemnisé") → 0 trimestre retenu pour cette période, quelle que soit sa
  // durée, même si elle est immédiatement contiguë (aucun jour de vide) à la
  // période précédente.
  it('chômage non indemnisé ultérieur non adjacent à une période indemnisée : exclu entièrement, même sans jour de vide', () => {
    const resultat = trimestresCotisesEtAssimilesDepuisCarriere([
      periode({ employeur: 'CHÔMAGE NON INDEMNISÉ', typeActivite: 'chomage', dateDebut: '2018-01-01', dateFin: '2018-01-01' }),
      // Contiguë (2018-01-02, sans trou) mais précédée d'une période non
      // indemnisée, pas indemnisée : condition d'adjacence non remplie.
      periode({
        employeur: 'CHÔMAGE NON INDEMNISÉ',
        typeActivite: 'chomage',
        dateDebut: '2018-01-02',
        dateFin: '2019-12-31',
      }),
    ]);

    expect(resultat).toEqual({ cotises: 0, assimiles: 0, total: 0 });
  });
});

// Indicateur de cohérence RIS ↔ carrière saisie (Carriere.tsx) : ce total
// dérivé alimente un indicateur d'écart affiché à l'écran, comparé à
// trimestres_valides (source RIS) avec un seuil de tolérance de 4
// trimestres (`SEUIL_ECART_COHERENCE_TRIMESTRES`, Carriere.tsx — dupliqué
// ici en commentaire faute de pouvoir l'importer depuis un composant React,
// ce projet n'ayant pas d'infrastructure de test de rendu de composants —
// aucun `@testing-library/react`, environnement vitest en `node` et non
// `jsdom`, confirmé dans vitest.config.ts, aucun fichier `*.test.tsx`
// nulle part dans le dépôt). Ces deux tests vérifient donc le calcul qui
// alimente l'indicateur, pas le rendu JSX (icône, couleur, texte) lui-même
// — limite assumée, documentée dans docs/audit/audit-retraite.md plutôt que
// laissée implicite.
describe('indicateur de cohérence RIS ↔ carrière saisie (calcul sous-jacent à Carriere.tsx)', () => {
  const SEUIL_ECART_COHERENCE_TRIMESTRES = 4; // dupliqué de Carriere.tsx, cf. commentaire ci-dessus.

  // Cas réel Titouan Weishaar (cf. test dédié plus haut, "cas réel Titouan
  // Weishaar") : trimestres_valides = 28 (confirmé dans
  // docs/audit/comparatif-retraite.md §1, `retraite_data.trimestres_valides`),
  // total dérivé = 28 (résultat déjà vérifié par le test dédié). Écart = 0,
  // sous le seuil → l'indicateur doit afficher "cohérent", pas
  // d'avertissement. Coïncidence exacte, pas un résultat cherché : les deux
  // valeurs proviennent de sources et de logiques totalement indépendantes
  // (RIS importé pour l'une, calcul depuis retraite_carriere_detail pour
  // l'autre).
  it('cas réel Titouan Weishaar : écart nul avec trimestres_valides = 28, sous le seuil de cohérence', () => {
    const trimestresValidesRIS = 28;
    const totalDeriveCarriere = trimestresCotisesEtAssimilesDepuisCarriere(periodesReellesTitouanWeishaar2018a2025).total;

    expect(totalDeriveCarriere).toBe(28);
    expect(Math.abs(trimestresValidesRIS - totalDeriveCarriere)).toBeLessThanOrEqual(SEUIL_ECART_COHERENCE_TRIMESTRES);
  });

  // Cas synthétique avec écart volontaire : carrière saisie manifestement
  // incomplète (une seule année, 2023, 4 trimestres cotisés bruts) comparée
  // à un trimestres_valides RIS de 28 (carrière complète, comme le cas réel
  // ci-dessus) — écart de 24 trimestres, très au-delà du seuil de 4 →
  // l'indicateur doit afficher l'avertissement explicite.
  it('cas synthétique : carrière saisie manifestement incomplète, écart au-delà du seuil de cohérence', () => {
    const trimestresValidesRIS = 28;
    const carriereIncomplete: PeriodeCarriere[] = [
      periode({ employeur: 'Employeur unique', dateDebut: '2023-01-01', dateFin: '2023-12-31', revenu: 1000000 }),
    ];
    const totalDeriveCarriere = trimestresCotisesEtAssimilesDepuisCarriere(carriereIncomplete).total;

    expect(totalDeriveCarriere).toBe(4); // plafond 4/an, un seul employeur sur une seule année.
    expect(Math.abs(trimestresValidesRIS - totalDeriveCarriere)).toBeGreaterThan(SEUIL_ECART_COHERENCE_TRIMESTRES);
  });
});
