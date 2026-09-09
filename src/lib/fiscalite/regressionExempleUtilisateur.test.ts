import { describe, expect, it } from 'vitest';
import { calculerRevenuSalaires } from './calculerRevenuSalaires';
import { calculerRevenuExonereTauxEffectif } from './calculerRevenuExonereTauxEffectif';
import { calculerPartsFiscales } from './calculerPartsFiscales';
import { calculerImpot } from './calculerImpot';
import { FoyerFiscalInput, RevenusExoneresTauxEffectifInput, RevenusSalairesInput } from './types';

/**
 * Cas réel signalé par un utilisateur : Kairos donnait 10 314 € quand le
 * simulateur officiel DGFiP donne 10 356 €. Cause : le choix 10 %/frais réels
 * (art. 83 CGI) était arbitré indépendamment pour 1AJ (salaire France) et
 * 1AC/1AE (salaire exonéré retenu pour le taux effectif) du même déclarant,
 * alors que ce choix est unique par déclarant pour l'ensemble de ses
 * traitements et salaires (voir JSDoc de calculerDeclarant).
 */
describe('régression : marié, 1AJ/1BJ + 1AC/1AE (frais réels) + 1AH', () => {
  it('retrouve le montant du simulateur officiel (10 356 €), pas 10 314 €', () => {
    const revenus: RevenusSalairesInput = {
      case1aj: 50000, case1bj: 20000,
      case1aa: null, case1ba: null, case1ga: null, case1ha: null,
      case1gh: null, case1hh: null, case1pb: null, case1pc: null,
      case1ad: null, case1bd: null, case1av: false, case1bv: false,
      case1gb: null, case1hb: null, case1gk: false, case1gl: false,
      case1gf: null, case1hf: null, case1gg: null, case1hg: null,
      case1aq: null, case1bq: null, case1ap: null, case1bp: null,
      case1af: null, case1bf: null, case1ag: null, case1bg: null,
      case1ak: null, case1bk: null, case1pm: null, case1qm: null,
      case1dy: null, case1ey: null, case1sm: null, case1dn: null,
    };
    const exoneres: RevenusExoneresTauxEffectifInput = {
      case1ac: 35000, case1bc: null, case1ge: false, case1he: false,
      case1ae: 4000, case1be: null, case1ah: 8000, case1bh: null,
      caseRse: null, caseRsf: null,
    };
    const foyer: FoyerFiscalInput = {
      situationFamille: 'marie', lieuResidence: 'metropole',
      enfantsCharge: [], personnesInvalidesCharge: [], enfantsMajeursRattaches: 0,
      parentIsole: false, ancienParentIsole: false,
      invaliditeDeclarant1: false, invaliditeDeclarant2: false,
      ancienCombattantDeclarant1: false, ancienCombattantDeclarant2: false,
      veufAncienCombattant: false, veuveDeGuerre: false,
    };

    const revenuSalaires = calculerRevenuSalaires(revenus, exoneres);
    const revenuExonere = calculerRevenuExonereTauxEffectif(
      exoneres,
      revenuSalaires.salairesNetImposablesExoneresTauxEffectif,
    );
    const parts = calculerPartsFiscales(foyer);

    expect(revenuSalaires.totalNetImposable).toBe(63000);
    expect(revenuExonere.totalRetenu).toBe(38700); // 31500 (35000 - 10 %) + 7200 (8000 - 10 %)

    const impot = calculerImpot(
      revenuSalaires.totalNetImposable,
      parts,
      foyer.situationFamille,
      revenuExonere.totalRetenu,
      foyer.lieuResidence,
    );

    expect(impot.impotNet).toBe(10356);
  });
});

/**
 * Cas réel signalé par un utilisateur : Kairos donnait 28 371 € quand le
 * simulateur officiel DGFiP donne 28 866 €. Cause : une fois les frais réels
 * combinés (1AK + 1AE = 15 000 €) retenus comme plus favorables que
 * l'abattement forfaitaire (12 950 € sur la base combinée 129 500 €),
 * `calculerDeclarant` répartissait la déduction proportionnellement entre le
 * pool France (1AJ...) et le pool 1AC au lieu de déduire le montant réel de
 * chaque source sur sa propre base (1AK sur le pool France, 1AE sur 1AC) —
 * voir JSDoc de `calculerDeclarant`.
 */
describe('régression : célibataire, 1AJ+1GB (frais réels 1AK) + 1AC/1AE (frais réels)', () => {
  it('retrouve le montant du simulateur officiel (28 866 €), pas 28 371 €', () => {
    const revenus: RevenusSalairesInput = {
      case1aj: 55000, case1bj: null,
      case1aa: 15000, case1ba: null, case1ga: 2400, case1ha: null,
      case1gh: 3600, case1hh: null, case1pb: 980, case1pc: null,
      case1ad: 4200, case1bd: null, case1av: true, case1bv: false,
      case1gb: 36000, case1hb: null, case1gk: false, case1gl: false,
      case1gf: 4000, case1hf: null, case1gg: null, case1hg: null,
      case1aq: null, case1bq: null, case1ap: 5200, case1bp: null,
      case1af: null, case1bf: null, case1ag: 4300, case1bg: null,
      case1ak: 12000, case1bk: null, case1pm: null, case1qm: null,
      case1dy: null, case1ey: null, case1sm: null, case1dn: null,
    };
    const exoneres: RevenusExoneresTauxEffectifInput = {
      case1ac: 10000, case1bc: null, case1ge: false, case1he: false,
      case1ae: 3000, case1be: null, case1ah: null, case1bh: null,
      caseRse: null, caseRsf: null,
    };
    const foyer: FoyerFiscalInput = {
      situationFamille: 'celibataire', lieuResidence: 'metropole',
      enfantsCharge: [], personnesInvalidesCharge: [], enfantsMajeursRattaches: 0,
      parentIsole: false, ancienParentIsole: false,
      invaliditeDeclarant1: false, invaliditeDeclarant2: false,
      ancienCombattantDeclarant1: false, ancienCombattantDeclarant2: false,
      veufAncienCombattant: false, veuveDeGuerre: false,
    };

    const revenuSalaires = calculerRevenuSalaires(revenus, exoneres);
    const revenuExonere = calculerRevenuExonereTauxEffectif(
      exoneres,
      revenuSalaires.salairesNetImposablesExoneresTauxEffectif,
    );
    const parts = calculerPartsFiscales(foyer);

    expect(revenuSalaires.declarant1.deductionRetenue).toBe('frais_reels');
    expect(revenuSalaires.totalNetImposable).toBe(107500); // 119500 (pool France) - 12000 (1AK)
    expect(revenuExonere.totalRetenu).toBe(7000); // 10000 (1AC) - 3000 (1AE)

    const impot = calculerImpot(
      revenuSalaires.totalNetImposable,
      parts,
      foyer.situationFamille,
      revenuExonere.totalRetenu,
      foyer.lieuResidence,
      0, 0, 0, 0, 0,
      revenuSalaires.revenuExonereRetenuPourRFR,
    );

    expect(impot.impotNet).toBe(28866);
    // RFR périmètre partiel : 1GH (3 600 €) réintégré, 1AD (4 200 €) pas encore — simulateur
    // officiel donne 122 402 €, écart de 4 302 € documenté (voir docs/fiscalite.md).
    expect(impot.revenuFiscalReference).toBe(118100);
  });
});
