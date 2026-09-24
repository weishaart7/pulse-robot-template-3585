import { describe, it, expect } from 'vitest';
import { calculerPensionConsolidee, EntreePensionConsolidee } from './pensionConsolidee';
import {
  tauxProratisation,
  pensionBase,
  decoteSurTrimestres,
  minimumContributif,
  majorationTroisEnfants,
} from './calcul';
import { nombreEnfantsEligiblesMajorationTroisEnfants } from './enfantsEligiblesMajoration';

const entreeBase: EntreePensionConsolidee = {
  salaireAnnuelMoyen: 30000,
  trimestresValides: 160,
  trimestresRequis: 172,
  dateNaissance: { annee: 1990, mois: 6 },
  dateEffet: new Date(Date.UTC(2054, 6, 1)), // départ à l'âge légal (64 ans) pour une naissance en juin 1990
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
      dateEffet: new Date(Date.UTC(2026, 9, 1)),
    };
    const resultat = calculerPensionConsolidee(entree);

    const tauxAttendu = tauxProratisation(160, 172);
    const decoteAttendue = Math.min(decoteSurTrimestres(160, 172), 0);
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
      dateEffet: new Date(Date.UTC(2026, 9, 1)),
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
        moyenneAnnuelleNBI: 0,
        trimestresLiquidablesNBI: 0,
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

describe('calculerPensionConsolidee — surcote classique après l’âge légal (référentiel §2.3.1)', () => {
  // Né en mars 1960 : âge légal 62 ans (anniversaire mars 2022), période de
  // référence à partir du 01/04/2022 ; date d'effet = 24/09/2026 →
  // fin de période au 30/06/2026.
  const annees = (de: number, a: number) =>
    Array.from({ length: a - de + 1 }, (_, i) => ({
      employeur: 'Test',
      typeActivite: 'employeur' as const,
      dateDebut: `${de + i}-01-01`,
      dateFin: `${de + i}-12-31`,
      revenu: 40000,
      estChiffreAffaires: false,
      regimes: ["L'Assurance retraite"],
    }));

  const entree = (detailCarriere: EntreePensionConsolidee['detailCarriere'], trimestresValides: number) => ({
    ...entreeBase,
    dateNaissance: { annee: 1960, mois: 3 },
    dateEffet: new Date(Date.UTC(2026, 8, 24)),
    trimestresRequis: 167,
    trimestresValides,
    detailCarriere,
  });

  it('trimestres cotisés après l’âge légal, bornés par l’excédent sur la durée requise', () => {
    // Période : T2-T4 2022 (3) + 2023-2025 (12) + T1-T2 2026 (2) = 17 ;
    // excédent 180 - 167 = 13 → 13 trimestres, 16,25 %.
    const resultat = calculerPensionConsolidee(entree(annees(1981, 2026), 180));
    expect(resultat.detailRegimeGeneral.surcoteClassiquePct).toBeCloseTo(16.25, 6);
  });

  it('non-régression : l’année précédant l’âge légal ne génère plus de surcote classique', () => {
    const resultat = calculerPensionConsolidee(entree(annees(1981, 2021), 180));
    expect(resultat.detailRegimeGeneral.surcoteClassiquePct).toBe(0);
  });

  it('durée requise appréciée tous régimes : trimestres FP inclus', () => {
    const resultat = calculerPensionConsolidee({
      ...entree(annees(1981, 2026), 160),
      fonctionPublique: {
        traitementIndiciaireBrut: 0,
        trimestresLiquidables: 20,
        pointsRAFP: 0,
        departAnticipeCategorieActive: false,
        departPourInvalidite: false,
        moyenneAnnuelleNBI: 0,
        trimestresLiquidablesNBI: 0,
      },
    });
    // 160 RG + 20 FP = 180 ≥ 167 → excédent 13.
    expect(resultat.detailRegimeGeneral.surcoteClassiquePct).toBeCloseTo(16.25, 6);
  });
});

