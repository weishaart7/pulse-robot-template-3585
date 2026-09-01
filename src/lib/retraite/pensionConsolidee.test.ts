import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { calculerPensionConsolidee, EntreePensionConsolidee } from './pensionConsolidee';
import {
  tauxProratisation,
  pensionBase,
  decoteSurTrimestresPlafond25,
  decoteApplicable,
  minimumContributif,
  majorationTroisEnfants,
} from './calcul';
import {
  nombreEnfantsEligiblesMajorationTroisEnfants,
  nombreEnfantsEligiblesMajorationAgircArrco,
} from './enfantsEligiblesMajoration';
import { FamilyLink } from '@/services/familyService';
import {
  pensionBaseFonctionPublique,
  decoteSurAgeFonctionPublique,
  decoteFonctionPublique,
  tauxDecoteParTrimestreFonctionPublique,
} from './calculFonctionPublique';

const entreeBase: EntreePensionConsolidee = {
  salaireAnnuelMoyen: 30000,
  trimestresValides: 160,
  trimestresRequis: 172,
  dateNaissance: { annee: 1990, mois: 6 },
  ageActuel: 35,
  regimesPoints: [{ nom: 'Agirc-Arrco', type: 'points', points: 5000, valeurPoint: 1.3498 }],
  detailCarriere: [
    {
      employeur: 'Test',
      typeActivite: 'employeur',
      dateDebut: '2020-01-01',
      dateFin: '2020-12-31',
      revenu: 30000,
      estChiffreAffaires: false,
      regimes: ["L'Assurance retraite"],
    },
  ],
  familyLinks: [],
  auMoinsUnTrimestreMajorationEnfant: false,
  autresPensionsMensuelles: 0,
  fonctionPublique: null,
  cnavpl: null,
};

describe('calculerPensionConsolidee — champs annexe exposés', () => {
  it('expose la répartition par régime, cohérente avec la pension totale (sans FP ni CNAVPL)', () => {
    const resultat = calculerPensionConsolidee(entreeBase);

    expect(resultat.repartitionParRegime.fonctionPublique).toBe(0);
    expect(resultat.repartitionParRegime.rafp).toBe(0);
    expect(resultat.repartitionParRegime.cnavpl).toBe(0);
    expect(
      resultat.repartitionParRegime.baseRegimeGeneral + resultat.repartitionParRegime.complementaireRegimeGeneral
    ).toBeCloseTo(resultat.pensionTotaleConsolidee, 6);
  });

  it('expose l’historique des trimestres retenus depuis le détail de carrière', () => {
    const resultat = calculerPensionConsolidee(entreeBase);

    expect(resultat.historiqueTrimestres.total).toBeGreaterThan(0);
    expect(Array.isArray(resultat.historiqueTrimestres.parAnnee)).toBe(true);
  });

  it('expose le résultat de l’âge légal calculé pour la génération de naissance', () => {
    const resultat = calculerPensionConsolidee(entreeBase);

    expect(resultat.ageLegal).not.toBeNull();
  });

  it('renvoie un ageLegal null quand la date de naissance est inconnue', () => {
    const resultat = calculerPensionConsolidee({ ...entreeBase, dateNaissance: null });

    expect(resultat.ageLegal).toBeNull();
  });
});

