import { describe, it, expect } from 'vitest';
import { sanitizeMemberForLink } from './familyLinkRules';

const base = {
  lien_familial: 'Enfant',
  est_decede: false,
  enfant_de: 'user',
  branche_familiale: 'Branche paternelle',
  enfant_adopte: 'Adoption simple',
  adoption_simple_abattement_plein: true,
  adoption_simple_motif: 'enfant_du_conjoint',
  enfant_renoncant: true,
  enfant_renoncant_de: 'user',
  enfant_a_charge: true,
  fiscalement_a_charge: true,
  exoneration_succession: true,
};

describe('sanitizeMemberForLink', () => {
  it('Enfant : garde les champs enfant et adoption, retire branche et exonération', () => {
    const out = sanitizeMemberForLink(base);
    expect(out.enfant_de).toBe('user');
    expect(out.enfant_renoncant).toBe(true);
    expect(out.enfant_renoncant_de).toBe('user');
    expect(out.enfant_a_charge).toBe(true);
    expect(out.adoption_simple_motif).toBe('enfant_du_conjoint');
    expect(out.branche_familiale).toBeNull();
    expect(out.exoneration_succession).toBe(false);
  });

  it('lien changé d\'Enfant à Parent : les champs propres à l\'enfant sont retirés', () => {
    const out = sanitizeMemberForLink({ ...base, lien_familial: 'Parent' });
    expect(out.enfant_renoncant).toBe(false);
    expect(out.enfant_renoncant_de).toBeNull();
    expect(out.enfant_a_charge).toBe(false);
    expect(out.fiscalement_a_charge).toBe(false);
    expect(out.enfant_adopte).toBe('Non');
    expect(out.adoption_simple_abattement_plein).toBe(false);
    expect(out.adoption_simple_motif).toBeNull();
    expect(out.enfant_de).toBe('user');
  });

  it('Frère/Sœur : garde l\'exonération', () => {
    expect(sanitizeMemberForLink({ ...base, lien_familial: 'Frère/Sœur' }).exoneration_succession).toBe(true);
  });

  it('Grand-parent : garde la branche', () => {
    expect(sanitizeMemberForLink({ ...base, lien_familial: 'Grand-parent' }).branche_familiale).toBe('Branche paternelle');
  });

  it('Tierce personne : pas de rattachement', () => {
    expect(sanitizeMemberForLink({ ...base, lien_familial: 'Tierce personne' }).enfant_de).toBeNull();
  });

  it('adoption plénière : l\'exception d\'abattement de l\'adoption simple est retirée', () => {
    const out = sanitizeMemberForLink({ ...base, enfant_adopte: 'Adoption plénière' });
    expect(out.adoption_simple_abattement_plein).toBe(false);
    expect(out.adoption_simple_motif).toBeNull();
  });

  it('non renonçant : pas de « renonce à la succession de »', () => {
    expect(sanitizeMemberForLink({ ...base, enfant_renoncant: false }).enfant_renoncant_de).toBeNull();
  });

  it('non décédé : pas de date de décès', () => {
    expect(sanitizeMemberForLink({ ...base, date_deces: new Date(2020, 0, 1) }).date_deces).toBeUndefined();
  });
});
