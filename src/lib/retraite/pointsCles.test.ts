import { describe, it, expect } from 'vitest';
import {
  calculerPointsCles,
  cumulSelonReformeLFSS2026,
  dateEffetAgeTauxPleinAutomatique,
  droitsCumulEmploiRetraite,
  plafondSecondePension,
  regimesPourCumul,
  EntreePointsCles,
} from './pointsCles';
import { trimestresRequisPourGeneration } from './calcul';

const naissance = { annee: 1968, mois: 6 };
const aujourdHui = new Date(Date.UTC(2025, 8, 25));
// Carrière continue : un trimestre par trimestre civil à partir du 4e trimestre 2025.
const projetes = (date: Date) =>
  Math.max(0, date.getUTCFullYear() * 4 + Math.floor(date.getUTCMonth() / 3) - (2025 * 4 + 3));
const base: EntreePointsCles = {
  dateNaissance: naissance,
  aujourdHui,
  trimestresAcquis: 140,
  trimestresEnfants: 0,
  trimestresProjetesJusqua: projetes,
  dateCarriereLongue: null,
};
const iso = (d: Date) => d.toISOString().slice(0, 10);

describe('calculerPointsCles', () => {
  it('âge légal de la génération et date d\'effet au 1er du mois suivant', () => {
    const p = calculerPointsCles(base)!;
    expect(p.dateAgeLegal.getUTCDate()).toBe(1);
    expect(p.ageLegal.ans).toBeGreaterThanOrEqual(62);
    expect(p.trimestresRequis).toBe(trimestresRequisPourGeneration(naissance, p.dateAgeLegal));
  });
  it('durée atteinte avant l\'âge légal : taux plein à l\'âge légal', () => {
    const p = calculerPointsCles({ ...base, trimestresAcquis: 200 })!;
    expect(iso(p.dateTauxPlein)).toBe(iso(p.dateAgeLegal));
    expect(p.trimestresManquantsAgeLegal).toBe(0);
    expect(p.tauxPleinParAge).toBe(false);
  });
  it('trimestres manquants à l\'âge légal : taux plein plus tard, au trimestre où la durée est atteinte', () => {
    const p0 = calculerPointsCles(base)!;
    const manque = 3;
    const acquis = p0.trimestresRequis - projetes(p0.dateAgeLegal) - manque;
    const p = calculerPointsCles({ ...base, trimestresAcquis: acquis })!;
    expect(p.trimestresManquantsAgeLegal).toBe(manque);
    expect(p.dateTauxPlein.getTime()).toBeGreaterThan(p.dateAgeLegal.getTime());
    expect(acquis + projetes(p.dateTauxPlein)).toBeGreaterThanOrEqual(trimestresRequisPourGeneration(naissance, p.dateTauxPlein));
  });
  it('trimestres enfants comptés', () => {
    const p0 = calculerPointsCles(base)!;
    const acquis = p0.trimestresRequis - projetes(p0.dateAgeLegal) - 4;
    expect(calculerPointsCles({ ...base, trimestresAcquis: acquis, trimestresEnfants: 4 })!.trimestresManquantsAgeLegal).toBe(0);
  });
  it('durée jamais atteinte : taux plein par l\'âge à 67 ans, cumul intégral à 67 ans', () => {
    const p = calculerPointsCles({ ...base, trimestresAcquis: 0, trimestresProjetesJusqua: () => 0 })!;
    expect(p.tauxPleinParAge).toBe(true);
    expect(iso(p.dateTauxPlein)).toBe(iso(dateEffetAgeTauxPleinAutomatique(naissance)));
    expect(iso(p.dateTauxPlein)).toBe('2035-07-01');
    expect(p.ageTauxPlein).toEqual({ ans: 67, mois: 0 });
    expect(p.cumulSelonReforme).toBe(true);
    expect(iso(p.dateCumulIntegral)).toBe('2035-07-01');
  });
  it('carrière longue retenue seulement si antérieure à l\'âge légal', () => {
    const tot = new Date(Date.UTC(2029, 0, 1));
    expect(calculerPointsCles({ ...base, dateCarriereLongue: tot })!.dateCarriereLongue).toEqual(tot);
    expect(calculerPointsCles({ ...base, dateCarriereLongue: new Date(Date.UTC(2040, 0, 1)) })!.dateCarriereLongue).toBeNull();
  });
});

describe('cumulSelonReformeLFSS2026', () => {
  it('liquidations à compter du 01/01/2027', () => {
    expect(cumulSelonReformeLFSS2026(new Date(Date.UTC(2026, 11, 1)))).toBe(false);
    expect(cumulSelonReformeLFSS2026(new Date(Date.UTC(2027, 0, 1)))).toBe(true);
  });
});

describe('cumul emploi-retraite : nouveaux droits par régime', () => {
  const base = {
    statut: 'salarie_prive',
    aRegimeGeneral: true,
    aAgircArrco: true,
    aRCI: false,
    aFonctionPublique: false,
    aCNAVPL: false,
    aIrcantec: false,
    caisseLiberale: null,
  };
  it('salarié du privé : régime général et Agirc-Arrco, nouveaux droits', () => {
    const droits = droitsCumulEmploiRetraite(regimesPourCumul(base));
    expect(droits.map((d) => [d.regime, d.nouveauxDroits])).toEqual([
      ['REGIME_GENERAL', 'oui'],
      ['AGIRC_ARRCO', 'oui'],
    ]);
    expect(droits[1].depuis?.toISOString().slice(0, 10)).toBe('2023-01-01');
  });
  it('indépendant : SSI et RCI (depuis 2025)', () => {
    const droits = droitsCumulEmploiRetraite(
      regimesPourCumul({ ...base, statut: 'independant_ssi', aAgircArrco: false, aRCI: true })
    );
    expect(droits.map((d) => d.regime)).toEqual(['SSI', 'RCI']);
    expect(droits[1].depuis?.toISOString().slice(0, 10)).toBe('2025-01-01');
  });
  it('libéraux : CAVEC sans droits, CARCDSF avec, CNAVPL et CARMF à vérifier ; volets ASV/PCV rattachés', () => {
    const regimes = regimesPourCumul({
      ...base,
      statut: 'liberal',
      aRegimeGeneral: false,
      aAgircArrco: false,
      aCNAVPL: true,
      caisseLiberale: 'CAVEC',
      caissesDetectees: ['carcdsfPcvCd', 'carmfAsv'],
    });
    expect(regimes).toEqual(['CNAVPL', 'CAVEC', 'CARCDSF', 'CARMF']);
    const droits = Object.fromEntries(droitsCumulEmploiRetraite(regimes).map((d) => [d.regime, d.nouveauxDroits]));
    expect(droits).toEqual({ CNAVPL: 'a_verifier', CAVEC: 'non', CARCDSF: 'oui', CARMF: 'a_verifier' });
  });
  it('seconde pension de base plafonnée à 5 % du PASS', () => {
    expect(plafondSecondePension(48060)).toBeCloseTo(2403, 6);
  });
});