// Ces tests couvrent le détail régime général exposé par
// `detailRegimeGeneral` (cf. docs/audit/audit-pension-consolidation.md,
// étape 1 de la fusion Carriere.tsx ↔ calculerPensionConsolidee) — non
// régression sur un jeu de profils variés (régime général seul avec décote,
// avec surcote, multi-régimes FP/CNAVPL, avec majoration enfants), en
// l'absence d'infrastructure de test de rendu de composants (cf.
// docs/audit/audit-retraite.md §4).
describe('calculerPensionConsolidee — detailRegimeGeneral (non-régression Carriere.tsx)', () => {
  it('décote seule (trimestres manquants, pas de date de naissance connue) : mêmes valeurs que les primitives appelées isolément', () => {
    const entree: EntreePensionConsolidee = {
      ...entreeBase,
      salaireAnnuelMoyen: 30000,
      trimestresValides: 160,
      trimestresRequis: 172,
      dateNaissance: null,
      ageActuel: null,
    };
    const resultat = calculerPensionConsolidee(entree);

    const tauxAttendu = tauxProratisation(160, 172);
    const decoteAttendue = Math.min(decoteSurTrimestresPlafond25(160, 172), 0);
    const pensionBaseBruteAttendue = pensionBase(30000, tauxAttendu, 0);

    expect(resultat.detailRegimeGeneral.pensionBaseBrute).toBeCloseTo(pensionBaseBruteAttendue, 6);
    expect(resultat.detailRegimeGeneral.decote).toBeCloseTo(decoteAttendue, 6);
    expect(resultat.detailRegimeGeneral.decote).toBeLessThan(0);
    expect(resultat.detailRegimeGeneral.surcoteTotalePct).toBe(0);

    const micoAttendu = minimumContributif(160, 172, resultat.detailRegimeGeneral.decote, 160);
    expect(resultat.detailRegimeGeneral.micoMontant).toBeCloseTo(micoAttendu, 6);
  });

  it('surcote (trimestres au-delà du requis, âge légal atteint) : surcote positive, décote nulle', () => {
    // Carrière continue de 1985 à 2025 (revenu confortable, régime de base)
    // pour garantir des trimestres cotisés quelle que soit l'année de
    // référence de la surcote résolue par ageLegalPourGeneration() pour une
    // naissance en 1955 — évite de recalculer cette année à la main ici.
    const detailCarriereLongue = Array.from({ length: 41 }, (_, i) => {
      const annee = 1985 + i;
      return {
        employeur: 'Test',
        typeActivite: 'employeur' as const,
        dateDebut: `${annee}-01-01`,
        dateFin: `${annee}-12-31`,
        revenu: 40000,
        estChiffreAffaires: false,
        regimes: ["L'Assurance retraite"],
      };
    });
    const entree: EntreePensionConsolidee = {
      ...entreeBase,
      salaireAnnuelMoyen: 30000,
      trimestresValides: 180,
      trimestresRequis: 160,
      dateNaissance: { annee: 1955, mois: 1 },
      ageActuel: 71,
      detailCarriere: detailCarriereLongue,
    };
    const resultat = calculerPensionConsolidee(entree);

    expect(resultat.detailRegimeGeneral.decote).toBe(0);
    expect(resultat.detailRegimeGeneral.surcoteTotalePct).toBeGreaterThan(0);
    expect(resultat.detailRegimeGeneral.surcoteMontant).toBeGreaterThan(0);
  });

  it('multi-régimes FP + CNAVPL : la répartition par régime somme exactement au total consolidé', () => {
    const entree: EntreePensionConsolidee = {
      ...entreeBase,
      fonctionPublique: {
        traitementIndiciaireBrut: 36000,
        trimestresLiquidables: 80,
        pointsRAFP: 4000,
        departAnticipeCategorieActive: false,
        departPourInvalidite: false,
      },
      cnavpl: {
        trimestresCNAVPL: 40,
        pointsCNAVPL: 1000,
        valeurPointCNAVPL: 0.6599,
      },
    };
    const resultat = calculerPensionConsolidee(entree);

    expect(resultat.repartitionParRegime.fonctionPublique).toBeGreaterThan(0);
    expect(resultat.repartitionParRegime.rafp).toBeGreaterThan(0);
    expect(resultat.repartitionParRegime.cnavpl).toBeGreaterThan(0);

    const sommeRepartition =
      resultat.repartitionParRegime.baseRegimeGeneral +
      resultat.repartitionParRegime.complementaireRegimeGeneral +
      resultat.repartitionParRegime.fonctionPublique +
      resultat.repartitionParRegime.rafp +
      resultat.repartitionParRegime.cnavpl;
    expect(sommeRepartition).toBeCloseTo(resultat.pensionTotaleConsolidee, 6);
  });

  it('majoration pour 3 enfants ou plus : même valeur que les primitives appelées isolément', () => {
    const familyLinks = [
      { lien_familial: 'Enfant', enfant_adopte: undefined },
      { lien_familial: 'Enfant', enfant_adopte: undefined },
      { lien_familial: 'Enfant', enfant_adopte: undefined },
    ] as EntreePensionConsolidee['familyLinks'];
    const entree: EntreePensionConsolidee = { ...entreeBase, familyLinks };
    const resultat = calculerPensionConsolidee(entree);

    const nombreEnfantsAttendu = nombreEnfantsEligiblesMajorationTroisEnfants(familyLinks);
    expect(resultat.detailRegimeGeneral.nombreEnfantsEligibles).toBe(nombreEnfantsAttendu);
    expect(resultat.detailRegimeGeneral.majorationEnfantsPct).toBe(majorationTroisEnfants(nombreEnfantsAttendu));
    expect(resultat.detailRegimeGeneral.majorationEnfantsPct).toBeGreaterThan(0);
  });
});


describe('calculerPensionConsolidee — plafond de décote régime général à -25 %', () => {
  it('20 trimestres manquants ou plus : le moteur consolidé applique bien -25 %, pas -20 %', () => {
    const entree: EntreePensionConsolidee = {
      ...entreeBase,
      salaireAnnuelMoyen: 30000,
      trimestresValides: 140, // 32 manquants, bien au-delà du plafond de 20
      trimestresRequis: 172,
      // ageActuel null : neutralise le comptage sur l'âge, on isole ici le
      // comptage sur trimestres (l'interaction des deux est couverte dans
      // calcul.test.ts).
      dateNaissance: null,
      ageActuel: null,
    };

    const resultat = calculerPensionConsolidee(entree);

    expect(resultat.detailRegimeGeneral.decote).toBe(-25);
    expect(resultat.detailRegimeGeneral.decote).not.toBe(-20);
    // La décote s'applique bien à la pension de base servie.
    const pensionBaseBrute = resultat.detailRegimeGeneral.pensionBaseBrute;
    expect(pensionBaseBrute * (1 + resultat.detailRegimeGeneral.decote / 100)).toBeCloseTo(
      pensionBaseBrute * 0.75,
      6
    );
  });
});


