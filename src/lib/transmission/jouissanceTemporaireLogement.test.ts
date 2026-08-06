/**
 * Correctif §5.8 référentiel (C. civ. art. 763) — droit de jouissance
 * temporaire du logement. Effet direct du mariage, non successoral :
 * purement informatif ici (mention dans explicationsTexte), ne doit jamais
 * modifier les parts civiles du conjoint (cf. index.ts, bloc "6ter").
 */
import { describe, it, expect } from 'vitest';
import { computeTransmission, FamilyGraph, PatrimonySnapshot, TransmissionParams } from './index';
import transmissionParamsData from '../../data/transmission-params.json';

function buildParams(): TransmissionParams {
  return {
    abattements: {
      ...transmissionParamsData.abattements,
      conjoint: transmissionParamsData.abattements.conjoint === 'Infinity' ? Infinity : Number(transmissionParamsData.abattements.conjoint)
    },
    bareme: transmissionParamsData.bareme,
    prelevement990I: transmissionParamsData.prelevement990I,
    debours: {
      mode: transmissionParamsData.debours.mode as 'pourcentage' | 'forfait',
      valeur: transmissionParamsData.debours.valeur
    }
  };
}

describe('Droit de jouissance temporaire du logement (§5.8, C. civ. art. 763)', () => {
  const rawAssets = [
    { id: 'rp', denomination: 'Résidence principale', valeur_estimee: 300000, nature: 'Résidence principale', qualification_bien: 'Bien commun' },
    { id: 'cto', denomination: 'CTO propre défunt', valeur_estimee: 50000, nature: 'valeur_mobiliere', qualification_bien: 'Bien propre', detenteur: 'user' }
  ];
  const patrimony: PatrimonySnapshot = { date: '2026-08-06', biensExistants: 200000, passifs: 0 };

  const familyAvecConjoint: FamilyGraph = {
    persons: [
      { id: 'defunt', nom: 'Defunt', prenom: 'Jean' },
      { id: 'conjoint', nom: 'Epouse', prenom: 'Julie', lienFamilial: 'Conjoint' },
      { id: 'enfant1', nom: 'Enfant', prenom: 'Un', lienFamilial: 'Enfant' }
    ],
    links: [{ from: 'defunt', to: 'enfant1', relation: 'child' }],
    marriages: [{ spouseA: 'defunt', spouseB: 'conjoint', regime: 'communauté légale' }],
    decedentId: 'defunt',
    hasSurvivingSpouse: true,
    survivingSpouseId: 'conjoint',
    childrenOfDecedent: ['enfant1'],
    childrenCommonWithSpouse: ['enfant1'],
    hasDDV: false
  };

  const familySansConjoint: FamilyGraph = {
    ...familyAvecConjoint,
    persons: familyAvecConjoint.persons.filter(p => p.id !== 'conjoint'),
    marriages: [],
    hasSurvivingSpouse: false,
    survivingSpouseId: undefined
  };

  it('conjoint survivant présent : le message informatif art. 763 est ajouté, sans modifier les parts civiles', () => {
    const result = computeTransmission({
      family: familyAvecConjoint,
      patrimony,
      liberalites: [],
      params: buildParams(),
      conjointOption: 'quart_pp',
      referenceDate: '2026-08-06',
      rawAssets
    });

    const message = result.explicationsTexte?.find(t => t.includes('art. 763'));
    expect(message).toBeDefined();
    expect(message).toContain('un an');
    expect(message).toContain('ne s\'impute pas');

    // La part civile du conjoint reste calculée normalement (1/4 PP ici) :
    // le droit temporaire ne vient jamais en déduction ni en supplément
    // chiffré de partFinale.
    const conjoint = result.heirs.find(h => h.personId === 'conjoint')!;
    expect(conjoint.partFinale).toBeCloseTo(50000, 0); // 1/4 de 200 000€ de masse
  });

  it('pas de conjoint survivant : aucun message art. 763', () => {
    const result = computeTransmission({
      family: familySansConjoint,
      patrimony,
      liberalites: [],
      params: buildParams(),
      referenceDate: '2026-08-06',
      rawAssets
    });

    const message = result.explicationsTexte?.find(t => t.includes('art. 763'));
    expect(message).toBeUndefined();
  });
});
