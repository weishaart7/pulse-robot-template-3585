/**
 * Renonciation à la clause bénéficiaire AV + démembrement de la clause
 * (usufruit/nue-propriété par bénéficiaire) — cf. diagnostic et décisions
 * actées : renonciation partielle → redistribution prorata au sein du même
 * niveau ; renonciation totale du niveau → cascade complète vers le niveau
 * suivant ; prédécès ('decede') → aucune cascade, traité comme 'accepte'.
 */
import { describe, it, expect } from 'vitest';
import { resolveEffectiveAVBeneficiaires, computeAssuranceVie } from './assurance-vie';
import { AVContract, Beneficiary, DmtgParams } from './types';
import dmtgParamsData from './params-dmtg.json';

const params = dmtgParamsData as DmtgParams;

describe('resolveEffectiveAVBeneficiaires', () => {
  it('renonciation partielle : la part du renonçant est redistribuée aux acceptants du même niveau, au prorata', () => {
    const niveaux: AVContract['niveaux'] = [
      {
        beneficiaires: [
          { beneficiaryId: 'A', quotePart: 0.5, statut: 'renoncant' },
          { beneficiaryId: 'B', quotePart: 0.3 },
          { beneficiaryId: 'C', quotePart: 0.2 }
        ]
      }
    ];

    const shares = resolveEffectiveAVBeneficiaires(niveaux);

    expect(shares).toHaveLength(2);
    expect(shares.find(s => s.beneficiaryId === 'A')).toBeUndefined();
    expect(shares.find(s => s.beneficiaryId === 'B')!.quotePart).toBeCloseTo(0.6, 6); // 1.0 * (0.3/0.5)
    expect(shares.find(s => s.beneficiaryId === 'C')!.quotePart).toBeCloseTo(0.4, 6); // 1.0 * (0.2/0.5)
  });

  it('renonciation totale du niveau 1 : bascule intégralement sur le niveau 2, avec la même logique de répartition', () => {
    const niveaux: AVContract['niveaux'] = [
      {
        beneficiaires: [
          { beneficiaryId: 'A', quotePart: 0.5, statut: 'renoncant' },
          { beneficiaryId: 'B', quotePart: 0.5, statut: 'renoncant' }
        ]
      },
      {
        beneficiaires: [
          { beneficiaryId: 'C', quotePart: 0.7 },
          { beneficiaryId: 'D', quotePart: 0.3, statut: 'renoncant' }
        ]
      }
    ];

    const shares = resolveEffectiveAVBeneficiaires(niveaux);

    // Niveau 1 intégralement renoncé → niveau 2, où D renonce à son tour :
    // C (seul acceptant du niveau 2) récupère 100%.
    expect(shares).toEqual([{ beneficiaryId: 'C', quotePart: 1 }]);
  });

  it('tous les niveaux intégralement renoncés : aucun bénéficiaire résolu (clause retombe sur "mes héritiers", non modélisé)', () => {
    const niveaux: AVContract['niveaux'] = [
      { beneficiaires: [{ beneficiaryId: 'A', quotePart: 1, statut: 'renoncant' }] },
      { beneficiaires: [{ beneficiaryId: 'B', quotePart: 1, statut: 'renoncant' }] }
    ];

    expect(resolveEffectiveAVBeneficiaires(niveaux)).toEqual([]);
  });

  it('bénéficiaire décédé : aucune cascade, sa part reste inchangée (traité comme un acceptant classique)', () => {
    const niveaux: AVContract['niveaux'] = [
      {
        beneficiaires: [
          { beneficiaryId: 'A', quotePart: 0.5, statut: 'decede' },
          { beneficiaryId: 'B', quotePart: 0.5 }
        ]
      }
    ];

    const shares = resolveEffectiveAVBeneficiaires(niveaux);

    expect(shares).toEqual([
      { beneficiaryId: 'A', quotePart: 0.5 },
      { beneficiaryId: 'B', quotePart: 0.5 }
    ]);
  });

  it('démembrement : un bénéficiaire en usufruit voit sa part scindée avec son nu-propriétaire selon usufruitPct déjà résolu', () => {
    const niveaux: AVContract['niveaux'] = [
      {
        beneficiaires: [
          {
            beneficiaryId: 'usufruitier',
            quotePart: 1,
            typeDetention: 'usufruit',
            nuProprietaireId: 'nu-proprietaire',
            usufruitPct: 0.4 // ex. barème 669 CGI, 65 ans
          }
        ]
      }
    ];

    const shares = resolveEffectiveAVBeneficiaires(niveaux);

    expect(shares).toEqual([
      { beneficiaryId: 'usufruitier', quotePart: 0.4 },
      { beneficiaryId: 'nu-proprietaire', quotePart: 0.6 }
    ]);
  });
});

