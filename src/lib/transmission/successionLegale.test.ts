import { describe, it, expect } from 'vitest';
import { calculateSuccessionLegale } from './successionLegale';
import { FamilyGraph, Person } from './types';

function person(overrides: Partial<Person> & { id: string; nom: string }): Person {
  return {
    prenom: '',
    estDecede: false,
    ...overrides,
  };
}

function graph(overrides: Partial<FamilyGraph> & { persons: Person[] }): FamilyGraph {
  return {
    links: [],
    marriages: [],
    decedentId: 'D',
    hasSurvivingSpouse: false,
    survivingSpouseId: undefined,
    childrenOfDecedent: [],
    childrenCommonWithSpouse: [],
    ...overrides,
  };
}

const defunt = person({ id: 'D', nom: 'Defunt', prenom: 'Jean', lienFamilial: 'decedent' });

describe('fente successorale (applyFenteSuccessorale)', () => {
  it('1. deux branches vivantes (grands-parents des deux côtés) → 50/50', () => {
    const g = graph({
      persons: [
        defunt,
        person({ id: 'GPP', nom: 'GrandPereP', lienFamilial: 'Grand-parent', brancheFamiliale: 'Branche paternelle' }),
        person({ id: 'GPM', nom: 'GrandMereM', lienFamilial: 'Grand-parent', brancheFamiliale: 'Branche maternelle' }),
      ],
    });

    const result = calculateSuccessionLegale(g);

    expect(result.heritiers).toHaveLength(2);
    const parts = result.heritiers.map(h => h.quotePart).sort();
    expect(parts).toEqual([0.5, 0.5]);
    expect(result.heritiers.reduce((s, h) => s + h.quotePart, 0)).toBeCloseTo(1);
    expect(result.explicationsTexte.some(t => t.includes('50% branche paternelle, 50% branche maternelle'))).toBe(true);
  });

  it('2. branche maternelle éteinte, un grand-parent paternel vivant → 100% à la branche paternelle', () => {
    const g = graph({
      persons: [
        defunt,
        person({ id: 'GPP', nom: 'GrandPereP', lienFamilial: 'Grand-parent', brancheFamiliale: 'Branche paternelle' }),
      ],
    });

    const result = calculateSuccessionLegale(g);

    expect(result.heritiers).toHaveLength(1);
    expect(result.heritiers[0].personId).toBe('GPP');
    expect(result.heritiers[0].quotePart).toBe(1);
    expect(result.explicationsTexte.some(t => t.includes('Vacance de branche maternelle'))).toBe(true);
  });

  it("3. aucun héritier jusqu'au 6e degré dans aucune branche → l'État hérite, pas de crash", () => {
    const g = graph({ persons: [defunt] });

    const result = calculateSuccessionLegale(g);

    expect(result.heritiers).toHaveLength(0);
    expect(result.explicationsTexte.some(t => t.includes("L'État français hérite"))).toBe(true);
  });

  it('4. rang 1 absent des deux côtés, rang 3 (oncle) présent côté paternel uniquement → bascule au bon rang et à la bonne branche', () => {
    const g = graph({
      persons: [
        defunt,
        // 'Oncle/Tante' est la valeur réelle unique enregistrée par le
        // formulaire (useFamilyLinkLogic.ts) — jamais 'Oncle' isolément.
        // Découverte 9 : collectFenteHeritiers comparait en '===' stricte
        // et ne matchait donc jamais aucune donnée réelle pour ce rang.
        person({ id: 'OP', nom: 'OnclePaternel', lienFamilial: 'Oncle/Tante', brancheFamiliale: 'Branche paternelle' }),
      ],
    });

    const result = calculateSuccessionLegale(g);

    expect(result.heritiers).toHaveLength(1);
    expect(result.heritiers[0].personId).toBe('OP');
    expect(result.heritiers[0].lien).toBe('oncle_tante');
    expect(result.heritiers[0].ordre).toBe(4);
    expect(result.heritiers[0].quotePart).toBe(1);
  });
});

