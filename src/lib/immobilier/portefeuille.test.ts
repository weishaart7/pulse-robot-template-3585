import { describe, expect, it } from 'vitest';
import type { Asset, AssetCharge, AssetRevenu } from '@/services/assetService';
import { computeFluxBien, computeIndicateurs, computePrixRevient, sommeFlux } from './portefeuille';

const revenu = (montant: number, periodicite: string): AssetRevenu =>
  ({ asset_id: 'a', nature: 'Loyers', montant, periodicite, date_debut: '2024-01-01' }) as AssetRevenu;

const charge = (montant: number, periodicite: string): AssetCharge =>
  ({
    asset_id: 'a', type_charge: 'Charges courantes', denomination: 'Taxe', debiteur: 'Couple',
    montant, unite: '€', periodicite, date_debut: '2024-01-01', duree_type: 'Indéterminée',
  }) as AssetCharge;

const asset = (overrides: Partial<Asset> = {}): Asset =>
  ({ nature: 'Immeubles locatifs (loués nus)', valeur_acquisition: 200_000, frais_acquisition: 20_000, financement_actif: false, ...overrides }) as Asset;

describe('computeFluxBien', () => {
  it('annualise et mensualise revenus et charges selon la périodicité', () => {
    const f = computeFluxBien(asset(), [revenu(1000, 'Mensuelle')], [charge(1200, 'annuelle')]);
    expect(f.loyerAnnuel).toBe(12_000);
    expect(f.revenusMensuels).toBe(1000);
    expect(f.chargesAnnuelles).toBe(1200);
    expect(f.chargesMensuelles).toBe(100);
    expect(f.prixRevient).toBe(220_000);
    expect(f.creditMensuel).toBe(0);
  });

  it("garde la convention existante : périodicité inconnue = annuelle pour un revenu, exclue pour une charge", () => {
    const f = computeFluxBien(asset(), [revenu(1200, '')], [charge(500, '')]);
    expect(f.loyerAnnuel).toBe(1200);
    expect(f.revenusMensuels).toBe(100);
    expect(f.chargesAnnuelles).toBe(0);
    expect(f.chargesMensuelles).toBe(0);
  });
});

describe('computeIndicateurs', () => {
  it('calcule rentabilités brute / nette et cashflow mensuel', () => {
    const ind = computeIndicateurs(computeFluxBien(asset(), [revenu(1000, 'Mensuelle')], [charge(1200, 'annuelle')]));
    expect(ind.rentabiliteBrute).toBeCloseTo((12_000 / 220_000) * 100, 6);
    expect(ind.rentabiliteNette).toBeCloseTo(((12_000 - 1200) / 220_000) * 100, 6);
    expect(ind.cashflowMensuel).toBeCloseTo(900, 6);
  });

  it('renvoie 0 sans prix d\'achat ni investissement', () => {
    const ind = computeIndicateurs(computeFluxBien(asset({ valeur_acquisition: 0, frais_acquisition: 0 }), [revenu(500, 'Mensuelle')], []));
    expect(ind.rentabiliteBrute).toBe(0);
    expect(ind.rentabiliteNette).toBe(0);
  });

  it('les indicateurs du portefeuille portent sur la somme des flux des biens', () => {
    const a = computeFluxBien(asset(), [revenu(1000, 'Mensuelle')], []);
    const b = computeFluxBien(asset({ valeur_acquisition: 100_000, frais_acquisition: 0 }), [], [charge(100, 'mensuelle')]);
    const total = computeIndicateurs(sommeFlux([a, b]));
    expect(total.rentabiliteBrute).toBeCloseTo((12_000 / 320_000) * 100, 6);
    expect(total.cashflowMensuel).toBeCloseTo(1000 - 100, 6);
  });
});

describe('computePrixRevient', () => {
  it('retient le coût de revient détaillé (immeuble + frais + travaux), comme le simulateur de la fiche', () => {
    const a = asset({ montant_immeuble: 180_000, frais_notaire: 13_500, frais_agence: 6_500, travaux_renovation: 10_000 });
    expect(computePrixRevient(a)).toBe(210_000);
  });

  it('se replie sur valeur_acquisition + frais_acquisition sans coût de revient détaillé', () => {
    expect(computePrixRevient(asset())).toBe(220_000);
  });

  it('pondère la base par la quote-part sans changer la rentabilité en %', () => {
    const plein = computeIndicateurs(computeFluxBien(asset(), [revenu(1000, 'Mensuelle')], []));
    const moitie = computeIndicateurs(computeFluxBien(asset({ pourcentage_utilisateur: 50 }), [revenu(1000, 'Mensuelle')], []));
    expect(moitie.rentabiliteBrute).toBeCloseTo(plein.rentabiliteBrute, 6);
  });
});

describe('computeFluxBien — parts foncières', () => {
  const scpi = (overrides: Partial<Asset> = {}) =>
    asset({ nature: 'Parts de SCPI', valeur_acquisition: 100_000, frais_acquisition: 0, revenus_distribues_12m: 4_800, ...overrides });

  it('retient les revenus distribués sur 12 mois quand le bien n’a aucune ligne de revenus', () => {
    const f = computeFluxBien(scpi(), [], []);
    expect(f.loyerAnnuel).toBe(4_800);
    expect(f.revenusMensuels).toBe(400);
    expect(computeIndicateurs(f).rentabiliteBrute).toBeCloseTo(4.8, 6);
  });

  it('ne cumule pas les revenus distribués avec des lignes de revenus', () => {
    const f = computeFluxBien(scpi(), [revenu(100, 'Mensuelle')], []);
    expect(f.loyerAnnuel).toBe(1_200);
  });

  it('pondère les revenus distribués par la quote-part', () => {
    expect(computeFluxBien(scpi({ pourcentage_utilisateur: 50 }), [], []).loyerAnnuel).toBe(2_400);
  });

  it('ignore les revenus distribués pour une autre nature', () => {
    expect(computeFluxBien(asset({ revenus_distribues_12m: 4_800 }), [], []).loyerAnnuel).toBe(0);
  });
});
