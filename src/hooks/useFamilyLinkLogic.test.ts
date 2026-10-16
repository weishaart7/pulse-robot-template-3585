// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFamilyLinkLogic } from './useFamilyLinkLogic';
import { FamilyLink, FamilyProfile, MaritalStatus } from '@/services/familyService';

const profile: FamilyProfile = { id: 'p1', prenom: 'Jean', nom: 'Martin' };
const marital: MaritalStatus = { statut_couple: 'Marié(e)', prenom_conjoint: 'Anne', nom_conjoint: 'Martin' };
const links: FamilyLink[] = [
  { id: 'par1', lien_familial: 'Parent', nom: 'Martin', prenom: 'Paul', enfant_de: 'user' },
  { id: 'fs1', lien_familial: 'Frère/Sœur', nom: 'Martin', prenom: 'Luc', enfant_de: 'user' },
];

const optionsPour = (lien: string) => {
  const { result } = renderHook(() => useFamilyLinkLogic(links, profile, marital));
  return result.current.getParentOptions(lien).map(o => o.value);
};

describe('useFamilyLinkLogic.getParentOptions', () => {
  it('Neveu/Nièce : rattaché à un frère ou une sœur, jamais au client ni au conjoint', () => {
    expect(optionsPour('Neveu/Nièce')).toEqual(['fs1']);
  });

  it('Grand-parent : rattaché à un parent, jamais au client ni au conjoint', () => {
    expect(optionsPour('Grand-parent')).toEqual(['par1']);
  });

  it('Enfant : client, conjoint ou les deux', () => {
    expect(optionsPour('Enfant')).toEqual(['user', 'spouse', 'both_parents']);
  });

  it('Parent : client ou conjoint', () => {
    expect(optionsPour('Parent')).toEqual(['user', 'spouse']);
  });
});
