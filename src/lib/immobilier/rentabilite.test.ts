import { describe, expect, it } from 'vitest';
import type { Asset, AssetCharge, AssetRevenu } from '@/services/assetService';
import {
  annualiserCharge,
  annualiserRevenu,
  computeAmortissement,
  computeAmortissementImmeubleLMNP,
  computeChargesAnnuelles,
  computeLoyersAnnuels,
  computeMicroBicLMNP,
  computePrixAcquisitionTotal,
  computeRentabilite,
  computeRentabiliteLMNP,
  computeRentabiliteLMP,
  computeResultatReelLMNP,
  computeResultatReelLMP,
  PLAFOND_DEFICIT_FONCIER,
  TAUX_PRELEVEMENTS_SOCIAUX_LMNP,
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

function makeAssetLMNP(overrides: Partial<Asset> = {}): Asset {
  return {
    nature: 'Immeubles locatifs (LMNP)',
    montant_immeuble: 200_000,
    zone_bien: 'Zones rurales et villes moyennes', // 15 % terrain
    meubles: 10_000,
    travaux_renovation: 0,
    travaux_construction: 0,
    type_location_lmnp: 'LMNP Classique',
    financement_actif: false,
    ...overrides,
  };
}

describe('computeAmortissementImmeubleLMNP', () => {
  it('amortit 100 % de la valeur du bâtiment (quotes-parts remises à l\'échelle)', () => {
    const lignes = computeAmortissementImmeubleLMNP(200_000, 15, 0, 0);
    const valeurBatiment = 200_000 * 0.85;
    const sommeBases = lignes.reduce((s, l) => s + l.base, 0);
    expect(sommeBases).toBeCloseTo(valeurBatiment);
  });

  it('ajoute des lignes distinctes pour mobilier et travaux quand renseignés', () => {
    const lignes = computeAmortissementImmeubleLMNP(200_000, 15, 10_000, 20_000);
    expect(lignes.find((l) => l.composant === 'Mobilier')).toMatchObject({ base: 10_000, duree: 5 });
    expect(lignes.find((l) => l.composant === 'Travaux')).toMatchObject({ base: 20_000, duree: 10 });
  });
});

describe('computeResultatReelLMNP', () => {
  it('plafonne l\'amortissement déductible sans créer de déficit', () => {
    const result = computeResultatReelLMNP(10_000, 2_000, 12_000);
    expect(result.amortissementDeductible).toBe(8_000);
    expect(result.amortissementNonDeductible).toBe(4_000);
    expect(result.resultatFiscal).toBe(0);
  });

  it('laisse un déficit réel de charges négatif, distinct de l\'amortissement', () => {
    const result = computeResultatReelLMNP(5_000, 9_000, 3_000);
    expect(result.amortissementDeductible).toBe(0);
    expect(result.amortissementNonDeductible).toBe(3_000);
    expect(result.resultatFiscal).toBe(-4_000);
  });
});

describe('computeMicroBicLMNP', () => {
  it('applique 50 % d\'abattement pour Classique et Tourisme classé (barème 2026)', () => {
    expect(computeMicroBicLMNP(20_000, 'LMNP Classique').revenuImposable).toBe(10_000);
    expect(computeMicroBicLMNP(20_000, 'Tourisme classé').revenuImposable).toBe(10_000);
  });

  it('applique 30 % d\'abattement et un plafond de 15 000 € pour Tourisme non classé', () => {
    const result = computeMicroBicLMNP(20_000, 'Tourisme non classé');
    expect(result.revenuImposable).toBe(14_000);
    expect(result.depassementPlafond).toBe(true);
  });

  it('ne signale pas de dépassement sous le plafond', () => {
    expect(computeMicroBicLMNP(10_000, 'Tourisme non classé').depassementPlafond).toBe(false);
  });
});

describe('computeRentabiliteLMNP', () => {
  it('calcule un cas nominal sans financement', () => {
    const asset = makeAssetLMNP();
    const revenus = [makeRevenu({ montant: 1000, periodicite: 'Mensuelle' })]; // 12000/an
    const charges = [makeCharge({ montant: 1000, periodicite: 'annuelle' })];
    const result = computeRentabiliteLMNP(asset, revenus, charges, 0.30);

    expect(result.loyersAnnuels).toBe(12_000);
    expect(result.chargesAnnuelles).toBe(1_000);
    expect(result.microBic.revenuImposable).toBe(6_000); // 50% d'abattement
    expect(result.reel.chargesDeductibles).toBe(1_000); // pas de financement
    expect(result.prixAcquisitionTotal).toBe(200_000);
  });

  it('applique les prélèvements sociaux LMNP à 18,6 % (distinct du foncier nu)', () => {
    const asset = makeAssetLMNP();
    const revenus = [makeRevenu({ montant: 20_000, periodicite: 'Annuelle' })];
    const result = computeRentabiliteLMNP(asset, revenus, [], 0);
    expect(result.microBic.prelevementsSociaux).toBeCloseTo(result.microBic.revenuImposable * TAUX_PRELEVEMENTS_SOCIAUX_LMNP);
  });

  it('ne met pas les PS/IR négatifs quand le résultat réel est un déficit', () => {
    const asset = makeAssetLMNP();
    const revenus = [makeRevenu({ montant: 1000, periodicite: 'Annuelle' })];
    const charges = [makeCharge({ montant: 5000, periodicite: 'annuelle' })];
    const result = computeRentabiliteLMNP(asset, revenus, charges, 0.30);
    expect(result.reel.resultatFiscal).toBeLessThan(0);
    expect(result.reel.impotRevenu).toBe(0);
    expect(result.reel.prelevementsSociaux).toBe(0);
  });
});

function makeAssetLMP(overrides: Partial<Asset> = {}): Asset {
  return {
    nature: 'Immeubles locatifs (LMP)',
    montant_immeuble: 200_000,
    zone_bien: 'Zones rurales et villes moyennes', // 15 % terrain
    meubles: 10_000,
    travaux_renovation: 0,
    travaux_construction: 0,
    type_location_lmnp: 'LMNP Classique',
    financement_actif: false,
    ...overrides,
  };
}

describe('computeResultatReelLMP', () => {
  it('ne plafonne pas l\'amortissement déductible (contrairement à LMNP)', () => {
    const result = computeResultatReelLMP(10_000, 2_000, 12_000);
    expect(result.resultatFiscal).toBe(-4_000);
    expect(result.deficitImputableRevenuGlobal).toBe(4_000);
  });

  it('laisse un déficit de charges seules, sans plafond (contrairement au foncier nu)', () => {
    const result = computeResultatReelLMP(5_000, 50_000, 0);
    expect(result.resultatFiscal).toBe(-45_000);
    expect(result.deficitImputableRevenuGlobal).toBe(45_000); // pas de min(10700, ...)
  });

  it('retourne un déficit imputable nul quand le résultat est positif', () => {
    const result = computeResultatReelLMP(20_000, 2_000, 3_000);
    expect(result.resultatFiscal).toBe(15_000);
    expect(result.deficitImputableRevenuGlobal).toBe(0);
  });
});

describe('computeRentabiliteLMP', () => {
  it('calcule un cas nominal sans financement', () => {
    const asset = makeAssetLMP();
    const revenus = [makeRevenu({ montant: 1000, periodicite: 'Mensuelle' })]; // 12000/an
    const charges = [makeCharge({ montant: 1000, periodicite: 'annuelle' })];
    const result = computeRentabiliteLMP(asset, revenus, charges, 0.30, 0.40);

    expect(result.loyersAnnuels).toBe(12_000);
    expect(result.microBic.revenuImposable).toBe(6_000); // même barème que LMNP
    expect(result.prixAcquisitionTotal).toBe(200_000);
  });

  it('impute le déficit sans plafond et calcule l\'économie d\'impôt potentielle associée', () => {
    const asset = makeAssetLMP();
    const revenus = [makeRevenu({ montant: 1000, periodicite: 'Annuelle' })];
    const charges = [makeCharge({ montant: 50_000, periodicite: 'annuelle' })];
    const result = computeRentabiliteLMP(asset, revenus, charges, 0.30, 0.40);
    expect(result.reel.resultatFiscal).toBeLessThan(-10_700); // dépasse le plafond du foncier nu
    expect(result.reel.deficitImputableRevenuGlobal).toBe(-result.reel.resultatFiscal); // non plafonné
    expect(result.reel.economieImpotPotentielle).toBeCloseTo(result.reel.deficitImputableRevenuGlobal * 0.30);
    expect(result.reel.impotRevenu).toBe(0);
    expect(result.reel.cotisationsSociales).toBe(0);
  });

  it('applique le taux de cotisations sociales saisi uniquement sur un résultat positif', () => {
    const asset = makeAssetLMP();
    const revenus = [makeRevenu({ montant: 30_000, periodicite: 'Annuelle' })];
    const charges = [makeCharge({ montant: 2_000, periodicite: 'annuelle' })];
    const result = computeRentabiliteLMP(asset, revenus, charges, 0.30, 0.40);
    expect(result.reel.resultatFiscal).toBeGreaterThan(0);
    expect(result.reel.cotisationsSociales).toBeCloseTo(result.reel.resultatFiscal * 0.40);
  });

  it('réutilise le même amortissement immeuble que LMNP à configuration identique', () => {
    const assetLMNP = makeAssetLMNP();
    const assetLMP = makeAssetLMP();
    const revenus = [makeRevenu({ montant: 1000, periodicite: 'Mensuelle' })];
    const charges = [makeCharge({ montant: 1000, periodicite: 'annuelle' })];
    const resultLMNP = computeRentabiliteLMNP(assetLMNP, revenus, charges, 0.30);
    const resultLMP = computeRentabiliteLMP(assetLMP, revenus, charges, 0.30, 0.40);
    expect(resultLMP.totalAmortissementImmeuble).toBeCloseTo(resultLMNP.totalAmortissementImmeuble);
  });
});
