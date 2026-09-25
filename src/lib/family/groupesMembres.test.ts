import { describe, expect, it } from 'vitest';
import { grouperMembres } from './groupesMembres';
import type { FamilyLink } from '@/services/familyService';

const m = (id: string, lien_familial: string, date_naissance?: string) =>
  ({ id, nom: id, lien_familial, date_naissance }) as FamilyLink;

describe('grouperMembres', () => {
  it('regroupe par branche, omet les groupes vides et trie proche → éloigné puis par âge', () => {
    const groupes = grouperMembres([
      m('pe', 'Petit-enfant', '2015-01-01'),
      m('e2', 'Enfant', '1995-01-01'),
      m('e1', 'Enfant', '1990-01-01'),
      m('p', 'Parent', '1940-01-01'),
    ]);
    expect(groupes.map(g => g.id)).toEqual(['descendants', 'ascendants']);
    expect(groupes[0].membres.map(x => x.id)).toEqual(['e1', 'e2', 'pe']);
  });

  it('place les liens inconnus dans « Autres »', () => {
    const groupes = grouperMembres([m('x', 'Filleul')]);
    expect(groupes).toEqual([{ id: 'autres', label: 'Autres', membres: [expect.objectContaining({ id: 'x' })] }]);
  });
});