describe('calculerPensionConsolidee — surcote régime général : durée requise appréciée tous régimes', () => {
  // Génération 1955 : âge légal 62 ans, stable, atteint le 1er janvier 2017.
  // La période de référence de la surcote CLASSIQUE s'ouvre donc en 2018
  // (art. L. 351-1-2 CSS, cf. `trimestresCotisesPeriodeSurcoteClassique()`) :
  // une année de carrière pleine en 2018 fournit les 4 trimestres cotisés qui
  // alimentent la surcote. Ce describe teste la condition de DURÉE (tous
  // régimes), pas la période de référence — l'année est simplement placée
  // dans la fenêtre valide pour que la surcote puisse s'ouvrir.
  const dateNaissance = { annee: 1955, mois: 1 };
  const detailCarrierePeriodeSurcote = [
    {
      employeur: 'Test',
      typeActivite: 'employeur' as const,
      dateDebut: '2018-01-01',
      dateFin: '2018-12-31',
      revenu: 40000,
      estChiffreAffaires: false,
      regimes: ["L'Assurance retraite"],
    },
  ];

  const entreePolypensionne: EntreePensionConsolidee = {
    ...entreeBase,
    dateNaissance,
    ageActuel: 71,
    detailCarriere: detailCarrierePeriodeSurcote,
    // Régime général seul : 100 trimestres, SOUS les 172 requis.
    trimestresValides: 100,
    trimestresRequis: 172,
    // Fonction publique : 80 trimestres → 180 au total, AU-DESSUS des 172.
    fonctionPublique: {
      traitementIndiciaireBrut: 40000,
      trimestresLiquidables: 80,
      pointsRAFP: 0,
      departAnticipeCategorieActive: false,
      departPourInvalidite: false,
      moyenneAnnuelleNBI: 0,
      trimestresLiquidablesNBI: 0,
    },
  };

  it('le total tous régimes atteint la durée requise : la surcote régime général est ouverte', () => {
    const resultat = calculerPensionConsolidee(entreePolypensionne);

    // Avant correction : dureeRequiseAtteinte = 100 >= 172 = false → 0 %.
    expect(resultat.detailRegimeGeneral.surcoteTotalePct).toBeGreaterThan(0);
    expect(resultat.detailRegimeGeneral.surcoteMontant).toBeGreaterThan(0);
  });

  it('témoin : sans la fonction publique, le régime général seul reste sous la durée requise et la surcote reste fermée', () => {
    const resultat = calculerPensionConsolidee({ ...entreePolypensionne, fonctionPublique: null });

    expect(resultat.detailRegimeGeneral.surcoteTotalePct).toBe(0);
    expect(resultat.detailRegimeGeneral.surcoteMontant).toBe(0);
  });

  it('cohérence avec la décote, qui comptait déjà tous régimes : les deux conditions lisent le même total', () => {
    // 180 trimestres tous régimes > 172 requis → aucune décote non plus.
    const resultat = calculerPensionConsolidee(entreePolypensionne);
    expect(resultat.detailRegimeGeneral.decote).toBe(0);
  });
});

