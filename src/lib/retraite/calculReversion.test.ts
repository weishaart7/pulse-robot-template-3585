import { describe, it, expect } from 'vitest';
import { calculerPartsFiscales } from '@/lib/fiscalite';
import {
  reversionRegimeGeneralAvantPlafond,
  reversionPourSurvivant,
  statutCoupleDepuisLibelle,
} from './calculReversion';
import { calculerNetRetraiteFoyer } from './calculNetRetraite';
import { AssietteReversion } from './pensionConsolidee';

const defuntSalarie: AssietteReversion = {
  regimeGeneral: 20000,
  trimestresRegimeGeneral: 172,
  agircArrco: 10000,
  fonctionPublique: 0,
  rafp: 0,
  cnavpl: 0,
};

describe('reversionRegimeGeneralAvantPlafond', () => {
  it('54 % de la pension du défunt', () => {
    expect(reversionRegimeGeneralAvantPlafond(20000, 172)).toBeCloseTo(10800, 6);
  });
  it('minimum 334,92 €/mois, proratisé sous 60 trimestres', () => {
    expect(reversionRegimeGeneralAvantPlafond(1000, 172)).toBeCloseTo(334.92 * 12, 6);
    expect(reversionRegimeGeneralAvantPlafond(1000, 30)).toBeCloseTo(334.92 * 12 * 0.5, 6);
  });
  it('maximum 1 081,35 €/mois', () => {
    expect(reversionRegimeGeneralAvantPlafond(40000, 172)).toBeCloseTo(1081.35 * 12, 6);
  });
});

describe('reversionPourSurvivant', () => {
  it('PACS ou concubinage : aucune réversion', () => {
    expect(reversionPourSurvivant(defuntSalarie, 0, 'pacse').total).toBe(0);
    expect(reversionPourSurvivant(defuntSalarie, 0, 'concubin').total).toBe(0);
  });

  it('scénario R1 : réversion régime général réduite par le plafond de ressources, Agirc-Arrco à 60 %', () => {
    const r = reversionPourSurvivant(defuntSalarie, 15000, 'marie');
    // 15 000 + 10 800 = 25 800 > 25 001,60 : réduite de 798,40 €.
    expect(r.regimeGeneral).toBeCloseTo(10001.6, 2);
    expect(r.reduiteParPlafondRessources).toBe(true);
    expect(r.agircArrco).toBeCloseTo(6000, 6);
    expect(r.total).toBeCloseTo(16001.6, 2);
  });

  it('ressources au-dessus du plafond : plus de réversion régime général, Agirc-Arrco maintenue', () => {
    const r = reversionPourSurvivant(defuntSalarie, 30000, 'marie');
    expect(r.regimeGeneral).toBe(0);
    expect(r.agircArrco).toBeCloseTo(6000, 6);
  });

  it('fonction publique et RAFP à 50 %, hors plafond de ressources', () => {
    const r = reversionPourSurvivant(
      { ...defuntSalarie, regimeGeneral: 0, agircArrco: 0, fonctionPublique: 24000, rafp: 800 },
      40000,
      'marie'
    );
    expect(r.fonctionPublique).toBe(12000);
    expect(r.rafp).toBe(400);
  });

  it('scénario R1 : revenu net du survivant (veuf, 1 part)', () => {
    const reversion = reversionPourSurvivant(defuntSalarie, 15000, 'marie');
    const net = calculerNetRetraiteFoyer(
      [{ base: 12000 + reversion.regimeGeneral, complementaires: 3000 + reversion.agircArrco }],
      calculerPartsFiscales({
        situationFamille: 'veuf',
        lieuResidence: 'metropole',
        enfantsCharge: [],
        personnesInvalidesCharge: [],
        enfantsMajeursRattaches: 0,
        parentIsole: false,
        ancienParentIsole: false,
        invaliditeDeclarant1: false,
        invaliditeDeclarant2: false,
        ancienCombattantDeclarant1: false,
        ancienCombattantDeclarant2: false,
        veufAncienCombattant: false,
        veuveDeGuerre: false,
      }),
      'veuf'
    );
    expect(net.pensionsBrutes).toBeCloseTo(31001.6, 2);
    expect(net.tranche).toBe('tauxNormal');
    expect(net.prelevementsSociaux).toBeCloseTo(2911.14, 1);
    expect(net.impot).toBe(1445);
    expect(net.netAnnuel).toBeCloseTo(26645.46, 1);
  });
});

describe('statutCoupleDepuisLibelle', () => {
  it('reconnaît mariage, PACS et concubinage', () => {
    expect(statutCoupleDepuisLibelle('Marié(e)')).toBe('marie');
    expect(statutCoupleDepuisLibelle('Pacsé(e)')).toBe('pacse');
    expect(statutCoupleDepuisLibelle('Concubinage')).toBe('concubin');
    expect(statutCoupleDepuisLibelle('Célibataire')).toBeNull();
  });
});
