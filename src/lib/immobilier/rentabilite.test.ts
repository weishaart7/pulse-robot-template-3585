import { describe, expect, it } from 'vitest';
import type { Asset, AssetCharge, AssetRevenu } from '@/services/assetService';
import {
  annualiserCharge,
  annualiserRevenu,
  computeAmortissement,
  computeChargesAnnuelles,
  computeLoyersAnnuels,
  computePrixAcquisitionTotal,
  computeRentabilite,
  PLAFOND_DEFICIT_FONCIER,
} from './rentabilite';

function makeRevenu(overrides: Partial<AssetRevenu> = {}): AssetRevenu {
  return {
    asset_id: 'asset-1',
    nature: 'Loyers hors charges',
    montant: 1000,
    periodicite: 'Mensuelle',
    date_debut: '2024-01-01',
    ...overrides,
  };
}

function makeCharge(overrides: Partial<AssetCharge> = {}): AssetCharge {
  return {
    asset_id: 'asset-1',
    type_charge: 'Charges courantes',
    denomination: 'Taxe foncière',
    debiteur: 'Couple',
    montant: 100,
    unite: '€',
    periodicite: 'mensuelle',
    date_debut: '2024-01-01',
    duree_type: 'Indéterminée',
    ...overrides,
  };
}

function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    nature: 'Immeubles locatifs (loués nus)',
    montant_immeuble: 200_000,
    frais_agence: 0,
    frais_notaire: 15_000,
    frais_bancaires: 0,
    frais_hypotheque: 0,
    travaux_renovation: 0,
    travaux_construction: 0,
    financement_actif: false,
    ...overrides,
  };
}

describe('annualiserRevenu', () => {
  it('annualise selon la périodicité capitalisée', () => {
    expect(annualiserRevenu(makeRevenu({ montant: 1000, periodicite: 'Mensuelle' }))).toBe(12000);
    expect(annualiserRevenu(makeRevenu({ montant: 1000, periodicite: 'Trimestrielle' }))).toBe(4000);
    expect(annualiserRevenu(makeRevenu({ montant: 1000, periodicite: 'Semestrielle' }))).toBe(2000);
    expect(annualiserRevenu(makeRevenu({ montant: 1000, periodicite: 'Annuelle' }))).toBe(1000);
  });
});

describe('annualiserCharge', () => {
  it("traite le montant comme déjà annualisé pour 'annuelle' (cas semestrielle fusionné en amont)", () => {
    expect(annualiserCharge(makeCharge({ montant: 600, periodicite: 'annuelle' }))).toBe(600);
    expect(annualiserCharge(makeCharge({ montant: 100, periodicite: 'mensuelle' }))).toBe(1200);
    expect(annualiserCharge(makeCharge({ montant: 100, periodicite: 'trimestrielle' }))).toBe(400);
  });
});

describe('computePrixAcquisitionTotal', () => {
  it('additionne montant_immeuble et frais annexes, pas valeur_acquisition/frais_acquisition', () => {
    const asset = makeAsset({
      montant_immeuble: 200_000,
      frais_agence: 5_000,
      frais_notaire: 15_000,
      frais_bancaires: 1_000,
      frais_hypotheque: 500,
      travaux_renovation: 10_000,
      travaux_construction: 0,
      valeur_acquisition: 999_999, // ne doit pas être utilisé
    });
    expect(computePrixAcquisitionTotal(asset)).toBe(231_500);
  });
});

describe('computeAmortissement', () => {
  it("retourne des valeurs nulles si financement_actif est faux", () => {
    const asset = makeAsset({ financement_actif: false });
    const result = computeAmortissement(asset);
    expect(result.mensualiteCredit).toBe(0);
    expect(result.interetsAnnee).toBe(0);
  });

  it('calcule la mensualité et les intérêts de la première année pour un prêt qui démarre aujourd\'hui', () => {
    const today = new Date();
    const asset = makeAsset({
      financement_actif: true,
      financement_apport: 20_000,
      financement_duree_mois: 240,
      financement_taux_credit: 3,
      financement_taux_assurance: 0.3,
      date_acquisition: today.toISOString().split('T')[0],
    });
    const result = computeAmortissement(asset, today);
    // capital emprunté = 215000 (prix acquisition) - 20000 apport = 195000
    expect(result.capitalEmprunte).toBe(195_000);
    expect(result.mensualiteCredit).toBeGreaterThan(0);
    expect(result.interetsAnnee).toBeGreaterThan(0);
    // Les intérêts de la première année doivent être proches de capital * taux annuel
    expect(result.interetsAnnee).toBeLessThan(195_000 * 0.03);
  });

  it('renvoie des intérêts nuls si le prêt est déjà soldé', () => {
    const asset = makeAsset({
      financement_actif: true,
      financement_apport: 20_000,
      financement_duree_mois: 12,
      financement_taux_credit: 3,
      financement_taux_assurance: 0.3,
      date_acquisition: '2015-01-01',
    });
    const result = computeAmortissement(asset, new Date('2020-01-01'));
    expect(result.interetsAnnee).toBe(0);
    expect(result.assuranceAnnee).toBe(0);
  });
});