describe('renonciation à succession (Règle A)', () => {
  it('5. enfant unique renonçant sans descendance → bascule sur le régime "pas d\'enfant" (les parents héritent), pas de part orpheline', () => {
    const g = graph({
      persons: [
        defunt,
        person({ id: 'C', nom: 'EnfantRenoncant', renoncant: true, renoncantDe: 'D' }),
        person({ id: 'PERE', nom: 'Pere', lienFamilial: 'Parent' }),
        person({ id: 'MERE', nom: 'Mere', lienFamilial: 'Parent' }),
      ],
      links: [{ from: 'D', to: 'C', relation: 'child' }],
    });

    const result = calculateSuccessionLegale(g);

    // Aucune souche d'enfant : le seul enfant a renoncé sans descendance.
    expect(result.nbSouchesEnfants).toBe(0);
    expect(result.souchesEnfantsRootIds).toEqual([]);

    // La succession se règle comme s'il n'y avait pas d'enfant : les deux
    // parents héritent chacun de la moitié (aucune part orpheline, aucun
    // crash, et surtout pas l'enfant renonçant lui-même comme héritier).
    expect(result.heritiers).toHaveLength(2);
    expect(result.heritiers.every(h => h.personId !== 'C')).toBe(true);
    const parts = result.heritiers.map(h => h.quotePart).sort();
    expect(parts).toEqual([0.5, 0.5]);
    expect(result.heritiers.reduce((s, h) => s + h.quotePart, 0)).toBeCloseTo(1);

    expect(result.explicationsTexte.some(t => t.includes('EnfantRenoncant') && t.includes('renonce'))).toBe(true);
  });

  it('6. enfant unique renonçant avec descendance vivante → représentation par son propre enfant', () => {
    const g = graph({
      persons: [
        defunt,
        person({ id: 'C', nom: 'EnfantRenoncant', renoncant: true, renoncantDe: 'D' }),
        person({ id: 'GC', nom: 'PetitEnfant' }),
      ],
      links: [
        { from: 'D', to: 'C', relation: 'child' },
        { from: 'C', to: 'GC', relation: 'child' },
      ],
    });

    const result = calculateSuccessionLegale(g);

    expect(result.nbSouchesEnfants).toBe(1);
    expect(result.souchesEnfantsRootIds).toEqual(['C']);

    expect(result.heritiers).toHaveLength(1);
    const heir = result.heritiers[0];
    expect(heir.personId).toBe('GC');
    expect(heir.lien).toBe('petit_enfant');
    expect(heir.representation).toBe(true);
    expect(heir.representationRootId).toBe('C');
    expect(heir.representationCount).toBe(1);
    expect(heir.quotePart).toBe(1);

    expect(
      result.explicationsTexte.some(t => t.includes('EnfantRenoncant') && t.includes('représentation'))
    ).toBe(true);
  });
});

describe('représentation neveu/nièce (Règle C, Découverte 8)', () => {
  it("7. frère/sœur prédécédé avec un neveu vivant → le neveu hérite par représentation, pas de souche perdue", () => {
    const g = graph({
      persons: [
        defunt,
        person({ id: 'S', nom: 'FrereDecede', lienFamilial: 'Frère/Sœur', estDecede: true }),
        person({ id: 'N', nom: 'Neveu', lienFamilial: 'Neveu/Nièce' }),
      ],
      // Le chaînage 'Neveu/Nièce' → id du lien 'Frère/Sœur' parent (via
      // enfant_de) est ce que buildFamilyGraph doit construire depuis la
      // Découverte 8 ; on le reproduit ici directement puisque ce test
      // exerce successionLegale.ts, pas transmissionHelpers.ts.
      links: [{ from: 'S', to: 'N', relation: 'child' }],
    });

    const result = calculateSuccessionLegale(g);

    // Sans le correctif de la Découverte 8, cette souche disparaîtrait
    // purement et simplement (collectRepresentantsRecursive('S') ne
    // trouverait aucun lien vers N) et heritiers serait vide.
    expect(result.heritiers).toHaveLength(1);
    const heir = result.heritiers[0];
    expect(heir.personId).toBe('N');
    expect(heir.lien).toBe('neveu_niece');
    expect(heir.representation).toBe(true);
    expect(heir.representationRootId).toBe('S');
    expect(heir.representationCount).toBe(1);
    expect(heir.quotePart).toBe(1);
  });
});
