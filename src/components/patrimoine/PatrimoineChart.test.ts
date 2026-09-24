// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { computePatrimoineBreakdown } from './PatrimoineChart';
import { usePatrimoineCalculations } from '@/hooks/usePatrimoineCalculations';
import { Asset } from '@/services/assetService';
import { Passif, Emprunt } from '@/services/passifService';

const assets = [
  { id: 'a1', nature: 'Résidence principale', valeur_estimee: 400000, qualification_bien: 'Bien commun', detenteur: 'common' },
  { id: 'a2', nature: 'Livret A', valeur_estimee: 20000, qualification_bien: null, detenteur: 'user' },
  { id: 'a3', nature: 'Résidences secondaires', valeur_estimee: 300000, qualification_bien: 'Indivision', detenteur: 'Indivision', pourcentage_utilisateur: 30, pourcentage_conjoint: 0 },
] as unknown as Asset[];
const passifs = [
  { id: 'p1', nature: 'Dette', montant_du: 5000, qualification_bien: null },
] as unknown as Passif[];
const emprunts = [
  { id: 'e1', nature: 'Crédit immobilier', capital_restant_du: 100000, qualification_bien: 'Bien commun', detenteur: 'common' },
] as unknown as Emprunt[];

describe('computePatrimoineBreakdown', () => {
  it('net du donut = net des cartes du Résumé (exclusions et part des tiers incluses)', () => {
    const breakdown = computePatrimoineBreakdown(assets, passifs, emprunts);
    const actifs = breakdown.filter(i => i.type === 'actif').reduce((s, i) => s + i.value, 0);
    const passifsTotal = breakdown.filter(i => i.type === 'passif').reduce((s, i) => s + i.value, 0);

    const { result } = renderHook(() => usePatrimoineCalculations({ assets, passifs, emprunts, statutCouple: 'Marié' }));
    const { totalActifs, totalPassifs, patrimoineNet } = result.current.financialSummary;

    expect(actifs).toBeCloseTo(400000 + 90000);
    expect(actifs).toBeCloseTo(totalActifs);
    expect(passifsTotal).toBeCloseTo(totalPassifs);
    expect(actifs - passifsTotal).toBeCloseTo(patrimoineNet);
  });

  it('indivision avec des tiers : la part des tiers n\'est pas attribuée au conjoint', () => {
    const { result } = renderHook(() => usePatrimoineCalculations({ assets, passifs, emprunts, statutCouple: 'Marié' }));
    const p = result.current.patrimoineParPersonne;
    expect(p.userActifs).toBeCloseTo(200000 + 90000);
    expect(p.spouseActifs).toBeCloseTo(200000);
  });
});

describe('plus-value d\'un actif démembré', () => {
  const np = (date_acquisition?: string) => [{
    id: 'np', nature: 'Résidences secondaires', valeur_estimee: 200000, valeur_acquisition: 100000,
    date_acquisition, qualification_bien: 'Bien propre', detenteur: 'user', mode_detention: 'Nue-propriété',
  }] as unknown as Asset[];
  // Usufruitier (tiers) né le 01/06/1965 : 45 ans en 2010 (NP 40 %), 61 ans aujourd'hui (NP 60 %).
  const assetDemembrements = [{ asset_id: 'np', type_partie: 'tiers', date_naissance_tiers: '1965-06-01' }] as never[];

  it("valeur d'acquisition pondérée par la fraction à la date d'acquisition", () => {
    const { result } = renderHook(() => usePatrimoineCalculations({ assets: np('2010-01-01'), passifs: [], emprunts: [], assetDemembrements }));
    const pv = result.current.plusValuesSummary.assetsWithPlusValue[0];
    expect(pv.valeurAcquisition).toBeCloseTo(40000);
    expect(pv.valeurEstimee).toBeCloseTo(120000);
    expect(pv.plusValue).toBeCloseTo(80000);
  });

  it("sans date d'acquisition : plus-value non calculée", () => {
    const { result } = renderHook(() => usePatrimoineCalculations({ assets: np(undefined), passifs: [], emprunts: [], assetDemembrements }));
    expect(result.current.plusValuesSummary.assetsWithPlusValue).toHaveLength(0);
  });
});