describe('computeRentabilite', () => {
  it('calcule un cas nominal sans financement (déficit foncier plafonné)', () => {
    const asset = makeAsset({ financement_actif: false });
    const revenus = [makeRevenu({ montant: 500, periodicite: 'Mensuelle' })]; // 6000/an
    const charges = [makeCharge({ montant: 15_000, periodicite: 'annuelle' })]; // charges > loyers
    const result = computeRentabilite(asset, revenus, charges, 0.30);

    expect(result.loyersAnnuels).toBe(6000);
    expect(result.chargesAnnuelles).toBe(15_000);
    // déficit hors financier = 6000 - 15000 = -9000 -> imputable = 9000 (< plafond)
    expect(result.reel.deficitImputableRevenuGlobal).toBe(9000);
    expect(result.reel.deficitImputableRevenuGlobal).toBeLessThanOrEqual(PLAFOND_DEFICIT_FONCIER);
    expect(result.reel.economieImpotPotentielle).toBeCloseTo(9000 * 0.30);
    // pas de financement -> résultat foncier réel = résultat hors financier
    expect(result.reel.resultatFoncier).toBe(-9000);
    expect(result.reel.impotRevenu).toBe(0); // résultat négatif, pas d'IR
  });

  it('plafonne le déficit imputable à 10 700 € même si le déficit réel est plus élevé', () => {
    const asset = makeAsset({ financement_actif: false });
    const revenus = [makeRevenu({ montant: 0, periodicite: 'Annuelle' })];
    const charges = [makeCharge({ montant: 20_000, periodicite: 'annuelle' })];
    const result = computeRentabilite(asset, revenus, charges, 0.30);
    expect(result.reel.deficitImputableRevenuGlobal).toBe(PLAFOND_DEFICIT_FONCIER);
  });

  it('calcule le régime micro-foncier avec abattement de 30 %', () => {
    const asset = makeAsset({ financement_actif: false });
    const revenus = [makeRevenu({ montant: 10_000, periodicite: 'Annuelle' })];
    const charges: AssetCharge[] = [];
    const result = computeRentabilite(asset, revenus, charges, 0.30);
    expect(result.microFoncier.revenuImposable).toBe(7000);
    expect(result.microFoncier.impotRevenu).toBeCloseTo(2100);
    expect(result.microFoncier.prelevementsSociaux).toBeCloseTo(7000 * 0.172);
  });

  it('avec TMI à 0, seuls les prélèvements sociaux distinguent les deux régimes', () => {
    const asset = makeAsset({ financement_actif: false });
    const revenus = [makeRevenu({ montant: 10_000, periodicite: 'Annuelle' })];
    const charges = [makeCharge({ montant: 5000, periodicite: 'annuelle' })];
    const result = computeRentabilite(asset, revenus, charges, 0);
    expect(result.microFoncier.impotRevenu).toBe(0);
    expect(result.reel.impotRevenu).toBe(0);
    // Charges réelles (5000) > abattement micro-foncier (3000) -> assiette réelle
    // plus faible -> PS réel inférieur aux PS micro.
    expect(result.reel.prelevementsSociaux).toBeLessThan(result.microFoncier.prelevementsSociaux);
  });
});

describe('computeLoyersAnnuels / computeChargesAnnuelles', () => {
  it('somme plusieurs lignes avec périodicités différentes', () => {
    const revenus = [
      makeRevenu({ montant: 1000, periodicite: 'Mensuelle' }),
      makeRevenu({ montant: 500, periodicite: 'Semestrielle' }),
    ];
    expect(computeLoyersAnnuels(revenus)).toBe(12000 + 1000);

    const charges = [
      makeCharge({ montant: 100, periodicite: 'mensuelle' }),
      makeCharge({ montant: 600, periodicite: 'annuelle' }),
    ];
    expect(computeChargesAnnuelles(charges)).toBe(1200 + 600);
  });
});