describe('calculerPensionConsolidee — décote fonction publique : plus petit des deux comptages hors catégorie active', () => {
  // Agent SÉDENTAIRE (departAnticipeCategorieActive = false) partant à 64 ans
  // avec 140 trimestres liquidables sur 172 requis.
  //   - comptage en trimestres : 32 manquants → -25 % (plafond)
  //   - comptage en âge : (64 - 67) × 4 = 12 trimestres × 1,25 % → -15 %
  // Art. L. 14 I CPCMR : le plus favorable des deux, soit -15 %.
  const TIB = 60000;
  const TRIMESTRES_LIQUIDABLES = 140;
  const TRIMESTRES_REQUIS = 172;

  const entreeSedentaire: EntreePensionConsolidee = {
    ...entreeBase,
    // Régime général neutralisé : isole la branche fonction publique et évite
    // que ses trimestres ne comblent la durée requise.
    trimestresValides: 0,
    salaireAnnuelMoyen: 0,
    trimestresRequis: TRIMESTRES_REQUIS,
    regimesPoints: [],
    detailCarriere: [],
    fonctionPublique: {
      traitementIndiciaireBrut: TIB,
      trimestresLiquidables: TRIMESTRES_LIQUIDABLES,
      pointsRAFP: 0,
      departAnticipeCategorieActive: false, // sédentaire — le cœur du test
      ageDepartAnticipe: 64,
      // ageAnnulationDecote non renseigné → 67 ans par défaut (sédentaire)
      departPourInvalidite: false,
      moyenneAnnuelleNBI: 0,
      trimestresLiquidablesNBI: 0,
    },
  };

  const taux = TRIMESTRES_LIQUIDABLES / TRIMESTRES_REQUIS;
  const decoteTrimestres = decoteSurTrimestresPlafond25(TRIMESTRES_LIQUIDABLES, TRIMESTRES_REQUIS);
  const decoteAge = decoteSurAgeFonctionPublique(64, 67);

  it('préconditions : les deux comptages diffèrent, celui sur l’âge est le plus favorable', () => {
    expect(decoteTrimestres).toBe(-25);
    expect(decoteAge).toBe(-15);
    expect(decoteApplicable(decoteTrimestres, decoteAge)).toBe(-15);
  });

  it('la pension retient le comptage sur l’âge (-15 %), pas le seul comptage sur la durée (-25 %)', () => {
    const resultat = calculerPensionConsolidee(entreeSedentaire);

    const attenduAvecRegleComplete = pensionBaseFonctionPublique(TIB, taux, -15);
    const attenduAvantCorrection = pensionBaseFonctionPublique(TIB, taux, -25);

    expect(resultat.repartitionParRegime.fonctionPublique).toBeCloseTo(attenduAvecRegleComplete, 6);
    expect(resultat.repartitionParRegime.fonctionPublique).not.toBeCloseTo(attenduAvantCorrection, 6);
    // La règle est bien favorable à l'agent.
    expect(attenduAvecRegleComplete).toBeGreaterThan(attenduAvantCorrection);
  });

  it('sans âge de départ renseigné, seul le comptage sur la durée s’applique (-25 %)', () => {
    const resultat = calculerPensionConsolidee({
      ...entreeSedentaire,
      fonctionPublique: { ...entreeSedentaire.fonctionPublique!, ageDepartAnticipe: undefined },
    });

    expect(resultat.repartitionParRegime.fonctionPublique).toBeCloseTo(
      pensionBaseFonctionPublique(TIB, taux, -25),
      6
    );
  });

  it('départ à l’âge d’annulation de la décote (67 ans) : aucune décote, malgré 32 trimestres manquants', () => {
    const resultat = calculerPensionConsolidee({
      ...entreeSedentaire,
      fonctionPublique: { ...entreeSedentaire.fonctionPublique!, ageDepartAnticipe: 67 },
    });

    expect(resultat.repartitionParRegime.fonctionPublique).toBeCloseTo(
      pensionBaseFonctionPublique(TIB, taux, 0),
      6
    );
  });
});


