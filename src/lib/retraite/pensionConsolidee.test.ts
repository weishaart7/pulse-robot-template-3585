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
