/**
 * buildFamilyGraph — couverture du filtre sur `parent_de` (enfant exclusif du
 * conjoint vs enfant de l'Utilisateur), corrigé dans cette fonction pour ne
 * plus diverger de son miroir `buildSpouseAsDecedentFamilyGraph`. Aucun test
 * n'appelait cette fonction avant ce fichier — comblé ici.
 */
import { describe, it, expect } from 'vitest';
import { buildFamilyGraph, buildSpouseAsDecedentFamilyGraph } from './transmissionHelpers';
import { FamilyProfile, MaritalStatus, FamilyLink } from '@/services/familyService';
import { calculateSuccessionLegale } from '@/lib/transmission/successionLegale';

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

/**
 * Bug d'audit statique : le <Select> "Renonce à la succession de"
 * (useFamilyLinkLogic.ts::getParentsForRenunciation) écrit 'user' / 'spouse'
 * / 'both' dans enfant_renoncant_de, jamais un id réel. Avant correctif,
 * buildFamilyGraph/buildSpouseAsDecedentFamilyGraph recopiaient cette valeur
 * telle quelle dans Person.renoncantDe, alors que successionLegale.ts
 * compare `child.renoncantDe === graph.decedentId` (un id 'defunt-1' ou
 * 'conjoint-defunt-1') — la comparaison ne matchait donc jamais, et un
 * enfant renonçant était traité comme héritier acceptant. Les tests
 * ci-dessous partent des valeurs brutes du flux UI réel (pas d'un
 * renoncantDe déjà sous forme d'id, qui masquait le bug jusqu'ici).
 */
describe('buildFamilyGraph — renoncantDe traduit depuis enfant_renoncant_de (bug renonciation)', () => {
  it("enfant_renoncant_de: 'user' → renoncantDe résolu à l'id du défunt (l'Utilisateur)", () => {
    const link = buildChildLink({ enfant_renoncant: true, enfant_renoncant_de: 'user' });
    const graph = buildFamilyGraph(familyProfile, maritalStatus, [link]);

    const child = graph.persons.find(p => p.id === 'enfant-1');
    expect(child?.renoncantDe).toBe('defunt-1');
    expect(child?.renoncantDe).toBe(graph.decedentId);
  });

  it("enfant_renoncant_de: 'spouse' → renoncantDe résolu à l'id du conjoint, PAS à celui de l'Utilisateur", () => {
    const link = buildChildLink({ enfant_renoncant: true, enfant_renoncant_de: 'spouse' });
    const graph = buildFamilyGraph(familyProfile, maritalStatus, [link]);

    const child = graph.persons.find(p => p.id === 'enfant-1');
    expect(child?.renoncantDe).toBe('conjoint-defunt-1');
    expect(child?.renoncantDe).not.toBe(graph.decedentId);
  });

  it("enfant_renoncant_de: 'both' → renoncantDe résolu à l'id du défunt courant (matche aussi bien côté Utilisateur que côté conjoint)", () => {
    const link = buildChildLink({ enfant_renoncant: true, enfant_renoncant_de: 'both' });
    const graph = buildFamilyGraph(familyProfile, maritalStatus, [link]);

    const child = graph.persons.find(p => p.id === 'enfant-1');
    expect(child?.renoncantDe).toBe(graph.decedentId);
  });

  it('enfant_renoncant_de absent : renoncantDe reste undefined', () => {
    const link = buildChildLink({ enfant_renoncant: false });
    const graph = buildFamilyGraph(familyProfile, maritalStatus, [link]);

    const child = graph.persons.find(p => p.id === 'enfant-1');
    expect(child?.renoncantDe).toBeUndefined();
  });

  it("régression bout-en-bout : un enfant unique renonçant (flux UI réel, enfant_renoncant_de: 'user'), sans parent survivant renseigné → le conjoint hérite de 100%, l'enfant renonçant n'apparaît pas dans les héritiers", () => {
    const link = buildChildLink({
      enfant_renoncant: true,
      enfant_renoncant_de: 'user',
      parent_de: 'both_parents'
    });
    const graph = buildFamilyGraph(familyProfile, maritalStatus, [link]);

    const result = calculateSuccessionLegale(graph);

    expect(result.nbSouchesEnfants).toBe(0);
    expect(result.heritiers).toHaveLength(1);
    expect(result.heritiers[0].lien).toBe('conjoint');
    expect(result.heritiers[0].quotePart).toBe(1);
    expect(result.heritiers.every(h => h.personId !== 'enfant-1')).toBe(true);
  });
});

