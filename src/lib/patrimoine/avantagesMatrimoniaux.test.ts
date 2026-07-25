import { describe, it, expect } from 'vitest';
import {
  getFractionAjustee,
  getFractionPassifAjustee,
  isClauseAllowedGivenOthers,
  resolvePreciputMode,
  AvantageMatrimonialContext,
} from './avantagesMatrimoniaux';
import { getPartSuccessorale } from './succession';
import { getDemembrementPct } from '../transmission';

function baseCtx(overrides: Partial<AvantageMatrimonialContext> = {}): AvantageMatrimonialContext {
  return {
    preciputAssetIds: [],
    preciputMode: null,
    attributionIntegraleMode: null,
    partConjointInegal: null,
    npSurvivant: 0.5,
    ...overrides,
  };
}

describe('getFractionAjustee — cas de test obligatoires', () => {
  it('1. Préciput PP : commun 600k (résidence 300k préciputée + autre bien 300k) → masse successorale défunt = 150 000 €', () => {
    const residence = { id: 'residence', qualification_bien: 'Bien commun', valeur: 300_000 };
    const autreBien = { id: 'autre', qualification_bien: 'Bien commun', valeur: 300_000 };

    const ctx = baseCtx({
      preciputAssetIds: ['residence'],
      preciputMode: 'pleine_propriete',
    });

    const fractionResidence = getFractionAjustee(residence, ctx) ?? getPartSuccessorale(residence);
    const fractionAutre = getFractionAjustee(autreBien, ctx) ?? getPartSuccessorale(autreBien);

    expect(fractionResidence).toBe(0);
    expect(fractionAutre).toBe(0.5);

    const masse = residence.valeur * fractionResidence + autreBien.valeur * fractionAutre;
    expect(masse).toBe(150_000);
  });

  it("2. Attribution intégrale usufruit : écart de 60 000 € sur une base de 600 000 € (moitié défunt) entre 76 ans et 64 ans", () => {
    const bienCommun = { id: 'commun', qualification_bien: 'Bien commun', valeur: 1_200_000 };

    const np76 = getDemembrementPct(76, 'nue_propriete');
    const np64 = getDemembrementPct(64, 'nue_propriete');
    expect(np76).toBe(0.7);
    expect(np64).toBe(0.6);

    const ctx76 = baseCtx({ attributionIntegraleMode: 'usufruit', npSurvivant: np76 });
    const ctx64 = baseCtx({ attributionIntegraleMode: 'usufruit', npSurvivant: np64 });

    const fraction76 = getFractionAjustee(bienCommun, ctx76)!;
    const fraction64 = getFractionAjustee(bienCommun, ctx64)!;

    const masse76 = bienCommun.valeur * fraction76;
    const masse64 = bienCommun.valeur * fraction64;

    expect(masse76).toBe(420_000); // 600 000 (moitié défunt) × 70%
    expect(masse64).toBe(360_000); // 600 000 (moitié défunt) × 60%
    expect(masse76 - masse64).toBe(60_000);
  });

  it('3. Parts inégales avec passif commun : le ratio (1 − partConjoint/100) s\'applique identiquement à l\'actif et au passif', () => {
    const actifCommun = { id: 'actif', qualification_bien: 'Bien commun', valeur: 500_000 };
    const passifCommun = { id: 'passif', qualification_bien: 'Bien commun', valeur: 100_000 };

    const ctx = baseCtx({ partConjointInegal: 70 }); // conjoint reçoit 70%, défunt 30%

    const fractionActif = getFractionAjustee(actifCommun, ctx) ?? getPartSuccessorale(actifCommun);
    const fractionPassif = getFractionPassifAjustee(passifCommun, ctx) ?? 0.5;

    expect(fractionActif).toBeCloseTo(0.3, 10);
    expect(fractionPassif).toBeCloseTo(0.3, 10);

    const masseNetteAvecRatio = actifCommun.valeur * fractionActif - passifCommun.valeur * fractionPassif;
    expect(masseNetteAvecRatio).toBeCloseTo(120_000, 6); // 150 000 − 30 000

    // Discriminant : si on omettait le ratio sur le passif (défaut 50%), le
    // résultat serait différent, car actif (500k) ≠ passif (100k).
    const masseNetteSansRatioPassif = actifCommun.valeur * fractionActif - passifCommun.valeur * 0.5;
    expect(masseNetteSansRatioPassif).toBeCloseTo(100_000, 6);
    expect(masseNetteSansRatioPassif).not.toBeCloseTo(masseNetteAvecRatio, 6);
  });

  it('4. Préciput usufruit : nue-propriété calculée sur 100% de la valeur du bien désigné (pas 50%)', () => {
    const bienDesigne = { id: 'designe', qualification_bien: 'Bien commun', valeur: 400_000 };
    const np = getDemembrementPct(70, 'nue_propriete'); // 61-70 → 60%
    expect(np).toBe(0.6);

    const ctx = baseCtx({
      preciputAssetIds: ['designe'],
      preciputMode: 'usufruit',
      npSurvivant: np,
    });

    const fraction = getFractionAjustee(bienDesigne, ctx)!;
    expect(fraction).toBe(0.6);

    const masse = bienDesigne.valeur * fraction;
    expect(masse).toBe(240_000); // 400 000 × 60%, PAS 400 000 × 50% × 60% = 120 000
    expect(masse).not.toBe(bienDesigne.valeur * 0.5 * np);
  });

  it('5. Mutuelle exclusion : attribution_integrale ↔ partage_inegal, et repli PP sur les 2 checkboxes préciput', () => {
    expect(isClauseAllowedGivenOthers('partage_inegal', ['attribution_integrale'])).toBe(false);
    expect(isClauseAllowedGivenOthers('attribution_integrale', ['partage_inegal'])).toBe(false);
    expect(isClauseAllowedGivenOthers('partage_inegal', [])).toBe(true);
    expect(isClauseAllowedGivenOthers('attribution_integrale', [])).toBe(true);
    expect(isClauseAllowedGivenOthers('preciput', ['attribution_integrale'])).toBe(true);

    expect(resolvePreciputMode({ pleineProprietee: true, usufruit: true })).toBe('pleine_propriete');
    expect(resolvePreciputMode({ pleineProprietee: false, usufruit: true })).toBe('usufruit');
    expect(resolvePreciputMode({ pleineProprietee: true, usufruit: false })).toBe('pleine_propriete');
    expect(resolvePreciputMode(undefined)).toBe(null);
  });

  it("6. Préciput résiduel sous participation aux acquêts (bien 'Bien propre') : neutralisé, le bien reste intégralement dans la succession (diagnostic chantier participation aux acquêts)", () => {
    // Reproduit l'exemple chiffré du diagnostic : résidence de 300 000 €,
    // qualifiée 'Bien propre' (systématique sous participation aux acquêts),
    // avec un résidu de clause de préciput pleine propriété issu d'un régime
    // antérieur — sans le garde-fou, la résidence sortait à tort à 0 € de la
    // succession, en plus de la créance de participation de 150 000 €
    // (calculée séparément par computeParticipationAcquets), inversant le
    // signe du résultat (+150 000 € attendu vs -150 000 € avec le bug).
    const residence = { id: 'residence', qualification_bien: 'Bien propre', valeur: 300_000 };

    const ctx = baseCtx({
      preciputAssetIds: ['residence'],
      preciputMode: 'pleine_propriete',
    });

    const fraction = getFractionAjustee(residence, ctx) ?? getPartSuccessorale({
      qualification_bien: residence.qualification_bien,
      detenteur: 'user',
    });

    // null (neutralisé) → repli sur getPartSuccessorale, qui renvoie 1 pour
    // un bien propre détenu par le défunt : le bien entre en totalité dans
    // la succession, comme si le préciput résiduel n'existait pas.
    expect(getFractionAjustee(residence, ctx)).toBe(null);
    expect(fraction).toBe(1);

    const creanceParticipation = 150_000; // calculée séparément, cf. participationAcquets.ts
    const masseNette = residence.valeur * fraction - creanceParticipation;
    expect(masseNette).toBe(150_000);
  });
});
