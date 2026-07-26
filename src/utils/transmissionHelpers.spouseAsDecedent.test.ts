/**
 * buildSpouseAsDecedentFamilyGraph — aucun test n'appelait cette fonction
 * directement avant ce fichier (les tests existants du chaînage 2nd décès
 * reconstruisaient un FamilyGraph à la main sans jamais passer par elle).
 * Comblé ici : filtre parent_de, decedentId, hasSurvivingSpouse, et les
 * deux erreurs dédiées (familyProfile.id manquant, statut_couple invalide,
 * SpouseSuccessionNonModelisableError).
 */
import { describe, it, expect } from 'vitest';
import {
  buildSpouseAsDecedentFamilyGraph,
  SpouseSuccessionNonModelisableError
} from './transmissionHelpers';
import { FamilyProfile, MaritalStatus, FamilyLink } from '@/services/familyService';

const familyProfile: FamilyProfile = {
  id: 'user-1',
  nom: 'TEST',
  prenom: 'Titouan',
  date_naissance: '2000-02-07'
};

const maritalStatusMarie: MaritalStatus = {
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

describe('buildSpouseAsDecedentFamilyGraph — cas nominal', () => {
  it("conjoint marié, enfant du conjoint exclusif (parent_de 'spouse') : inclus dans childrenOfDecedent et persons", () => {
    const link = buildChildLink({ id: 'chloe', parent_de: 'spouse' });
    const graph = buildSpouseAsDecedentFamilyGraph(familyProfile, maritalStatusMarie, [link]);

    expect(graph.childrenOfDecedent).toContain('chloe');
    expect(graph.persons.some(p => p.id === 'chloe')).toBe(true);
    expect(graph.links.some(l => l.from === 'conjoint-user-1' && l.to === 'chloe' && l.relation === 'child')).toBe(true);
  });

  it("enfant commun (parent_de 'both_parents') : inclus dans childrenOfDecedent", () => {
    const link = buildChildLink({ id: 'romy', parent_de: 'both_parents' });
    const graph = buildSpouseAsDecedentFamilyGraph(familyProfile, maritalStatusMarie, [link]);

    expect(graph.childrenOfDecedent).toContain('romy');
    expect(graph.persons.some(p => p.id === 'romy')).toBe(true);
  });

  it("enfant exclusif de l'Utilisateur (parent_de 'user') : exclu de childrenOfDecedent, de persons, et sans lien, aux côtés d'un enfant du conjoint retenu", () => {
    const enfantDuConjoint = buildChildLink({ id: 'chloe', parent_de: 'spouse' });
    const enfantDeLUtilisateur = buildChildLink({ id: 'user-only', prenom: 'Romy', parent_de: 'user' });
    const graph = buildSpouseAsDecedentFamilyGraph(familyProfile, maritalStatusMarie, [enfantDuConjoint, enfantDeLUtilisateur]);

    expect(graph.childrenOfDecedent).not.toContain('user-only');
    expect(graph.persons.some(p => p.id === 'user-only')).toBe(false);
    expect(graph.links.some(l => l.to === 'user-only')).toBe(false);
  });

  it('cas mixte réaliste : un enfant du conjoint (spouse) et un enfant exclusif de l\'Utilisateur (user) — seul le premier apparaît chez le conjoint défunt', () => {
    const enfantDuConjoint = buildChildLink({ id: 'chloe', prenom: 'Chloé', parent_de: 'spouse' });
    const enfantDeLUtilisateur = buildChildLink({ id: 'romy', prenom: 'Romy', parent_de: 'user' });
    const graph = buildSpouseAsDecedentFamilyGraph(familyProfile, maritalStatusMarie, [enfantDuConjoint, enfantDeLUtilisateur]);

    expect(graph.childrenOfDecedent).toEqual(['chloe']);
    expect(graph.persons.some(p => p.id === 'chloe')).toBe(true);
    expect(graph.persons.some(p => p.id === 'romy')).toBe(false);
  });

  it("statut_couple 'Pacsé(e)' : accepté au même titre que 'Marié(e)'", () => {
    const pacse: MaritalStatus = { ...maritalStatusMarie, statut_couple: 'Pacsé(e)' };
    const link = buildChildLink({ id: 'chloe', parent_de: 'spouse' });
    const graph = buildSpouseAsDecedentFamilyGraph(familyProfile, pacse, [link]);

    expect(graph.childrenOfDecedent).toContain('chloe');
  });

  it('decedentId vaut `conjoint-${familyProfile.id}` et hasSurvivingSpouse vaut false', () => {
    const link = buildChildLink({ id: 'chloe', parent_de: 'spouse' });
    const graph = buildSpouseAsDecedentFamilyGraph(familyProfile, maritalStatusMarie, [link]);

    expect(graph.decedentId).toBe('conjoint-user-1');
    expect(graph.hasSurvivingSpouse).toBe(false);
  });
});

describe('buildSpouseAsDecedentFamilyGraph — erreurs dédiées', () => {
  it('lève une Error si familyProfile.id est absent', () => {
    const profileSansId = { ...familyProfile, id: undefined as unknown as string };
    const link = buildChildLink({ id: 'chloe', parent_de: 'spouse' });

    expect(() => buildSpouseAsDecedentFamilyGraph(profileSansId, maritalStatusMarie, [link])).toThrow(
      'buildSpouseAsDecedentFamilyGraph requires a familyProfile with an id'
    );
  });

  it('lève une Error si familyProfile est null', () => {
    const link = buildChildLink({ id: 'chloe', parent_de: 'spouse' });

    expect(() => buildSpouseAsDecedentFamilyGraph(null, maritalStatusMarie, [link])).toThrow(
      'buildSpouseAsDecedentFamilyGraph requires a familyProfile with an id'
    );
  });

  it("lève une Error si maritalStatus.statut_couple n'est ni 'Marié(e)' ni 'Pacsé(e)'", () => {
    const celibataire: MaritalStatus = { ...maritalStatusMarie, statut_couple: 'Célibataire' };
    const link = buildChildLink({ id: 'chloe', parent_de: 'spouse' });

    expect(() => buildSpouseAsDecedentFamilyGraph(familyProfile, celibataire, [link])).toThrow(
      'buildSpouseAsDecedentFamilyGraph requires an existing spouse (statut_couple Marié(e)/Pacsé(e))'
    );
  });

  it('lève une Error si maritalStatus est null', () => {
    const link = buildChildLink({ id: 'chloe', parent_de: 'spouse' });

    expect(() => buildSpouseAsDecedentFamilyGraph(familyProfile, null, [link])).toThrow(
      'buildSpouseAsDecedentFamilyGraph requires an existing spouse (statut_couple Marié(e)/Pacsé(e))'
    );
  });

  it("lève SpouseSuccessionNonModelisableError si le conjoint n'a aucun enfant renseigné", () => {
    expect(() => buildSpouseAsDecedentFamilyGraph(familyProfile, maritalStatusMarie, [])).toThrow(
      SpouseSuccessionNonModelisableError
    );
  });

  it("SpouseSuccessionNonModelisableError : les enfants exclusifs de l'Utilisateur ne comptent pas comme enfants du conjoint", () => {
    const enfantDeLUtilisateur = buildChildLink({ id: 'romy', parent_de: 'user' });

    expect(() => buildSpouseAsDecedentFamilyGraph(familyProfile, maritalStatusMarie, [enfantDeLUtilisateur])).toThrow(
      SpouseSuccessionNonModelisableError
    );
  });
});