describe('Décote fonction publique — écran et moteur consolidé donnent la même valeur (profil sédentaire)', () => {
  // CarriereFonctionPublique.tsx et calculerPensionConsolidee() appellent
  // désormais tous deux decoteFonctionPublique(). Ce test reproduit le chemin
  // COMPLET de l'écran — saisies sous forme de chaînes, parseFloat/parseInt,
  // puis pensionBaseFonctionPublique() — et vérifie qu'il aboutit exactement
  // à la pension fonction publique renvoyée par le moteur consolidé pour le
  // même profil. En l'absence d'infrastructure de rendu de composants (cf.
  // docs/audit/audit-retraite.md §4), c'est la garantie la plus proche d'un
  // test d'écran ; elle tient parce que les deux chemins partagent une
  // implémentation unique de la règle.
  const TRIMESTRES_REQUIS = 172;

  // Saisie telle qu'elle existe dans le formulaire (des chaînes), pour un
  // agent SÉDENTAIRE : la case « catégorie active » n'est pas cochée.
  const saisie = {
    traitementIndiciaireBrut: '60000',
    trimestresLiquidables: '140',
    ageDepartAnticipe: '64',
    ageAnnulationDecote: '', // non renseigné → 67 ans par défaut
    anneeOuvertureDroits: '', // non renseignée → 1,25 % par défaut
  };

  // Chemin de l'écran, reproduit à l'identique.
  const tib = parseFloat(saisie.traitementIndiciaireBrut) || 0;
  const trimestresLiquidablesNum = parseInt(saisie.trimestresLiquidables) || 0;
  const anneeOuvertureDroitsNum =
    saisie.anneeOuvertureDroits === '' ? undefined : parseInt(saisie.anneeOuvertureDroits, 10);
  const decoteEcran = decoteFonctionPublique({
    trimestresLiquidables: trimestresLiquidablesNum,
    trimestresAutresRegimes: 0,
    trimestresRequis: TRIMESTRES_REQUIS,
    ageDepart: parseFloat(saisie.ageDepartAnticipe),
    ageAnnulationDecote: parseFloat(saisie.ageAnnulationDecote), // NaN
    tauxDecoteParTrimestre: tauxDecoteParTrimestreFonctionPublique(anneeOuvertureDroitsNum),
  });
  const pensionEcran = pensionBaseFonctionPublique(
    tib,
    tauxProratisation(trimestresLiquidablesNum, TRIMESTRES_REQUIS),
    decoteEcran
  );

  // Même profil vu par le moteur consolidé (valeurs typées, venues de la base).
  const entreeMoteur: EntreePensionConsolidee = {
    ...entreeBase,
    trimestresValides: 0,
    salaireAnnuelMoyen: 0,
    trimestresRequis: TRIMESTRES_REQUIS,
    regimesPoints: [],
    detailCarriere: [],
    fonctionPublique: {
      traitementIndiciaireBrut: 60000,
      trimestresLiquidables: 140,
      pointsRAFP: 0,
      departAnticipeCategorieActive: false, // sédentaire
      ageDepartAnticipe: 64,
      ageAnnulationDecote: undefined, // non renseigné en base
      departPourInvalidite: false,
      moyenneAnnuelleNBI: 0,
      trimestresLiquidablesNBI: 0,
    },
  };

  it("l'écran applique bien la règle du plus petit des deux comptages pour un sédentaire", () => {
    // Durée : 32 trimestres manquants → -25 %. Âge : (64-67)×4 → -15 %.
    expect(decoteEcran).toBe(-15);
  });

  it('écran et moteur consolidé renvoient la même pension fonction publique', () => {
    const resultat = calculerPensionConsolidee(entreeMoteur);
    expect(resultat.repartitionParRegime.fonctionPublique).toBeCloseTo(pensionEcran, 6);
  });

  it("le champ vide de l'écran (NaN) et le champ absent de la base (undefined) donnent le même âge d'annulation (67 ans)", () => {
    // Les deux chemins alimentent le même paramètre par des voies
    // différentes : `parseFloat('')` côté écran, `undefined` côté base.
    expect(decoteEcran).toBe(
      decoteFonctionPublique({
        trimestresLiquidables: 140,
        trimestresAutresRegimes: 0,
        trimestresRequis: TRIMESTRES_REQUIS,
        ageDepart: 64,
        ageAnnulationDecote: undefined,
      })
    );
    expect(decoteEcran).toBe(decoteSurAgeFonctionPublique(64, 67));
  });

  it("cocher « catégorie active » ne change plus la décote : seul le motif du départ diffère", () => {
    const avecCaseCochee = calculerPensionConsolidee({
      ...entreeMoteur,
      fonctionPublique: { ...entreeMoteur.fonctionPublique!, departAnticipeCategorieActive: true },
    });
    const sansCaseCochee = calculerPensionConsolidee(entreeMoteur);

    expect(avecCaseCochee.repartitionParRegime.fonctionPublique).toBeCloseTo(
      sansCaseCochee.repartitionParRegime.fonctionPublique,
      6
    );
  });
});


