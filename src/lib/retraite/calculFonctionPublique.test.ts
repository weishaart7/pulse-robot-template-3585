import { describe, it, expect } from 'vitest';
import {
  pensionBaseFonctionPublique,
  minimumGaranti,
  pensionFonctionPubliqueFinale,
  majorationEnfantsFonctionPublique,
  pensionFonctionPubliqueAvecMajorationEnfants,
} from './calculFonctionPublique';

describe('majorationEnfantsFonctionPublique — dégressif 10 % + 5 %/enfant (référentiel §7.6)', () => {
  it.each([
    [0, 0],
    [2, 0],
    [3, 10], // 10 % pile pour 3 enfants
    [4, 15], // +5 % pour le 4e enfant — cas explicitement demandé par la mission
    [5, 20],
    [6, 25],
  ] as const)('%i enfant(s) éligible(s) → majoration=%i%%', (nombreEnfants, majorationAttendue) => {
    expect(majorationEnfantsFonctionPublique(nombreEnfants)).toBe(majorationAttendue);
  });

  it("diffère de majorationTroisEnfants() (taux flat) : la fonction publique n'a pas un taux unique à 10 %", () => {
    // 4 enfants → 15 % ici, contre 10 % flat pour le régime général
    // (majorationTroisEnfants(4) === 10, testé dans calcul.test.ts).
    expect(majorationEnfantsFonctionPublique(4)).not.toBe(10);
    expect(majorationEnfantsFonctionPublique(4)).toBe(15);
  });
});

describe('Ordre d’application fonction publique, majoration enfants incluse : base → décote/surcote → minimum garanti → majoration (référentiel §7.2, §7.6)', () => {
  // Traitement modeste et carrière incomplète : pension calculée sous le
  // plancher du minimum garanti, pour vérifier que la majoration est bien
  // assise sur la pension PORTÉE AU MINIMUM GARANTI, pas sur la pension
  // calculée brute (même logique que le MICO du régime général).
  const traitementAnnuel = 20000;
  const trimestresRequis = 172;
  const trimestresLiquidables = 140;
  const tauxProrata = Math.min(trimestresLiquidables / trimestresRequis, 1);
  const decote = 0; // isolé pour ce scénario, non testé ici

  const pensionCalculee = pensionBaseFonctionPublique(traitementAnnuel, tauxProrata, decote);
  const mg = minimumGaranti(trimestresLiquidables, trimestresRequis);
  const pensionApresMinimumGaranti = pensionFonctionPubliqueFinale(pensionCalculee, mg);
  const majorationPct = majorationEnfantsFonctionPublique(3); // 10 %

  it('préconditions du scénario : la pension calculée est sous le plancher du minimum garanti', () => {
    expect(pensionCalculee).toBeLessThan(mg);
    expect(pensionApresMinimumGaranti).toBe(mg);
  });

  it('ordre CORRECT : la majoration est assise sur la pension portée au minimum garanti, sans dépasser le dernier traitement', () => {
    const pensionFinale = pensionFonctionPubliqueAvecMajorationEnfants(
      pensionApresMinimumGaranti,
      majorationPct,
      traitementAnnuel
    );
    const attendueAvantPlafond = mg * 1.1;
    expect(attendueAvantPlafond).toBeLessThan(traitementAnnuel); // le plafond ne joue pas dans ce scénario
    expect(pensionFinale).toBeCloseTo(attendueAvantPlafond, 6);
  });

  it('ordre INCORRECT (régression à ne jamais réintroduire) : majoration assise sur la pension calculée brute, avant minimum garanti', () => {
    const pensionIncorrecte = Math.max(pensionCalculee * (1 + majorationPct / 100), mg);
    const pensionCorrecte = pensionFonctionPubliqueAvecMajorationEnfants(
      pensionApresMinimumGaranti,
      majorationPct,
      traitementAnnuel
    );
    expect(pensionIncorrecte).not.toBeCloseTo(pensionCorrecte, 6);
    expect(pensionIncorrecte).toBeLessThan(pensionCorrecte);
  });
});

describe('Plafonnement au dernier traitement (référentiel §7.6 : « le total pension + majoration ne peut excéder le dernier traitement »)', () => {
  it('la majoration est écrêtée dès que pension + majoration dépasse le dernier traitement', () => {
    const pensionPorteeAuMinimumGaranti = 19000;
    const dernierTraitementAnnuel = 20000;
    const majorationPct = majorationEnfantsFonctionPublique(6); // 25 %, 19 000 × 1,25 = 23 750 > 20 000

    const pensionFinale = pensionFonctionPubliqueAvecMajorationEnfants(
      pensionPorteeAuMinimumGaranti,
      majorationPct,
      dernierTraitementAnnuel
    );

    expect(pensionFinale).toBe(dernierTraitementAnnuel);
  });

  it('sans dépassement, la majoration s’applique intégralement (pas de plafond artificiel en dessous du dernier traitement)', () => {
    const pensionPorteeAuMinimumGaranti = 10000;
    const dernierTraitementAnnuel = 20000;
    const majorationPct = majorationEnfantsFonctionPublique(3); // 10 %, 10 000 × 1,10 = 11 000 < 20 000

    const pensionFinale = pensionFonctionPubliqueAvecMajorationEnfants(
      pensionPorteeAuMinimumGaranti,
      majorationPct,
      dernierTraitementAnnuel
    );

    expect(pensionFinale).toBeCloseTo(11000, 6);
  });
});
