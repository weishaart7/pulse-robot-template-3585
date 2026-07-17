import { describe, it, expect } from 'vitest';
import { buildAVContracts, splitPrimesAvantApres70, AVDonneesInsuffisantesError } from './transmissionHelpers';
import { FamilyGraph } from '@/lib/transmission/types';

const family: FamilyGraph = {
  persons: [
    { id: 'defunt', nom: 'Defunt', prenom: 'Jean' },
    { id: 'conjoint-defunt', nom: 'Epouse', prenom: 'Julie', lienFamilial: 'conjoint' },
    { id: 'enfant1', nom: 'Enfant', prenom: 'Un', lienFamilial: 'Enfant' }
  ],
  links: [],
  marriages: [],
  decedentId: 'defunt',
  hasSurvivingSpouse: true,
  survivingSpouseId: 'conjoint-defunt',
  childrenOfDecedent: ['enfant1'],
  childrenCommonWithSpouse: ['enfant1'],
  hasDDV: false
};

describe('splitPrimesAvantApres70', () => {
  it('sépare les primes selon l\'âge exact au versement, pas l\'âge actuel', () => {
    const { primesAvant70, primesApres70 } = splitPrimesAvantApres70(
      [
        { type_operation: 'versement', montant: 100000, date_operation: '2010-01-01' }, // 40 ans
        { type_operation: 'versement', montant: 50000, date_operation: '2045-01-01' }, // 75 ans
        { type_operation: 'rachat', montant: 20000, date_operation: '2020-01-01' } // exclu : pas une prime
      ],
      '1970-01-01'
    );
    expect(primesAvant70).toBe(100000);
    expect(primesApres70).toBe(50000);
  });

  it('lève AVDonneesInsuffisantesError si aucun versement enregistré', () => {
    expect(() => splitPrimesAvantApres70([], '1970-01-01', 'Contrat X'))
      .toThrow(AVDonneesInsuffisantesError);
    expect(() => splitPrimesAvantApres70([{ type_operation: 'rachat', montant: 100, date_operation: '2020-01-01' }], '1970-01-01'))
      .toThrow(AVDonneesInsuffisantesError);
  });

  it('lève AVDonneesInsuffisantesError si la date de naissance est inconnue — jamais de répartition devinée', () => {
    expect(() => splitPrimesAvantApres70(
      [{ type_operation: 'versement', montant: 1000, date_operation: '2020-01-01' }],
      null
    )).toThrow(AVDonneesInsuffisantesError);
  });
});

describe('buildAVContracts', () => {
  it('traduit le marqueur "conjoint" de la clause vers le vrai survivingSpouseId, et exonère 990I/PACS', () => {
    const [contract] = buildAVContracts(
      [{
        assetId: 'av1',
        valeurEstimee: 100000,
        operations: [{ type_operation: 'versement', montant: 100000, date_operation: '2010-01-01' }],
        clauseBeneficiaireStructuree: { niveaux: [{ beneficiaires: [{ familyLinkId: 'conjoint', pourcentage: 100 }] }] }
      }],
      '1970-01-01',
      family
    );
    expect(contract.beneficiaires).toEqual([{ beneficiaryId: 'conjoint-defunt', quotePart: 1 }]);
    expect(contract.isExonereBeneficiaireConjointPacs).toBe(true);
  });

  it('ne retient que le niveau 1 de la clause (pas de croisement avec une éventuelle renonciation)', () => {
    const [contract] = buildAVContracts(
      [{
        assetId: 'av1',
        valeurEstimee: 100000,
        operations: [{ type_operation: 'versement', montant: 100000, date_operation: '2010-01-01' }],
        clauseBeneficiaireStructuree: {
          niveaux: [
            { beneficiaires: [{ familyLinkId: 'enfant1', pourcentage: 100 }] },
            { beneficiaires: [{ familyLinkId: 'conjoint', pourcentage: 100 }] }
          ]
        }
      }],
      '1970-01-01',
      family
    );
    expect(contract.beneficiaires).toEqual([{ beneficiaryId: 'enfant1', quotePart: 1 }]);
  });
});
