import { describe, it, expect } from 'vitest';
import { creerSimulateurDepart, ContexteSimulationDepart } from './simulationDepart';
import { ResultatTrimestresCotisesEtAssimiles, trimestresCotisesEtAssimilesDepuisCarriere } from './calculTrimestres';
import { PeriodeCarriere } from './parseRIS';
import { calculerSAM } from './calculSAM';
import { calculerProjectionRevenuFutur, projectionRevenuFuturA } from './hypotheseRevenuFutur';
import { appliquerProjectionStatut } from './projectionStatut';
import { calculerPensionConsolidee } from './pensionConsolidee';
import { trimestresRequisPourGeneration } from './calcul';

const carriereVide: ResultatTrimestresCotisesEtAssimiles = {
  cotises: 0,
  assimiles: 0,
  total: 0,
  parAnnee: [],
  anneesSansBaremeConnu: [],
  assimilesParNature: { maternite: 0, maladie: 0, chomageIndemnise: 0, chomageNonIndemnise: 0 },
};

const dateEffet = new Date(Date.UTC(2034, 3, 1)); // âge légal, née en mars 1970

const contexte = (surcharge: Partial<ContexteSimulationDepart>): ContexteSimulationDepart => ({
  dateNaissance: { annee: 1970, mois: 3 },
  aujourdHui: dateEffet, // aucune projection de trimestres futurs
  trimestresValidesActuels: 160,
  salaireAnnuelMoyen: 30000,
  regimesPoints: [],
  auMoinsUnTrimestreMajorationEnfant: false,
  trimestresCarriere: carriereVide,
  fonctionPublique: null,
  cnavpl: null,
  nombreEnfantsEligibles: 0,
  enfantsAgircArrco: [],
  salaireComplementaire: null,
  ageDepartAnticipeConfirme: null,
  ...surcharge,
});

describe('creerSimulateurDepart — non-régression de l\'extraction (scénarios de référence)', () => {
  it('S2 : base décotée de 15 %, même montant que le moteur consolidé', () => {
    const r = creerSimulateurDepart(contexte({})).simuler(dateEffet);
    expect(r.avantAgeLegal).toBe(false);
    expect(r.decote).toBe(-15);
    expect(r.pensionBaseValue).toBeCloseTo(11860.47, 2);
  });

  it('Agirc-Arrco abattu (0,88 à 64 ans) quand la base est décotée', () => {
    const r = creerSimulateurDepart(
      contexte({ regimesPoints: [{ nom: 'Agirc-Arrco', type: 'points', points: 10000 }] })
    ).simuler(dateEffet);
    expect(r.pensionComplementaires).toBeCloseTo(10000 * 1.4587 * 0.88, 2);
  });

  it('trimestres enfants : ajoutés aux validés, décote réduite d\'autant (−15 % → −5 %)', () => {
    const r = creerSimulateurDepart(
      contexte({
        trimestresEnfantsA: () => ({
          rg: 8,
          cnavpl: 0,
          fpMajorationDuree: 0,
          fpBonification: 0,
          total: 8,
          auMoinsUn: true,
          detail: [],
        }),
      })
    ).simuler(dateEffet);
    expect(r.trimestresValidesProjetes).toBe(168);
    expect(r.trimestresEnfants).toBe(8);
    expect(r.decote).toBe(-5);
  });

  it('avant l\'âge légal sans départ anticipé : impossible', () => {
    const r = creerSimulateurDepart(contexte({})).simuler(new Date(Date.UTC(2033, 3, 1)));
    expect(r.avantAgeLegal).toBe(true);
  });

  it('départ anticipé confirmé par la caisse à 62 ans : taux plein, pas d\'abattement', () => {
    const simulateur = creerSimulateurDepart(
      contexte({
        ageDepartAnticipeConfirme: 62,
        regimesPoints: [{ nom: 'Agirc-Arrco', type: 'points', points: 10000 }],
      })
    );
    const r = simulateur.simuler(new Date(Date.UTC(2032, 3, 1)));
    expect(r.departAnticipe).toBe('confirme');
    expect(r.avantAgeLegal).toBe(false);
    expect(r.decote).toBe(0);
    expect(r.pensionComplementaires).toBeCloseTo(10000 * 1.4587, 2);
    expect(simulateur.dateEffetDepartConfirme?.toISOString().slice(0, 10)).toBe('2032-04-01');
  });
});

