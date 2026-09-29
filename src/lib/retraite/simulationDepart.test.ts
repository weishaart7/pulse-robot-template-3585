import { describe, it, expect } from 'vitest';
import { creerSimulateurDepart, ContexteSimulationDepart } from './simulationDepart';
import { ResultatTrimestresCotisesEtAssimiles } from './calculTrimestres';

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
    expect(r.pensionComplementaires).toBeCloseTo(10000 * 1.4386 * 0.88, 2);
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
    expect(r.pensionComplementaires).toBeCloseTo(10000 * 1.4386, 2);
    expect(simulateur.dateEffetDepartConfirme?.toISOString().slice(0, 10)).toBe('2032-04-01');
  });
});