describe('Surcote classique régime général — période de référence propre (art. L. 351-1-2 CSS)', () => {
  // ⚠️ Ces scénarios dépendent de « aujourd'hui » (le moteur simule la date
  // d'effet par `new Date()`) : l'horloge est figée pour qu'ils restent
  // valables dans le temps, sinon leurs bornes d'année dériveraient d'un an
  // à chaque 1er janvier.
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-01T00:00:00Z'));
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  const anneePleine = (annee: number) => ({
    employeur: 'Test',
    typeActivite: 'employeur' as const,
    dateDebut: `${annee}-01-01`,
    dateFin: `${annee}-12-31`,
    revenu: 40000,
    estChiffreAffaires: false,
    regimes: ["L'Assurance retraite"],
  });

  it('liquidation dès l’âge légal : aucune surcote classique, malgré un excédent de trimestres', () => {
    // Né en mai 1963 → âge légal (62 ans 9 mois) atteint le 1er février 2026,
    // soit l'année en cours. La période de référence de la surcote classique
    // ne s'ouvre qu'à partir de 2027 : elle est vide.
    //
    // Avant correction, le code lisait l'année PRÉCÉDANT l'âge légal (2025),
    // pleine ici, et accordait donc +5 % à un client qui n'a pas prolongé
    // d'un seul jour au-delà de l'âge légal.
    const resultat = calculerPensionConsolidee({
      ...entreeBase,
      dateNaissance: { annee: 1963, mois: 5 },
      ageActuel: 63,
      trimestresValides: 180, // excédent : la condition de durée est remplie
      trimestresRequis: 172,
      detailCarriere: [anneePleine(2025)],
    });

    expect(resultat.detailRegimeGeneral.surcoteTotalePct).toBe(0);
    expect(resultat.detailRegimeGeneral.surcoteMontant).toBe(0);
  });

  it('trois ans d’activité au-delà de l’âge légal : surcote sur 12 trimestres (+15 %), pas 4 (+5 %)', () => {
    // Né en mars 1961 → âge légal (62 ans) atteint le 1er mars 2023. Période
    // de référence = 2024, 2025, 2026, toutes pleines → 3 × 4 = 12 trimestres.
    //
    // Avant correction, le code lisait la seule année 2022 (précédant l'âge
    // légal) et plafonnait de fait la surcote à 4 trimestres.
    const resultat = calculerPensionConsolidee({
      ...entreeBase,
      dateNaissance: { annee: 1961, mois: 3 },
      ageActuel: 65,
      trimestresValides: 180,
      trimestresRequis: 172,
      detailCarriere: [anneePleine(2024), anneePleine(2025), anneePleine(2026)],
    });

    expect(resultat.detailRegimeGeneral.surcoteTotalePct).toBe(15); // 12 × 1,25 %
    expect(resultat.detailRegimeGeneral.surcoteTotalePct).not.toBe(5);
  });

  it('la surcote classique n’est plus plafonnée à 4 trimestres : chaque année au-delà compte', () => {
    const deuxAns = calculerPensionConsolidee({
      ...entreeBase,
      dateNaissance: { annee: 1961, mois: 3 },
      ageActuel: 65,
      trimestresValides: 180,
      trimestresRequis: 172,
      detailCarriere: [anneePleine(2024), anneePleine(2025)],
    });
    const troisAns = calculerPensionConsolidee({
      ...entreeBase,
      dateNaissance: { annee: 1961, mois: 3 },
      ageActuel: 65,
      trimestresValides: 180,
      trimestresRequis: 172,
      detailCarriere: [anneePleine(2024), anneePleine(2025), anneePleine(2026)],
    });

    expect(deuxAns.detailRegimeGeneral.surcoteTotalePct).toBe(10);
    expect(troisAns.detailRegimeGeneral.surcoteTotalePct).toBe(15);
  });

  it('les années ANTÉRIEURES à l’âge légal ne comptent plus dans la surcote classique', () => {
    // Carrière pleine avant l'âge légal uniquement (2020-2022, âge légal en
    // 2023) : rien dans la période de référence → aucune surcote classique.
    const resultat = calculerPensionConsolidee({
      ...entreeBase,
      dateNaissance: { annee: 1961, mois: 3 },
      ageActuel: 65,
      trimestresValides: 180,
      trimestresRequis: 172,
      detailCarriere: [anneePleine(2020), anneePleine(2021), anneePleine(2022)],
    });

    expect(resultat.detailRegimeGeneral.surcoteTotalePct).toBe(0);
  });
});


describe('Point 1 — surcote fonction publique et CNAVPL : plus structurellement nulle', () => {
  // Génération 1955 : âge légal atteint depuis 2017 → porte d'éligibilité
  // ouverte. Trimestres au-dessus de la durée requise → condition de durée
  // remplie. Seul le compteur manquait.
  const socle = {
    ...entreeBase,
    dateNaissance: { annee: 1955, mois: 1 },
    ageActuel: 71,
    trimestresValides: 0,
    salaireAnnuelMoyen: 0,
    trimestresRequis: 172,
    regimesPoints: [],
    detailCarriere: [],
  };

  const fp = (trimestresCotisesApresAgeLegal: number) => ({
    traitementIndiciaireBrut: 60000,
    trimestresLiquidables: 180,
    pointsRAFP: 0,
    departAnticipeCategorieActive: false,
    departPourInvalidite: false,
    moyenneAnnuelleNBI: 0,
    trimestresLiquidablesNBI: 0,
    trimestresCotisesApresAgeLegal,
  });

  const cnavpl = (trimestresCotisesApresAgeLegal: number) => ({
    trimestresCNAVPL: 180,
    pointsCNAVPL: 50000,
    valeurPointCNAVPL: 0.6599,
    trimestresCotisesApresAgeLegal,
  });

  it('fonction publique : le champ déclaratif ouvre la surcote (8 trimestres → +10 %)', () => {
    const sans = calculerPensionConsolidee({ ...socle, fonctionPublique: fp(0) });
    const avec = calculerPensionConsolidee({ ...socle, fonctionPublique: fp(8) });

    // Avant : le compteur était codé en dur à 0, les deux étaient identiques.
    expect(avec.repartitionParRegime.fonctionPublique).toBeGreaterThan(
      sans.repartitionParRegime.fonctionPublique
    );
    // 8 trimestres × 1,25 % = 10 % de la pension avant décote.
    const pensionAvantDecote = 60000 * 0.75; // taux de proratisation plafonné à 1
    expect(
      avec.repartitionParRegime.fonctionPublique - sans.repartitionParRegime.fonctionPublique
    ).toBeCloseTo(pensionAvantDecote * 0.1, 6);
  });

  it('CNAVPL : le champ déclaratif ouvre la surcote (8 trimestres → +10 %)', () => {
    const sans = calculerPensionConsolidee({ ...socle, cnavpl: cnavpl(0) });
    const avec = calculerPensionConsolidee({ ...socle, cnavpl: cnavpl(8) });

    expect(avec.repartitionParRegime.cnavpl).toBeGreaterThan(sans.repartitionParRegime.cnavpl);
    expect(avec.repartitionParRegime.cnavpl - sans.repartitionParRegime.cnavpl).toBeCloseTo(
      50000 * 0.6599 * 0.1,
      6
    );
  });

  it('champ non renseigné : comportement historique inchangé (aucune surcote)', () => {
    const sansChamp = calculerPensionConsolidee({
      ...socle,
      fonctionPublique: {
        traitementIndiciaireBrut: 60000,
        trimestresLiquidables: 180,
        pointsRAFP: 0,
        departAnticipeCategorieActive: false,
        departPourInvalidite: false,
        moyenneAnnuelleNBI: 0,
        trimestresLiquidablesNBI: 0,
      },
    });
    const avecZero = calculerPensionConsolidee({ ...socle, fonctionPublique: fp(0) });
    expect(sansChamp.repartitionParRegime.fonctionPublique).toBeCloseTo(
      avecZero.repartitionParRegime.fonctionPublique,
      6
    );
  });
});

