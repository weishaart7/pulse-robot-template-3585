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

describe('calculerImpot — réduction outre-mer (art. 197 I 3° CGI)', () => {
  it('métropole (par défaut) : aucune réduction', () => {
    const result = calculerImpot(50000, makeParts(), 'celibataire');
    expect(result.reductionOutreMer).toBe(0);
  });

  it('métropole (explicite) : aucune réduction', () => {
    const result = calculerImpot(50000, makeParts(), 'celibataire', 0, 'metropole');
    expect(result.reductionOutreMer).toBe(0);
  });

  it('Guadeloupe/Martinique/Réunion : réduction de 30 % sous le plafond', () => {
    const result = calculerImpot(20000, makeParts(), 'celibataire', 0, 'guadeloupe_martinique_reunion');
    // impôt avant réduction = (20000-11600)*11% = 924 -> 30% = 277,2 (sous le plafond 2450)
    expect(result.reductionOutreMer).toBeCloseTo(924 * 0.30, 6);
  });

  it('Guadeloupe/Martinique/Réunion : réduction plafonnée à 2 450 € sur un revenu élevé', () => {
    const result = calculerImpot(200000, makeParts(), 'celibataire', 0, 'guadeloupe_martinique_reunion');
    expect(result.reductionOutreMer).toBe(2450);
  });

  it('Guyane/Mayotte : réduction de 40 % sous le plafond', () => {
    const result = calculerImpot(20000, makeParts(), 'celibataire', 0, 'guyane_mayotte');
    expect(result.reductionOutreMer).toBeCloseTo(924 * 0.40, 6);
  });

  it('Guyane/Mayotte : réduction plafonnée à 4 050 € sur un revenu élevé', () => {
    const result = calculerImpot(200000, makeParts(), 'celibataire', 0, 'guyane_mayotte');
    expect(result.reductionOutreMer).toBe(4050);
  });

  it('la réduction fait baisser l\'impôt net par rapport à la métropole, toutes choses égales par ailleurs', () => {
    const metropole = calculerImpot(50000, makeParts(), 'celibataire', 0, 'metropole');
    const dom = calculerImpot(50000, makeParts(), 'celibataire', 0, 'guadeloupe_martinique_reunion');
    expect(dom.impotNet).toBeLessThan(metropole.impotNet);
  });

  it('la réduction est appliquée avant la décote (pas cumulée en double)', () => {
    const result = calculerImpot(20000, makeParts(), 'celibataire', 0, 'guadeloupe_martinique_reunion');
    expect(result.impotApresReductionOutreMer).toBeCloseTo(result.impotProportionnel - result.reductionOutreMer, 6);
    expect(result.impotNet).toBeLessThanOrEqual(Math.round(result.impotApresReductionOutreMer));
  });
});

describe('calculerImpot — impôt forfaitaire (carried-interest, gains à taux historique)', () => {
  it('sans impôt forfaitaire (paramètre omis) : comportement inchangé', () => {
    const parts = makeParts();
    const sansParam = calculerImpot(30000, parts, 'celibataire');
    const avecZero = calculerImpot(30000, parts, 'celibataire', 0, 'metropole', 0);
    expect(avecZero.impotNet).toBe(sansParam.impotNet);
    expect(avecZero.impotForfaitaire).toBe(0);
  });

  it("s'ajoute intégralement à l'impôt net après décote", () => {
    const parts = makeParts();
    const sansForfaitaire = calculerImpot(30000, parts, 'celibataire', 0, 'metropole', 0);
    const avecForfaitaire = calculerImpot(30000, parts, 'celibataire', 0, 'metropole', 1280);
    expect(avecForfaitaire.impotForfaitaire).toBe(1280);
    expect(avecForfaitaire.impotNet).toBe(sansForfaitaire.impotNet + 1280);
  });

  it("n'entre pas dans le revenu mondial fictif ni dans le quotient (base barème inchangée)", () => {
    const parts = makeParts();
    const sansForfaitaire = calculerImpot(30000, parts, 'celibataire', 0, 'metropole', 0);
    const avecForfaitaire = calculerImpot(30000, parts, 'celibataire', 0, 'metropole', 5000);
    expect(avecForfaitaire.revenuMondialFictif).toBe(sansForfaitaire.revenuMondialFictif);
    expect(avecForfaitaire.quotientFamilial).toBe(sansForfaitaire.quotientFamilial);
    expect(avecForfaitaire.tmi).toBe(sansForfaitaire.tmi);
  });

  it("n'est pas affecté par la décote (s'ajoute même quand le barème est totalement absorbé par la décote)", () => {
    const result = calculerImpot(0, makeParts(), 'celibataire', 0, 'metropole', 640);
    expect(result.impotApresDecote).toBe(0);
    expect(result.impotNet).toBe(640);
  });

  it("n'est pas affecté par la réduction outre-mer", () => {
    const dom = calculerImpot(20000, makeParts(), 'celibataire', 0, 'guadeloupe_martinique_reunion', 1000);
    const metropole = calculerImpot(20000, makeParts(), 'celibataire', 0, 'metropole', 1000);
    expect(dom.impotForfaitaire).toBe(1000);
    expect(dom.reductionOutreMer).toBeGreaterThan(0);
    expect(dom.impotApresDecote).toBeLessThan(metropole.impotApresDecote);
  });

  it('cumulé avec le taux effectif (revenu exonéré) : les deux mécanismes restent indépendants', () => {
    const sansForfaitaire = calculerImpot(30000, makeParts(), 'celibataire', 50000, 'metropole', 0);
    const avecForfaitaire = calculerImpot(30000, makeParts(), 'celibataire', 50000, 'metropole', 2000);
    expect(avecForfaitaire.impotNet).toBe(sansForfaitaire.impotNet + 2000);
  });

  it("reste positif ou nul même si un impotForfaitaire négatif était transmis par erreur", () => {
    const result = calculerImpot(30000, makeParts(), 'celibataire', 0, 'metropole', -500);
    expect(result.impotForfaitaire).toBe(0);
  });
});

