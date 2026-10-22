import { describe, it, expect } from 'vitest';
import { cotisationCapitalisationCAVP, renteCAVPCapitalisation } from './calculCAVPCapitalisation';
import { annuiteDepuisCapital, capitalProjete } from './calculEpargneRetraite';
import { PARAMETRES_EPARGNE_RETRAITE, PARAMETRES_ESPERANCE_VIE } from './parametres';

describe('CAVP — volet par capitalisation', () => {
  it('part capitalisée 2026 selon la classe du revenu', () => {
    expect(cotisationCapitalisationCAVP(50000)).toBe(2906);
    expect(cotisationCapitalisationCAVP(90000)).toBe(4359);
    expect(cotisationCapitalisationCAVP(500000)).toBe(17436);
  });
  it('capital projeté au rendement central puis converti jusqu’à l’âge de référence', () => {
    const rendement = PARAMETRES_EPARGNE_RETRAITE.rendementsHypotheses.central;
    const { hommes, femmes } = PARAMETRES_ESPERANCE_VIE.a65;
    const r = renteCAVPCapitalisation(100000, 90000, 10, 67);
    expect(r.capitalAuDepart).toBeCloseTo(capitalProjete(100000, 4359, rendement, 10), 6);
    expect(r.renteAnnuelle).toBeCloseTo(annuiteDepuisCapital(r.capitalAuDepart, rendement, 65 + (hommes + femmes) / 2 - 67), 6);
  });
  it('sans revenu futur : capital actuel capitalisé seul ; rien sans capital', () => {
    const rendement = PARAMETRES_EPARGNE_RETRAITE.rendementsHypotheses.central;
    expect(renteCAVPCapitalisation(50000, null, 10, 67).capitalAuDepart).toBeCloseTo(capitalProjete(50000, 0, rendement, 10), 6);
    expect(renteCAVPCapitalisation(0, null, 0, 67).renteAnnuelle).toBe(0);
  });
});
