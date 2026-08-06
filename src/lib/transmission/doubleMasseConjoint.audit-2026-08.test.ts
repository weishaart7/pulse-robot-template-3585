/**
 * Correctif délibéré (2026-08) — répartition du cash réel par « rapport en moins
 * prenant » (art. 858 C. civ., Annexe 1 Étape 7.2-7.3), résolvant l'absence de masse
 * d'exercice distincte pour le conjoint (art. 758-5) constatée par
 * docs/audit-transmission-devolution-conjoint-2026-08.md §4.4 puis chiffrée par
 * docs/audit-transmission-clamp-double-masse-2026-08.md.
 *
 * Ce fichier documentait auparavant le comportement BUGUÉ figé (avant correctif) :
 * conjoint 24 439 € / enfant sur-doté 73 316 € sur le scénario S1. Il documente
 * maintenant le comportement CORRIGÉ, conforme au design
 * docs/design-rapport-moins-prenant-2026-08.md (S1 à S5).
 *
 * Principe implémenté dans index.ts (§6bis) : `partFinale` reste la part théorique
 * totale en valeur (donation comprise), inchangée. La fraction utilisée pour
 * répartir le cash RÉELLEMENT disponible (civilShares → assiette fiscale DMTG ET
 * netBreakdown, un seul point de correction pour les deux) exclut désormais ce
 * qu'un héritier détient déjà via une donation rapportable maintenue (`dejaDetenu`) :
 *   cashDu(héritier) = max(0, partFinale − dejaDetenu)
 * Si Σ cashDu ≤ résiduel réel : chacun reçoit son cashDu (+ surplus éventuel au
 * prorata des quoteParts d'origine, cf. S1.1 du design, sous-cas non rencontré ici).
 * Si Σ cashDu > résiduel réel (conjoint exhérédé de fait, éventuellement en
 * concurrence avec un autre héritier sous-doté) : répartition proportionnelle aux
 * cashDu respectifs — arbitrage rendu le 2026-08 (design §1.2), faute de clé de
 * répartition explicite dans le référentiel pour ce cas. Un message est alors ajouté
 * à `explicationsTexte` pour signaler que l'affichage est une approximation à
 * confirmer par le notaire.
 */
import { describe, it, expect } from 'vitest';
import { computeTransmission, FamilyGraph, PatrimonySnapshot, TransmissionParams, Liberalite, RawAssetInput } from './index';
import transmissionParamsData from '../../data/transmission-params.json';

function buildParams(): TransmissionParams {
  return {
    abattements: {
      ...transmissionParamsData.abattements,
      conjoint: transmissionParamsData.abattements.conjoint === 'Infinity' ? Infinity : Number(transmissionParamsData.abattements.conjoint)
    },
    bareme: transmissionParamsData.bareme,
    prelevement990I: transmissionParamsData.prelevement990I,
    debours: { mode: transmissionParamsData.debours.mode as 'pourcentage' | 'forfait', valeur: 0 }
  };
}

function residuelAsset(valeur: number): RawAssetInput[] {
  return [{ id: 'residuel', denomination: 'Résiduel', valeur_estimee: valeur, nature: 'valeur_mobiliere', qualification_bien: 'Bien propre', detenteur: 'user' }];
}

const AVERTISSEMENT_RESIDUEL_INSUFFISANT = /résiduel réellement disponible.*insuffisant/;

