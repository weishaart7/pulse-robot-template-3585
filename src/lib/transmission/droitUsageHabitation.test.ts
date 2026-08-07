/**
 * Droit d'usage et d'habitation (DUH, C. civ. art. 764-766, référentiel §5.9)
 * — droit successoral optionnel du conjoint survivant sur le logement,
 * distinct du droit de jouissance temporaire (§5.8, purement informatif, cf.
 * jouissanceTemporaireLogement.test.ts). Valeur = 60% de la valeur d'usufruit
 * (barème art. 669 CGI), âge du conjoint pris UN AN APRÈS le décès. S'impute
 * sur la part successorale du conjoint (dejaDetenus, §6bis) sans jamais la
 * dépasser en soulte inversée (Math.max(0, ...) déjà en place).
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

describe('Droit d\'usage et d\'habitation (§5.9, C. civ. art. 764-766)', () => {
  // Logement 400 000 € en pleine propriété du défunt (qualification_bien
  // 'Bien propre', detenteur 'user') : la valeur DUH n'est donc pas diluée par
  // une fraction successorale < 1 (cf. getPartSuccessorale).
  const rawAssets = [
    { id: 'rp', denomination: 'Résidence principale', valeur_estimee: 400000, nature: 'Résidence principale', qualification_bien: 'Bien propre', detenteur: 'user' }
  ];
  const patrimony: PatrimonySnapshot = { date: '2026-08-07', biensExistants: 400000, passifs: 0 };
  const referenceDate = '2026-08-07';

  // Conjoint né le 1964-01-01 : 62 ans au décès (2026-08-07), 63 ans un an
  // après (2027-08-07, anniversaire déjà passé) — tranche 61-70 du barème
  // art. 669 CGI (usufruit 40%) à l'âge retenu, contre 51-60 (usufruit 50%)
  // à l'âge au décès si (à tort) on ne décalait pas d'un an.
  const family: FamilyGraph = {
    persons: [
      { id: 'defunt', nom: 'Defunt', prenom: 'Jean' },
      { id: 'conjoint', nom: 'Epouse', prenom: 'Julie', lienFamilial: 'Conjoint', dateNaissance: '1964-01-01' },
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

  // 1/4 en pleine propriété pour le conjoint (masse 400 000€) = 100 000€ de
  // part théorique. DUH = 400 000 × 40% (barème 61-70 ans) × 60% = 96 000€.
  const partTheoriqueConjoint = 100000;
  const valeurDUHAttendue = 400000 * 0.40 * 0.60; // 96 000 €

  it('DUH optée : message informatif ajouté, montant imputé sur le cash réellement dû au conjoint (pas sur partFinale)', () => {
    const result = computeTransmission({
      family,
      patrimony,
      liberalites: [],
      params: buildParams(),
      conjointOption: 'quart_pp',
      referenceDate,
      rawAssets,
      duhOpte: true
    });

    const message = result.explicationsTexte?.find(t => t.includes('764-766'));
    expect(message).toBeDefined();
    expect(message).toContain('63 ans');
    expect(message).toMatch(/96\s000/); // espace insécable fine (toLocaleString('fr-FR'))

    const conjoint = result.heirs.find(h => h.personId === 'conjoint')!;
    // partFinale (part théorique) reste intacte : le DUH s'impute sur le cash
    // réellement perçu, pas sur la part théorique elle-même.
    expect(conjoint.partFinale).toBeCloseTo(partTheoriqueConjoint, 0);

    // Le net perçu par le conjoint diminue, celui de l'enfant augmente : la
    // valeur du DUH se reporte bien sur l'autre héritier. Pas d'assertion sur
    // un montant de transfert exact : le résiduel réel (400 000€, un seul
    // actif = le logement lui-même, jamais retiré du pot contrairement à une
    // donation réelle déjà sortie du patrimoine) excède la somme des cashDu
    // dès que le DUH réduit celui du conjoint (304 000€ < 400 000€) — le
    // surplus (96 000€) est réparti au prorata des quoteParts d'origine
    // (§6bis, branche « résiduel réel strictement supérieur », docs/design-
    // rapport-moins-prenant-2026-08.md §1.1), donc environ 25% du DUH revient
    // mécaniquement au conjoint par ce canal distinct. Comportement hérité du
    // moteur §6bis, pas spécifique au DUH — voir commentaire index.ts.
    const off = computeTransmission({
      family,
      patrimony,
      liberalites: [],
      params: buildParams(),
      conjointOption: 'quart_pp',
      referenceDate,
      rawAssets,
      duhOpte: false
    });
    const netConjoint = result.netBreakdown.heirs.find(h => h.personId === 'conjoint')!;
    const netConjointSansDUH = off.netBreakdown.heirs.find(h => h.personId === 'conjoint')!;
    const netEnfant = result.netBreakdown.heirs.find(h => h.personId === 'enfant1')!;
    const netEnfantSansDUH = off.netBreakdown.heirs.find(h => h.personId === 'enfant1')!;

    expect(netConjoint.netARecevoir).toBeLessThan(netConjointSansDUH.netARecevoir);
    expect(netConjoint.netARecevoir).toBeGreaterThanOrEqual(0);
    expect(netEnfant.netARecevoir).toBeGreaterThan(netEnfantSansDUH.netARecevoir);
  });

  it('DUH non optée : aucun message, aucune imputation sur le cash dû au conjoint', () => {
    const result = computeTransmission({
      family,
      patrimony,
      liberalites: [],
      params: buildParams(),
      conjointOption: 'quart_pp',
      referenceDate,
      rawAssets,
      duhOpte: false
    });

    const message = result.explicationsTexte?.find(t => t.includes('764-766'));
    expect(message).toBeUndefined();

    const conjoint = result.heirs.find(h => h.personId === 'conjoint')!;
    expect(conjoint.partFinale).toBeCloseTo(partTheoriqueConjoint, 0);
  });

  it('DUH optée mais valeur > part théorique du conjoint : pas de soulte inversée, jamais de montant négatif', () => {
    // Même logement (400 000€, DUH 96 000€) mais patrimoine bien plus petit :
    // la part théorique du conjoint (1/4 de 50 000€ = 12 500€) est inférieure
    // au DUH (96 000€). Le cashDu interne du conjoint doit tomber à 0 (jamais
    // négatif, Math.max(0, ...) déjà en place côté §6bis) sans qu'aucun autre
    // héritier ne se voie réclamer de soulte pour combler la différence — on
    // vérifie ici l'absence de valeur négative ou de crash, pas un montant
    // net exact (cf. nuance sur la redistribution du surplus, test précédent).
    const smallPatrimony: PatrimonySnapshot = { date: '2026-08-07', biensExistants: 50000, passifs: 0 };
    const smallRawAssets = [
      { id: 'rp', denomination: 'Résidence principale', valeur_estimee: 400000, nature: 'Résidence principale', qualification_bien: 'Bien propre', detenteur: 'user' }
    ];

    const result = computeTransmission({
      family,
      patrimony: smallPatrimony,
      liberalites: [],
      params: buildParams(),
      conjointOption: 'quart_pp',
      referenceDate,
      rawAssets: smallRawAssets,
      duhOpte: true
    });

    const conjoint = result.heirs.find(h => h.personId === 'conjoint')!;
    expect(conjoint.partFinale).toBeCloseTo(12500, 0);

    result.netBreakdown.heirs.forEach(h => {
      expect(h.netARecevoir).toBeGreaterThanOrEqual(0);
    });
    expect(result.netBreakdown.totals.netTotal).toBeCloseTo(
      result.netBreakdown.heirs.reduce((sum, h) => sum + h.netARecevoir, 0),
      0
    );
  });

  it('pas de conjoint survivant : aucun message, aucun calcul DUH même si duhOpte est vrai', () => {
    const familySansConjoint: FamilyGraph = {
      ...family,
      persons: family.persons.filter(p => p.id !== 'conjoint'),
      marriages: [],
      hasSurvivingSpouse: false,
      survivingSpouseId: undefined
    };

    const result = computeTransmission({
      family: familySansConjoint,
      patrimony,
      liberalites: [],
      params: buildParams(),
      referenceDate,
      rawAssets,
      duhOpte: true
    });

    const message = result.explicationsTexte?.find(t => t.includes('764-766'));
    expect(message).toBeUndefined();
  });
});
