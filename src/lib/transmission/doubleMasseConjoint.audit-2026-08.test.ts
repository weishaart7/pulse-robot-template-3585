/**
 * Double masse du conjoint (art. 758-5) et rapport en valeur (art. 858) —
 * comportement issu de la phase 1 de l'audit « résultat notaire » du
 * 2026-09-29 (lib/transmission/partage.ts), qui remplace la répartition
 * proportionnelle du correctif 2026-08 :
 * - les droits en PP du conjoint (1/4 de la masse de l'art. 758-5) s'exercent
 *   sur les biens non légués, sans entamer la réserve des enfants : plafonnés
 *   à la QD restant après imputation des libéralités ;
 * - l'enfant dont la donation rapportable dépasse sa part doit la différence
 *   à ses cohéritiers (soulte, héritier supposé acceptant) ;
 * - l'indemnité de réduction due par le donataire revient aux réservataires.
 * Depuis la phase 3, `netARecevoir` part de la valeur civile reçue et intègre la
 * soulte signée : un enfant débiteur d'une soulte a un net négatif (à verser).
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

const DROITS_CONJOINT_PLAFONNES = /droits du conjoint en pleine propriété sont limités/;
const soulte = (r: { heirs: { personId: string; soulte?: number }[] }, id: string) =>
  Math.round(r.heirs.find(h => h.personId === id)?.soulte || 0);

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
    expect(conjointNet?.netARecevoir).toBe(99255); // valeur civile reçue (100 000 €), nette des frais de notaire
    expect((conjointNet?.netARecevoir || 0) + (enfantNet?.netARecevoir || 0)).toBeLessThanOrEqual(100000);

    // Résiduel insuffisant pour couvrir le cashDu théorique du conjoint (250 000 €) :
    // avertissement attendu.
    expect(result.explicationsTexte?.some(t => DROITS_CONJOINT_PLAFONNES.test(t))).toBe(true);
  });

  it('S2 — option fermée (enfant non commun), don 900k€ à l\'enfant commun, résiduel 100k€ : QD épuisée, conjoint à 0, soulte due par l\'enfant sur-doté', () => {
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
    expect(enfantCommunNet?.netARecevoir).toBe(-166667);
    // QD épuisée par la donation (réduite) : le conjoint ne reçoit rien (art. 758-5 al. 2).
    // Masse égalitaire 1 000 000 € → 500 000 € par enfant : l'enfant commun (666 667 €
    // maintenus) doit 166 667 € ; l'enfant non commun reçoit 333 333 € (biens +
    // indemnité de réduction) + 166 667 € de soulte.
    expect(conjointNet?.netARecevoir).toBe(0);
    expect(enfantNonCommunNet?.netARecevoir).toBe(451361);
    expect(soulte(result, 'enfantCommun')).toBe(-166667);
    expect(soulte(result, 'enfantNonCommun')).toBe(166667);

    expect(result.explicationsTexte?.some(t => DROITS_CONJOINT_PLAFONNES.test(t))).toBe(true);
  });

  it('S3 — 3 enfants communs, donation proche du plafond réserve+QD sans le dépasser (490k€), résiduel 500k€ : conjoint plafonné à la QD restante, soulte partagée', () => {
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
    expect(e1Net?.netARecevoir).toBe(-161667);
    // QD restante 5 000 € (247 500 € − 242 500 € imputés) : plafond des droits du conjoint.
    expect(conjointNet?.netARecevoir).toBe(4972);
    // e2/e3 : 152 143€ (au lieu de 153 809€) depuis l'ajout du forfait
    // mobilier 5% (art. 764 CGI) : conjoint exonéré donc net inchangé, e2/e3
    // paient plus de droits sur leur quote-part du forfait, donc reçoivent
    // 1 666€ de moins chacun.
    // Masse égalitaire 495 000 + 490 000 = 985 000 € → 328 333 € par enfant :
    // e1 doit 161 667 €, partagés entre e2 et e3 (80 833 € chacun).
    expect(e2Net?.netARecevoir).toBe(296931);
    expect(e3Net?.netARecevoir).toBe(296931);
    expect(soulte(result, 'e1')).toBe(-161667);
    expect(soulte(result, 'e2')).toBe(80833);

    expect(result.explicationsTexte?.some(t => DROITS_CONJOINT_PLAFONNES.test(t))).toBe(true);
  });

  it('S4 — 2 enfants communs, donation dépassant le plafond (950k€, réduction déclenchée), résiduel 50k€ : indemnité de réduction et soulte à e2, conjoint à 0', () => {
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

    expect(e1Net?.netARecevoir).toBe(-166667);
    expect(conjointNet?.netARecevoir).toBe(0);
    expect(e2Net?.netARecevoir).toBe(451616); // 50 000 € + indemnité de réduction 283 333 €, nets
    expect(soulte(result, 'e2')).toBe(166667);

    expect(result.explicationsTexte?.some(t => DROITS_CONJOINT_PLAFONNES.test(t))).toBe(true);
  });

  it('S5 — sans conjoint, 2 enfants dont 1 sur-doté (990k€, réduction déclenchée), résiduel 10k€ : réserve servie par l\'indemnité de réduction', () => {
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
    expect(e1Net?.netARecevoir).toBe(-166667);
    // e2 : réserve de 333 333 € couverte par les biens (10 000 €) et l'indemnité de
    // réduction (323 333 €), + soulte de rapport de 166 667 € due par e1.
    expect(e2Net?.netARecevoir).toBe(451882);
    expect(soulte(result, 'e2')).toBe(166667);
  });
});
