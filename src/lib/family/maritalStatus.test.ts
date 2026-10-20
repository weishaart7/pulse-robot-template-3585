import { describe, it, expect } from 'vitest';
import { hasConjoint, isSingleStatus, buildStatutCoupleWrite, CHAMPS_MARIAGE, CHAMPS_PACS } from './maritalStatus';

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
  it('Marié(e) : efface les champs du PACS, garde ceux du mariage', () => {
    expect(buildStatutCoupleWrite('Marié(e)')).toEqual({ ...CHAMPS_PACS, statut_couple: 'Marié(e)' });
  });

  it('Pacsé(e) : efface régime, mariage, DDV, séparation de corps, option du conjoint et clauses', () => {
    const w = buildStatutCoupleWrite('Pacsé(e)');
    expect(w).toEqual({ ...CHAMPS_MARIAGE, statut_couple: 'Pacsé(e)' });
    expect(w).not.toHaveProperty('convention_pacs');
    expect(w.clauses_contrat).toBeNull();
    expect(w.donation_dernier_vivant_personne).toBe(false);
  });

  it.each(['Concubinage', 'Célibataire'])('%s : efface mariage et PACS', (statut) => {
    expect(buildStatutCoupleWrite(statut)).toEqual({ ...CHAMPS_MARIAGE, ...CHAMPS_PACS, statut_couple: statut });
  });

  it.each(['Divorcé(e)', 'Veuf/Veuve'])('%s : conserve le régime de l\'union dissoute, efface le PACS', (statut) => {
    expect(buildStatutCoupleWrite(statut)).toEqual({ ...CHAMPS_PACS, statut_couple: statut });
  });

  it("statut null : n'efface rien (formulaire enregistré avant chargement)", () => {
    expect(buildStatutCoupleWrite(null)).toEqual({ statut_couple: null });
  });

  it("n'efface jamais l'identité du partenaire ni ses antécédents matrimoniaux", () => {
    const w = buildStatutCoupleWrite('Célibataire');
    expect(w).not.toHaveProperty('prenom_conjoint');
    expect(w).not.toHaveProperty('mariage_precedent_conjoint');
  });

  it('la saisie du formulaire partenaire (extra) l\'emporte sur l\'effacement', () => {
    const extra = { nom_conjoint: 'Dupont', prenom_conjoint: 'Marie', date_pacs: '2020-01-01' };
    expect(buildStatutCoupleWrite('Marié(e)', extra)).toMatchObject({
      statut_couple: 'Marié(e)', nom_conjoint: 'Dupont', prenom_conjoint: 'Marie', date_pacs: '2020-01-01',
    });
  });

  it('le statut passé écrase toujours toute valeur statut_couple présente dans extra', () => {
    const extra = { statut_couple: 'Marié(e)' as string | null };
    expect(buildStatutCoupleWrite('Célibataire', extra).statut_couple).toBe('Célibataire');
  });
});

describe('hasConjoint', () => {
  it('exige un statut en couple et un prénom de conjoint', () => {
    expect(hasConjoint({ statut_couple: 'Marié(e)', prenom_conjoint: 'B' })).toBe(true);
    expect(hasConjoint({ statut_couple: 'Pacsé(e)', prenom_conjoint: 'B' })).toBe(true);
    expect(hasConjoint({ statut_couple: 'Marié(e)', prenom_conjoint: null })).toBe(false);
    expect(hasConjoint({ statut_couple: 'Célibataire', prenom_conjoint: 'B' })).toBe(false);
    expect(hasConjoint(null)).toBe(false);
  });
});
