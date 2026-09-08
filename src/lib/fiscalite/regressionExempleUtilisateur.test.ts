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
