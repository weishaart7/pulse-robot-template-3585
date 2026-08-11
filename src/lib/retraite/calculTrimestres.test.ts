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
  // réelles disponibles (2018-2025, retraite_carriere_detail, périmètre
  // employeur/chomage/maladie de cette phase), ce que produit la fonction, et
  // constate que l'écart avec 66/170 est structurel (périmètre temporel et
  // exclusion micro-entrepreneur), pas un signe de bug.
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

    // Valeurs recalculées à la main (cf. corps du test) : 24 cotisés, 6 assimilés
    // (chômage : 2 en 2024 + 4 plafonnés en 2025 ; maladie : 0 en 2022).
    expect(resultat).toEqual({ cotises: 24, assimiles: 6, total: 30 });
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
  // chômage). Ce test vérifie que ces chevauchements micro-entrepreneur/chômage
  // n'affectent PAS le résultat : les lignes micro_entrepreneur doivent être
  // intégralement ignorées, seules les 4 lignes chômage/maladie et les 12 lignes
  // employeur (dont un doublon régime en 2022) doivent contribuer.
  it('cas réel Titouan Weishaar : 27 lignes réelles avec chevauchements micro-entrepreneur/chômage en 2025, micro-entrepreneur ignoré', () => {
    const periodesCompletes2018a2025: PeriodeCarriere[] = [
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

    const resultatComplet = trimestresCotisesEtAssimilesDepuisCarriere(periodesCompletes2018a2025);
    const periodesSansMicroEntrepreneur = periodesCompletes2018a2025.filter(
      (p) => p.typeActivite !== 'micro_entrepreneur'
    );
    const resultatSansMicroEntrepreneur = trimestresCotisesEtAssimilesDepuisCarriere(periodesSansMicroEntrepreneur);

    expect(resultatComplet).toEqual({ cotises: 24, assimiles: 6, total: 30 });
    // Les 13 lignes micro_entrepreneur (dont les chevauchements avec les 3
    // périodes chômage de 2025) sont sans effet sur le résultat.
    expect(resultatComplet).toEqual(resultatSansMicroEntrepreneur);
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

  it('micro_entrepreneur explicitement ignoré, même avec un revenu élevé (limitation documentée, pas un oubli)', () => {
    const resultat = trimestresCotisesEtAssimilesDepuisCarriere([
      periode({
        typeActivite: 'micro_entrepreneur',
        dateDebut: '2023-01-01',
        dateFin: '2023-12-31',
        revenu: 100000,
        estChiffreAffaires: true,
      }),
    ]);
    expect(resultat).toEqual({ cotises: 0, assimiles: 0, total: 0 });
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
});