describe('calculerImpot — crédit d\'impôt assurance-vie (2DH, restituable)', () => {
  it('nul par défaut (paramètre omis) : comportement inchangé', () => {
    const sansParam = calculerImpot(30000, makeParts(), 'celibataire');
    const avecZero = calculerImpot(30000, makeParts(), 'celibataire', 0, 'metropole', 0, 0, 0);
    expect(avecZero.impotNet).toBe(sansParam.impotNet);
    expect(avecZero.creditImpotAssuranceVie).toBe(0);
  });

  it("se déduit intégralement de l'impôt net, après décote et impôt forfaitaire", () => {
    const sansCredit = calculerImpot(30000, makeParts(), 'celibataire', 0, 'metropole', 1280, 0, 0);
    const avecCredit = calculerImpot(30000, makeParts(), 'celibataire', 0, 'metropole', 1280, 0, 300);
    expect(avecCredit.creditImpotAssuranceVie).toBe(300);
    expect(avecCredit.impotNet).toBe(sansCredit.impotNet - 300);
  });

  it('est restituable : peut rendre impotNet négatif si le crédit dépasse l\'impôt dû', () => {
    const result = calculerImpot(0, makeParts(), 'celibataire', 0, 'metropole', 0, 0, 300);
    expect(result.impotApresDecote).toBe(0);
    expect(result.impotNet).toBe(-300);
  });

  it("reste positif ou nul si un crédit négatif était transmis par erreur", () => {
    const result = calculerImpot(30000, makeParts(), 'celibataire', 0, 'metropole', 0, 0, -300);
    expect(result.creditImpotAssuranceVie).toBe(0);
  });
});