describe('Point 2 — majoration familiale Agirc-Arrco (10 % plafonnés)', () => {
  const enfant = (nom: string, extra: Partial<FamilyLink> = {}): FamilyLink => ({
    lien_familial: 'Enfant',
    nom,
    ...extra,
  });
  const troisEnfants = [enfant('A'), enfant('B'), enfant('C')];

  const socle = {
    ...entreeBase,
    trimestresValides: 0,
    salaireAnnuelMoyen: 0,
    detailCarriere: [],
  };

  it('3 enfants : +10 % sur la part Agirc-Arrco, qui n’était jamais majorée', () => {
    const regimesPoints = [{ nom: 'Agirc-Arrco', type: 'points' as const, points: 5000, valeurPoint: 1.3498 }];
    const sansEnfants = calculerPensionConsolidee({ ...socle, regimesPoints, familyLinks: [] });
    const avecEnfants = calculerPensionConsolidee({ ...socle, regimesPoints, familyLinks: troisEnfants });

    const pensionAgirc = 5000 * 1.3498;
    expect(sansEnfants.repartitionParRegime.complementaireRegimeGeneral).toBeCloseTo(pensionAgirc, 6);
    expect(avecEnfants.repartitionParRegime.complementaireRegimeGeneral).toBeCloseTo(
      pensionAgirc * 1.1,
      6
    );
  });

  it('2 enfants : aucune majoration (seuil de 3 enfants)', () => {
    const regimesPoints = [{ nom: 'Agirc-Arrco', type: 'points' as const, points: 5000, valeurPoint: 1.3498 }];
    const resultat = calculerPensionConsolidee({
      ...socle,
      regimesPoints,
      familyLinks: [enfant('A'), enfant('B')],
    });
    expect(resultat.repartitionParRegime.complementaireRegimeGeneral).toBeCloseTo(5000 * 1.3498, 6);
  });

  it('majoration plafonnée à 2 367,48 € par an', () => {
    // 20 000 points × 1,3498 = 26 996 € → 10 % = 2 699,60 €, au-dessus du plafond.
    const regimesPoints = [{ nom: 'Agirc-Arrco', type: 'points' as const, points: 20000, valeurPoint: 1.3498 }];
    const resultat = calculerPensionConsolidee({ ...socle, regimesPoints, familyLinks: troisEnfants });

    const pensionAgirc = 20000 * 1.3498;
    expect(resultat.repartitionParRegime.complementaireRegimeGeneral).toBeCloseTo(
      pensionAgirc + 2367.48,
      6
    );
    expect(
      resultat.repartitionParRegime.complementaireRegimeGeneral - pensionAgirc
    ).toBeLessThan(pensionAgirc * 0.1);
  });

  it('seule la part Agirc-Arrco est majorée, pas les autres régimes à points', () => {
    const regimesPoints = [
      { nom: 'Agirc-Arrco', type: 'points' as const, points: 5000, valeurPoint: 1.3498 },
      { nom: 'Ircantec', type: 'points' as const, points: 5000, valeurPoint: 0.5 },
    ];
    const resultat = calculerPensionConsolidee({ ...socle, regimesPoints, familyLinks: troisEnfants });

    const agirc = 5000 * 1.3498;
    const ircantec = 5000 * 0.5;
    expect(resultat.repartitionParRegime.complementaireRegimeGeneral).toBeCloseTo(
      agirc * 1.1 + ircantec,
      6
    );
  });

  it('libellé de régime pollué par le RIS : toujours reconnu comme Agirc-Arrco', () => {
    const regimesPoints = [
      { nom: 'DAICRISE01V03 88077569 Agirc-Arrco', type: 'points' as const, points: 5000, valeurPoint: 1.3498 },
    ];
    const resultat = calculerPensionConsolidee({ ...socle, regimesPoints, familyLinks: troisEnfants });
    expect(resultat.repartitionParRegime.complementaireRegimeGeneral).toBeCloseTo(
      5000 * 1.3498 * 1.1,
      6
    );
  });

  it('critère « nés ou élevés » plus large que le régime général : l’adoption simple compte', () => {
    const liens = [
      enfant('A'),
      enfant('B'),
      enfant('C', { enfant_adopte: 'Adoption simple' }),
    ];
    // Régime général : l'adoption simple est exclue du cas courant → 2 enfants.
    expect(nombreEnfantsEligiblesMajorationTroisEnfants(liens)).toBe(2);
    // Agirc-Arrco : la filiation est établie → 3 enfants, majoration ouverte.
    expect(nombreEnfantsEligiblesMajorationAgircArrco(liens, new Date('2026-09-01T00:00:00Z'))).toBe(3);

    const regimesPoints = [{ nom: 'Agirc-Arrco', type: 'points' as const, points: 5000, valeurPoint: 1.3498 }];
    const resultat = calculerPensionConsolidee({ ...socle, regimesPoints, familyLinks: liens });
    expect(resultat.repartitionParRegime.complementaireRegimeGeneral).toBeCloseTo(
      5000 * 1.3498 * 1.1,
      6
    );
  });

  it('enfant né après la date de départ : non pris en compte', () => {
    const dateDepart = new Date('2026-09-01T00:00:00Z');
    const liens = [
      enfant('A', { date_naissance: '1990-01-01' }),
      enfant('B', { date_naissance: '1992-01-01' }),
      enfant('C', { date_naissance: '2030-01-01' }), // après le départ
    ];
    expect(nombreEnfantsEligiblesMajorationAgircArrco(liens, dateDepart)).toBe(2);
    // Le même trio, tous nés avant, donnerait bien 3.
    expect(
      nombreEnfantsEligiblesMajorationAgircArrco(
        [liens[0], liens[1], enfant('C', { date_naissance: '1995-01-01' })],
        dateDepart
      )
    ).toBe(3);
  });
});