describe('buildSpouseAsDecedentFamilyGraph — renoncantDe traduit depuis enfant_renoncant_de (miroir du bug renonciation)', () => {
  it("enfant_renoncant_de: 'spouse' → renoncantDe résolu à l'id du conjoint (défunt de ce graphe)", () => {
    const link = buildChildLink({ enfant_renoncant: true, enfant_renoncant_de: 'spouse', parent_de: 'both_parents' });
    const graph = buildSpouseAsDecedentFamilyGraph(familyProfile, maritalStatus, [link]);

    const child = graph.persons.find(p => p.id === 'enfant-1');
    expect(child?.renoncantDe).toBe('conjoint-defunt-1');
    expect(child?.renoncantDe).toBe(graph.decedentId);
  });

  it("enfant_renoncant_de: 'user' → renoncantDe résolu à l'id de l'Utilisateur, PAS à celui du conjoint", () => {
    const link = buildChildLink({ enfant_renoncant: true, enfant_renoncant_de: 'user', parent_de: 'both_parents' });
    const graph = buildSpouseAsDecedentFamilyGraph(familyProfile, maritalStatus, [link]);

    const child = graph.persons.find(p => p.id === 'enfant-1');
    expect(child?.renoncantDe).toBe('defunt-1');
    expect(child?.renoncantDe).not.toBe(graph.decedentId);
  });

  it("régression bout-en-bout : un enfant unique renonçant à la succession du conjoint (flux UI réel, enfant_renoncant_de: 'both') → nbSouchesEnfants à 0 côté graphe du conjoint", () => {
    const link = buildChildLink({
      enfant_renoncant: true,
      enfant_renoncant_de: 'both',
      parent_de: 'both_parents'
    });
    const graph = buildSpouseAsDecedentFamilyGraph(familyProfile, maritalStatus, [link]);

    const result = calculateSuccessionLegale(graph);

    expect(result.nbSouchesEnfants).toBe(0);
    expect(result.heritiers.every(h => h.personId !== 'enfant-1')).toBe(true);
  });
});

function buildSiblingLink(overrides: Partial<FamilyLink>): FamilyLink {
  return {
    id: 'frere-1',
    lien_familial: 'Frère/Sœur',
    nom: 'TEST',
    prenom: 'Alex',
    date_naissance: '1995-01-01',
    ...overrides
  };
}

describe('buildFamilyGraph / buildSpouseAsDecedentFamilyGraph — exonerationSuccession traduit depuis exoneration_succession (art. 796-0 ter CGI)', () => {
  it("buildFamilyGraph : exoneration_succession true → Person.exonerationSuccession true", () => {
    const link = buildSiblingLink({ exoneration_succession: true });
    const graph = buildFamilyGraph(familyProfile, maritalStatus, [link]);

    expect(graph.persons.find(p => p.id === 'frere-1')?.exonerationSuccession).toBe(true);
  });

  it("buildFamilyGraph : exoneration_succession false/absent → Person.exonerationSuccession false, non-régression", () => {
    const link = buildSiblingLink({ exoneration_succession: false });
    const graph = buildFamilyGraph(familyProfile, maritalStatus, [link]);

    expect(graph.persons.find(p => p.id === 'frere-1')?.exonerationSuccession).toBe(false);
  });

  it("buildSpouseAsDecedentFamilyGraph (miroir) : exoneration_succession true → Person.exonerationSuccession true", () => {
    // buildSpouseAsDecedentFamilyGraph exige au moins un enfant du conjoint
    // renseigné (sinon SpouseSuccessionNonModelisableError) — sans rapport
    // avec exonerationSuccession, juste une précondition de la fonction.
    const child = buildChildLink({ parent_de: 'both_parents' });
    const link = buildSiblingLink({ exoneration_succession: true });
    const graph = buildSpouseAsDecedentFamilyGraph(familyProfile, maritalStatus, [child, link]);

    expect(graph.persons.find(p => p.id === 'frere-1')?.exonerationSuccession).toBe(true);
  });
});
