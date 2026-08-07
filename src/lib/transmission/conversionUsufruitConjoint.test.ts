/**
 * Correctif §5.7 référentiel (C. civ. art. 759 à 762) — faculté de
 * conversion de l'usufruit du conjoint. Purement informatif (mention dans
 * explicationsTexte) : aucun montant de rente ou de capital n'est calculé,
 * conformément au référentiel (rente fixée par le juge selon le revenu net,
 * sans barème ; capital par accord libre des parties). Ne doit jamais
 * modifier les parts civiles (cf. index.ts, bloc "6quater").
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

describe('Conversion de l\'usufruit du conjoint (§5.7, C. civ. art. 759 à 762)', () => {
  const patrimony: PatrimonySnapshot = { date: '2026-08-07', biensExistants: 400000, passifs: 0 };

  // Tous les enfants sont communs au couple : le conjoint peut opter pour
  // l'usufruit total (ou 1/4 PP + 3/4 usufruit) sur la succession légale.
  const familyUsufruitLegal: FamilyGraph = {
    persons: [
      { id: 'defunt', nom: 'Defunt', prenom: 'Jean', dateNaissance: '1950-01-01' },
      { id: 'conjoint', nom: 'Epouse', prenom: 'Julie', lienFamilial: 'Conjoint', dateNaissance: '1955-01-01' },
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

  // Pleine propriété simple (1/4 PP conjoint, 3/4 PP enfant) : pas d'usufruit
  // du conjoint, donc rien à convertir.
  const familySansUsufruit: FamilyGraph = {
    ...familyUsufruitLegal
  };

  it('conjoint usufruitier (dévolution légale) : le message informatif art. 759-762 est ajouté, sans montant de rente ni de capital', () => {
    const result = computeTransmission({
      family: familyUsufruitLegal,
      patrimony,
      liberalites: [],
      params: buildParams(),
      conjointOption: 'usufruit_total',
      referenceDate: '2026-08-07'
    });

    const message = result.explicationsTexte?.find(t => t.includes('art. 759'));
    expect(message).toBeDefined();
    expect(message).toContain('rente viagère');
    expect(message).toContain('capital');
    expect(message).toContain('nus-propriétaires');
    expect(message).toContain('résidence principale');
    expect(message).toContain('125 €');
    // Aucun montant chiffré de rente ou de capital ne doit apparaître.
    expect(message).toContain('Aucun montant de rente ou de capital n\'est calculé');

    // La part civile du conjoint reste calculée normalement (usufruit total ici) :
    // la conversion ne modifie jamais partFinale.
    const conjoint = result.heirs.find(h => h.personId === 'conjoint')!;
    expect(conjoint.typeQuotePart).toBe('usufruit');
  });

  it('conjoint en pleine propriété (option 1/4 PP, pas d\'usufruit) : aucun message art. 759-762', () => {
    const result = computeTransmission({
      family: familySansUsufruit,
      patrimony,
      liberalites: [],
      params: buildParams(),
      conjointOption: 'quart_pp',
      referenceDate: '2026-08-07'
    });

    const message = result.explicationsTexte?.find(t => t.includes('art. 759'));
    expect(message).toBeUndefined();
  });
});