describe('Audit 2026-08 — double masse du conjoint (art. 758-5), correctif "rapport en moins prenant"', () => {
  it('S1 — 1 enfant commun sur-doté (900k€, sous réserve+QD, pas de réduction), résiduel 100k€, conjoint seul sous-doté', () => {
    const family: FamilyGraph = {
      persons: [
        { id: 'defunt', nom: 'D', prenom: 'J' },
        { id: 'conjoint', nom: 'C', prenom: 'M', lienFamilial: 'Conjoint' },
        { id: 'enfant1', nom: 'E', prenom: '1', lienFamilial: 'Enfant' },
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
    const patrimony: PatrimonySnapshot = { date: '2026-08-06', biensExistants: 100000, passifs: 0 };
    const liberalites: Liberalite[] = [
      { id: 'don1', type: 'donation', beneficiaireId: 'enfant1', valeur: 900000, date: '2010-01-01', typeImputation: 'avance_part' }
    ];

    const result = computeTransmission({
      family, patrimony, liberalites, rawAssets: residuelAsset(100000),
      params: buildParams(), conjointOption: 'quart_pp', referenceDate: '2026-08-06'
    });

    expect(result.details.reductions).toEqual([]); // pas de réduction, conforme au scénario audité

    const conjointNet = result.netBreakdown.heirs.find(h => h.personId === 'conjoint');
    const enfantNet = result.netBreakdown.heirs.find(h => h.personId === 'enfant1');

    // Un seul héritier sous-doté (le conjoint) : le résiduel réel (100 000 €) lui
    // revient intégralement (net des frais/droits) ; l'enfant, déjà sur-doté de
    // 150 000 € au-delà de sa part théorique (900k détenus vs 750k dus), ne reçoit
    // plus rien du résiduel réel.
    expect(enfantNet?.netARecevoir).toBe(0);
    expect(conjointNet?.netARecevoir).toBe(97755); // ≈ résiduel réel, net des frais de notaire
    expect((conjointNet?.netARecevoir || 0) + (enfantNet?.netARecevoir || 0)).toBeLessThanOrEqual(100000);

    // Résiduel insuffisant pour couvrir le cashDu théorique du conjoint (250 000 €) :
    // avertissement attendu.
    expect(result.explicationsTexte?.some(t => AVERTISSEMENT_RESIDUEL_INSUFFISANT.test(t))).toBe(true);
  });

  it('S2 — option fermée (enfant non commun), don 900k€ à l\'enfant commun, résiduel 100k€ : 2 héritiers simultanément sous-dotés → répartition proportionnelle', () => {
    const family: FamilyGraph = {
      persons: [
        { id: 'defunt', nom: 'D', prenom: 'J' },
        { id: 'conjoint', nom: 'C', prenom: 'M', lienFamilial: 'Conjoint' },
        { id: 'enfantCommun', nom: 'E', prenom: 'C', lienFamilial: 'Enfant' },
        { id: 'enfantNonCommun', nom: 'E', prenom: 'NC', lienFamilial: 'Enfant' },
      ],
      links: [
        { from: 'defunt', to: 'enfantCommun', relation: 'child' },
        { from: 'defunt', to: 'enfantNonCommun', relation: 'child' },
      ],
      marriages: [{ spouseA: 'defunt', spouseB: 'conjoint', regime: 'communauté légale' }],
      decedentId: 'defunt',
      hasSurvivingSpouse: true,
      survivingSpouseId: 'conjoint',
      childrenOfDecedent: ['enfantCommun', 'enfantNonCommun'],
      childrenCommonWithSpouse: ['enfantCommun'], // enfantNonCommun absent -> option fermée
      hasDDV: false
    };
    const patrimony: PatrimonySnapshot = { date: '2026-08-06', biensExistants: 100000, passifs: 0 };
    const liberalites: Liberalite[] = [
      { id: 'don1', type: 'donation', beneficiaireId: 'enfantCommun', valeur: 900000, date: '2010-01-01', typeImputation: 'avance_part' }
    ];

    const result = computeTransmission({
      family, patrimony, liberalites, rawAssets: residuelAsset(100000),
      params: buildParams(), referenceDate: '2026-08-06'
    });

    expect(result.details.reductions.length).toBeGreaterThan(0); // réduction déclenchée ici (contrairement à S1)

    const conjointNet = result.netBreakdown.heirs.find(h => h.personId === 'conjoint');
    const enfantCommunNet = result.netBreakdown.heirs.find(h => h.personId === 'enfantCommun');
    const enfantNonCommunNet = result.netBreakdown.heirs.find(h => h.personId === 'enfantNonCommun');

    // cashDu théoriques : conjoint 250 000 €, enfantCommun 0 € (sur-doté), enfantNonCommun
    // 375 000 € → Σ = 625 000 € > résiduel réel (100 000 €). Répartition proportionnelle :
    // conjoint 250/625 × 100 000 = 40 000 € ; enfantNonCommun 375/625 × 100 000 = 60 000 €
    // (avant frais/droits — cf. valeurs nettes ci-dessous).
    expect(enfantCommunNet?.netARecevoir).toBe(0);
    expect(conjointNet?.netARecevoir).toBe(39102);
    expect(enfantNonCommunNet?.netARecevoir).toBe(58653);

    expect(result.explicationsTexte?.some(t => AVERTISSEMENT_RESIDUEL_INSUFFISANT.test(t))).toBe(true);
  });

  it('S3 — 3 enfants communs, donation proche du plafond réserve+QD sans le dépasser (490k€), résiduel 500k€ : 3 héritiers simultanément sous-dotés', () => {
    const family: FamilyGraph = {
      persons: [
        { id: 'defunt', nom: 'D', prenom: 'J' },
        { id: 'conjoint', nom: 'C', prenom: 'M', lienFamilial: 'Conjoint' },
        { id: 'e1', nom: 'E', prenom: '1', lienFamilial: 'Enfant' },
        { id: 'e2', nom: 'E', prenom: '2', lienFamilial: 'Enfant' },
        { id: 'e3', nom: 'E', prenom: '3', lienFamilial: 'Enfant' },
      ],
      links: [
        { from: 'defunt', to: 'e1', relation: 'child' },
        { from: 'defunt', to: 'e2', relation: 'child' },
        { from: 'defunt', to: 'e3', relation: 'child' },
      ],
      marriages: [{ spouseA: 'defunt', spouseB: 'conjoint', regime: 'communauté légale' }],
      decedentId: 'defunt',
      hasSurvivingSpouse: true,
      survivingSpouseId: 'conjoint',
      childrenOfDecedent: ['e1', 'e2', 'e3'],
      childrenCommonWithSpouse: ['e1', 'e2', 'e3'],
      hasDDV: false
    };
    const patrimony: PatrimonySnapshot = { date: '2026-08-06', biensExistants: 500000, passifs: 0 };
    const liberalites: Liberalite[] = [
      { id: 'don1', type: 'donation', beneficiaireId: 'e1', valeur: 490000, date: '2010-01-01', typeImputation: 'avance_part' }
    ];

    const result = computeTransmission({
      family, patrimony, liberalites, rawAssets: residuelAsset(500000),
      params: buildParams(), conjointOption: 'quart_pp', referenceDate: '2026-08-06'
    });

    expect(result.details.reductions).toEqual([]); // donation sous le plafond réserve+QD, pas de réduction

    const conjointNet = result.netBreakdown.heirs.find(h => h.personId === 'conjoint');
    const e1Net = result.netBreakdown.heirs.find(h => h.personId === 'e1');
    const e2Net = result.netBreakdown.heirs.find(h => h.personId === 'e2');
    const e3Net = result.netBreakdown.heirs.find(h => h.personId === 'e3');

    // cashDu théoriques : conjoint/e2/e3 = 247 500 € chacun, e1 = 0 € (sur-doté) →
    // Σ = 742 500 € > résiduel réel (500 000 €) : répartition proportionnelle,
    // les 3 héritiers sous-dotés reçoivent la même proportion (parts théoriques
    // identiques ici).
    expect(e1Net?.netARecevoir).toBe(0);
    expect(conjointNet?.netARecevoir).toBe(165237);
    // e2/e3 : 152 143€ (au lieu de 153 809€) depuis l'ajout du forfait
    // mobilier 5% (art. 764 CGI) : conjoint exonéré donc net inchangé, e2/e3
    // paient plus de droits sur leur quote-part du forfait, donc reçoivent
    // 1 666€ de moins chacun.
    expect(e2Net?.netARecevoir).toBe(152143);
    expect(e3Net?.netARecevoir).toBe(152143);

    expect(result.explicationsTexte?.some(t => AVERTISSEMENT_RESIDUEL_INSUFFISANT.test(t))).toBe(true);
  });

  it('S4 — 2 enfants communs, donation dépassant le plafond (950k€, réduction déclenchée), résiduel 50k€ : réduction ne neutralise pas l\'écart de répartition du cash réel', () => {
    const family: FamilyGraph = {
      persons: [
        { id: 'defunt', nom: 'D', prenom: 'J' },
        { id: 'conjoint', nom: 'C', prenom: 'M', lienFamilial: 'Conjoint' },
        { id: 'e1', nom: 'E', prenom: '1', lienFamilial: 'Enfant' },
        { id: 'e2', nom: 'E', prenom: '2', lienFamilial: 'Enfant' },
      ],
      links: [
        { from: 'defunt', to: 'e1', relation: 'child' },
        { from: 'defunt', to: 'e2', relation: 'child' },
      ],
      marriages: [{ spouseA: 'defunt', spouseB: 'conjoint', regime: 'communauté légale' }],
      decedentId: 'defunt',
      hasSurvivingSpouse: true,
      survivingSpouseId: 'conjoint',
      childrenOfDecedent: ['e1', 'e2'],
      childrenCommonWithSpouse: ['e1', 'e2'],
      hasDDV: false
    };
    const patrimony: PatrimonySnapshot = { date: '2026-08-06', biensExistants: 50000, passifs: 0 };
    const liberalites: Liberalite[] = [
      { id: 'don1', type: 'donation', beneficiaireId: 'e1', valeur: 950000, date: '2010-01-01', typeImputation: 'avance_part' }
    ];

    const result = computeTransmission({
      family, patrimony, liberalites, rawAssets: residuelAsset(50000),
      params: buildParams(), conjointOption: 'quart_pp', referenceDate: '2026-08-06'
    });

    expect(result.details.reductions.length).toBeGreaterThan(0);

    const conjointNet = result.netBreakdown.heirs.find(h => h.personId === 'conjoint');
    const e1Net = result.netBreakdown.heirs.find(h => h.personId === 'e1');
    const e2Net = result.netBreakdown.heirs.find(h => h.personId === 'e2');

    expect(e1Net?.netARecevoir).toBe(0);
    expect(conjointNet?.netARecevoir).toBe(19204);
    expect(e2Net?.netARecevoir).toBe(28806);

    expect(result.explicationsTexte?.some(t => AVERTISSEMENT_RESIDUEL_INSUFFISANT.test(t))).toBe(true);
  });

  it('S5 — sans conjoint, 2 enfants dont 1 sur-doté (990k€, réduction déclenchée), résiduel 10k€ : un seul héritier sous-doté, pas d\'avertissement nécessaire', () => {
    const family: FamilyGraph = {
      persons: [
        { id: 'defunt', nom: 'D', prenom: 'J' },
        { id: 'e1', nom: 'E', prenom: '1', lienFamilial: 'Enfant' },
        { id: 'e2', nom: 'E', prenom: '2', lienFamilial: 'Enfant' },
      ],
      links: [
        { from: 'defunt', to: 'e1', relation: 'child' },
        { from: 'defunt', to: 'e2', relation: 'child' },
      ],
      marriages: [],
      decedentId: 'defunt',
      hasSurvivingSpouse: false,
      childrenOfDecedent: ['e1', 'e2'],
      childrenCommonWithSpouse: [],
      hasDDV: false
    };
    const patrimony: PatrimonySnapshot = { date: '2026-08-06', biensExistants: 10000, passifs: 0 };
    const liberalites: Liberalite[] = [
      { id: 'don1', type: 'donation', beneficiaireId: 'e1', valeur: 990000, date: '2010-01-01', typeImputation: 'avance_part' }
    ];

    const result = computeTransmission({
      family, patrimony, liberalites, rawAssets: residuelAsset(10000),
      params: buildParams(), referenceDate: '2026-08-06'
    });

    expect(result.details.reductions.length).toBeGreaterThan(0);

    const e1Net = result.netBreakdown.heirs.find(h => h.personId === 'e1');
    const e2Net = result.netBreakdown.heirs.find(h => h.personId === 'e2');

    // Un seul héritier sous-doté (e2) : cashDu(e2) = 500 000 € > résiduel réel
    // (10 000 €) mais il est SEUL sous-doté (e1 déjà sur-doté, cashDu = 0) → pas
    // d'ambiguïté de répartition entre plusieurs héritiers, le résiduel entier lui
    // revient (net des frais), sans que le message d'avertissement soit nécessaire
    // pour ARBITRER entre plusieurs sous-dotés — il reste néanmoins ajouté par le
    // code actuel dès que Σ cashDu > résiduel réel, qu'un ou plusieurs héritiers
    // soient concernés (comportement volontairement simple, pas une distinction
    // testée séparément par le design).
    expect(e1Net?.netARecevoir).toBe(0);
    expect(e2Net?.netARecevoir).toBe(8276);
  });
});
