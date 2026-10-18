import { describe, it, expect } from 'vitest';
import { societeToFormData, formDataToSociete } from './formMapping';
import type { Societe } from '@/services/societeService';

const societe = (overrides: Partial<Societe> = {}): Societe => ({
  id: 's1',
  user_id: 'u1',
  denomination: 'Société test',
  type_societe: 'sarl',
  ...overrides,
});

describe('formMapping — quotités de détention', () => {
  it('conserve une quote-part utilisateur de 0 % (société détenue par le seul conjoint)', () => {
    const form = societeToFormData(societe({ pourcentage_utilisateur: 0, pourcentage_conjoint: 100 }));
    expect(form.pourcentageUtilisateur).toBe(0);
    expect(form.pourcentageConjoint).toBe(100);

    const row = formDataToSociete(form);
    expect(row.pourcentage_utilisateur).toBe(0);
    expect(row.pourcentage_conjoint).toBe(100);
  });

  it('retombe sur 100 % / 0 % seulement quand les quotités n\'ont jamais été saisies', () => {
    const form = societeToFormData(societe());
    expect(form.pourcentageUtilisateur).toBe(100);
    expect(form.pourcentageConjoint).toBe(0);
  });
});
