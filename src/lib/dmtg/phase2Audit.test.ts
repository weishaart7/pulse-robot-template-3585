/**
 * Correctifs de la phase 2 de l'audit Transmission (2026-09), assurance-vie :
 * 7. abattement 757 B de 30 500€ réparti entre les seuls non-exonérés ;
 * 8. abattement 990 I réparti entre usufruitier et nu-propriétaire ;
 * 9. assiette 990 I = capital décès rattaché aux primes avant 70 ans.
 */
import { describe, it, expect } from 'vitest';
import { computeAssuranceVie, DEFAULT_DMTG_PARAMS, AVContract, Beneficiary } from './index';

const REF = '2026-09-23';
const benefs: Beneficiary[] = [
  { id: 'conjoint', lien: 'conjoint' } as Beneficiary,
  { id: 'e1', lien: 'enfant' } as Beneficiary,
  { id: 'e2', lien: 'enfant' } as Beneficiary
];

const av = (over: Partial<AVContract>): AVContract => ({
  id: 'c1',
  capitalDeces: 0,
  primesAvant70: 0,
  primesApres70: 0,
  niveaux: [{ beneficiaires: [{ beneficiaryId: 'e1', quotePart: 1 }] }],
  isExonereBeneficiaireConjointPacs: true,
  ...over
} as AVContract);

describe('Phase 2 — 757 B', () => {
  it('conjoint et enfant 50/50 : l\'enfant garde tout l\'abattement de 30 500€', () => {
    const r = computeAssuranceVie([av({
      capitalDeces: 100000, primesApres70: 100000,
      niveaux: [{ beneficiaires: [{ beneficiaryId: 'conjoint', quotePart: 0.5 }, { beneficiaryId: 'e1', quotePart: 0.5 }] }]
    })], benefs, DEFAULT_DMTG_PARAMS, REF);
    expect(r.perBeneficiary.e1.reintegration757B).toBe(19500);
  });

  it('deux enfants sur deux contrats : abattement au prorata des primes', () => {
    const r = computeAssuranceVie([
      av({ id: 'c1', capitalDeces: 60000, primesApres70: 60000 }),
      av({ id: 'c2', capitalDeces: 40000, primesApres70: 40000, niveaux: [{ beneficiaires: [{ beneficiaryId: 'e2', quotePart: 1 }] }] })
    ], benefs, DEFAULT_DMTG_PARAMS, REF);
    expect(r.perBeneficiary.e1.reintegration757B).toBe(60000 - 18300);
    expect(r.perBeneficiary.e2.reintegration757B).toBe(40000 - 12200);
  });

  it('gains sur primes après 70 ans : jamais réintégrés', () => {
    const r = computeAssuranceVie([av({ capitalDeces: 150000, primesApres70: 100000 })], benefs, DEFAULT_DMTG_PARAMS, REF);
    expect(r.perBeneficiary.e1.reintegration757B).toBe(69500);
    expect(r.perBeneficiary.e1.prelev990I).toBe(0);
  });
});

describe('Phase 2 — 990 I démembré', () => {
  it('usufruitier 40% / nu-propriétaire 60% : abattements de 61 000€ et 91 500€', () => {
    const r = computeAssuranceVie([av({
      capitalDeces: 500000, primesAvant70: 500000,
      niveaux: [{ beneficiaires: [{ beneficiaryId: 'e1', quotePart: 1, typeDetention: 'usufruit', nuProprietaireId: 'e2', usufruitPct: 0.4 }] }]
    })], benefs, DEFAULT_DMTG_PARAMS, REF);
    expect(r.perBeneficiary.e1.prelev990I).toBe((200000 - 61000) * 0.2);
    expect(r.perBeneficiary.e2.prelev990I).toBe((300000 - 91500) * 0.2);
  });

  it('nu-propriétaire aussi bénéficiaire en PP d\'un autre contrat : abattement plafonné à 152 500€', () => {
    const r = computeAssuranceVie([
      av({ id: 'c1', capitalDeces: 500000, primesAvant70: 500000,
        niveaux: [{ beneficiaires: [{ beneficiaryId: 'e1', quotePart: 1, typeDetention: 'usufruit', nuProprietaireId: 'e2', usufruitPct: 0.4 }] }] }),
      av({ id: 'c2', capitalDeces: 100000, primesAvant70: 100000, niveaux: [{ beneficiaires: [{ beneficiaryId: 'e2', quotePart: 1 }] }] })
    ], benefs, DEFAULT_DMTG_PARAMS, REF);
    expect(r.perBeneficiary.e2.prelev990I).toBe((400000 - 152500) * 0.2);
  });
});

describe('Phase 2 — assiette 990 I sur le capital décès', () => {
  it('plus-value : 400 k€ de primes, 600 k€ de capital → assiette 600 000€', () => {
    const r = computeAssuranceVie([av({ capitalDeces: 600000, primesAvant70: 400000 })], benefs, DEFAULT_DMTG_PARAMS, REF);
    expect(r.perBeneficiary.e1.prelev990I).toBe((600000 - 152500) * 0.2);
  });

  it('contrat mixte : capital réparti au prorata des primes avant/après 70 ans', () => {
    // 300 k€ avant 70, 100 k€ après, capital 600 k€ → 450 000€ en 990 I.
    const r = computeAssuranceVie([av({ capitalDeces: 600000, primesAvant70: 300000, primesApres70: 100000 })], benefs, DEFAULT_DMTG_PARAMS, REF);
    expect(r.perBeneficiary.e1.prelev990I).toBe((450000 - 152500) * 0.2);
    expect(r.perBeneficiary.e1.reintegration757B).toBe(69500);
  });
});
