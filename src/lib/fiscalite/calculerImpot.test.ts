import { describe, expect, it } from 'vitest';
import { calculerImpot } from './calculerImpot';
import { MajorationDetail, PartsFiscalesResult } from './types';

function makeParts(overrides: Partial<PartsFiscalesResult> = {}): PartsFiscalesResult {
  return {
    partsBase: 1,
    majorations: [],
    nombreParts: 1,
    ...overrides,
  };
}

function majoration(overrides: Partial<MajorationDetail> = {}): MajorationDetail {
  return { type: 'test', libelle: 'test', parts: 0.5, plafondUnitaire: 1807, ...overrides };
}

describe('calculerImpot — barème progressif (1 part)', () => {
  it('revenu nul : impôt nul, TMI 0 %', () => {
    const result = calculerImpot(0, makeParts(), 'celibataire');
    expect(result.impotNet).toBe(0);
    expect(result.tmi).toBe(0);
  });

  it('revenu dans la tranche à 0 % (sous 11 600 €) : impôt nul', () => {
    const result = calculerImpot(11000, makeParts(), 'celibataire');
    expect(result.impotAvecMajorations).toBe(0);
    expect(result.tmi).toBe(0);
  });

  it('revenu à cheval sur la tranche à 11 % : calcul tranche par tranche', () => {
    const result = calculerImpot(20000, makeParts(), 'celibataire');
    // (20000 - 11600) * 11% = 924
    expect(result.impotAvecMajorations).toBeCloseTo(924, 6);
    expect(result.tmi).toBe(0.11);
  });

  it('revenu dans la tranche à 30 % : TMI 30 %', () => {
    const result = calculerImpot(50000, makeParts(), 'celibataire');
    expect(result.tmi).toBe(0.30);
  });

  it('revenu dans la tranche à 45 % : TMI 45 %', () => {
    const result = calculerImpot(300000, makeParts(), 'celibataire');
    expect(result.tmi).toBe(0.45);
  });
});

describe('calculerImpot — quotient familial (plusieurs parts)', () => {
  it('couple 2 parts : le quotient divise le revenu par 2 avant barème', () => {
    const parts = makeParts({ partsBase: 2, nombreParts: 2 });
    const result = calculerImpot(40000, parts, 'marie');
    // quotient = 20000 -> (20000-11600)*11% = 924 par part, x2 parts = 1848
    expect(result.impotAvecMajorations).toBeCloseTo(1848, 6);
  });

  it('parts supplémentaires (enfants) réduisent l\'impôt par rapport aux parts de base', () => {
    const parts = makeParts({
      partsBase: 2,
      nombreParts: 3,
      majorations: [majoration({ parts: 1, plafondUnitaire: 1807 * 2 })],
    });
    const result = calculerImpot(60000, parts, 'marie');
    expect(result.impotAvecMajorations).toBeLessThan(result.impotSansMajorations);
  });
});

describe('calculerImpot — plafonnement du quotient familial (art. 197 CGI)', () => {
  it("ne plafonne pas quand l'avantage reste sous le plafond", () => {
    const parts = makeParts({
      partsBase: 2,
      nombreParts: 2.5,
      majorations: [majoration({ parts: 0.5, plafondUnitaire: 1807 })],
    });
    const result = calculerImpot(40000, parts, 'marie');
    expect(result.plafonnementApplique).toBe(false);
    expect(result.impotApresPlafonnement).toBeCloseTo(result.impotAvecMajorations, 6);
  });

  it("plafonne l'avantage quand il dépasse le plafond (haut revenu, 1 demi-part)", () => {
    const parts = makeParts({
      partsBase: 2,
      nombreParts: 2.5,
      majorations: [majoration({ parts: 0.5, plafondUnitaire: 1807 })],
    });
    const result = calculerImpot(200000, parts, 'marie');
    expect(result.plafonnementApplique).toBe(true);
    expect(result.impotApresPlafonnement).toBeCloseTo(result.impotSansMajorations - 1807, 6);
  });

  it('désactive le plafonnement si une majoration ne porte pas de plafondUnitaire (ex. personne invalide à charge)', () => {
    const parts = makeParts({
      partsBase: 2,
      nombreParts: 3,
      majorations: [majoration({ type: 'personne_invalide_charge_1', parts: 1, plafondUnitaire: undefined })],
    });
    const result = calculerImpot(300000, parts, 'marie');
    expect(result.plafondQuotientFamilial).toBe(Infinity);
    expect(result.plafonnementApplique).toBe(false);
    expect(result.impotApresPlafonnement).toBeCloseTo(result.impotAvecMajorations, 6);
  });
});