describe('calculerImpot — crédits d\'impôt sur valeurs étrangères (2AB non restituable, 2CK restituable)', () => {
  it('nuls par défaut (paramètres omis) : comportement inchangé', () => {
    const sansParam = calculerImpot(30000, makeParts(), 'celibataire');
    const avecZero = calculerImpot(30000, makeParts(), 'celibataire', 0, 'metropole', 0, 0, 0, 0, 0);
    expect(avecZero.impotNet).toBe(sansParam.impotNet);
    expect(avecZero.creditImpotEtranger2AB).toBe(0);
    expect(avecZero.creditImpotValeursEtrangeres2CK).toBe(0);
  });

  it('2CK se déduit intégralement de l\'impôt net, sans plafond', () => {
    const sansCredit = calculerImpot(30000, makeParts(), 'celibataire', 0, 'metropole', 0, 0, 0, 0, 0);
    const avecCredit = calculerImpot(30000, makeParts(), 'celibataire', 0, 'metropole', 0, 0, 0, 0, 300);
    expect(avecCredit.creditImpotValeursEtrangeres2CK).toBe(300);
    expect(avecCredit.impotNet).toBe(sansCredit.impotNet - 300);
  });

  it('2CK est restituable : peut rendre impotNet négatif si le crédit dépasse l\'impôt dû', () => {
    const result = calculerImpot(0, makeParts(), 'celibataire', 0, 'metropole', 0, 0, 0, 0, 300);
    expect(result.impotApresDecote).toBe(0);
    expect(result.impotNet).toBe(-300);
  });

  it('2AB se déduit intégralement de l\'impôt net quand il ne dépasse pas l\'impôt dû', () => {
    const sansCredit = calculerImpot(30000, makeParts(), 'celibataire', 0, 'metropole', 0, 0, 0, 0);
    const avecCredit = calculerImpot(30000, makeParts(), 'celibataire', 0, 'metropole', 0, 0, 0, 300);
    expect(avecCredit.creditImpotEtranger2AB).toBe(300);
    expect(avecCredit.impotNet).toBe(sansCredit.impotNet - 300);
  });

  it("2AB n'est PAS restituable : plafonné à l'impôt restant dû, jamais de restitution à lui seul", () => {
    const result = calculerImpot(0, makeParts(), 'celibataire', 0, 'metropole', 0, 0, 0, 500);
    expect(result.impotApresDecote).toBe(0);
    expect(result.creditImpotEtranger2AB).toBe(0); // rien à imputer, aucun impôt dû : crédit perdu, pas restitué
    expect(result.impotNet).toBe(0);
  });

  it('2AB (non restituable) est plafonné avant que 2CK (restituable) ne réduise encore le solde', () => {
    // Impôt dû avant crédits finaux : 1000 €. 2AB = 1500 € (excède l'impôt dû, non restituable) ;
    // 2CK = 200 € (restituable). 2AB doit être plafonné sur les 1000 € AVANT que 2CK ne s'applique,
    // pour ne pas priver 2CK de sa restitution.
    const parts = makeParts();
    // On force un impôt forfaitaire de 1000 € pour avoir un impôt dû connu et non nul.
    const result = calculerImpot(0, parts, 'celibataire', 0, 'metropole', 1000, 0, 0, 1500, 200);
    expect(result.creditImpotEtranger2AB).toBe(1000); // plafonné sur l'impôt dû (1000 €), pas 1500 €
    expect(result.creditImpotValeursEtrangeres2CK).toBe(200); // intégralement appliqué, restituable
    expect(result.impotNet).toBe(1000 - 1000 - 200); // -200 : la restitution vient de 2CK, pas de 2AB
  });

  it('les trois crédits finaux (2AB, 2CK, assurance-vie) se cumulent', () => {
    const result = calculerImpot(0, makeParts(), 'celibataire', 0, 'metropole', 1000, 0, 100, 300, 200);
    expect(result.creditImpotEtranger2AB).toBe(300);
    expect(result.creditImpotValeursEtrangeres2CK).toBe(200);
    expect(result.creditImpotAssuranceVie).toBe(100);
    expect(result.impotNet).toBe(1000 - 300 - 100 - 200);
  });

  it('reste positifs si des montants négatifs étaient transmis par erreur', () => {
    const result = calculerImpot(30000, makeParts(), 'celibataire', 0, 'metropole', 0, 0, 0, -300, -300);
    expect(result.creditImpotEtranger2AB).toBe(0);
    expect(result.creditImpotValeursEtrangeres2CK).toBe(0);
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

describe('calculerImpot — système du quotient (revenus exceptionnels, 0XX)', () => {
  it('nul par défaut : comportement inchangé', () => {
    const sans = calculerImpot(30000, makeParts(), 'celibataire');
    const avecZero = calculerImpot(30000, makeParts(), 'celibataire', 0, 'metropole', 0, 0);
    expect(avecZero.impotNet).toBe(sans.impotNet);
    expect(avecZero.impotSupplementaireQuotientExceptionnel).toBe(0);
    expect(avecZero.revenuExceptionnelQuotient).toBe(0);
  });

  it("atténue la progressivité par rapport à une simple addition au revenu (vérifié à la main)", () => {
    // Célibataire, 1 part, revenu ordinaire 70 000 €, revenu exceptionnel 200 000 € (coefficient 4).
    // ID1 = impôt(70 000) = 14 103,99 € ; ID2 = impôt(70 000 + 200 000/4 = 120 000) = 33 000,52 €.
    // Supplément = (33 000,52 - 14 103,99) × 4 = 75 586,12 € ; impôt brut = 89 690,11 €.
    const result = calculerImpot(70000, makeParts(), 'celibataire', 0, 'metropole', 0, 200000);
    expect(result.impotSupplementaireQuotientExceptionnel).toBeCloseTo(75586.12, 1);
    expect(result.impotApresPlafonnement).toBeCloseTo(89690.11, 1);
    expect(result.impotNet).toBe(89690);

    // Sans le système du quotient (simple addition au revenu), l'impôt serait plus élevé (98 023,84 €).
    const sansQuotient = calculerImpot(270000, makeParts(), 'celibataire');
    expect(result.impotNet).toBeLessThan(sansQuotient.impotNet);
  });

  it('revenuMondialFictif et TMI incluent le revenu exceptionnel', () => {
    const result = calculerImpot(70000, makeParts(), 'celibataire', 0, 'metropole', 0, 200000);
    expect(result.revenuMondialFictif).toBe(270000);
    expect(result.tmi).toBe(0.45);
    expect(result.revenuExceptionnelQuotient).toBe(200000);
  });

  it('la décote reste appliquée sur le total (montant élevé ici : décote nulle)', () => {
    const result = calculerImpot(70000, makeParts(), 'celibataire', 0, 'metropole', 0, 200000);
    expect(result.decote).toBe(0);
  });

  it("s'applique avant l'ajout de l'impôt forfaitaire", () => {
    const sansForfaitaire = calculerImpot(70000, makeParts(), 'celibataire', 0, 'metropole', 0, 200000);
    const avecForfaitaire = calculerImpot(70000, makeParts(), 'celibataire', 0, 'metropole', 3000, 200000);
    expect(avecForfaitaire.impotNet).toBe(sansForfaitaire.impotNet + 3000);
  });
});
