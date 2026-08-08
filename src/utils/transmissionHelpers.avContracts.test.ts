import { describe, it, expect } from 'vitest';
import { buildAVContracts, splitPrimesAvantApres70, computeAVReintegrationCivile, AVDonneesInsuffisantesError } from './transmissionHelpers';
import { FamilyGraph, TransmissionParams, PatrimonySnapshot } from '@/lib/transmission/types';
import { computeTransmission } from '@/lib/transmission';
import { AVContract } from '@/lib/dmtg/types';
import transmissionParamsData from '@/data/transmission-params.json';

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

  it('frère/sœur avec exoneration_succession déclarée : isSiblingExonEligible = true sur le contrat', () => {
    const familyAvecFrereExonere: FamilyGraph = {
      ...family,
      persons: [...family.persons, { id: 'frere1', nom: 'Frere', prenom: 'Un', lienFamilial: 'Frère/Soeur', exonerationSuccession: true }]
    };

    const [contract] = buildAVContracts(
      [{
        assetId: 'av1',
        valeurEstimee: 100000,
        operations: [{ type_operation: 'versement', montant: 100000, date_operation: '2010-01-01' }],
        clauseBeneficiaireStructuree: { niveaux: [{ beneficiaires: [{ familyLinkId: 'frere1', pourcentage: 100 }] }] }
      }],
      '1970-01-01',
      familyAvecFrereExonere
    );

    expect(contract.isSiblingExonEligible).toBe(true);
  });

  it('frère/sœur sans exoneration_succession déclarée : isSiblingExonEligible = false, non-régression', () => {
    const familyAvecFrereNonExonere: FamilyGraph = {
      ...family,
      persons: [...family.persons, { id: 'frere1', nom: 'Frere', prenom: 'Un', lienFamilial: 'Frère/Soeur', exonerationSuccession: false }]
    };

    const [contract] = buildAVContracts(
      [{
        assetId: 'av1',
        valeurEstimee: 100000,
        operations: [{ type_operation: 'versement', montant: 100000, date_operation: '2010-01-01' }],
        clauseBeneficiaireStructuree: { niveaux: [{ beneficiaires: [{ familyLinkId: 'frere1', pourcentage: 100 }] }] }
      }],
      '1970-01-01',
      familyAvecFrereNonExonere
    );

    expect(contract.isSiblingExonEligible).toBe(false);
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

describe('computeAVReintegrationCivile (doctrine Ciot, §9.6.1)', () => {
  const contratConjointDeniersCommuns: AVContract = {
    id: 'av-conjoint-commun',
    niveaux: [],
    capitalDeces: 50000,
    primesAvant70: 50000,
    primesApres70: 0,
    detenteur: 'spouse',
    origineFonds: 'deniers_communs'
  };
  const contratConjointDeniersPropres: AVContract = {
    id: 'av-conjoint-propre',
    niveaux: [],
    capitalDeces: 30000,
    primesAvant70: 30000,
    primesApres70: 0,
    detenteur: 'spouse',
    origineFonds: 'deniers_propres'
  };
  const contratUtilisateur: AVContract = {
    id: 'av-utilisateur',
    niveaux: [],
    capitalDeces: 40000,
    primesAvant70: 40000,
    primesApres70: 0,
    detenteur: 'user',
    origineFonds: 'deniers_communs'
  };

  it('régime de communauté + deniers communs + contrat détenu par le conjoint : réintègre la valeur de rachat', () => {
    expect(
      computeAVReintegrationCivile([contratConjointDeniersCommuns], 'spouse', 'Communauté réduite aux acquêts')
    ).toBe(50000);
  });

  it('régime de communauté + deniers propres : pas de réintégration civile', () => {
    expect(
      computeAVReintegrationCivile([contratConjointDeniersPropres], 'spouse', 'Communauté réduite aux acquêts')
    ).toBe(0);
  });

  it.each(['Séparation de biens', 'Participation aux acquêts'])(
    'régime séparatiste (%s) : pas de réintégration civile, même en deniers communs',
    (regime) => {
      expect(computeAVReintegrationCivile([contratConjointDeniersCommuns], 'spouse', regime)).toBe(0);
    }
  );

  it('un contrat détenu par l\'Utilisateur (dénoué par son propre décès) n\'est jamais réintégré civilement pour le conjoint survivant', () => {
    expect(computeAVReintegrationCivile([contratUtilisateur], 'spouse', 'Communauté universelle')).toBe(0);
  });

  it('additionne plusieurs contrats éligibles et ignore les non-éligibles dans le même appel', () => {
    expect(
      computeAVReintegrationCivile(
        [contratConjointDeniersCommuns, contratConjointDeniersPropres, contratUtilisateur],
        'spouse',
        'Communauté réduite aux acquêts'
      )
    ).toBe(50000);
  });
});

describe('computeTransmission — filtrage fiscal des contrats AV par détenteur (doctrine Ciot, §9.6.1)', () => {
  const params: TransmissionParams = {
    abattements: {
      ...transmissionParamsData.abattements,
      conjoint: transmissionParamsData.abattements.conjoint === 'Infinity' ? Infinity : Number(transmissionParamsData.abattements.conjoint)
    },
    bareme: transmissionParamsData.bareme,
    prelevement990I: transmissionParamsData.prelevement990I
  };
  const patrimony: PatrimonySnapshot = { date: '2026-07-28', biensExistants: 100000, passifs: 0 };

  // capitalDeces/primesAvant70 volontairement > abattement 990I (152 500€) :
  // sans cela, un contrat réellement dénoué et taxé produirait quand même un
  // prélèvement nul (base sous abattement), rendant le test inconcluant.
  const contratConjoint: AVContract = {
    id: 'av-conjoint',
    niveaux: [{ beneficiaires: [{ beneficiaryId: 'enfant1', quotePart: 1 }] }],
    capitalDeces: 250000,
    primesAvant70: 250000,
    primesApres70: 0,
    detenteur: 'spouse',
    origineFonds: 'deniers_communs'
  };
  const contratUtilisateur: AVContract = {
    id: 'av-utilisateur',
    niveaux: [{ beneficiaires: [{ beneficiaryId: 'enfant1', quotePart: 1 }] }],
    capitalDeces: 250000,
    primesAvant70: 250000,
    primesApres70: 0,
    detenteur: 'user',
    origineFonds: 'deniers_communs'
  };

  it("l'Utilisateur décède en premier : un contrat détenu par le conjoint (non dénoué) est absent de l'assiette 990I de cette succession", () => {
    const result = computeTransmission({
      family,
      patrimony,
      liberalites: [],
      params,
      referenceDate: '2026-07-28',
      avContracts: [contratConjoint]
    });
    expect(result.dmtg.perBeneficiary['enfant1']?.prelev990I || 0).toBe(0);
  });

  it("l'Utilisateur décède en premier : un contrat qu'il détient lui-même reste dénoué et taxé normalement (traitement fiscal inchangé)", () => {
    const result = computeTransmission({
      family,
      patrimony,
      liberalites: [],
      params,
      referenceDate: '2026-07-28',
      avContracts: [contratUtilisateur]
    });
    expect(result.dmtg.perBeneficiary['enfant1']?.prelev990I || 0).toBeGreaterThan(0);
  });
});
