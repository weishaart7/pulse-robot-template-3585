import { describe, it, expect } from 'vitest';
import { isSingleStatus, buildStatutCoupleWrite } from './maritalStatus';

describe('isSingleStatus', () => {
  it('true uniquement pour "Célibataire"', () => {
    expect(isSingleStatus('Célibataire')).toBe(true);
  });

  it('false pour les statuts en couple', () => {
    expect(isSingleStatus('Concubinage')).toBe(false);
    expect(isSingleStatus('Pacsé(e)')).toBe(false);
    expect(isSingleStatus('Marié(e)')).toBe(false);
  });

  it('false pour undefined/null (statut non renseigné, pas encore hydraté)', () => {
    expect(isSingleStatus(undefined)).toBe(false);
    expect(isSingleStatus(null)).toBe(false);
  });
});

describe('buildStatutCoupleWrite', () => {
  it('écrit le statut choisi, sans champs additionnels (FicheClientForm)', () => {
    expect(buildStatutCoupleWrite('Marié(e)')).toEqual({ statut_couple: 'Marié(e)' });
  });

  it('efface le statut avec null au lieu de l\'omettre (décochage FamilleSection)', () => {
    expect(buildStatutCoupleWrite(null)).toEqual({ statut_couple: null });
  });

  it('fusionne les champs additionnels sans les écraser (parent_isole, FamilleSection)', () => {
    expect(buildStatutCoupleWrite('Célibataire', { parent_isole: false })).toEqual({
      statut_couple: 'Célibataire',
      parent_isole: false,
    });
  });

  it('conserve le payload conjoint complet à côté du statut (PartnerForm)', () => {
    const extra = { nom_conjoint: 'Dupont', prenom_conjoint: 'Marie' };
    expect(buildStatutCoupleWrite('Pacsé(e)', extra)).toEqual({
      statut_couple: 'Pacsé(e)',
      nom_conjoint: 'Dupont',
      prenom_conjoint: 'Marie',
    });
  });

  it('le statut passé écrase toujours toute valeur statut_couple présente dans extra', () => {
    const extra = { statut_couple: 'Marié(e)' as string | null };
    expect(buildStatutCoupleWrite('Célibataire', extra)).toEqual({ statut_couple: 'Célibataire' });
  });
});