describe('calculerPensionConsolidee — date d’effet unique (âge de départ au mois près)', () => {
  it('départ à 64 ans 0 mois avec trimestres manquants : décote âge -15 % retenue si plus favorable', () => {
    // Né en mars 1970, effet au 01/04/2034 (64 ans 0 mois) : 12 trimestres
    // avant 67 ans → -15 %, plus favorable que la décote trimestres (-25 %).
    const resultat = calculerPensionConsolidee({
      ...entreeBase,
      dateNaissance: { annee: 1970, mois: 3 },
      dateEffet: new Date(Date.UTC(2034, 3, 1)),
      trimestresValides: 140,
      trimestresRequis: 172,
    });
    expect(resultat.detailRegimeGeneral.decote).toBeCloseTo(-15, 10);
  });

  it('départ à l’âge légal : aucune surcote classique même avec un excédent de trimestres', () => {
    const resultat = calculerPensionConsolidee({
      ...entreeBase,
      dateNaissance: { annee: 1970, mois: 3 },
      dateEffet: new Date(Date.UTC(2034, 3, 1)),
      trimestresValides: 180,
      trimestresRequis: 172,
    });
    expect(resultat.detailRegimeGeneral.surcoteClassiquePct).toBe(0);
    expect(resultat.detailRegimeGeneral.decote).toBe(0);
  });

  it('texte du taux plein apprécié tous régimes (RG + FP)', () => {
    const resultat = calculerPensionConsolidee({
      ...entreeBase,
      trimestresValides: 160,
      trimestresRequis: 172,
      fonctionPublique: {
        traitementIndiciaireBrut: 0,
        trimestresLiquidables: 20,
        pointsRAFP: 0,
        departAnticipeCategorieActive: false,
        departPourInvalidite: false,
        moyenneAnnuelleNBI: 0,
        trimestresLiquidablesNBI: 0,
      },
    });
    expect(resultat.ageTauxPlein).toBe('Taux plein atteint avec les trimestres validés');
  });
});

describe('calculerPensionConsolidee — écrêtement du MICO tous régimes (référentiel §3.5.5)', () => {
  // Petite pension RG au taux plein (départ à 67 ans) → MICO applicable.
  const entreeMico: EntreePensionConsolidee = {
    ...entreeBase,
    salaireAnnuelMoyen: 8000,
    trimestresValides: 172,
    trimestresRequis: 172,
    dateNaissance: { annee: 1960, mois: 5 },
    dateEffet: new Date(Date.UTC(2027, 5, 1)),
    regimesPoints: [],
    detailCarriere: [],
  };

  it('sans autre pension : majoration MICO non écrêtée', () => {
    const r = calculerPensionConsolidee(entreeMico).detailRegimeGeneral;
    expect(r.majorationMicoApresEcretement).toBeCloseTo(r.majorationMicoAvantEcretement, 6);
    expect(r.majorationMicoAvantEcretement).toBeGreaterThan(0);
  });

  it('la complémentaire Agirc-Arrco calculée par l’outil entre dans le plafond', () => {
    const complementaire = 16000; // au-delà du plafond à elle seule avec P0
    const r = calculerPensionConsolidee({
      ...entreeMico,
      regimesPoints: [{ nom: 'Agirc-Arrco', type: 'points', points: complementaire, valeurPoint: 1 }],
    }).detailRegimeGeneral;
    expect(r.majorationMicoApresEcretement).toBe(0);
  });

  it('la pension CNAVPL calculée par l’outil entre dans le plafond (réduction à due concurrence)', () => {
    const sans = calculerPensionConsolidee(entreeMico).detailRegimeGeneral;
    const pensionCNAVPL = 10000; // 4 000 (P0) + ~5 075 (MICO) + 10 000 > 16 930,68
    const r = calculerPensionConsolidee({
      ...entreeMico,
      cnavpl: { trimestresCNAVPL: 0, pointsCNAVPL: pensionCNAVPL, valeurPointCNAVPL: 1 },
    }).detailRegimeGeneral;
    const p0 = r.pensionBaseBrute * (1 + r.decote / 100);
    const depassement = p0 + sans.majorationMicoAvantEcretement + pensionCNAVPL - 16930.68;
    expect(depassement).toBeGreaterThan(0);
    expect(r.majorationMicoApresEcretement).toBeCloseTo(
      Math.max(0, sans.majorationMicoAvantEcretement - Math.max(0, depassement)),
      6
    );
  });
});
