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
