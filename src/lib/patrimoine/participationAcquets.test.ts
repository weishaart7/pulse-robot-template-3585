/**
 * Tests du moteur de calcul de la créance de participation aux acquêts
 * (art. 1569-1581 C. civ.), en isolation — cf.
 * lib/transmission/participationAcquets.branchement.test.ts pour le
 * branchement réel dans computeTransmission (décès uniquement, cf. commentaire
 * en tête de participationAcquets.ts).
 */
import { describe, it, expect } from 'vitest';
import { computeAcquetNet, computeParticipationAcquets, regimeIsParticipationAcquets } from './participationAcquets';

// Jeu de référence repris par lib/transmission/participationAcquets.branchement.test.ts :
// user acquêt net 600k (1 200 000 - 600 000), spouse acquêt net 200k (1 000 000 - 800 000).
const patrimoineOriginaire = [
  { epoux: 'user' as const, valeur: 600000, bienProfessionnel: false },
  { epoux: 'spouse' as const, valeur: 800000, bienProfessionnel: false }
];
const patrimoineFinal = [
  { epoux: 'user' as const, valeur: 1200000, bienProfessionnel: false },
  { epoux: 'spouse' as const, valeur: 1000000, bienProfessionnel: false }
];

describe('computeAcquetNet', () => {
  it('acquêt net = patrimoine final - patrimoine originaire (art. 1570)', () => {
    expect(computeAcquetNet('user', patrimoineOriginaire, patrimoineFinal, false)).toBe(600000);
    expect(computeAcquetNet('spouse', patrimoineOriginaire, patrimoineFinal, false)).toBe(200000);
  });

  it("plancher à 0 : l'appauvrissement ne se compense pas", () => {
    const originaire = [{ epoux: 'user' as const, valeur: 500000, bienProfessionnel: false }];
    const final = [{ epoux: 'user' as const, valeur: 300000, bienProfessionnel: false }];
    expect(computeAcquetNet('user', originaire, final, false)).toBe(0);
  });

  it('exclusionBiensProfessionnels retire les biens professionnels du calcul', () => {
    const finalAvecPro = [
      ...patrimoineFinal,
      { epoux: 'user' as const, valeur: 300000, bienProfessionnel: true }
    ];
    expect(computeAcquetNet('user', patrimoineOriginaire, finalAvecPro, false)).toBe(900000);
    expect(computeAcquetNet('user', patrimoineOriginaire, finalAvecPro, true)).toBe(600000);
  });

  it("extensionQualificationAcquets : le patrimoine originaire n'est plus déduit, l'acquêt net devient égal au patrimoine final", () => {
    expect(computeAcquetNet('user', patrimoineOriginaire, patrimoineFinal, false, true)).toBe(1200000);
    expect(computeAcquetNet('spouse', patrimoineOriginaire, patrimoineFinal, false, true)).toBe(1000000);
  });

  it('extensionQualificationAcquets absent ou false : comportement inchangé (défaut)', () => {
    expect(computeAcquetNet('user', patrimoineOriginaire, patrimoineFinal, false, false)).toBe(600000);
    expect(computeAcquetNet('user', patrimoineOriginaire, patrimoineFinal, false)).toBe(600000);
  });
});

describe('computeParticipationAcquets', () => {
  it('partage par moitié par défaut (art. 1571 al. 1) : créance = moitié de la différence des acquêts nets', () => {
    const result = computeParticipationAcquets({
      patrimoineOriginaire,
      patrimoineFinal,
      exclusionBiensProfessionnels: false
    });
    expect(result.epouxDebiteur).toBe('user');
    expect(result.epouxCreancier).toBe('spouse');
    expect(result.montantCreance).toBe(200000);
  });

  it('acquêts nets égaux : aucune créance, quel que soit le taux de partage inégal', () => {
    const originaireEgal = [
      { epoux: 'user' as const, valeur: 500000, bienProfessionnel: false },
      { epoux: 'spouse' as const, valeur: 300000, bienProfessionnel: false }
    ];
    const finalEgal = [
      { epoux: 'user' as const, valeur: 900000, bienProfessionnel: false },
      { epoux: 'spouse' as const, valeur: 700000, bienProfessionnel: false }
    ];
    const result = computeParticipationAcquets({
      patrimoineOriginaire: originaireEgal,
      patrimoineFinal: finalEgal,
      exclusionBiensProfessionnels: false,
      partCreancierPct: 100
    });
    expect(result.epouxDebiteur).toBeNull();
    expect(result.epouxCreancier).toBeNull();
    expect(result.montantCreance).toBe(0);
  });

  it("clause de partage inégal (art. 1581) : un taux de 100% attribue la totalité de la différence à l'époux créancier", () => {
    const result = computeParticipationAcquets({
      patrimoineOriginaire,
      patrimoineFinal,
      exclusionBiensProfessionnels: false,
      partCreancierPct: 100
    });
    expect(result.epouxDebiteur).toBe('user');
    expect(result.epouxCreancier).toBe('spouse');
    expect(result.montantCreance).toBe(400000);
  });

  it('clause de partage inégal : un taux de 25% réduit la créance proportionnellement', () => {
    const result = computeParticipationAcquets({
      patrimoineOriginaire,
      patrimoineFinal,
      exclusionBiensProfessionnels: false,
      partCreancierPct: 25
    });
    expect(result.montantCreance).toBe(100000);
  });

  it('taux à 0% : aucune créance due, même si les acquêts nets diffèrent', () => {
    const result = computeParticipationAcquets({
      patrimoineOriginaire,
      patrimoineFinal,
      exclusionBiensProfessionnels: false,
      partCreancierPct: 0
    });
    expect(result.montantCreance).toBe(0);
  });

  it("clause d'extension de la qualification d'acquêts : la créance porte sur l'intégralité du patrimoine final, sans déduire le patrimoine originaire", () => {
    const result = computeParticipationAcquets({
      patrimoineOriginaire,
      patrimoineFinal,
      exclusionBiensProfessionnels: false,
      extensionQualificationAcquets: true
    });
    // Acquêts nets : user 1 200 000€, spouse 1 000 000€ (patrimoine final intégral, originaire ignoré).
    expect(result.acquetNet).toEqual({ user: 1200000, spouse: 1000000 });
    expect(result.epouxDebiteur).toBe('user');
    expect(result.epouxCreancier).toBe('spouse');
    expect(result.montantCreance).toBe(100000);
  });
});

describe('regimeIsParticipationAcquets', () => {
  it('détecte le régime sur le libellé humain, insensible à la casse', () => {
    expect(regimeIsParticipationAcquets('Participation aux acquêts')).toBe(true);
    expect(regimeIsParticipationAcquets('participation aux acquêts (régime optionnel)')).toBe(true);
  });

  it('renvoie false pour un autre régime ou une valeur absente', () => {
    expect(regimeIsParticipationAcquets('Communauté réduite aux acquêts')).toBe(false);
    expect(regimeIsParticipationAcquets(null)).toBe(false);
    expect(regimeIsParticipationAcquets(undefined)).toBe(false);
  });
});
