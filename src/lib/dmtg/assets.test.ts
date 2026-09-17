import { describe, it, expect } from 'vitest';
import { filterAndValueEstateAssets } from './assets';
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
