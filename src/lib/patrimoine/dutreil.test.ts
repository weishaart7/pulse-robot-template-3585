import { describe, it, expect } from 'vitest';
import { evaluerEligibiliteDutreil } from './dutreil';

const REF = '2026-10-14';
const complet = {
  type_engagement_collectif: 'signe',
  engagement_collectif_date: '2026-03-01',
  fonction_direction: 'Président',
  part_biens_non_affectes: 0
};

describe('evaluerEligibiliteDutreil (art. 787 B CGI)', () => {
  it('engagement signé en cours, même depuis moins de 2 ans : éligible si confirmé', () => {
    expect(evaluerEligibiliteDutreil(complet, REF, true).eligible).toBe(true);
    expect(evaluerEligibiliteDutreil(complet, REF, false)).toMatchObject({ conditionsRemplies: true, eligible: false });
  });

  it('engagement signé : date requise et antérieure à la transmission', () => {
    expect(evaluerEligibiliteDutreil({ ...complet, engagement_collectif_date: null }, REF, true).engagementCollectif).toBe(false);
    expect(evaluerEligibiliteDutreil({ ...complet, engagement_collectif_date: '2026-11-01' }, REF, true).eligible).toBe(false);
  });

  it('réputé acquis ou post mortem : sans date d\'engagement', () => {
    for (const type of ['repute_acquis', 'post_mortem']) {
      expect(evaluerEligibiliteDutreil({ ...complet, type_engagement_collectif: type, engagement_collectif_date: null }, REF, true).eligible).toBe(true);
    }
    expect(evaluerEligibiliteDutreil({ ...complet, type_engagement_collectif: null }, REF, true).eligible).toBe(false);
  });

  it('fonction de direction et part des biens non affectés obligatoires (0 accepté)', () => {
    expect(evaluerEligibiliteDutreil({ ...complet, fonction_direction: '  ' }, REF, true).eligible).toBe(false);
    expect(evaluerEligibiliteDutreil({ ...complet, part_biens_non_affectes: null }, REF, true).eligible).toBe(false);
    expect(evaluerEligibiliteDutreil({ ...complet, part_biens_non_affectes: 35 }, REF, true).eligible).toBe(true);
  });
});
