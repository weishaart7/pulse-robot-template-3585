/**
 * Tests d'intégration du branchement réel des récompenses/créances entre
 * époux (art. 1468-1478 et 1479, 1543 C. civ.) dans computeTransmission —
 * dernier trou du module Transmission comblé (Succession2ndDeces.tsx),
 * après validation du moteur en isolation (cf.
 * lib/patrimoine/recompensesCreances.test.ts). Décès uniquement, dans les
 * deux sens (utilisateur décède en premier, ou conjoint décède en premier) —
 * même principe de symétrie que participationAcquets.branchement.test.ts :
 * ce mécanisme n'opère jamais sur rawAssets/qualification_bien.
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
    prelevement990I: transmissionParamsData.prelevement990I
  };
}

// decedentId 'defunt' → getDecedentRole = 'user' (convention buildFamilyGraph).
function buildFamilyUtilisateurDecede(): FamilyGraph {
  return {
    persons: [
      { id: 'defunt', nom: 'Dupont', prenom: 'Jean' },
      { id: 'conjoint', nom: 'Dupont', prenom: 'Marie', lienFamilial: 'Conjoint' },
      { id: 'enfant1', nom: 'Dupont', prenom: 'Léo', lienFamilial: 'Enfant' }
    ],
    links: [{ from: 'defunt', to: 'enfant1', relation: 'child' }],
    marriages: [{ spouseA: 'defunt', spouseB: 'conjoint' }],
    decedentId: 'defunt',
    hasSurvivingSpouse: true,
    survivingSpouseId: 'conjoint',
    childrenOfDecedent: ['enfant1'],
    childrenCommonWithSpouse: ['enfant1'],
    hasDDV: false
  };
}

// decedentId 'conjoint-defunt' → getDecedentRole = 'spouse' (convention
// buildSpouseAsDecedentFamilyGraph, préfixe 'conjoint-').
function buildFamilyConjointDecede(): FamilyGraph {
  return {
    persons: [
      { id: 'conjoint-defunt', nom: 'Dupont', prenom: 'Marie' },
      { id: 'defunt', nom: 'Dupont', prenom: 'Jean', lienFamilial: 'Conjoint' },
      { id: 'enfant1', nom: 'Dupont', prenom: 'Léo', lienFamilial: 'Enfant' }
    ],
    links: [{ from: 'conjoint-defunt', to: 'enfant1', relation: 'child' }],
    marriages: [{ spouseA: 'conjoint-defunt', spouseB: 'defunt' }],
    decedentId: 'conjoint-defunt',
    hasSurvivingSpouse: true,
    survivingSpouseId: 'defunt',
    childrenOfDecedent: ['enfant1'],
    childrenCommonWithSpouse: ['enfant1'],
    hasDDV: false
  };
}

const patrimonyVide: PatrimonySnapshot = {
  date: '2026-07-24',
  biensExistants: 0,
  passifs: 0,
  assuranceVieTotal: 0
};

describe('Branchement réel — récompenses/créances entre époux dans computeTransmission', () => {
  it('créance entre époux (user créancier, spouse débiteur) : le signe de l\'impact s\'inverse selon qui décède', () => {
    const creancesEntreEpoux = [
      { epouxCreancier: 'user' as const, epouxDebiteur: 'spouse' as const, depenseFaite: 80000, natureDepense: 'autre' as const, modeEvaluationConventionnel: 'nominal' as const }
    ];

    // Décès de l'utilisateur (créancier) : +80 000€ d'actif successoral.
    const resultUtilisateurDecede = computeTransmission({
      family: buildFamilyUtilisateurDecede(),
      patrimony: patrimonyVide,
      liberalites: [],
      params: buildParams(),
      conjointOption: 'quart_pp',
      referenceDate: '2026-07-24',
      creancesEntreEpoux
    });
    const totalUtilisateurDecede = resultUtilisateurDecede.heirs.reduce((s, h) => s + h.partFinale, 0);
    expect(totalUtilisateurDecede).toBeCloseTo(80000, 0);

    // Décès du conjoint (débiteur) : -80 000€, masse successorale plancher à 0.
    const resultConjointDecede = computeTransmission({
      family: buildFamilyConjointDecede(),
      patrimony: patrimonyVide,
      liberalites: [],
      params: buildParams(),
      conjointOption: 'quart_pp',
      referenceDate: '2026-07-24',
      creancesEntreEpoux
    });
    const totalConjointDecede = resultConjointDecede.heirs.reduce((s, h) => s + h.partFinale, 0);
    expect(totalConjointDecede).toBe(0);
  });

  it('récompense (masse commune) : impact identique quel que soit le sens du décès, contrairement à la créance ci-dessus', () => {
    const recompenses = [
      { sens: 'epoux_vers_communaute' as const, epoux: 'user' as const, depenseFaite: 60000, natureDepense: 'autre' as const, modeEvaluationConventionnel: 'nominal' as const }
    ];
    const regimeMatrimonial = 'Communauté réduite aux acquêts';

    // Récompense due à la communauté par l'un des époux : accroît la masse
    // commune (art. 1470-1474), donc la masse successorale, pour moitié
    // (50%, ratio successoral fixe du mécanisme A) — indépendamment de qui décède.
    const resultUtilisateurDecede = computeTransmission({
      family: buildFamilyUtilisateurDecede(),
      patrimony: patrimonyVide,
      liberalites: [],
      params: buildParams(),
      conjointOption: 'quart_pp',
      referenceDate: '2026-07-24',
      regimeMatrimonial,
      recompenses
    });
    const totalUtilisateurDecede = resultUtilisateurDecede.heirs.reduce((s, h) => s + h.partFinale, 0);
    expect(totalUtilisateurDecede).toBeCloseTo(30000, 0);

    const resultConjointDecede = computeTransmission({
      family: buildFamilyConjointDecede(),
      patrimony: patrimonyVide,
      liberalites: [],
      params: buildParams(),
      conjointOption: 'quart_pp',
      referenceDate: '2026-07-24',
      regimeMatrimonial,
      recompenses
    });
    const totalConjointDecede = resultConjointDecede.heirs.reduce((s, h) => s + h.partFinale, 0);
    expect(totalConjointDecede).toBeCloseTo(30000, 0);
  });
});
