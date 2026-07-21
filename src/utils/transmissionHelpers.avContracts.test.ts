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
    expect(contract.niveaux).toEqual([{ beneficiaires: [{ beneficiaryId: 'conjoint-defunt', quotePart: 1, statut: undefined }] }]);
    expect(contract.isExonereBeneficiaireConjointPacs).toBe(true);
  });

  it('reprend désormais tous les niveaux de la clause (plus seulement le niveau 1) — la cascade elle-même est résolue au calcul, pas ici', () => {
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
    expect(contract.niveaux).toEqual([
      { beneficiaires: [{ beneficiaryId: 'enfant1', quotePart: 1, statut: undefined }] },
      { beneficiaires: [{ beneficiaryId: 'conjoint-defunt', quotePart: 1, statut: undefined }] }
    ]);
  });

  it('démembrement de la clause : résout le pourcentage d\'usufruit de l\'usufruitier désigné selon son âge à la date de référence (barème art. 669 CGI)', () => {
    const familyAvecDateNaissance: FamilyGraph = {
      ...family,
      persons: family.persons.map(p =>
        p.id === 'conjoint-defunt' ? { ...p, dateNaissance: '1961-01-01' } : p // 65 ans au 17/07/2026
      )
    };

    const [contract] = buildAVContracts(
      [{
        assetId: 'av1',
        valeurEstimee: 100000,
        operations: [{ type_operation: 'versement', montant: 100000, date_operation: '2010-01-01' }],
        clauseBeneficiaireStructuree: {
          niveaux: [{
            beneficiaires: [{
              familyLinkId: 'conjoint',
              pourcentage: 100,
              typeDetention: 'usufruit',
              nuProprietaireId: 'enfant1'
            }]
          }]
        }
      }],
      '1970-01-01',
      familyAvecDateNaissance,
      '2026-07-17'
    );

    const [benef] = contract.niveaux[0].beneficiaires;
    expect(benef.beneficiaryId).toBe('conjoint-defunt');
    expect(benef.nuProprietaireId).toBe('enfant1');
    expect(benef.usufruitPct).toBeCloseTo(0.4, 6); // 61-70 ans → 40% usufruit (barème 669 CGI)
  });

  it('démembrement de la clause : lève AVDonneesInsuffisantesError si la date de naissance de l\'usufruitier désigné est inconnue', () => {
    expect(() => buildAVContracts(
      [{
        assetId: 'av1',
        valeurEstimee: 100000,
        operations: [{ type_operation: 'versement', montant: 100000, date_operation: '2010-01-01' }],
        clauseBeneficiaireStructuree: {
          niveaux: [{
            beneficiaires: [{
              familyLinkId: 'conjoint', // pas de dateNaissance dans `family` (fixture de base)
              pourcentage: 100,
              typeDetention: 'usufruit',
              nuProprietaireId: 'enfant1'
            }]
          }]
        }
      }],
      '1970-01-01',
      family,
      '2026-07-17'
    )).toThrow(AVDonneesInsuffisantesError);
  });
});
