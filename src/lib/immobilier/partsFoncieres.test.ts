import { describe, expect, it } from 'vitest';
import {
  categorieImpositionParts,
  computeIndicateursParts,
  estBienNuEnDirect,
  isPartsFoncieres,
  REGIME_FORFAIT_FORESTIER,
  regimeImpositionParts,
} from './partsFoncieres';

const parts = (overrides = {}) => ({
  revenus_distribues_12m: 4_500,
  valeur_acquisition: 100_000,
  valeur_estimee: 90_000,
  frais_acquisition: 0,
  ...overrides,
});

describe('computeIndicateursParts', () => {
  it('calcule taux de distribution, rendement actuel et plus-value latente', () => {
    const r = computeIndicateursParts(parts(), 1);
    expect(r.tauxDistribution).toBeCloseTo(0.045);
    expect(r.rendementActuel).toBeCloseTo(0.05);
    expect(r.plusValueLatente).toBe(-10_000);
    expect(r.tauxPlusValue).toBeCloseTo(-0.1);
  });

  it('ne calcule aucun taux sans revenus distribués renseignés', () => {
    const r = computeIndicateursParts(parts({ revenus_distribues_12m: undefined }), 1);
    expect(r.tauxDistribution).toBeNull();
    expect(r.rendementActuel).toBeNull();
    expect(r.plusValueLatente).toBe(-10_000);
  });

  it('pondère la plus-value par la quote-part et la fraction de démembrement, frais non pondérés par la fraction', () => {
    // Nue-propriété 60 %, quote-part 50 % : (90 000 × 0,6 − (100 000 × 0,6 + 1 000)) × 0,5 = −3 500.
    const r = computeIndicateursParts(parts({ frais_acquisition: 1_000, pourcentage_utilisateur: 50 }), 0.6);
    expect(r.plusValueLatente).toBeCloseTo(-3_500);
  });

  it('ne calcule pas la plus-value si la fraction de démembrement est inconnue ou sans prix d’acquisition', () => {
    expect(computeIndicateursParts(parts(), null).plusValueLatente).toBeNull();
    expect(computeIndicateursParts(parts({ valeur_acquisition: 0 }), 1).plusValueLatente).toBeNull();
  });
});

describe('regimeImpositionParts', () => {
  it('rattache les régimes « Revenus fonciers… » aux revenus fonciers', () => {
    expect(categorieImpositionParts('Revenus fonciers')).toBe('revenus_fonciers');
    expect(categorieImpositionParts('Revenus fonciers agricoles')).toBe('revenus_fonciers');
    expect(categorieImpositionParts('Revenus fonciers viticoles')).toBe('revenus_fonciers');
  });

  it('distingue le forfait forestier, les SCPI fiscales, les dividendes et les régimes non modélisés', () => {
    expect(categorieImpositionParts(REGIME_FORFAIT_FORESTIER)).toBe('forfait_forestier');
    expect(categorieImpositionParts('SCPI fiscale (Pinel / Malraux / Déficit foncier)')).toBe('scpi_fiscale');
    expect(categorieImpositionParts('Dividendes')).toBe('dividendes');
    expect(categorieImpositionParts('Revenus forestiers')).toBe('autre');
    expect(categorieImpositionParts('Autre')).toBe('autre');
    expect(categorieImpositionParts(undefined)).toBe('non_renseigne');
  });

  it('n’ouvre le micro-foncier que si le foyer loue aussi un bien nu en direct', () => {
    expect(regimeImpositionParts('Revenus fonciers', true).microFoncierPossible).toBe(true);
    expect(regimeImpositionParts('Revenus fonciers', false).microFoncierPossible).toBe(false);
    expect(regimeImpositionParts(REGIME_FORFAIT_FORESTIER, true).microFoncierPossible).toBeNull();
  });
});

describe('estBienNuEnDirect', () => {
  it('retient un bien loué nu détenu en direct, pas des parts de société', () => {
    expect(estBienNuEnDirect({ nature: 'Immeubles locatifs (loués nus)', type_location: 'Location nue' })).toBe(true);
    expect(estBienNuEnDirect({ nature: 'Parts de SCPI', type_location: 'Location nue' })).toBe(false);
    expect(estBienNuEnDirect({ nature: 'Parts de SCI', type_location: 'Location nue' })).toBe(false);
    expect(estBienNuEnDirect({ nature: 'Immeubles locatifs (loués nus)', type_location: undefined })).toBe(false);
  });

  it('reconnaît les quatre natures de parts', () => {
    expect(isPartsFoncieres('Parts de SCPI')).toBe(true);
    expect(isPartsFoncieres("Parts de sociétés d'épargne forestière")).toBe(true);
    expect(isPartsFoncieres('Parts de SCI')).toBe(false);
  });
});
