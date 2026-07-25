/**
 * Tests d'intégration du branchement réel des avantages matrimoniaux
 * (préciput, attribution intégrale, partage inégal) dans computeTransmission
 * et buildPatrimonySnapshot — étape 4 du chantier, après validation du
 * moteur en isolation (cf. lib/patrimoine/avantagesMatrimoniaux.test.ts).
 */
import { describe, it, expect } from 'vitest';
import { computeTransmission, FamilyGraph, PatrimonySnapshot, TransmissionParams } from './index';
import { buildPatrimonySnapshot } from '../../utils/transmissionHelpers';
import { ClausesData } from '../../types/matrimonial';
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

function buildFamily(conjointDateNaissance?: string): FamilyGraph {
  return {
    persons: [
      { id: 'defunt', nom: 'Dupont', prenom: 'Jean' },
      { id: 'conjoint', nom: 'Dupont', prenom: 'Marie', lienFamilial: 'Conjoint', dateNaissance: conjointDateNaissance },
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

describe('Branchement réel — avantages matrimoniaux dans computeTransmission', () => {
  it("sans clausesData : comportement strictement inchangé (getPartSuccessorale seul)", () => {
    const family = buildFamily();
    const rawAssets = [
      { id: 'commun1', denomination: 'Bien commun', valeur_estimee: 400000, nature: 'valeur_mobiliere', qualification_bien: 'Bien commun' }
    ];
    const patrimony: PatrimonySnapshot = buildPatrimonySnapshot(rawAssets as any, []);
    expect(patrimony.biensExistants).toBeCloseTo(200000, 0); // 50% par défaut

    const result = computeTransmission({
      family,
      patrimony,
      liberalites: [],
      params: buildParams(),
      conjointOption: 'quart_pp',
      referenceDate: '2026-07-17',
      rawAssets
    });

    const totalPartsCiviles = result.heirs.reduce((s, h) => s + h.partFinale, 0);
    expect(totalPartsCiviles).toBeCloseTo(200000, 0);
  });

  it('préciput pleine propriété sur un bien désigné : masse civile ET fiscale réduites de concert', () => {
    const family = buildFamily();
    const rawAssets = [
      { id: 'residence', denomination: 'Résidence (préciputée)', valeur_estimee: 300000, nature: 'valeur_mobiliere', qualification_bien: 'Bien commun' },
      { id: 'autre', denomination: 'Autre bien commun', valeur_estimee: 300000, nature: 'valeur_mobiliere', qualification_bien: 'Bien commun' }
    ];
    const clausesData: ClausesData = {
      preciput: { enabled: true, selectedAssets: ['residence'], options: { pleineProprietee: true } }
    };

    // Chemin civil : buildPatrimonySnapshot ne connaît pas encore les clauses
    // (pas de paramètre dédié à l'actif, seulement au passif) — même pattern
    // que récompenses/créances : c'est computeTransmission qui réconcilie via
    // le delta interne, à partir de rawAssets + clausesData.
    const patrimonyBrut = buildPatrimonySnapshot(rawAssets as any, []);
    expect(patrimonyBrut.biensExistants).toBeCloseTo(300000, 0); // 50%+50% par défaut, sans clause

    const result = computeTransmission({
      family,
      patrimony: patrimonyBrut,
      liberalites: [],
      params: buildParams(),
      conjointOption: 'quart_pp',
      referenceDate: '2026-07-17',
      rawAssets,
      clausesData
    });

    // Masse successorale attendue : résidence 0% (préciputée PP) + autre 50% = 150 000€.
    const totalPartsCiviles = result.heirs.reduce((s, h) => s + h.partFinale, 0);
    expect(totalPartsCiviles).toBeCloseTo(150000, 0);

    // Assiette fiscale (dmtgAssets) alignée sur la même masse.
    const droitsTotal = Object.values(result.dmtg.perBeneficiary).reduce((s, b) => s + b.droitsTotaux, 0);
    const droitsSansClause = (() => {
      const resultSansClause = computeTransmission({
        family,
        patrimony: patrimonyBrut,
        liberalites: [],
        params: buildParams(),
        conjointOption: 'quart_pp',
        referenceDate: '2026-07-17',
        rawAssets
      });
      return Object.values(resultSansClause.dmtg.perBeneficiary).reduce((s, b) => s + b.droitsTotaux, 0);
    })();
    // La masse taxable étant deux fois plus petite avec préciput (150k vs 300k),
    // les droits ne peuvent pas être identiques (preuve que dmtgAssets a bien
    // repris la fraction ajustée, pas seulement le civil).
    expect(droitsTotal).toBeLessThan(droitsSansClause);
  });

  it('attribution intégrale en usufruit : npSurvivant résolu automatiquement depuis la date de naissance du conjoint', () => {
    const family = buildFamily('1961-01-01'); // 65 ans au 17/07/2026 → NP 60%
    const rawAssets = [
      { id: 'commun1', denomination: 'Bien commun', valeur_estimee: 600000, nature: 'valeur_mobiliere', qualification_bien: 'Bien commun' }
    ];
    const clausesData: ClausesData = {
      attribution_integrale: { enabled: true, options: { porteSur: 'usufruit' } }
    };
    const patrimonyBrut = buildPatrimonySnapshot(rawAssets as any, []);

    const result = computeTransmission({
      family,
      patrimony: patrimonyBrut,
      liberalites: [],
      params: buildParams(),
      conjointOption: 'quart_pp',
      referenceDate: '2026-07-17',
      rawAssets,
      clausesData
    });

    // fraction = 0,5 × NP(65 ans) = 0,5 × 0,6 = 0,3 → masse = 180 000€.
    const totalPartsCiviles = result.heirs.reduce((s, h) => s + h.partFinale, 0);
    expect(totalPartsCiviles).toBeCloseTo(180000, 0);
  });

  it('partage inégal : le ratio (1 − partConjoint/100) s\'applique identiquement à buildPatrimonySnapshot (passif) et à computeTransmission (actif)', () => {
    const family = buildFamily();
    const rawAssets = [
      { id: 'actif', denomination: 'Actif commun', valeur_estimee: 500000, nature: 'valeur_mobiliere', qualification_bien: 'Bien commun' }
    ];
    const passifs = [{ montant_du: 100000, qualification_bien: 'Bien commun' }];
    const clausesData: ClausesData = {
      partage_inegal: { enabled: true, partPleineProprietee: 70 } // conjoint reçoit 70%
    };

    // Passif : ratio appliqué directement dans buildPatrimonySnapshot via le
    // paramètre dédié (mapping partConjointInegal ← partPleineProprietee).
    const patrimony = buildPatrimonySnapshot(rawAssets as any, passifs, 0, 70);
    expect(patrimony.passifs).toBeCloseTo(30000, 0); // 100 000 × (1 − 70/100)

    const result = computeTransmission({
      family,
      patrimony,
      liberalites: [],
      params: buildParams(),
      conjointOption: 'quart_pp',
      referenceDate: '2026-07-17',
      rawAssets,
      clausesData
    });

    // Actif ajusté = 500 000 × 0,3 = 150 000€ (patrimony.biensExistants
    // ré-ancré en interne par computeTransmission via le delta, à partir de
    // buildPatrimonySnapshot(500 000×0,5=250 000) + delta (0,3−0,5)×500 000=−100 000).
    // Masse partageable (heirs.partFinale) = actif ajusté − passif ajusté
    // (computeMasseCalcul nette déjà le passif) = 150 000 − 30 000 = 120 000€.
    const totalPartsCiviles = result.heirs.reduce((s, h) => s + h.partFinale, 0);
    expect(totalPartsCiviles).toBeCloseTo(120000, 0);
  });

  it('sans clausesData : buildPatrimonySnapshot reste rétro-compatible (passif commun toujours à 100%, comportement historique)', () => {
    const passifs = [{ montant_du: 50000, qualification_bien: 'Bien commun' }];
    const patrimony = buildPatrimonySnapshot([], passifs);
    expect(patrimony.passifs).toBe(50000);
  });
});
