/**
 * Phase 4b de l'audit Transmission (2026-09) : legs à un légataire qui
 * n'hérite pas — sorti du résiduel des héritiers et taxé selon son propre
 * lien avec le défunt.
 */
import { describe, it, expect } from 'vitest';
import { computeTransmission, FamilyGraph, Liberalite } from './index';
import { buildPatrimonySnapshot, buildTransmissionLiberalites } from '../../utils/transmissionHelpers';

const REF = '2026-09-23';

function famille(extra: FamilyGraph['persons'] = [], spouse?: { id: string; marie: boolean }, nbEnfants = 1): FamilyGraph {
  const enfants = Array.from({ length: nbEnfants }, (_, i) => `e${i + 1}`);
  return {
    persons: [
      { id: 'd', nom: 'Dupont', prenom: 'Jean' },
      ...enfants.map(id => ({ id, nom: 'Dupont', prenom: id, lienFamilial: 'Enfant' })),
      ...(spouse ? [{ id: spouse.id, nom: 'Martin', prenom: 'Claire', lienFamilial: 'conjoint', dateNaissance: '1960-01-01' }] : []),
      ...extra
    ],
    links: enfants.map(id => ({ from: 'd', to: id, relation: 'child' as const })),
    marriages: spouse ? [{ spouseA: 'd', spouseB: spouse.id }] : [],
    decedentId: 'd',
    hasSurvivingSpouse: !!spouse?.marie,
    survivingSpouseId: spouse?.id,
    childrenOfDecedent: enfants,
    childrenCommonWithSpouse: [],
    hasDDV: false
  } as FamilyGraph;
}

const rawAssets = [
  { id: 'a', denomination: 'Portefeuille', valeur_estimee: 500000, nature: 'valeur_mobiliere', qualification_bien: 'Bien propre' }
] as any;

const legs = (beneficiaireId: string, valeur: number, id = 'l1'): Liberalite => ({
  id, type: 'legs', beneficiaireId, valeur, date: REF, typeImputation: 'hors_part', beneficiaireName: 'Légataire'
});

function run(family: FamilyGraph, liberalites: Liberalite[], partageEnvisage = false) {
  const patrimony = buildPatrimonySnapshot(rawAssets, [], 0);
  return computeTransmission({ family, patrimony, liberalites, params: {} as any, referenceDate: REF, rawAssets, partageEnvisage });
}

describe('Phase 4b — legs à un non-héritier', () => {
  it('legs de 100 k€ à un ami : sorti de la base de l\'enfant, taxé à 60 %', () => {
    const r = run(famille([{ id: 'ami', nom: 'Durand', prenom: 'Paul', lienFamilial: 'Ami' }]), [legs('ami', 100000)]);
    const enfant = r.dmtg.perBeneficiary.e1;
    const ami = r.dmtg.perBeneficiary.ami;

    // 400 000 − 1 200 de frais funéraires (80 %).
    expect(enfant.baseApresFrais).toBe(398800);
    expect(enfant.droitsHorsAV).toBe(61954);
    // 100 000 − 300 de frais funéraires + 5 000 de forfait mobilier − 1 594.
    expect(ami.baseApresFrais).toBe(99700);
    expect(ami.taxableAfterAllowance).toBe(103106);
    expect(ami.droitsHorsAV).toBe(61864);

    expect(r.legataires).toEqual([{ personId: 'ami', nom: 'Paul Durand', lien: 'Ami', montant: 100000 }]);
    const netAmi = r.netBreakdown.heirs.find(h => h.personId === 'ami');
    expect(netAmi?.droitsDMTG).toBe(61864);
  });

  it('legataire hors fiche famille (\'tiers\') : taxé à 60 %', () => {
    const r = run(famille(), [legs('tiers', 100000, 'lt')]);
    expect(r.dmtg.perBeneficiary['tiers-lt'].droitsHorsAV).toBe(61864);
    expect(r.dmtg.perBeneficiary.e1.baseApresFrais).toBe(398800);
  });

  it('legs au partenaire de PACS : droits nuls', () => {
    const r = run(famille([], { id: 'pacs1', marie: false }), [legs('pacs1', 100000)]);
    expect(r.dmtg.perBeneficiary.pacs1.baseApresFrais).toBe(99700);
    expect(r.dmtg.perBeneficiary.pacs1.droitsHorsAV).toBe(0);
    expect(r.dmtg.perBeneficiary.e1.baseApresFrais).toBe(398800);
  });

  it('legs de 50 k€ à un petit-enfant (enfant vivant) : abattement 1 594€, barème ligne directe', () => {
    const r = run(famille([{ id: 'pe', nom: 'Dupont', prenom: 'Lou', lienFamilial: 'Petit-enfant' }]), [legs('pe', 50000)]);
    const pe = r.dmtg.perBeneficiary.pe;
    // 50 000 − 150 + 2 500 − 1 594 = 50 756
    expect(pe.taxableAfterAllowance).toBe(50756);
    expect(pe.droitsHorsAV).toBe(8346);
  });

  it('legs à un héritier : comportement inchangé (aucun légataire à part)', () => {
    const r = run(famille(), [legs('e1', 100000)]);
    expect(r.legataires).toEqual([]);
    expect(r.dmtg.perBeneficiary.e1.baseApresFrais).toBe(498500);
  });

  it('droit de partage : jamais dû par un légataire, qui n\'est pas en indivision', () => {
    const r = run(famille([{ id: 'ami', nom: 'Durand', prenom: 'Paul', lienFamilial: 'Ami' }], undefined, 2), [legs('ami', 100000)], true);
    const netAmi = r.netBreakdown.heirs.find(h => h.personId === 'ami')!;
    expect(netAmi.droitPartage).toBe(0);
    // Assiette du partage : 500 000 − 100 000 légués, × 2,5 %.
    expect(r.netBreakdown.totals.droitPartage).toBe(10000);
  });

  it('sentinelle \'conjoint\' (liberalites.beneficiaire_conjoint) : résolue vers le partenaire de PACS', () => {
    const r = run(famille([], { id: 'pacs1', marie: false }), [legs('conjoint', 100000)]);
    expect(r.legataires.map(l => l.personId)).toEqual(['pacs1']);
    expect(r.dmtg.perBeneficiary.pacs1.droitsHorsAV).toBe(0);
  });

  it('sentinelle \'conjoint\' sans conjoint dans le graphe : traitée comme un tiers', () => {
    const r = run(famille(), [legs('conjoint', 100000)]);
    expect(r.dmtg.perBeneficiary['tiers-l1'].droitsHorsAV).toBe(61864);
  });

  it('buildTransmissionLiberalites : beneficiaire_conjoint → sentinelle \'conjoint\'', () => {
    const { liberalites } = buildTransmissionLiberalites(
      [{ id: 'l', type: 'legs', beneficiaire_nom: 'Claire', denomination: 'Legs', beneficiaire_conjoint: true, biens: [{ asset_id: 'a' }] }],
      [{ id: 'a', valeur_estimee: 100000 }]
    );
    expect(liberalites[0].beneficiaireId).toBe('conjoint');
  });
});
