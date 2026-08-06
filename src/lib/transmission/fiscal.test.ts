import { describe, it, expect } from 'vitest';
import { computeNotaryFees } from './fiscal';

describe('computeNotaryFees — écrêtement des émoluments immobiliers (§20.5 L2013-2018, C. com. art. A.444-175)', () => {
  it('L1881 — appartement 500 000€ : l\'écrêtement ne se déclenche pas (émolument 2 832€ HT, très inférieur au plafond de 10% = 50 000€ et au-dessus du plancher de 90€)', () => {
    const result = computeNotaryFees(500000, 500000);
    expect(result.emolumentsAttestationHT).toBe(2832);
  });

  // Le plafond de 10% ne peut mathématiquement jamais se déclencher avec le
  // barème actuel (taux marginal maximal 1,935%, très inférieur à 10% — le
  // ratio émolument/valeur ne fait que décroître avec la valeur, dégressif
  // par tranches). Seul le plancher de 90€ est réellement atteignable, pour
  // un bien de faible valeur : c'est le cas testé ci-dessous, à défaut d'un
  // cas réel où le plafond se déclenche (constat documenté dans le commit).
  it('bien immobilier de faible valeur (2 000€) : le plancher de 90€ s\'applique (barème dégressif seul aurait donné 39€)', () => {
    const result = computeNotaryFees(2000, 2000);
    expect(result.emolumentsAttestationHT).toBe(90);
  });
});
