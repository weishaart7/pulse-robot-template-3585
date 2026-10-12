/**
 * Audit des calculs du 2026-10-12, phase 1 (cf. docs/transmission.md §3) :
 * #2 usufruit viager du défunt hors succession, #5 masse de l'art. 758-5 sans
 * double compte des legs « sur part successorale ». Le #1 (récompenses) est
 * couvert par recompensesCreances.branchement.test.ts.
 */
import { describe, it, expect } from 'vitest';
import { computeTransmission, FamilyGraph, Liberalite, TransmissionParams } from './index';
import { buildPatrimonySnapshot } from '@/utils/transmissionHelpers';
import type { Asset } from '@/services/assetService';
import transmissionParamsData from '../../data/transmission-params.json';

const params = {
  abattements: { ...transmissionParamsData.abattements, conjoint: Infinity },
  bareme: transmissionParamsData.bareme,
  prelevement990I: transmissionParamsData.prelevement990I
} as unknown as TransmissionParams;

const REF = '2026-10-12';

function famille(avecConjoint: boolean): FamilyGraph {
  return {
    persons: [
      { id: 'defunt', nom: 'D', prenom: 'Jean', dateNaissance: '1960-01-01' },
      ...(avecConjoint ? [{ id: 'conjoint', nom: 'D', prenom: 'Marie', lienFamilial: 'conjoint', dateNaissance: '1962-01-01' }] : []),
      { id: 'e1', nom: 'D', prenom: 'A', lienFamilial: 'Enfant', dateNaissance: '1990-01-01' },
      { id: 'e2', nom: 'D', prenom: 'B', lienFamilial: 'Enfant', dateNaissance: '1992-01-01' }
    ],
    links: [{ from: 'defunt', to: 'e1', relation: 'child' }, { from: 'defunt', to: 'e2', relation: 'child' }],
    marriages: avecConjoint ? [{ spouseA: 'defunt', spouseB: 'conjoint' }] : [],
    decedentId: 'defunt',
    hasSurvivingSpouse: avecConjoint,
    survivingSpouseId: avecConjoint ? 'conjoint' : undefined,
    childrenOfDecedent: ['e1', 'e2'],
    childrenCommonWithSpouse: avecConjoint ? ['e1', 'e2'] : [],
    hasDDV: false
  };
}

describe('#2 — usufruit viager détenu par le défunt', () => {
  const maisonEnUsufruit = {
    id: 'maison', denomination: 'Maison (NP donnée)', valeur_estimee: 500000, nature: 'Résidences secondaires',
    mode_detention: 'Usufruit', detenteur: 'user', qualification_bien: 'Bien propre'
  };
  const comptes = {
    id: 'cc', denomination: 'Comptes', valeur_estimee: 300000, nature: 'Comptes courants',
    mode_detention: 'Pleine propriété', detenteur: 'user', qualification_bien: 'Bien propre'
  };
  const ctxDemembrement = { familyProfile: { date_naissance: '1960-01-01' } };

  it('n\'entre pas dans la masse civile (art. 617 C. civ.)', () => {
    const snap = buildPatrimonySnapshot([maisonEnUsufruit, comptes] as unknown as Asset[], [], 0, [], ctxDemembrement);
    expect(snap.biensExistants).toBe(300000);
  });

  it('n\'entre pas dans l\'assiette des droits (art. 1133 CGI) et le résultat le signale', () => {
    const result = computeTransmission({
      family: famille(false),
      patrimony: { date: REF, biensExistants: 300000, passifs: 0 },
      liberalites: [],
      params,
      referenceDate: REF,
      rawAssets: [maisonEnUsufruit, comptes],
      demembrementCtx: ctxDemembrement
    });
    // Comptes seuls : 150 000 € par enfant − 750 € de frais funéraires
    // + 7 500 € de forfait mobilier − 100 000 € d'abattement.
    expect(result.dmtg.perBeneficiary['e1'].taxableAfterAllowance).toBe(56750);
    expect(result.explicationsTexte.some(t => t.includes('art. 617'))).toBe(true);
  });

  it('la nue-propriété détenue par le défunt reste évaluée au barème 669', () => {
    const np = { ...maisonEnUsufruit, mode_detention: 'Nue-propriété' };
    const snap = buildPatrimonySnapshot([np] as unknown as Asset[], [], 0, [], ctxDemembrement);
    // Usufruitier = contrepartie non renseignée → valeur non calculable (0),
    // comportement inchangé ; avec un usufruitier de 66 ans : 60 % de NP.
    const snapAvecUsufruitier = buildPatrimonySnapshot(
      [np] as unknown as Asset[], [],
      0,
      [{ asset_id: 'maison', type_partie: 'tiers', date_naissance_tiers: '1960-01-01' } as never],
      ctxDemembrement
    );
    expect(snap.biensExistants).toBe(0);
    expect(snapAvecUsufruitier.biensExistants).toBe(300000);
  });
});

describe('#5 — masse de l\'art. 758-5 et legs sur part successorale', () => {
  it('le legs, déjà dans les biens existants, n\'est pas réuni une seconde fois', () => {
    const legs: Liberalite[] = [{ id: 'l1', type: 'legs', beneficiaireId: 'e1', valeur: 200000, date: REF, typeImputation: 'avance_part' }];
    const result = computeTransmission({
      family: famille(true),
      patrimony: { date: REF, biensExistants: 800000, passifs: 0 },
      liberalites: legs,
      params,
      conjointOption: 'quart_pp',
      referenceDate: REF
    });
    const recu = (id: string) => result.heirs.filter(h => h.personId === id).reduce((s, h) => s + h.recuSuccession, 0);
    expect(recu('conjoint')).toBeCloseTo(200000, 0);
    expect(recu('e1')).toBeCloseTo(300000, 0);
    expect(recu('e2')).toBeCloseTo(300000, 0);
  });
});
