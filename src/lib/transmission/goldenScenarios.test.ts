/**
 * Tests d'intégration de bout en bout contre docs/Golden_Scenarios_Transmission.md
 * (v2, 5 scénarios calculés à la main selon le référentiel sourcé, forfait
 * frais funéraires intégré).
 *
 * Limitations connues empêchant une correspondance complète sur les
 * scénarios 1/2/3 (assurance-vie + assiette immobilière) :
 *
 * 1. Liquidation de communauté : RÉSOLU le 2026-07-17. La pondération par bien
 *    (lib/patrimoine/succession.ts::getPartSuccessorale, appliquée à la fois
 *    dans transmissionHelpers.ts::buildPatrimonySnapshot et dans la
 *    construction des dmtgAssets de transmission/index.ts) fait maintenant la
 *    liquidation elle-même à partir du patrimoine BRUT complet (communs +
 *    propres, `qualification_bien` par bien) — plus besoin de passer un actif
 *    déjà net de la moitié de communauté en contournement. Les scénarios 1/2/3
 *    passent désormais le patrimoine brut et vérifient que `computeTransmission`
 *    produit lui-même 305 500€.
 * 2. Assurance-vie non intégrée à `netARecevoir` (décision actée le
 *    2026-07-17, option (a) : chantier de modélisation séparé — pas de table/UI
 *    pour un contrat avec bénéficiaire désigné).
 * 3. Forfait de frais funéraires (1 500€, art. 775 CGI) : intégré depuis la
 *    v2 du fichier golden (l'écart ≈150€/≈338€ constaté en v1 sur les
 *    scénarios 4/5 était dû à son absence du calcul manuel, pas à un bug de
 *    code — confirmé par Titouan). Les droits de succession et netARecevoir
 *    des scénarios 4/5 sont donc maintenant vérifiés avec de vraies
 *    assertions. Pour 1/2/3, seuls droits de succession/base après frais/parts
 *    civiles sont vérifiés (le reste reste bloqué par les limitations 2/4).
 * 4. Les biens immobiliers de test (scénarios 1/2/3) sont marqués
 *    `nature: 'valeur_mobiliere'` dans les fixtures ci-dessous, alors qu'ils
 *    représentent une SCI et une résidence principale (immobilier). Choix
 *    délibéré : `nature: 'immobilier'` déclenche le bug déjà identifié et
 *    déféré (`isResidencePrincipale: asset.nature === 'immobilier'` dans
 *    transmission/index.ts, marque TOUT bien immobilier comme résidence
 *    principale et lui applique à tort l'abattement -20%), ce qui aurait
 *    pollué les assertions sur les droits de succession avec un bug sans
 *    rapport. Conséquence : les assertions dépendant de l'assiette
 *    immobilière (frais de notaire, attestation immobilière) restent en
 *    `it.todo` pour ces 3 scénarios de toute façon (limitation 4, hors
 *    périmètre du chantier communauté — nécessite un nouveau champ en base) —
 *    ce contournement ne leur fait donc perdre aucune couverture réelle.
 */
import { describe, it, expect } from 'vitest';
import { computeTransmission, FamilyGraph, PatrimonySnapshot, TransmissionParams } from './index';
import { buildPatrimonySnapshot } from '../../utils/transmissionHelpers';
import transmissionParamsData from '../../data/transmission-params.json';

const TOLERANCE = 50;

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

