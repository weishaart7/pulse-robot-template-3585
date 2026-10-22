import { describe, it, expect } from 'vitest';
import {
  appliquerProjectionStatut,
  caisseProjetee,
  pointsCNAVPLAnnuels,
  pointsRAFPAnnuels,
  statutActuelDepuisTexte,
  EntreeProjectionStatut,
} from './projectionStatut';
import { creerSimulateurDepart, ContexteSimulationDepart } from './simulationDepart';

const fp = {
  traitementIndiciaireBrut: 40000,
  trimestresLiquidables: 100,
  pointsRAFP: 1000,
  departAnticipeCategorieActive: false,
  departPourInvalidite: false,
  moyenneAnnuelleNBI: 0,
  trimestresLiquidablesNBI: 0,
};
const cnavpl = { trimestresCNAVPL: 60, pointsCNAVPL: 8000, valeurPointCNAVPL: 0.6599 };

const base: EntreeProjectionStatut = {
  statut: 'salarie_prive',
  trimestresProjetes: 40,
  revenuAnnuel: 60000,
  primesAnnuellesFP: null,
  trimestresValidesRG: 100,
  salaireAnnuelMoyenRIS: 30000,
  salaireAnnuelMoyenProjete: 35000,
  fonctionPublique: null,
  cnavpl: null,
};

describe('pointsCNAVPLAnnuels — barème 557 / 25 (référentiel §5.2)', () => {
  it('revenu au PASS : 557 + 25/5', () => {
    expect(pointsCNAVPLAnnuels(48060)).toBeCloseTo(557 + 5, 6);
  });
  it('revenu à 5 PASS et au-delà : 582', () => {
    expect(pointsCNAVPLAnnuels(5 * 48060)).toBeCloseTo(582, 6);
    expect(pointsCNAVPLAnnuels(10 * 48060)).toBeCloseTo(582, 6);
  });
  it('revenu nul : 0', () => {
    expect(pointsCNAVPLAnnuels(0)).toBe(0);
  });
});

describe('pointsRAFPAnnuels — 10 % des primes plafonnées à 20 % du TIB', () => {
  it('primes sous le plafond', () => {
    expect(pointsRAFPAnnuels(5000, 40000)).toBeCloseTo((5000 * 0.1) / 1.4596, 6);
  });
  it('primes au-delà de 20 % du TIB : plafonnées', () => {
    expect(pointsRAFPAnnuels(20000, 40000)).toBeCloseTo((8000 * 0.1) / 1.4596, 6);
  });
});

describe('appliquerProjectionStatut', () => {
  it('salarié du privé : comportement antérieur (RG + Agirc-Arrco)', () => {
    const r = appliquerProjectionStatut(base);
    expect(r.trimestresValidesRG).toBe(140);
    expect(r.salaireAnnuelMoyen).toBe(35000);
    expect(r.projeterAgircArrco).toBe(true);
  });
  it('indépendant SSI : régime général, pas de points Agirc-Arrco', () => {
    const r = appliquerProjectionStatut({ ...base, statut: 'independant_ssi' });
    expect(r.trimestresValidesRG).toBe(140);
    expect(r.projeterAgircArrco).toBe(false);
    expect(r.trimestresCaisseProjetes).toBe(40);
  });
  it('contractuel public : régime général et points Ircantec projetés', () => {
    const r = appliquerProjectionStatut({ ...base, statut: 'contractuel_public' });
    expect(r.trimestresValidesRG).toBe(140);
    expect(r.projeterAgircArrco).toBe(false);
    expect(r.trimestresCaisseProjetes).toBe(40);
    expect(caisseProjetee('contractuel_public', null)).toBe('IRCANTEC');
  });
  it('fonctionnaire : trimestres liquidables et points RAFP, RG figé', () => {
    const r = appliquerProjectionStatut({ ...base, statut: 'fonctionnaire', fonctionPublique: fp, primesAnnuellesFP: 5000 });
    expect(r.trimestresValidesRG).toBe(100);
    expect(r.salaireAnnuelMoyen).toBe(30000);
    expect(r.fonctionPublique?.trimestresLiquidables).toBe(140);
    expect(r.fonctionPublique?.pointsRAFP).toBeCloseTo(1000 + 10 * pointsRAFPAnnuels(5000, 40000), 6);
  });
  it('libéral : trimestres et points CNAVPL', () => {
    const r = appliquerProjectionStatut({ ...base, statut: 'liberal', cnavpl });
    expect(r.cnavpl?.trimestresCNAVPL).toBe(100);
    expect(r.cnavpl?.pointsCNAVPL).toBeCloseTo(8000 + 10 * pointsCNAVPLAnnuels(60000), 6);
    expect(r.trimestresValidesRG).toBe(100);
  });
  it('régime cible absent : rien de projeté, avertissement', () => {
    const r = appliquerProjectionStatut({ ...base, statut: 'liberal' });
    expect(r.trimestresValidesRG).toBe(100);
    expect(r.avertissement).not.toBeNull();
  });
  it('avocat sans CNBF renseignée : avertissement', () => {
    expect(appliquerProjectionStatut({ ...base, statut: 'avocat_cnbf' }).avertissement).not.toBeNull();
  });
  it('statut inconnu ou vide : salarié du privé', () => {
    expect(statutActuelDepuisTexte(null)).toBe('salarie_prive');
    expect(statutActuelDepuisTexte('autre')).toBe('salarie_prive');
  });
});

describe('creerSimulateurDepart — statut actuel', () => {
  const contexte: ContexteSimulationDepart = {
    dateNaissance: { annee: 1970, mois: 3 },
    aujourdHui: new Date(Date.UTC(2026, 0, 15)),
    trimestresValidesActuels: 100,
    salaireAnnuelMoyen: 30000,
    regimesPoints: [],
    auMoinsUnTrimestreMajorationEnfant: false,
    trimestresCarriere: {
      cotises: 0,
      assimiles: 0,
      total: 0,
      parAnnee: [],
      anneesSansBaremeConnu: [],
      assimilesParNature: { maternite: 0, maladie: 0, chomageIndemnise: 0, chomageNonIndemnise: 0 },
    },
    fonctionPublique: fp,
    cnavpl: null,
    nombreEnfantsEligibles: 0,
    enfantsAgircArrco: [],
    salaireComplementaire: null,
    ageDepartAnticipeConfirme: null,
  };
  const dateEffet = new Date(Date.UTC(2034, 3, 1));

  it('fonctionnaire : les trimestres projetés vont à la FP, pas au régime général', () => {
    const salarie = creerSimulateurDepart(contexte).simuler(dateEffet);
    const fonctionnaire = creerSimulateurDepart({ ...contexte, statutActuel: 'fonctionnaire' }).simuler(dateEffet);
    expect(salarie.trimestresValidesProjetes).toBeGreaterThan(100);
    expect(fonctionnaire.trimestresValidesProjetes).toBe(100);
    expect(fonctionnaire.trimestresTousRegimes).toBe(salarie.trimestresTousRegimes);
    expect(fonctionnaire.pensionAutresRegimes).toBeGreaterThan(salarie.pensionAutresRegimes);
  });
});
