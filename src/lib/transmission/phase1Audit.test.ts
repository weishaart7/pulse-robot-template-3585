/**
 * Correctifs de la phase 1 de l'audit Transmission (2026-09) :
 * 1. passif déduit de l'assiette DMTG (art. 768 CGI) ;
 * 2. abattement 990 I unique par bénéficiaire, tous contrats confondus ;
 * 3. tranche 990 I à 31,25% au-delà de 700 000€ de part taxable ;
 * 4. ascendants ordinaires en ligne directe, collatéraux ≤ 4e degré à 55%.
 */
import { describe, it, expect } from 'vitest';
import { computeTransmission, FamilyGraph } from './index';
import { buildPatrimonySnapshot } from '../../utils/transmissionHelpers';
import { computeAssuranceVie, DEFAULT_DMTG_PARAMS, AVContract } from '../dmtg';

const REF = '2026-09-23';

function familleUnEnfant(): FamilyGraph {
  return {
    persons: [
      { id: 'defunt', nom: 'Dupont', prenom: 'Jean' },
      { id: 'enfant1', nom: 'Dupont', prenom: 'Léo', lienFamilial: 'Enfant' }
    ],
    links: [{ from: 'defunt', to: 'enfant1', relation: 'child' }],
    marriages: [],
    decedentId: 'defunt',
    hasSurvivingSpouse: false,
    childrenOfDecedent: ['enfant1'],
    childrenCommonWithSpouse: [],
    hasDDV: false
  } as FamilyGraph;
}

function familleUnOncle(lienFamilial: string): FamilyGraph {
  return {
    persons: [
      { id: 'defunt', nom: 'Dupont', prenom: 'Jean' },
      { id: 'h1', nom: 'Dupont', prenom: 'Paul', lienFamilial, brancheFamiliale: 'paternelle' }
    ],
    links: [],
    marriages: [],
    decedentId: 'defunt',
    hasSurvivingSpouse: false,
    childrenOfDecedent: [],
    childrenCommonWithSpouse: [],
    hasDDV: false
  } as FamilyGraph;
}

const actif = (valeur: number) => [
  { id: 'a', denomination: 'Portefeuille', valeur_estimee: valeur, nature: 'valeur_mobiliere', qualification_bien: 'Bien propre' }
];

function run(family: FamilyGraph, valeur: number, passif = 0) {
  const rawAssets = actif(valeur) as any;
  const patrimony = buildPatrimonySnapshot(rawAssets, passif ? [{ montant_du: passif, qualification_bien: 'Bien propre' }] as any : [], 0);
  return computeTransmission({ family, patrimony, liberalites: [], params: {} as any, referenceDate: REF, rawAssets });
}

describe('Phase 1 — passif déduit de l\'assiette DMTG', () => {
  it('500 k€ d\'actif, 300 k€ de dette : base = 200 000 − 1 500 frais funéraires', () => {
    const r = run(familleUnEnfant(), 500000, 300000);
    const b = r.dmtg.perBeneficiary.enfant1;
    expect(b.baseApresFrais).toBe(198500);
    // Forfait mobilier toujours calculé sur l'actif brut (5% de 500 000).
    expect(b.forfaitMobilierImpute).toBe(25000);
    // Taxable = 198 500 + 25 000 − 100 000 = 123 500 → 22 894€.
    expect(b.taxableAfterAllowance).toBe(123500);
    expect(b.droitsHorsAV).toBe(22894);
  });

  it('passif supérieur à l\'actif : base jamais négative', () => {
    const r = run(familleUnEnfant(), 100000, 250000);
    expect(r.dmtg.perBeneficiary.enfant1.baseApresFrais).toBe(0);
  });

  it('sans passif : résultat inchangé', () => {
    const r = run(familleUnEnfant(), 500000);
    expect(r.dmtg.perBeneficiary.enfant1.baseApresFrais).toBe(498500);
  });
});

const contrat = (id: string, primes: number, nature?: string): AVContract => ({
  id,
  capitalDeces: primes,
  primesAvant70: primes,
  primesApres70: 0,
  nature,
  niveaux: [{ beneficiaires: [{ beneficiaryId: 'e1', quotePart: 1, statut: 'accepte' }] }]
} as any);

const enfant = [{ id: 'e1', lien: 'enfant' } as any];

describe('Phase 1 — 990 I', () => {
  it('deux contrats de 400 k€ : un seul abattement de 152 500€', () => {
    const r = computeAssuranceVie([contrat('c1', 400000), contrat('c2', 400000)], enfant, DEFAULT_DMTG_PARAMS, REF);
    expect(r.perBeneficiary.e1.prelev990I).toBe(129500); // (800 000 − 152 500) × 20%
  });

  it('1 152 500€ : 20% jusqu\'à 700 000€ de part taxable, 31,25% au-delà', () => {
    const r = computeAssuranceVie([contrat('c1', 1152500)], enfant, DEFAULT_DMTG_PARAMS, REF);
    expect(r.perBeneficiary.e1.prelev990I).toBe(233750); // 700 000×20% + 300 000×31,25%
  });

  it('vie-génération : -20% propre au contrat, avant l\'abattement commun', () => {
    const r = computeAssuranceVie(
      [contrat('c1', 500000, 'Contrat vie-génération'), contrat('c2', 100000)],
      enfant, DEFAULT_DMTG_PARAMS, REF
    );
    // 400 000 + 100 000 − 152 500 = 347 500 × 20%
    expect(r.perBeneficiary.e1.prelev990I).toBe(69500);
  });
});

describe('Phase 1 — liens ascendants / collatéraux ordinaires', () => {
  it('oncle héritier : 55%, abattement 1 594€', () => {
    const r = run(familleUnOncle('Oncle/Tante'), 100000);
    const b = r.dmtg.perBeneficiary.h1;
    // 98 500 + 5 000 forfait − 1 594 = 101 906 × 55%
    expect(b.taxableAfterAllowance).toBe(101906);
    expect(b.droitsHorsAV).toBe(Math.round(101906 * 0.55));
  });

  it('grand-parent héritier : abattement 100 000€ et barème ligne directe', () => {
    const r = run(familleUnOncle('Grand-parent'), 100000);
    const b = r.dmtg.perBeneficiary.h1;
    // 98 500 + 5 000 − 100 000 = 3 500 × 5%
    expect(b.taxableAfterAllowance).toBe(3500);
    expect(b.droitsHorsAV).toBe(175);
  });
});
