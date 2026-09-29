/**
 * Phase 2 de l'audit « résultat notaire » du 2026-09-29 :
 * - R6 : abattement de 20 % sur la résidence principale conditionné à son
 *   occupation au décès par le conjoint / partenaire de PACS ou un enfant
 *   mineur ou handicapé (art. 764 bis CGI), occupation présumée ;
 * - R7 : abattement handicap (art. 779 II CGI) réellement appliqué, cumulable
 *   avec les abattements de parenté, remplaçant celui de 1 594 € (788 IV).
 */
import { describe, it, expect } from 'vitest';
import { computeTransmission, FamilyGraph, Liberalite, Person } from './index';
import { computeRecallAndAllowances, DEFAULT_DMTG_PARAMS } from '../dmtg';

const REF = '2026-09-29';

function famille(enfants: Partial<Person>[], conjoint: boolean): FamilyGraph {
  const ids = enfants.map((_, i) => `E${i + 1}`);
  return {
    persons: [
      { id: 'D', nom: 'D', prenom: 'D', dateNaissance: '1950-01-01' },
      ...(conjoint ? [{ id: 'C', nom: 'C', prenom: 'C', lienFamilial: 'Conjoint', dateNaissance: '1952-01-01' }] : []),
      ...enfants.map((e, i) => ({ id: ids[i], nom: ids[i], prenom: ids[i], lienFamilial: 'Enfant', ...e })),
    ],
    links: ids.map(id => ({ from: 'D', to: id, relation: 'child' as const })),
    marriages: conjoint ? [{ spouseA: 'D', spouseB: 'C' }] : [],
    decedentId: 'D',
    hasSurvivingSpouse: conjoint,
    survivingSpouseId: conjoint ? 'C' : undefined,
    childrenOfDecedent: ids,
    childrenCommonWithSpouse: ids,
    hasDDV: false,
  };
}

function run(family: FamilyGraph, liberalites: Liberalite[] = [], nature = 'Résidence principale') {
  return computeTransmission({
    family,
    patrimony: { date: REF, biensExistants: 500000, passifs: 0 },
    liberalites,
    params: {} as any,
    referenceDate: REF,
    conjointOption: 'quart_pp',
    rawAssets: [{ id: 'rp', denomination: 'Maison', valeur_estimee: 500000, nature, qualification_bien: 'Bien propre', detenteur: 'user' }],
  });
}

const ADULTE = { dateNaissance: '1985-01-01' };

describe('R6 — abattement résidence principale (art. 764 bis CGI)', () => {
  it('veuf, 2 enfants majeurs : aucun abattement, 30 544 € de droits par enfant', () => {
    // 250 000 + forfait mobilier 12 500 − frais funéraires 750 = 261 750 − 100 000 = 161 750 taxables.
    const r = run(famille([ADULTE, ADULTE], false));
    expect(Math.abs(r.dmtg.perBeneficiary['E1'].droitsHorsAV - 30544)).toBeLessThanOrEqual(2);
    expect(r.explicationsTexte?.some(t => t.startsWith("Pas d'abattement de 20 %"))).toBe(true);
  });

  it('conjoint survivant : abattement maintenu', () => {
    const avecRP = run(famille([ADULTE, ADULTE], true));
    const sansRP = run(famille([ADULTE, ADULTE], true), [], 'Résidences secondaires');
    expect(avecRP.dmtg.perBeneficiary['E1'].droitsHorsAV).toBeLessThan(sansRP.dmtg.perBeneficiary['E1'].droitsHorsAV);
  });

  it('veuf avec un enfant mineur : abattement maintenu', () => {
    const r = run(famille([ADULTE, { dateNaissance: '2012-06-01' }], false));
    const veufMajeurs = run(famille([ADULTE, ADULTE], false));
    expect(r.dmtg.perBeneficiary['E1'].droitsHorsAV).toBeLessThan(veufMajeurs.dmtg.perBeneficiary['E1'].droitsHorsAV);
  });

  it('veuf avec un enfant majeur handicapé : abattement maintenu', () => {
    const r = run(famille([ADULTE, { ...ADULTE, handicap: true }], false));
    const veufMajeurs = run(famille([ADULTE, ADULTE], false));
    expect(r.dmtg.perBeneficiary['E1'].droitsHorsAV).toBeLessThan(veufMajeurs.dmtg.perBeneficiary['E1'].droitsHorsAV);
  });

  it('enfant sans date de naissance : jamais présumé mineur', () => {
    const r = run(famille([{}, {}], false));
    expect(Math.abs(r.dmtg.perBeneficiary['E1'].droitsHorsAV - 30544)).toBeLessThanOrEqual(2);
  });
});

describe('R7 — abattement handicap (art. 779 II CGI)', () => {
  const params = DEFAULT_DMTG_PARAMS;
  const abattement = (b: Parameters<typeof computeRecallAndAllowances>[0]['beneficiary']) =>
    computeRecallAndAllowances({ beneficiary: b, donations15y: [], params }).allowanceGeneralResidual;

  it('enfant handicapé : 100 000 + 159 325', () => {
    expect(abattement({ id: 'x', lien: 'enfant', isHandicapped: true })).toBe(259325);
  });
  it('tiers handicapé : 159 325 (au lieu de 0)', () => {
    expect(abattement({ id: 'x', lien: 'autre', isHandicapped: true })).toBe(159325);
  });
  it('collatéral du 4e degré handicapé : 159 325, sans les 1 594 € de l\'art. 788 IV', () => {
    expect(abattement({ id: 'x', lien: 'collateral_4', isHandicapped: true })).toBe(159325);
  });
  it('neveu handicapé : 7 967 + 159 325', () => {
    expect(abattement({ id: 'x', lien: 'neveu_niece', isHandicapped: true })).toBe(167292);
  });

  it('bout en bout : le handicap saisi dans Famille atteint le calcul des droits', () => {
    const r = run(famille([ADULTE, { ...ADULTE, handicap: true }], false));
    expect(r.dmtg.perBeneficiary['E2'].allowanceGeneralResidual).toBe(259325);
    expect(r.dmtg.perBeneficiary['E2'].droitsHorsAV).toBeLessThan(r.dmtg.perBeneficiary['E1'].droitsHorsAV);
  });
});
