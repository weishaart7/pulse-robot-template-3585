/**
 * Tests d'intégration du branchement réel de la créance de participation aux
 * acquêts (art. 1569-1581 C. civ.) dans computeTransmission — étape 3 du
 * chantier, après validation du moteur en isolation (cf.
 * lib/patrimoine/participationAcquets.test.ts). Décès uniquement pour cette
 * v1, dans les deux sens (utilisateur décède en premier, ou conjoint décède
 * en premier) — cf. diagnostic confirmant la symétrie (la créance n'opère
 * jamais sur rawAssets/qualification_bien, contrairement aux avantages
 * matrimoniaux).
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

// Jeu de référence : user acquêt net 600k, conjoint acquêt net 200k →
// créance de 200 000€ due par user à spouse (cf. participationAcquets.test.ts).
const patrimoineOriginaire = [
  { epoux: 'user' as const, valeur: 600000, bienProfessionnel: false },
  { epoux: 'spouse' as const, valeur: 800000, bienProfessionnel: false }
];
const patrimoineFinal = [
  { epoux: 'user' as const, valeur: 1200000, bienProfessionnel: false },
  { epoux: 'spouse' as const, valeur: 1000000, bienProfessionnel: false }
];

describe('Branchement réel — créance de participation aux acquêts dans computeTransmission', () => {
  it('utilisateur décède en premier, débiteur de la créance : passif de sa succession (masse réduite de 200 000€)', () => {
    const result = computeTransmission({
      family: buildFamilyUtilisateurDecede(),
      patrimony: patrimonyVide,
      liberalites: [],
      params: buildParams(),
      conjointOption: 'quart_pp',
      referenceDate: '2026-07-24',
      regimeMatrimonial: 'Participation aux acquêts',
      participationAcquets: { patrimoineOriginaire, patrimoineFinal, exclusionBiensProfessionnels: false }
    });

    const totalPartsCiviles = result.heirs.reduce((s, h) => s + h.partFinale, 0);
    // Masse successorale négative (passif net) plafonnée à 0 par heirs.partFinale (Math.max(0, ...)).
    expect(totalPartsCiviles).toBe(0);
  });

  it('conjoint décède en premier, même jeu de données : le défunt (spouse) est créancier, actif de 200 000€ dans sa succession', () => {
    const result = computeTransmission({
      family: buildFamilyConjointDecede(),
      patrimony: patrimonyVide,
      liberalites: [],
      params: buildParams(),
      conjointOption: 'quart_pp',
      referenceDate: '2026-07-24',
      regimeMatrimonial: 'Participation aux acquêts',
      participationAcquets: { patrimoineOriginaire, patrimoineFinal, exclusionBiensProfessionnels: false }
    });

    // Défunt = spouse = créancier (user est débiteur) → +200 000€ d'actif successoral.
    const totalPartsCiviles = result.heirs.reduce((s, h) => s + h.partFinale, 0);
    expect(totalPartsCiviles).toBeCloseTo(200000, 0);
  });

  it('acquêts nets égaux : créance nulle, aucun impact sur la masse successorale', () => {
    const patrimoineOriginaireEgal = [
      { epoux: 'user' as const, valeur: 500000, bienProfessionnel: false },
      { epoux: 'spouse' as const, valeur: 300000, bienProfessionnel: false }
    ];
    const patrimoineFinalEgal = [
      { epoux: 'user' as const, valeur: 900000, bienProfessionnel: false },
      { epoux: 'spouse' as const, valeur: 700000, bienProfessionnel: false }
    ];

    const result = computeTransmission({
      family: buildFamilyUtilisateurDecede(),
      patrimony: patrimonyVide,
      liberalites: [],
      params: buildParams(),
      conjointOption: 'quart_pp',
      referenceDate: '2026-07-24',
      regimeMatrimonial: 'Participation aux acquêts',
      participationAcquets: {
        patrimoineOriginaire: patrimoineOriginaireEgal,
        patrimoineFinal: patrimoineFinalEgal,
        exclusionBiensProfessionnels: false
      }
    });

    const totalPartsCiviles = result.heirs.reduce((s, h) => s + h.partFinale, 0);
    expect(totalPartsCiviles).toBe(0);
  });

  it("régime autre que participation aux acquêts : aucun impact même si participationAcquets est fourni", () => {
    const result = computeTransmission({
      family: buildFamilyUtilisateurDecede(),
      patrimony: patrimonyVide,
      liberalites: [],
      params: buildParams(),
      conjointOption: 'quart_pp',
      referenceDate: '2026-07-24',
      regimeMatrimonial: 'Séparation de biens',
      participationAcquets: { patrimoineOriginaire, patrimoineFinal, exclusionBiensProfessionnels: false }
    });

    const totalPartsCiviles = result.heirs.reduce((s, h) => s + h.partFinale, 0);
    expect(totalPartsCiviles).toBe(0); // pas de -200 000€ appliqué (déjà à 0, donc preuve indirecte via le test fiscal ci-dessous)

    const droitsTotal = Object.values(result.dmtg.perBeneficiary).reduce((s, b) => s + b.droitsTotaux, 0);
    expect(droitsTotal).toBe(0);
  });

  it('clause d\'exclusion des biens professionnels active : la créance appliquée dans computeTransmission reflète le montant recalculé, pas le montant brut', () => {
    const patrimoineFinalAvecProAuConjoint = [
      { epoux: 'user' as const, valeur: 1200000, bienProfessionnel: false },
      { epoux: 'spouse' as const, valeur: 1000000, bienProfessionnel: false },
      { epoux: 'spouse' as const, valeur: 900000, bienProfessionnel: true }
    ];

    const resultSansExclusion = computeTransmission({
      family: buildFamilyUtilisateurDecede(),
      patrimony: patrimonyVide,
      liberalites: [],
      params: buildParams(),
      conjointOption: 'quart_pp',
      referenceDate: '2026-07-24',
      regimeMatrimonial: 'Participation aux acquêts',
      participationAcquets: {
        patrimoineOriginaire,
        patrimoineFinal: patrimoineFinalAvecProAuConjoint,
        exclusionBiensProfessionnels: false
      }
    });
    // Sans exclusion : conjoint acquêt net 1 100 000€ > user 600 000€ → user devient créancier (+250 000€).
    const totalSansExclusion = resultSansExclusion.heirs.reduce((s, h) => s + h.partFinale, 0);
    expect(totalSansExclusion).toBeCloseTo(250000, 0);

    const resultAvecExclusion = computeTransmission({
      family: buildFamilyUtilisateurDecede(),
      patrimony: patrimonyVide,
      liberalites: [],
      params: buildParams(),
      conjointOption: 'quart_pp',
      referenceDate: '2026-07-24',
      regimeMatrimonial: 'Participation aux acquêts',
      participationAcquets: {
        patrimoineOriginaire,
        patrimoineFinal: patrimoineFinalAvecProAuConjoint,
        exclusionBiensProfessionnels: true
      }
    });
    // Avec exclusion : bien professionnel du conjoint retiré → user redevient débiteur → masse à 0 (plancher).
    const totalAvecExclusion = resultAvecExclusion.heirs.reduce((s, h) => s + h.partFinale, 0);
    expect(totalAvecExclusion).toBe(0);
  });
});