describe('computeAssuranceVie — intégration cascade + démembrement dans le calcul fiscal', () => {
  const beneficiaries: Beneficiary[] = [
    { id: 'conjoint', lien: 'conjoint' },
    { id: 'enfant1', lien: 'enfant' },
    { id: 'enfant2', lien: 'enfant' }
  ];

  it('renonciation partielle : le 990 I se calcule sur les parts effectives (post-cascade), pas sur les parts nominales de la clause', () => {
    const contracts: AVContract[] = [{
      id: 'av1',
      capitalDeces: 400000,
      primesAvant70: 400000,
      primesApres70: 0,
      niveaux: [{
        beneficiaires: [
          { beneficiaryId: 'conjoint', quotePart: 1, statut: 'renoncant' },
          { beneficiaryId: 'enfant1', quotePart: 0, statut: 'renoncant' } // 0% mais présent, ignoré du prorata
        ]
      }, {
        beneficiaires: [
          { beneficiaryId: 'enfant1', quotePart: 0.5 },
          { beneficiaryId: 'enfant2', quotePart: 0.5 }
        ]
      }],
      isExonereBeneficiaireConjointPacs: true
    }];

    const result = computeAssuranceVie(contracts, beneficiaries, params, '2026-07-20');

    // Le conjoint renonce : aucune fiscalité sur lui malgré isExonereBeneficiaireConjointPacs.
    expect(result.perBeneficiary['conjoint'].prelev990I).toBe(0);
    // Niveau 1 intégralement renoncé → niveau 2 : enfant1/enfant2 200 000€ chacun,
    // abattement 152 500€ → base imposable 47 500€ × 20% = 9 500€ chacun.
    expect(result.perBeneficiary['enfant1'].prelev990I).toBeCloseTo(9500, 0);
    expect(result.perBeneficiary['enfant2'].prelev990I).toBeCloseTo(9500, 0);
  });

  it('usufruit/nue-propriété sur la clause AV : chacun taxé séparément sur sa part démembrée avec son propre abattement', () => {
    const contracts: AVContract[] = [{
      id: 'av1',
      capitalDeces: 500000,
      primesAvant70: 500000,
      primesApres70: 0,
      niveaux: [{
        beneficiaires: [{
          beneficiaryId: 'conjoint',
          quotePart: 1,
          typeDetention: 'usufruit',
          nuProprietaireId: 'enfant1',
          usufruitPct: 0.4 // ex. 65 ans, barème 669 CGI
        }]
      }],
      isExonereBeneficiaireConjointPacs: true
    }];

    const result = computeAssuranceVie(contracts, beneficiaries, params, '2026-07-20');

    // Conjoint usufruitier : exonéré (990 I 2e alinéa), quelle que soit sa part.
    expect(result.perBeneficiary['conjoint'].prelev990I).toBe(0);
    // Enfant1 nu-propriétaire : 60% de 500 000€ = 300 000€, abattement 152 500€
    // → base imposable 147 500€ × 20% = 29 500€.
    expect(result.perBeneficiary['enfant1'].prelev990I).toBeCloseTo(29500, 0);
  });

  it('bénéficiaire décédé : le calcul reste identique à un bénéficiaire acceptant classique (aucune redistribution)', () => {
    const contracts: AVContract[] = [{
      id: 'av1',
      capitalDeces: 300000,
      primesAvant70: 300000,
      primesApres70: 0,
      niveaux: [{
        beneficiaires: [
          { beneficiaryId: 'enfant1', quotePart: 0.5, statut: 'decede' },
          { beneficiaryId: 'enfant2', quotePart: 0.5 }
        ]
      }]
    }];

    const resultAvecDeces = computeAssuranceVie(contracts, beneficiaries, params, '2026-07-20');

    const contractsSansStatut: AVContract[] = [{
      ...contracts[0],
      niveaux: [{
        beneficiaires: [
          { beneficiaryId: 'enfant1', quotePart: 0.5 },
          { beneficiaryId: 'enfant2', quotePart: 0.5 }
        ]
      }]
    }];
    const resultSansDeces = computeAssuranceVie(contractsSansStatut, beneficiaries, params, '2026-07-20');

    expect(resultAvecDeces.perBeneficiary['enfant1']).toEqual(resultSansDeces.perBeneficiary['enfant1']);
    expect(resultAvecDeces.perBeneficiary['enfant2']).toEqual(resultSansDeces.perBeneficiary['enfant2']);
  });
});
