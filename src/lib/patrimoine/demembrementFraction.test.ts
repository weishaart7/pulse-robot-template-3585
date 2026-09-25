import { describe, it, expect } from 'vitest';
import { getFractionDemembrement, DemembrementFractionContext } from './demembrementFraction';

const REF = new Date('2026-01-01');
const ctx: DemembrementFractionContext = {
  familyProfile: { date_naissance: '1980-06-01' }, // 45 ans → 60 % / 40 %
  maritalStatus: { date_naissance_conjoint: '1990-06-01' }, // 35 ans → 70 % / 30 %
  familyLinks: [{ id: 'parent-1', date_naissance: '1950-06-01' }], // 75 ans → 30 % / 70 %
};
const contrepartie = [{ type_partie: 'famille' as const, family_link_id: 'parent-1' }];

describe('getFractionDemembrement — détention en indivision', () => {
  it('usufruit en indivision : âge du client (quote-part du foyer)', () => {
    expect(getFractionDemembrement({ mode_detention: 'Usufruit', detenteur: 'Indivision' }, [], ctx, REF)).toBe(0.6);
  });

  it("usufruit en indivision : n'utilise jamais l'âge du conjoint", () => {
    const sansClient = { ...ctx, familyProfile: { date_naissance: null } };
    expect(getFractionDemembrement({ mode_detention: 'Usufruit', detenteur: 'Indivision' }, [], sansClient, REF)).toBeNull();
  });

  it('nue-propriété en indivision : âge de la contrepartie usufruitière', () => {
    expect(getFractionDemembrement({ mode_detention: 'Nue-propriété', detenteur: 'Indivision' }, contrepartie, ctx, REF)).toBe(0.7);
  });
});
