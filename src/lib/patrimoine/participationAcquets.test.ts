import { describe, it, expect } from 'vitest';
import { computeAcquetNet, computeParticipationAcquets } from './participationAcquets';

describe('computeParticipationAcquets', () => {
  it('cas de référence — époux A enrichi, époux B moins enrichi : créance de 200 000€ due par A à B (art. 1571 al. 1)', () => {
    const result = computeParticipationAcquets({
      patrimoineOriginaire: [
        { epoux: 'user', valeur: 600000, bienProfessionnel: false },
        { epoux: 'spouse', valeur: 800000, bienProfessionnel: false },
      ],
      patrimoineFinal: [
        { epoux: 'user', valeur: 1200000, bienProfessionnel: false },
        { epoux: 'spouse', valeur: 1000000, bienProfessionnel: false },
      ],
      exclusionBiensProfessionnels: false,
    });

    expect(result.acquetNet.user).toBe(600000);
    expect(result.acquetNet.spouse).toBe(200000);
    expect(result.epouxDebiteur).toBe('user');
    expect(result.epouxCreancier).toBe('spouse');
    expect(result.montantCreance).toBe(200000);
  });

  it('clause d\'exclusion des biens professionnels active — un bien professionnel chez le conjoint fait basculer le débiteur et le montant', () => {
    const patrimoineOriginaire = [
      { epoux: 'user' as const, valeur: 600000, bienProfessionnel: false },
      { epoux: 'spouse' as const, valeur: 800000, bienProfessionnel: false },
    ];
    const patrimoineFinal = [
      { epoux: 'user' as const, valeur: 1200000, bienProfessionnel: false },
      { epoux: 'spouse' as const, valeur: 1000000, bienProfessionnel: false },
      { epoux: 'spouse' as const, valeur: 900000, bienProfessionnel: true },
    ];

    // Sans exclusion : le bien professionnel du conjoint (900k) fait grimper
    // son acquêt net au-dessus de celui de l'utilisateur → conjoint débiteur.
    const sansExclusion = computeParticipationAcquets({
      patrimoineOriginaire,
      patrimoineFinal,
      exclusionBiensProfessionnels: false,
    });
    expect(sansExclusion.acquetNet.spouse).toBe(1100000);
    expect(sansExclusion.epouxDebiteur).toBe('spouse');
    expect(sansExclusion.montantCreance).toBe(250000);

    // Avec exclusion : le bien professionnel est retiré des deux sommes du
    // conjoint → son acquêt net retombe à 200k, le débiteur redevient l'utilisateur.
    const avecExclusion = computeParticipationAcquets({
      patrimoineOriginaire,
      patrimoineFinal,
      exclusionBiensProfessionnels: true,
    });
    expect(avecExclusion.acquetNet.spouse).toBe(200000);
    expect(avecExclusion.epouxDebiteur).toBe('user');
    expect(avecExclusion.montantCreance).toBe(200000);
  });

  it('acquêts nets égaux — créance nulle, aucun débiteur ni créancier désigné', () => {
    const result = computeParticipationAcquets({
      patrimoineOriginaire: [
        { epoux: 'user', valeur: 500000, bienProfessionnel: false },
        { epoux: 'spouse', valeur: 300000, bienProfessionnel: false },
      ],
      patrimoineFinal: [
        { epoux: 'user', valeur: 900000, bienProfessionnel: false },
        { epoux: 'spouse', valeur: 700000, bienProfessionnel: false },
      ],
      exclusionBiensProfessionnels: false,
    });

    expect(result.acquetNet.user).toBe(400000);
    expect(result.acquetNet.spouse).toBe(400000);
    expect(result.epouxDebiteur).toBeNull();
    expect(result.epouxCreancier).toBeNull();
    expect(result.montantCreance).toBe(0);
  });

  it('appauvrissement d\'un époux — acquêt net plancher à zéro (art. 1570), pas de compensation négative', () => {
    const result = computeParticipationAcquets({
      patrimoineOriginaire: [
        { epoux: 'user', valeur: 800000, bienProfessionnel: false },
        { epoux: 'spouse', valeur: 200000, bienProfessionnel: false },
      ],
      patrimoineFinal: [
        { epoux: 'user', valeur: 600000, bienProfessionnel: false }, // appauvri : final < originaire
        { epoux: 'spouse', valeur: 500000, bienProfessionnel: false },
      ],
      exclusionBiensProfessionnels: false,
    });

    expect(result.acquetNet.user).toBe(0);
    expect(result.acquetNet.spouse).toBe(300000);
    expect(result.epouxDebiteur).toBe('spouse');
    expect(result.epouxCreancier).toBe('user');
    expect(result.montantCreance).toBe(150000);
  });
});

describe('computeAcquetNet', () => {
  it('plancher à zéro appliqué directement par la fonction unitaire', () => {
    const acquet = computeAcquetNet(
      'user',
      [{ epoux: 'user', valeur: 1000000, bienProfessionnel: false }],
      [{ epoux: 'user', valeur: 400000, bienProfessionnel: false }],
      false
    );
    expect(acquet).toBe(0);
  });
});
