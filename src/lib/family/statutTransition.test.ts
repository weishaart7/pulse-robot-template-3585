import { describe, it, expect } from 'vitest';
import { isCoupleStatus, leavesCouple, childrenLinkedToSpouse } from './statutTransition';
import type { FamilyLink } from '@/services/familyService';

describe('isCoupleStatus', () => {
  it('true pour Concubinage, Pacsé(e), Marié(e)', () => {
    expect(isCoupleStatus('Concubinage')).toBe(true);
    expect(isCoupleStatus('Pacsé(e)')).toBe(true);
    expect(isCoupleStatus('Marié(e)')).toBe(true);
  });

  it('false pour les autres statuts et les valeurs vides', () => {
    expect(isCoupleStatus('Célibataire')).toBe(false);
    expect(isCoupleStatus('Divorcé(e)')).toBe(false);
    expect(isCoupleStatus('Veuf/Veuve')).toBe(false);
    expect(isCoupleStatus(null)).toBe(false);
    expect(isCoupleStatus(undefined)).toBe(false);
  });
});

describe('leavesCouple', () => {
  it('true quand on quitte un statut en couple', () => {
    expect(leavesCouple('Marié(e)', 'Divorcé(e)')).toBe(true);
    expect(leavesCouple('Pacsé(e)', 'Célibataire')).toBe(true);
    expect(leavesCouple('Marié(e)', 'Veuf/Veuve')).toBe(true);
  });

  it('false entre deux statuts en couple ou en entrant en couple', () => {
    expect(leavesCouple('Pacsé(e)', 'Marié(e)')).toBe(false);
    expect(leavesCouple('Célibataire', 'Marié(e)')).toBe(false);
    expect(leavesCouple('Célibataire', 'Divorcé(e)')).toBe(false);
  });
});

describe('childrenLinkedToSpouse', () => {
  const link = (lien_familial: string, parent_de: string | null): FamilyLink =>
    ({ id: `${lien_familial}-${parent_de}`, nom: 'X', lien_familial, parent_de } as FamilyLink);

  it('ne retient que les enfants rattachés au conjoint ou aux deux parents', () => {
    const result = childrenLinkedToSpouse([
      link('Enfant', 'spouse'),
      link('Enfant', 'both_parents'),
      link('Enfant', 'user'),
      link('Enfant', null),
      link('Parent', 'spouse'),
    ]);
    expect(result.map(l => l.parent_de)).toEqual(['spouse', 'both_parents']);
  });
});
