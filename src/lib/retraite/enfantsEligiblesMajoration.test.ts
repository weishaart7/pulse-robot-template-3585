import { describe, it, expect } from 'vitest';
import { nombreEnfantsEligiblesMajorationTroisEnfants } from './enfantsEligiblesMajoration';
import { FamilyLink } from '@/services/familyService';

const enfant = (overrides: Partial<FamilyLink> = {}): FamilyLink => ({
  lien_familial: 'Enfant',
  nom: 'Test',
  ...overrides,
});

describe('nombreEnfantsEligiblesMajorationTroisEnfants — cas courant uniquement (référentiel §3.8)', () => {
  it('compte les enfants en filiation directe (enfant_adopte non renseigné ou "Non")', () => {
    const liens = [enfant(), enfant({ enfant_adopte: 'Non' }), enfant({ enfant_adopte: undefined })];
    expect(nombreEnfantsEligiblesMajorationTroisEnfants(liens)).toBe(3);
  });

  it('compte les enfants adoptés plénièrement', () => {
    const liens = [enfant({ enfant_adopte: 'Adoption plénière' })];
    expect(nombreEnfantsEligiblesMajorationTroisEnfants(liens)).toBe(1);
  });

  it("exclut l'adoption simple — branche « recueilli sans filiation », pas le cas courant", () => {
    const liens = [
      enfant({ enfant_adopte: 'Non' }),
      enfant({ enfant_adopte: 'Adoption plénière' }),
      enfant({ enfant_adopte: 'Adoption simple' }),
    ];
    expect(nombreEnfantsEligiblesMajorationTroisEnfants(liens)).toBe(2);
  });

  it('ignore les liens familiaux qui ne sont pas des enfants directs', () => {
    const liens = [
      enfant(),
      { lien_familial: 'Petit-enfant', nom: 'Test' } as FamilyLink,
      { lien_familial: 'Parent', nom: 'Test' } as FamilyLink,
    ];
    expect(nombreEnfantsEligiblesMajorationTroisEnfants(liens)).toBe(1);
  });

  it('liste vide → 0', () => {
    expect(nombreEnfantsEligiblesMajorationTroisEnfants([])).toBe(0);
  });
});
