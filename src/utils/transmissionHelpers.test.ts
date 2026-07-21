/**
 * buildFamilyGraph — couverture du filtre sur `parent_de` (enfant exclusif du
 * conjoint vs enfant de l'Utilisateur), corrigé dans cette fonction pour ne
 * plus diverger de son miroir `buildSpouseAsDecedentFamilyGraph`. Aucun test
 * n'appelait cette fonction avant ce fichier — comblé ici.
 */
import { describe, it, expect } from 'vitest';
import { buildFamilyGraph } from './transmissionHelpers';
import { FamilyProfile, MaritalStatus, FamilyLink } from '@/services/familyService';

const familyProfile: FamilyProfile = {
  id: 'defunt-1',
  nom: 'TEST',
  prenom: 'Titouan',
  date_naissance: '2000-02-07'
};

const maritalStatus: MaritalStatus = {
  statut_couple: 'Marié(e)',
  nom_conjoint: 'TEST',
  prenom_conjoint: 'Julie',
  date_naissance_conjoint: '2000-09-25',
  regime_matrimonial: 'communauté légale'
};

function buildChildLink(overrides: Partial<FamilyLink>): FamilyLink {
  return {
    id: 'enfant-1',
    lien_familial: 'Enfant',
    nom: 'TEST',
    prenom: 'Romy',
    date_naissance: '2025-02-20',
    ...overrides
  };
}

describe('buildFamilyGraph — filtre parent_de sur les enfants directs', () => {
  it("parent_de === 'user' : enfant inclus dans childrenOfDecedent et persons", () => {
    const link = buildChildLink({ parent_de: 'user' });
    const graph = buildFamilyGraph(familyProfile, maritalStatus, [link]);

    expect(graph.childrenOfDecedent).toContain('enfant-1');
    expect(graph.persons.some(p => p.id === 'enfant-1')).toBe(true);
    expect(graph.links.some(l => l.from === 'defunt-1' && l.to === 'enfant-1' && l.relation === 'child')).toBe(true);
    expect(graph.childrenCommonWithSpouse).not.toContain('enfant-1');
  });

  it("parent_de === 'both_parents' : enfant inclus dans childrenOfDecedent et childrenCommonWithSpouse", () => {
    const link = buildChildLink({ parent_de: 'both_parents' });
    const graph = buildFamilyGraph(familyProfile, maritalStatus, [link]);

    expect(graph.childrenOfDecedent).toContain('enfant-1');
    expect(graph.childrenCommonWithSpouse).toContain('enfant-1');
    expect(graph.persons.some(p => p.id === 'enfant-1')).toBe(true);
  });

  it("parent_de === 'spouse' : enfant exclu de childrenOfDecedent, de persons, et sans lien vers le défunt (cas du bug corrigé)", () => {
    const link = buildChildLink({ parent_de: 'spouse' });
    const graph = buildFamilyGraph(familyProfile, maritalStatus, [link]);

    expect(graph.childrenOfDecedent).not.toContain('enfant-1');
    expect(graph.persons.some(p => p.id === 'enfant-1')).toBe(false);
    expect(graph.links.some(l => l.to === 'enfant-1')).toBe(false);
    expect(graph.childrenCommonWithSpouse).not.toContain('enfant-1');
  });

  it('parent_de null (jamais renseigné) : enfant inclus — comportement historique préservé', () => {
    const link = buildChildLink({ parent_de: null as unknown as undefined });
    const graph = buildFamilyGraph(familyProfile, maritalStatus, [link]);

    expect(graph.childrenOfDecedent).toContain('enfant-1');
    expect(graph.persons.some(p => p.id === 'enfant-1')).toBe(true);
  });

  it('parent_de absent (champ jamais écrit sur la ligne) : enfant inclus — comportement historique préservé', () => {
    const { parent_de, ...linkWithoutParentDe } = buildChildLink({ parent_de: 'user' });
    const graph = buildFamilyGraph(familyProfile, maritalStatus, [linkWithoutParentDe as FamilyLink]);

    expect(graph.childrenOfDecedent).toContain('enfant-1');
    expect(graph.persons.some(p => p.id === 'enfant-1')).toBe(true);
  });

  it('cas mixte réaliste : un enfant commun (both_parents) et un enfant du conjoint seul (spouse) dans le même foyer — seul l\'enfant commun apparaît chez le défunt', () => {
    const enfantCommun = buildChildLink({ id: 'romy', prenom: 'Romy', parent_de: 'both_parents' });
    const enfantDuConjoint = buildChildLink({ id: 'chloe', prenom: 'Chloé', nom: 'PREVIOUS', parent_de: 'spouse' });
    const graph = buildFamilyGraph(familyProfile, maritalStatus, [enfantCommun, enfantDuConjoint]);

    expect(graph.childrenOfDecedent).toEqual(['romy']);
    expect(graph.childrenCommonWithSpouse).toEqual(['romy']);
    expect(graph.persons.some(p => p.id === 'romy')).toBe(true);
    expect(graph.persons.some(p => p.id === 'chloe')).toBe(false);
    expect(graph.links.some(l => l.to === 'chloe')).toBe(false);
  });
});