describe('Point 3 — décote CNAVPL : taux plein à 67 ans quel que soit le nombre de trimestres', () => {
  const socle = {
    ...entreeBase,
    trimestresValides: 0,
    salaireAnnuelMoyen: 0,
    trimestresRequis: 172,
    regimesPoints: [],
    detailCarriere: [],
    dateNaissance: { annee: 1955, mois: 1 },
  };
  const donneesCNAVPL = { trimestresCNAVPL: 100, pointsCNAVPL: 50000, valeurPointCNAVPL: 0.6599 };
  const pensionPleine = 50000 * 0.6599;

  it('67 ans avec 72 trimestres manquants : aucune décote (art. L. 643-4 CSS)', () => {
    const resultat = calculerPensionConsolidee({ ...socle, ageActuel: 67, cnavpl: donneesCNAVPL });
    // Avant : -25 % appliqués sur le seul comptage en trimestres.
    expect(resultat.repartitionParRegime.cnavpl).toBeCloseTo(pensionPleine, 6);
    expect(resultat.repartitionParRegime.cnavpl).not.toBeCloseTo(pensionPleine * 0.75, 6);
  });

  it('64 ans : le plus petit des deux comptages, soit -15 % (âge) et non -25 % (durée)', () => {
    const resultat = calculerPensionConsolidee({ ...socle, ageActuel: 64, cnavpl: donneesCNAVPL });
    expect(resultat.repartitionParRegime.cnavpl).toBeCloseTo(pensionPleine * 0.85, 6);
  });

  it('âge inconnu : seul le comptage en trimestres s’applique (-25 %)', () => {
    const resultat = calculerPensionConsolidee({
      ...socle,
      dateNaissance: null,
      ageActuel: null,
      cnavpl: donneesCNAVPL,
    });
    expect(resultat.repartitionParRegime.cnavpl).toBeCloseTo(pensionPleine * 0.75, 6);
  });

  it('l’absence de proratisation CNAVPL est conservée : la pension reste points × valeur', () => {
    // 100 trimestres sur 172 requis : aucun ratio 100/172 n'est appliqué,
    // contrairement au régime général et à la fonction publique.
    const resultat = calculerPensionConsolidee({ ...socle, ageActuel: 67, cnavpl: donneesCNAVPL });
    expect(resultat.repartitionParRegime.cnavpl).toBeCloseTo(pensionPleine, 6);
    expect(resultat.repartitionParRegime.cnavpl).not.toBeCloseTo(pensionPleine * (100 / 172), 6);
  });
});