describe('calculerImpot — décote', () => {
  it("s'applique et annule l'impôt sous le seuil célibataire (897 / 45,25 %)", () => {
    // impôt brut proche du seuil bas : décote peut ramener l'impôt à 0
    const result = calculerImpot(12500, makeParts(), 'celibataire');
    expect(result.impotAvecMajorations).toBeGreaterThan(0);
    expect(result.decote).toBeGreaterThan(0);
  });

  it('ne s\'applique pas au-delà du seuil de décote (célibataire, 1 982 €)', () => {
    const result = calculerImpot(30000, makeParts(), 'celibataire');
    // impôt brut = (29579-11600)*11% + (30000-29579)*30% = 1978,69 + 126,3 = 2104,99 > 1982
    expect(result.decote).toBe(0);
  });

  it('seuil de décote différent pour un couple (3 277 €)', () => {
    const parts = makeParts({ partsBase: 2, nombreParts: 2 });
    const result = calculerImpot(35000, parts, 'marie');
    // quotient 17500 -> impôt/part = (17500-11600)*11%=649 x2 parts = 1298 < 3277 -> décote s'applique
    expect(result.decote).toBeGreaterThan(0);
  });

  it('veuf avec enfants (2 parts) reste au seuil célibataire pour la décote (déclarant seul)', () => {
    const parts = makeParts({ partsBase: 2, nombreParts: 2 });
    const resultVeuf = calculerImpot(35000, parts, 'veuf');
    const resultMarie = calculerImpot(35000, parts, 'marie');
    expect(resultVeuf.decote).not.toBe(resultMarie.decote);
  });
});

describe('calculerImpot — méthode du taux effectif', () => {
  it('sans revenu exonéré : comportement identique au calcul sans taux effectif', () => {
    const parts = makeParts();
    const avecZero = calculerImpot(30000, parts, 'celibataire', 0);
    const sansParam = calculerImpot(30000, parts, 'celibataire');
    expect(avecZero.impotNet).toBe(sansParam.impotNet);
    expect(avecZero.impotProportionnel).toBe(avecZero.impotApresPlafonnement);
  });

  it('un revenu exonéré fait monter le taux appliqué au revenu français (progressivité)', () => {
    const parts = makeParts();
    const sansExonere = calculerImpot(30000, parts, 'celibataire');
    const avecExonere = calculerImpot(30000, parts, 'celibataire', 50000);
    // même revenu français, mais un revenu mondial fictif plus élevé -> taux plus élevé -> impôt dû plus élevé
    expect(avecExonere.impotNet).toBeGreaterThan(sansExonere.impotNet);
  });

  it("l'impôt dû ne porte que sur le revenu français, pas sur le revenu exonéré", () => {
    const parts = makeParts();
    const result = calculerImpot(30000, parts, 'celibataire', 50000);
    // impôt sur 80 000€ (mondial fictif) très supérieur à l'impôt réellement dû (proraté sur 30 000€ seulement)
    const impotSiToutImposable = calculerImpot(80000, parts, 'celibataire').impotNet;
    expect(result.impotNet).toBeLessThan(impotSiToutImposable);
  });

  it('le TMI reflète le revenu mondial fictif, pas seulement le revenu français', () => {
    const parts = makeParts();
    // 10 000€ de revenu français seul -> tranche à 0%, mais + 50 000€ exonérés -> tranche à 30%
    const result = calculerImpot(10000, parts, 'celibataire', 50000);
    expect(result.tmi).toBe(0.30);
  });

  it('revenu français nul avec revenu exonéré : impôt net nul (rien à prélever en France)', () => {
    const parts = makeParts();
    const result = calculerImpot(0, parts, 'celibataire', 100000);
    expect(result.impotNet).toBe(0);
    expect(result.tauxEffectif).toBeGreaterThan(0);
  });

  it('revenu mondial fictif nul : pas de division par zéro', () => {
    const parts = makeParts();
    const result = calculerImpot(0, parts, 'celibataire', 0);
    expect(result.impotNet).toBe(0);
    expect(result.tauxEffectif).toBe(0);
  });
});

describe('calculerImpot — impôt net', () => {
  it("n'est jamais négatif", () => {
    const result = calculerImpot(5000, makeParts(), 'celibataire');
    expect(result.impotNet).toBeGreaterThanOrEqual(0);
  });

  it('est arrondi à l\'euro', () => {
    const result = calculerImpot(25000, makeParts(), 'celibataire');
    expect(Number.isInteger(result.impotNet)).toBe(true);
  });
});