describe('Golden Scenarios — Transmission (docs/Golden_Scenarios_Transmission.md)', () => {
  // Patrimoine BRUT complet, commun aux scénarios 1/2/3 : communs SCI 122 000€ +
  // RP 445 000€ (qualification_bien 'Bien commun' → 50% chacun en succession, cf.
  // getPartSuccessorale) + propres CTO 12 000€ + PER 10 000€ (qualification_bien
  // 'Bien propre', detenteur 'user' → 100% en succession). Total pondéré attendu :
  // 122000×0.5 + 445000×0.5 + 12000 + 10000 = 305 500€ — computeTransmission doit
  // produire ce chiffre lui-même, sans contournement (limitation 1 résolue).
  function buildScenario123RawAssets() {
    return [
      { id: 'sci', denomination: 'SCI (commun)', valeur_estimee: 122000, nature: 'valeur_mobiliere', qualification_bien: 'Bien commun' }, // cf. limitation 4 : nature volontairement non 'immobilier'
      { id: 'rp', denomination: 'RP (commun)', valeur_estimee: 445000, nature: 'valeur_mobiliere', qualification_bien: 'Bien commun' }, // cf. limitation 4
      { id: 'cto', denomination: 'CTO (propre défunt)', valeur_estimee: 12000, nature: 'valeur_mobiliere', qualification_bien: 'Bien propre', detenteur: 'user' },
      { id: 'per', denomination: 'PER (propre défunt)', valeur_estimee: 10000, nature: 'valeur_mobiliere', qualification_bien: 'Bien propre', detenteur: 'user' }
    ];
  }

  describe('Scénario 1 — Communauté légale, conjoint 1/4 PP, 2 enfants communs, AV clause conjoint', () => {
    const family: FamilyGraph = {
      persons: [
        { id: 'defunt', nom: 'Defunt', prenom: 'Jean' },
        { id: 'conjoint', nom: 'Epouse', prenom: 'Julie', lienFamilial: 'Conjoint' },
        { id: 'enfant1', nom: 'Enfant', prenom: 'Un', lienFamilial: 'Enfant' },
        { id: 'enfant2', nom: 'Enfant', prenom: 'Deux', lienFamilial: 'Enfant' }
      ],
      links: [
        { from: 'defunt', to: 'enfant1', relation: 'child' },
        { from: 'defunt', to: 'enfant2', relation: 'child' }
      ],
      marriages: [{ spouseA: 'defunt', spouseB: 'conjoint', regime: 'communauté légale' }],
      decedentId: 'defunt',
      hasSurvivingSpouse: true,
      survivingSpouseId: 'conjoint',
      childrenOfDecedent: ['enfant1', 'enfant2'],
      childrenCommonWithSpouse: ['enfant1', 'enfant2'],
      hasDDV: false
    };
    const rawAssets = buildScenario123RawAssets();
    // patrimony.biensExistants dérivé de buildPatrimonySnapshot (chemin civil, UI
    // réelle), à partir du MÊME patrimoine brut que rawAssets (chemin fiscal) —
    // preuve que les deux chemins retombent sur la même assiette pondérée.
    const patrimony: PatrimonySnapshot = buildPatrimonySnapshot(rawAssets as any, [], 250000);

    const result = computeTransmission({
      family,
      patrimony,
      liberalites: [],
      params: buildParams(),
      conjointOption: 'quart_pp',
      referenceDate: '2026-07-17',
      rawAssets
    });

    it('liquidation de communauté automatique : computeTransmission produit lui-même 305 500€ à partir du patrimoine brut (communs 567 000€ + propres 22 000€) — limitation 1 résolue', () => {
      expect(patrimony.biensExistants).toBeCloseTo(305500, 0);
      const totalPartsCiviles = result.heirs.reduce((s, h) => s + h.partFinale, 0);
      expect(totalPartsCiviles).toBeCloseTo(305500, 0);
    });

    it('parts civiles : épouse 76 375€, enfants 114 562,50€ chacun', () => {
      const epouse = result.heirs.find(h => h.personId === 'conjoint')!;
      const enfants = result.heirs.filter(h => h.lien === 'enfant');
      expect(epouse.partFinale).toBeCloseTo(76375, 0);
      enfants.forEach(e => expect(e.partFinale).toBeCloseTo(114562.5, 0));
    });

    it('droits de succession : épouse exonérée, enfants ≈1 091€ chacun (base après frais funéraires 114 000€)', () => {
      expect(result.dmtg.perBeneficiary['conjoint'].droitsTotaux).toBe(0);
      const droitsEnfant1 = result.dmtg.perBeneficiary['enfant1'].droitsTotaux;
      const droitsEnfant2 = result.dmtg.perBeneficiary['enfant2'].droitsTotaux;
      expect(Math.abs(droitsEnfant1 - 1091)).toBeLessThanOrEqual(TOLERANCE);
      expect(Math.abs(droitsEnfant2 - 1091)).toBeLessThanOrEqual(TOLERANCE);
    });

    it.todo('frais de notaire ≈4 950€ total — bloqué par l\'assiette immobilière (limitation 4)');
    it.todo('netARecevoir avec assurance-vie intégrée (250 000€ nette pour l\'épouse) — AV hors périmètre de computeNetPerHeir, cf. limitation 2');
  });

  describe('Scénario 2 — Même patrimoine, conjoint opte pour l\'usufruit total (25 ans)', () => {
    const family: FamilyGraph = {
      persons: [
        { id: 'defunt', nom: 'Defunt', prenom: 'Jean' },
        { id: 'conjoint', nom: 'Epouse', prenom: 'Julie', lienFamilial: 'Conjoint', dateNaissance: '2001-01-01' },
        { id: 'enfant1', nom: 'Enfant', prenom: 'Un', lienFamilial: 'Enfant' },
        { id: 'enfant2', nom: 'Enfant', prenom: 'Deux', lienFamilial: 'Enfant' }
      ],
      links: [
        { from: 'defunt', to: 'enfant1', relation: 'child' },
        { from: 'defunt', to: 'enfant2', relation: 'child' }
      ],
      marriages: [{ spouseA: 'defunt', spouseB: 'conjoint', regime: 'communauté légale' }],
      decedentId: 'defunt',
      hasSurvivingSpouse: true,
      survivingSpouseId: 'conjoint',
      childrenOfDecedent: ['enfant1', 'enfant2'],
      childrenCommonWithSpouse: ['enfant1', 'enfant2'],
      hasDDV: false
    };
    const rawAssets = buildScenario123RawAssets();
    const patrimony: PatrimonySnapshot = buildPatrimonySnapshot(rawAssets as any, [], 250000);

    const result = computeTransmission({
      family,
      patrimony,
      liberalites: [],
      params: buildParams(),
      conjointOption: 'usufruit_total',
      referenceDate: '2026-07-17',
      rawAssets
    });

    it('barème 669 CGI (25 ans → 80%/20%) : épouse usufruit 244 400€, enfants nue-propriété 30 550€ chacun', () => {
      const epouse = result.heirs.find(h => h.personId === 'conjoint')!;
      const enfants = result.heirs.filter(h => h.lien === 'enfant');
      expect(epouse.partFinale).toBeCloseTo(244400, 0);
      enfants.forEach(e => expect(e.partFinale).toBeCloseTo(30550, 0));
    });

    it('droits de succession : tout le monde sous abattement (0€)', () => {
      expect(result.dmtg.perBeneficiary['conjoint'].droitsTotaux).toBe(0);
      expect(result.dmtg.perBeneficiary['enfant1'].droitsTotaux).toBe(0);
      expect(result.dmtg.perBeneficiary['enfant2'].droitsTotaux).toBe(0);
    });

    it.todo('frais de notaire ≈4 950€ total — même écart que le scénario 1 (limitation notariale, cf. scénario 1)');
    it.todo('netARecevoir avec assurance-vie intégrée (250 000€ nette pour l\'épouse) — cf. limitation 2');
  });

  describe('Scénario 3 — Famille recomposée (enfant non commun) + assurance-vie vers un enfant', () => {
    // Même patrimoine que le scénario 1. enfant2 = non commun (issu d'une
    // première union) → 1/4 PP obligatoire (art. 757 al. 2), même si
    // conjointOption demande autre chose.
    const family: FamilyGraph = {
      persons: [
        { id: 'defunt', nom: 'Defunt', prenom: 'Jean' },
        { id: 'conjoint', nom: 'Epouse', prenom: 'Julie', lienFamilial: 'Conjoint' },
        { id: 'enfant1', nom: 'Commun', prenom: 'Un', lienFamilial: 'Enfant' },
        { id: 'enfant2', nom: 'NonCommun', prenom: 'Deux', lienFamilial: 'Enfant' }
      ],
      links: [
        { from: 'defunt', to: 'enfant1', relation: 'child' },
        { from: 'defunt', to: 'enfant2', relation: 'child' }
      ],
      marriages: [{ spouseA: 'defunt', spouseB: 'conjoint', regime: 'communauté légale' }],
      decedentId: 'defunt',
      hasSurvivingSpouse: true,
      survivingSpouseId: 'conjoint',
      childrenOfDecedent: ['enfant1', 'enfant2'],
      childrenCommonWithSpouse: ['enfant1'], // enfant2 exclu : non commun
      hasDDV: false
    };
    const rawAssets = buildScenario123RawAssets();
    const patrimony: PatrimonySnapshot = buildPatrimonySnapshot(rawAssets as any, [], 250000);

    const result = computeTransmission({
      family,
      patrimony,
      liberalites: [],
      params: buildParams(),
      conjointOption: 'usufruit_total', // ignoré : au moins un enfant non commun → 1/4 PP forcé
      referenceDate: '2026-07-17',
      rawAssets
    });

    it('1/4 PP forcé malgré la demande d\'usufruit (enfant non commun) : mêmes parts civiles que le scénario 1', () => {
      const epouse = result.heirs.find(h => h.personId === 'conjoint')!;
      const enfants = result.heirs.filter(h => h.lien === 'enfant');
      expect(epouse.partFinale).toBeCloseTo(76375, 0);
      enfants.forEach(e => expect(e.partFinale).toBeCloseTo(114562.5, 0));
    });

    it('droits de succession identiques au scénario 1 (l\'assurance-vie ne modifie pas l\'assiette de succession) : ≈1 091€ chacun', () => {
      expect(result.dmtg.perBeneficiary['conjoint'].droitsTotaux).toBe(0);
      const droitsEnfant1 = result.dmtg.perBeneficiary['enfant1'].droitsTotaux;
      const droitsEnfant2 = result.dmtg.perBeneficiary['enfant2'].droitsTotaux;
      expect(Math.abs(droitsEnfant1 - 1091)).toBeLessThanOrEqual(TOLERANCE);
      expect(Math.abs(droitsEnfant2 - 1091)).toBeLessThanOrEqual(TOLERANCE);
    });

    it.todo('frais de notaire ≈4 950€ total — même blocage que le scénario 1 (limitation 4)');
    it.todo('prélèvement 990 I sur l\'enfant commun bénéficiaire de l\'AV (abattement 152 500€, distinct et cumulable avec l\'abattement succession 100 000€) — avContracts non implémenté, cf. limitation 2');
    it.todo('netARecevoir final (succession nette + AV nette) par héritier — cf. limitation 2');
  });

  describe('Scénario 4 — Séparation de biens, enfant unique, conjoint usufruit (55 ans)', () => {
    // Séparation de biens : pas de liquidation de communauté à faire, tout le
    // patrimoine du défunt entre en succession tel quel — aucun contournement
    // nécessaire ici, entièrement vérifiable de bout en bout.
    const family: FamilyGraph = {
      persons: [
        { id: 'defunt', nom: 'Defunt', prenom: 'Pierre' },
        { id: 'conjoint', nom: 'Epoux', prenom: 'Marie', lienFamilial: 'Conjoint', dateNaissance: '1971-01-01' },
        { id: 'enfant1', nom: 'Enfant', prenom: 'Unique', lienFamilial: 'Enfant' }
      ],
      links: [{ from: 'defunt', to: 'enfant1', relation: 'child' }],
      marriages: [{ spouseA: 'defunt', spouseB: 'conjoint', regime: 'séparation de biens' }],
      decedentId: 'defunt',
      hasSurvivingSpouse: true,
      survivingSpouseId: 'conjoint',
      childrenOfDecedent: ['enfant1'],
      childrenCommonWithSpouse: ['enfant1'],
      hasDDV: false
    };
    const patrimony: PatrimonySnapshot = { date: '2026-07-17', biensExistants: 500000, passifs: 0, assuranceVieTotal: 0 };
    // Séparation de biens : bien propre au défunt (qualifierBien() le confirmerait
    // automatiquement, cf. qualification.ts — renseigné ici explicitement pour le test).
    const rawAssets = [{ id: 'a1', denomination: 'Patrimoine propre', valeur_estimee: 500000, nature: 'valeur_mobiliere', qualification_bien: 'Bien propre', detenteur: 'user' }];

    const result = computeTransmission({
      family,
      patrimony,
      liberalites: [],
      params: buildParams(),
      conjointOption: 'usufruit_total',
      referenceDate: '2026-07-17',
      rawAssets
    });

    it('barème 669 CGI (55 ans → 50%/50%) : parts civiles 250 000€ chacun', () => {
      const conjoint = result.heirs.find(h => h.personId === 'conjoint')!;
      const enfant = result.heirs.find(h => h.personId === 'enfant1')!;
      expect(conjoint.partFinale).toBeCloseTo(250000, 0);
      expect(enfant.partFinale).toBeCloseTo(250000, 0);
    });

    it('droits de succession : conjoint exonéré, enfant ≈28 044€ (base après frais funéraires 149 250€, tranche à 20%)', () => {
      expect(result.dmtg.perBeneficiary['conjoint'].droitsTotaux).toBe(0);
      const droitsEnfant = result.dmtg.perBeneficiary['enfant1'].droitsTotaux;
      expect(Math.abs(droitsEnfant - 28044)).toBeLessThanOrEqual(TOLERANCE);
    });

    it('frais de notaire ≈5 289€ total (barème dégressif déclaration + forfait + TVA + débours 0,5%, pas d\'immobilier)', () => {
      expect(Math.abs(result.fraisNotaire - 5289)).toBeLessThanOrEqual(TOLERANCE);
    });

    it('netARecevoir ≈246 605€ (conjoint) / ≈218 561€ (enfant)', () => {
      const conjointNet = result.netBreakdown.heirs.find(h => h.personId === 'conjoint')!;
      const enfantNet = result.netBreakdown.heirs.find(h => h.personId === 'enfant1')!;
      expect(Math.abs(conjointNet.netARecevoir - 246605)).toBeLessThanOrEqual(TOLERANCE);
      expect(Math.abs(enfantNet.netARecevoir - 218561)).toBeLessThanOrEqual(TOLERANCE);
    });
  });

  describe('Scénario 5 — Pas de conjoint ni de descendant : succession entre frères et sœurs', () => {
    const family: FamilyGraph = {
      persons: [
        { id: 'defunt', nom: 'Defunt', prenom: 'Paul' },
        { id: 'frere1', nom: 'Frere', prenom: 'Un', lienFamilial: 'Frère/Sœur' },
        { id: 'frere2', nom: 'Frere', prenom: 'Deux', lienFamilial: 'Frère/Sœur' }
      ],
      links: [
        { from: 'defunt', to: 'frere1', relation: 'sibling' },
        { from: 'defunt', to: 'frere2', relation: 'sibling' }
      ],
      marriages: [],
      decedentId: 'defunt',
      hasSurvivingSpouse: false,
      childrenOfDecedent: [],
      childrenCommonWithSpouse: [],
      hasDDV: false
    };
    const patrimony: PatrimonySnapshot = { date: '2026-07-17', biensExistants: 400000, passifs: 0, assuranceVieTotal: 0 };
    // Pas de conjoint : bien personnel (qualifierBien() le confirmerait automatiquement,
    // cf. qualification.ts — renseigné ici explicitement pour le test).
    const rawAssets = [{ id: 'a1', denomination: 'Patrimoine propre', valeur_estimee: 400000, nature: 'valeur_mobiliere', qualification_bien: 'Bien personnel' }];

    const result = computeTransmission({
      family,
      patrimony,
      liberalites: [],
      params: buildParams(),
      referenceDate: '2026-07-17',
      rawAssets
    });

    it('parts civiles 50/50 : 200 000€ chacun', () => {
      result.heirs.forEach(h => expect(h.partFinale).toBeCloseTo(200000, 0));
    });

    it('droits de succession (barème frère/sœur 35%/45%, abattement 15 932€, base après frais funéraires 199 250€) : ≈80 050€ chacun', () => {
      const droits1 = result.dmtg.perBeneficiary['frere1'].droitsTotaux;
      const droits2 = result.dmtg.perBeneficiary['frere2'].droitsTotaux;
      expect(Math.abs(droits1 - 80050)).toBeLessThanOrEqual(TOLERANCE);
      expect(Math.abs(droits2 - 80050)).toBeLessThanOrEqual(TOLERANCE);
    });

    it('frais de notaire ≈4 278€ total (barème dégressif déclaration + forfait + TVA + débours 0,5%, pas d\'immobilier)', () => {
      expect(Math.abs(result.fraisNotaire - 4278)).toBeLessThanOrEqual(TOLERANCE);
    });

    it('netARecevoir ≈117 061€ chacun', () => {
      result.netBreakdown.heirs.forEach(h => {
        expect(Math.abs(h.netARecevoir - 117061)).toBeLessThanOrEqual(TOLERANCE);
      });
    });

    it('partageEnvisage: true (transmis via TransmissionContext) déclenche bien le droit de partage sur ce scénario sans démembrement', () => {
      const resultAvecPartage = computeTransmission({
        family,
        patrimony,
        liberalites: [],
        params: buildParams(),
        referenceDate: '2026-07-17',
        rawAssets,
        partageEnvisage: true
      });

      expect(resultAvecPartage.netBreakdown.totals.droitPartage).toBeCloseTo(400000 * 0.025, 0);
      expect(result.netBreakdown.totals.droitPartage).toBe(0);
    });
  });
});
