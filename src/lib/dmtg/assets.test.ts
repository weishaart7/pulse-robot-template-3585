import { describe, it, expect } from 'vitest';
import { filterAndValueEstateAssets, valueDismemberedRight } from './assets';
import { DmtgParams, Asset } from './types';

const params: DmtgParams = {
  year: 2026,
  abattements: {
    enfant_ascendant: 100000,
    frere_soeur: 15932,
    neveu_niece: 7967,
    tiers: 1594,
    handicap: 159325,
    don_790G: 31865,
    apres70_AV_global: 30500,
    av_990I_allowance: 152500
  },
  baremes: { ligne_directe: [], frere_soeur: [], collateral_4: [], autre: [] },
  av_990I_rates: [],
  demembrementViager: [],
  corseEndDate: '2027-12-31',
  fraisFunerairesForfait: 1500
};

function asset(valeurVenale: number): Asset {
  return {
    id: 'a1',
    label: 'Bien',
    valeurVenale,
    nature: 'autre',
    location: 'metropole',
    exclurePour: {}
  };
}

describe('filterAndValueEstateAssets — forfait mobilier 5% (art. 764 CGI, §19.5 L1835)', () => {
  it('sans inventaire notarié : forfait = 5% de l\'actif brut successoral (200 000€ → 10 000€), sans effet cumulatif ni sur totalBaseTaxable', () => {
    const result = filterAndValueEstateAssets([asset(200000)], params, '2026-08-06');
    expect(result.totalBaseTaxable).toBe(200000); // patrimoine réel inchangé : le forfait est une fiction fiscale
    expect(result.forfaitMobilier).toBe(10000); // 5% de 200 000€, pas 5% de (200 000€ + forfait)
  });

  it('avec inventaire notarié produit : aucun forfait appliqué', () => {
    const result = filterAndValueEstateAssets([asset(200000)], params, '2026-08-06', true);
    expect(result.forfaitMobilier).toBe(0);
    expect(result.totalBaseTaxable).toBe(200000);
  });
});

const baremeViager: DmtgParams['demembrementViager'] = [
  { minAge: 0, maxAge: 20, usufruitPct: 0.9, nuePropPct: 0.1 },
  { minAge: 21, maxAge: 30, usufruitPct: 0.8, nuePropPct: 0.2 },
];

function demembrementAsset(demembrement: Asset['demembrement']): Asset {
  return { ...asset(100000), demembrement };
}

describe('valueDismemberedRight — refus explicite plutôt qu\'assiette à zéro sur donnée invalide', () => {
  it('viager avec âge dans le barème : calcule normalement les parts', () => {
    const result = valueDismemberedRight(
      demembrementAsset({
        type: 'viager',
        usufruitierAge: 25,
        usufruitierId: 'usu1',
        nueProprietaires: [{ id: 'np1', quotePart: 1 }],
      }),
      { ...params, demembrementViager: baremeViager }
    );
    expect(result.parts).toEqual([
      { beneficiaryId: 'usu1', baseTaxable: 80000 },
      { beneficiaryId: 'np1', baseTaxable: 20000 },
    ]);
  });

  it('viager avec âge hors barème : lève une erreur explicite (pas une assiette à zéro)', () => {
    expect(() =>
      valueDismemberedRight(
        demembrementAsset({
          type: 'viager',
          usufruitierAge: 150,
          usufruitierId: 'usu1',
          nueProprietaires: [],
        }),
        { ...params, demembrementViager: baremeViager }
      )
    ).toThrow(/hors barème/);
  });

  it('viager sans âge renseigné : lève une erreur explicite', () => {
    expect(() =>
      valueDismemberedRight(
        demembrementAsset({ type: 'viager', usufruitierId: 'usu1', nueProprietaires: [] }),
        { ...params, demembrementViager: baremeViager }
      )
    ).toThrow(/sans âge/);
  });

  it('temporaire sans durée renseignée : lève une erreur explicite', () => {
    expect(() =>
      valueDismemberedRight(
        demembrementAsset({ type: 'temporaire', usufruitierId: 'usu1', nueProprietaires: [] }),
        { ...params, demembrementViager: baremeViager }
      )
    ).toThrow(/sans durée/);
  });

  it('type de démembrement null : lève une erreur explicite', () => {
    expect(() =>
      valueDismemberedRight(
        demembrementAsset({ type: null, usufruitierId: 'usu1', nueProprietaires: [] }),
        { ...params, demembrementViager: baremeViager }
      )
    ).toThrow(/sans type renseigné/);
  });
});
