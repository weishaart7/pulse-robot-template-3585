import { describe, it, expect } from 'vitest';
import {
  capitalProjete,
  capitalNecessaire,
  annuiteDepuisCapital,
  plafondDeductionPER,
  fractionImposableRente,
  sortiePERCapital,
  sortiePERRente,
  scenarioCouverture,
  versementAnnuelPourCapital,
  analyserEcartRevenu,
} from './calculEpargneRetraite';

describe('capitalisation et annuités', () => {
  it('capital projeté : 50 000 € + 3 000 €/an pendant 15 ans à 2 %', () => {
    expect(capitalProjete(50000, 3000, 0.02, 15)).toBeCloseTo(119173.67, 2);
  });
  it('rendement nul : simple somme', () => {
    expect(capitalProjete(50000, 3000, 0, 15)).toBe(95000);
    expect(capitalNecessaire(6000, 0, 20)).toBe(120000);
  });
  it('capital nécessaire : 6 000 €/an pendant 20 ans à 2 % (versements en début d\'année)', () => {
    expect(capitalNecessaire(6000, 0.02, 20)).toBeCloseTo(100070.77, 2);
  });
  it('annuité : inverse du capital nécessaire', () => {
    expect(annuiteDepuisCapital(capitalNecessaire(6000, 0.02, 20), 0.02, 20)).toBeCloseTo(6000, 6);
  });
});

describe('PER', () => {
  it('plafond de déduction 2026 : 10 %, entre 4 710 € et 37 680 €', () => {
    expect(plafondDeductionPER(20000)).toBe(4710);
    expect(plafondDeductionPER(80000)).toBe(8000);
    expect(plafondDeductionPER(1000000)).toBe(37680);
  });
  it('fraction imposable de la rente selon l\'âge', () => {
    expect(fractionImposableRente(64)).toBe(0.4);
    expect(fractionImposableRente(70)).toBe(0.3);
  });
  it('sortie en capital : 100 000 € dont 60 000 € de versements déduits, TMI 30 %', () => {
    const s = sortiePERCapital(100000, 60000, 0.3);
    expect(s.impot).toBeCloseTo(23120, 6);
    expect(s.prelevementsSociaux).toBeCloseTo(7440, 6);
    expect(s.net).toBeCloseTo(69440, 6);
  });
  it('sortie en rente : 6 000 €/an dès 64 ans, TMI 11 %', () => {
    const s = sortiePERRente(6000, 64, 0.11);
    expect(s.impot).toBeCloseTo(594, 6);
    expect(s.prelevementsSociaux).toBeCloseTo(446.4, 6);
    expect(s.net).toBeCloseTo(4959.6, 6);
  });
});

describe('scenarioCouverture — scénario E1 (docs/Golden_Scenarios_Retraite.md)', () => {
  it('déficit de 6 000 €/an sur 20 ans couvert à 119 % au rendement central', () => {
    const s = scenarioCouverture({
      epargneActuelle: 50000,
      versementAnnuel: 3000,
      anneesAvantDepart: 15,
      deficitAnnuel: 6000,
      rendement: 0.02,
      anneesVersement: 20,
    });
    expect(s.capitalProjete).toBeCloseTo(119173.67, 2);
    expect(s.capitalNecessaire).toBeCloseTo(100070.77, 2);
    expect(s.couverture).toBeCloseTo(1.1909, 4);
    expect(s.revenuAnnuelPermis).toBeCloseTo(7145.36, 2);
  });
  it('aucun déficit : couverture non définie', () => {
    expect(
      scenarioCouverture({
        epargneActuelle: 1000,
        versementAnnuel: 0,
        anneesAvantDepart: 5,
        deficitAnnuel: -2000,
        rendement: 0.02,
        anneesVersement: 20,
      }).couverture
    ).toBeNull();
  });
});

describe('analyserEcartRevenu — épargne complémentaire recommandée', () => {
  const base = {
    netMensuel: 2500,
    revenusActifsMensuels: 0,
    budgetMensuel: 3000,
    encoursPER: 20000,
    encoursAssuranceVie: 0,
    versementAnnuel: 0,
    anneesAvantDepart: 15,
    ageDepart: 64,
    ageReference: 84,
    rendements: { prudent: 0.01, central: 0.02, favorable: 0.03 },
  };
  it('déficit de 500 €/mois : capital manquant et versement annuel équivalent (scénario central)', () => {
    const r = analyserEcartRevenu(base);
    expect(r.deficitAnnuel).toBe(6000);
    const projete = 20000 * Math.pow(1.02, 15);
    expect(r.capitalManquantCentral).toBeCloseTo(100070.77 - projete, 1);
    expect(r.versementAnnuelComplementaire).toBeCloseTo(versementAnnuelPourCapital(100070.77 - projete, 0.02, 15), 1);
  });
  it('versement équivalent : reconstitue le capital manquant', () => {
    const v = versementAnnuelPourCapital(50000, 0.02, 15);
    expect(capitalProjete(0, v, 0.02, 15)).toBeCloseTo(50000, 6);
  });
  it('excédent : rien à constituer', () => {
    const r = analyserEcartRevenu({ ...base, netMensuel: 3500 });
    expect(r.capitalManquantCentral).toBe(0);
    expect(r.versementAnnuelComplementaire).toBe(0);
  });
});