describe('creerSimulateurDepart — SAM projeté par date de départ', () => {
  const naissance = { annee: 1968, mois: 6 };
  const aujourdHui = new Date(Date.UTC(2026, 9, 22));
  const detail: PeriodeCarriere[] = Array.from({ length: 36 }, (_, i) => ({
    employeur: 'Employeur',
    typeActivite: 'employeur',
    dateDebut: `${1990 + i}-01-01`,
    dateFin: `${1990 + i}-12-31`,
    revenu: 30000,
    estChiffreAffaires: false,
    regimes: ["L'Assurance retraite"],
  }));
  const carriere = trimestresCotisesEtAssimilesDepuisCarriere(detail);
  const samRIS = calculerSAM(detail, naissance.annee).sam;
  const projectionA = (d: Date) =>
    projectionRevenuFuturA(naissance, detail, samRIS, 'revenu_moyen_projete', 60000, aujourdHui, 0.03, d);
  const simulateur = creerSimulateurDepart(
    contexte({
      dateNaissance: naissance,
      aujourdHui,
      trimestresValidesActuels: carriere.total,
      trimestresCarriere: carriere,
      salaireAnnuelMoyen: samRIS,
      salaireAnnuelMoyenA: (d) => projectionA(d).salaireAnnuelMoyenProjete,
    })
  );

  it('départ à l\'âge légal : même SAM et même pension de base que la Synthèse', () => {
    const synthese = calculerProjectionRevenuFutur(naissance, detail, samRIS, 'revenu_moyen_projete', 60000, aujourdHui, 0.03);
    const dateLegal = synthese.dateEffet!;
    const projection = appliquerProjectionStatut({
      statut: 'salarie_prive',
      trimestresProjetes: synthese.trimestresValidesProjetes,
      revenuAnnuel: synthese.revenuHypothese,
      primesAnnuellesFP: null,
      trimestresValidesRG: carriere.total,
      salaireAnnuelMoyenRIS: samRIS,
      salaireAnnuelMoyenProjete: synthese.salaireAnnuelMoyenProjete,
      fonctionPublique: null,
      cnavpl: null,
    });
    const consolidee = calculerPensionConsolidee({
      salaireAnnuelMoyen: projection.salaireAnnuelMoyen,
      trimestresValides: projection.trimestresValidesRG,
      trimestresRequis: trimestresRequisPourGeneration(naissance, dateLegal),
      dateNaissance: naissance,
      dateEffet: dateLegal,
      regimesPoints: [],
      detailCarriere: detail,
      familyLinks: [],
      auMoinsUnTrimestreMajorationEnfant: false,
      autresPensionsMensuelles: 0,
      fonctionPublique: null,
      cnavpl: null,
    });
    const r = simulateur.simuler(dateLegal);
    expect(synthese.salaireAnnuelMoyenProjete).toBeGreaterThan(samRIS);
    expect(r.salaireAnnuelMoyen).toBeCloseTo(synthese.salaireAnnuelMoyenProjete, 6);
    expect(r.pensionBaseBrute).toBeCloseTo(consolidee.detailRegimeGeneral.pensionBaseBrute, 2);
    expect(r.decote).toBeCloseTo(consolidee.detailRegimeGeneral.decote, 6);
  });

  it('départ plus tardif : SAM recalculé avec les années projetées supplémentaires', () => {
    const tot = simulateur.simuler(new Date(Date.UTC(2032, 6, 1)));
    const tard = simulateur.simuler(new Date(Date.UTC(2035, 6, 1)));
    expect(tard.salaireAnnuelMoyen).toBeGreaterThan(tot.salaireAnnuelMoyen);
  });

  it('sans SAM par date : SAM du relevé à toute date', () => {
    const r = creerSimulateurDepart(contexte({})).simuler(dateEffet);
    expect(r.salaireAnnuelMoyen).toBe(30000);
  });
});
