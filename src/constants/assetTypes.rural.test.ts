import { describe, it, expect } from 'vitest';
import { getFractionEligibleRurale } from './assetTypes';

const GF = 'Parts de groupements fonciers';

describe('getFractionEligibleRurale', () => {
  it('GFI : part forestière saisie, 90 % par défaut', () => {
    expect(getFractionEligibleRurale({ nature: GF, type_groupement: 'GFI', fraction_eligible_rural: 80 })).toBe(0.8);
    expect(getFractionEligibleRurale({ nature: GF, type_groupement: 'GFI' })).toBe(0.9);
  });
  it('autres groupements : toute la valeur', () => {
    expect(getFractionEligibleRurale({ nature: GF, type_groupement: 'GFF', fraction_eligible_rural: 50 })).toBe(1);
  });
  it("société d'épargne forestière : fraction saisie, 0 sinon", () => {
    expect(getFractionEligibleRurale({ nature: "Parts de sociétés d'épargne forestière", fraction_eligible_rural: 60 })).toBe(0.6);
    expect(getFractionEligibleRurale({ nature: "Parts de sociétés d'épargne forestière" })).toBe(0);
  });
});
