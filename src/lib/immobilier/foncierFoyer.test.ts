import { describe, expect, it } from 'vitest';
import type { Asset, AssetCharge, AssetRevenu } from '@/services/assetService';
import {
  buildBienFoncierInput,
  computeFoyerFoncier,
  PLAFOND_DEFICIT_FONCIER_RENOVATION_ENERGETIQUE,
  SEUIL_MICRO_FONCIER,
  type BienFoncierInput,
  type DeficitFoncierReporte,
} from './foncierFoyer';
import { PLAFOND_DEFICIT_FONCIER, TAUX_PRELEVEMENTS_SOCIAUX } from './rentabilite';

function makeBien(overrides: Partial<BienFoncierInput> = {}): BienFoncierInput {
  return {
    quotePart: 100,
    loyersBruts: 12_000,
    chargesHorsInterets: 2_000,
    interetsEtAssuranceEmprunt: 0,
    ...overrides,
  };
}

function makeDeficit(overrides: Partial<DeficitFoncierReporte> = {}): DeficitFoncierReporte {
  return {
    anneeOrigine: 2020,
    type: 'hors_interets',
    montantRestant: 1_000,
    ...overrides,
  };
}

describe('buildBienFoncierInput', () => {
  function makeAsset(overrides: Partial<Asset> = {}): Asset {
    return { nature: 'Immeubles locatifs (loués nus)', financement_actif: false, ...overrides };
  }
  function makeRevenu(overrides: Partial<AssetRevenu> = {}): AssetRevenu {
    return {
      asset_id: 'asset-1',
      nature: 'Loyers hors charges',
      montant: 1_000,
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

  it('agrège loyers/charges annualisés et quote-part depuis un bien sans financement', () => {
    const bien = buildBienFoncierInput(makeAsset(), [makeRevenu()], [makeCharge()]);
    expect(bien.loyersBruts).toBe(12_000);
    expect(bien.chargesHorsInterets).toBe(1_200);
    expect(bien.interetsEtAssuranceEmprunt).toBe(0);
    expect(bien.quotePart).toBe(100);
    expect(bien.travauxRenovationEnergetique).toBe(false);
  });
});

describe('computeFoyerFoncier — seuil micro-foncier', () => {
  it('est éligible au micro-foncier sous 15 000 € de loyers bruts foyer', () => {
    const result = computeFoyerFoncier([makeBien({ loyersBruts: 14_999, chargesHorsInterets: 0 })], [], 0.3);
    expect(result.loyersBrutsFoyer).toBe(14_999);
    expect(result.eligibleMicroFoncier).toBe(true);
    expect(result.regimeReelObligatoire).toBe(false);
  });

  it('bascule en régime réel obligatoire dès que le total foyer dépasse 15 000 €, même réparti sur plusieurs biens sous le seuil chacun', () => {
    const result = computeFoyerFoncier(
      [
        makeBien({ loyersBruts: 8_000, chargesHorsInterets: 0 }),
        makeBien({ loyersBruts: 8_000, chargesHorsInterets: 0 }),
      ],
      [],
      0.3,
    );
    expect(result.loyersBrutsFoyer).toBe(16_000);
    expect(result.loyersBrutsFoyer).toBeGreaterThan(SEUIL_MICRO_FONCIER);
    expect(result.eligibleMicroFoncier).toBe(false);
    expect(result.regimeReelObligatoire).toBe(true);
  });
});

describe('computeFoyerFoncier — quote-part d’indivision', () => {
  it('pondère loyers/charges/intérêts par la quote-part du foyer dans chaque bien', () => {
    const result = computeFoyerFoncier(
      [makeBien({ quotePart: 50, loyersBruts: 20_000, chargesHorsInterets: 4_000, interetsEtAssuranceEmprunt: 2_000 })],
      [],
      0.3,
    );
    expect(result.loyersBrutsFoyer).toBe(10_000);
    expect(result.chargesHorsInteretsFoyer).toBe(2_000);
    expect(result.interetsFoyer).toBe(1_000);
  });
});

describe('computeFoyerFoncier — déficit imputable sur le revenu global', () => {
  it('plafonne le déficit hors intérêts imputable à 10 700 € et reporte l’excédent', () => {
    const result = computeFoyerFoncier(
      [makeBien({ loyersBruts: 5_000, chargesHorsInterets: 20_000 })],
      [],
      0.3,
    );
    expect(result.resultatAvantInterets).toBe(-15_000);
    expect(result.deficitImputableRevenuGlobal).toBe(PLAFOND_DEFICIT_FONCIER);
    expect(result.nouveauDeficitReportableHorsInterets).toBe(15_000 - PLAFOND_DEFICIT_FONCIER);
    expect(result.economieImpotPotentielle).toBeCloseTo(PLAFOND_DEFICIT_FONCIER * 0.3);
  });

  it('n’impute rien au-delà du déficit réel même si le plafond est plus élevé', () => {
    const result = computeFoyerFoncier(
      [makeBien({ loyersBruts: 5_000, chargesHorsInterets: 8_000 })],
      [],
      0.3,
    );
    expect(result.deficitImputableRevenuGlobal).toBe(3_000);
    expect(result.nouveauDeficitReportableHorsInterets).toBe(0);
  });

  it('applique le plafond majoré à 21 400 € si un bien a des travaux de rénovation énergétique', () => {
    const result = computeFoyerFoncier(
      [makeBien({ loyersBruts: 5_000, chargesHorsInterets: 30_000, travauxRenovationEnergetique: true })],
      [],
      0.3,
    );
    expect(result.plafondDeficitApplicable).toBe(PLAFOND_DEFICIT_FONCIER_RENOVATION_ENERGETIQUE);
    expect(result.deficitImputableRevenuGlobal).toBe(PLAFOND_DEFICIT_FONCIER_RENOVATION_ENERGETIQUE);
  });

  it('ne rend jamais les intérêts imputables sur le revenu global : ils sont toujours reportés en totalité si le résultat hors intérêts est déjà négatif', () => {
    const result = computeFoyerFoncier(
      [makeBien({ loyersBruts: 5_000, chargesHorsInterets: 8_000, interetsEtAssuranceEmprunt: 3_000 })],
      [],
      0.3,
    );
    expect(result.deficitImputableRevenuGlobal).toBe(3_000); // uniquement la part hors intérêts
    expect(result.nouveauDeficitReportableInterets).toBe(3_000); // intégralité des intérêts, jamais sur le revenu global
  });

  it('reporte les seuls intérêts quand ils créent à eux seuls le déficit (résultat hors intérêts positif)', () => {
    const result = computeFoyerFoncier(
      [makeBien({ loyersBruts: 10_000, chargesHorsInterets: 2_000, interetsEtAssuranceEmprunt: 9_000 })],
      [],
      0.3,
    );
    expect(result.resultatAvantInterets).toBe(8_000);
    expect(result.resultatFoncierGlobal).toBe(-1_000);
    expect(result.deficitImputableRevenuGlobal).toBe(0);
    expect(result.nouveauDeficitReportableInterets).toBe(1_000);
    expect(result.nouveauDeficitReportableHorsInterets).toBe(0);
  });
});

describe('computeFoyerFoncier — consommation des déficits reportés', () => {
  it('consomme le stock reporté sur un résultat foncier positif, FIFO par année d’origine', () => {
    const result = computeFoyerFoncier(
      [makeBien({ loyersBruts: 12_000, chargesHorsInterets: 4_000 })],
      [
        makeDeficit({ id: 'a', anneeOrigine: 2022, montantRestant: 3_000 }),
        makeDeficit({ id: 'b', anneeOrigine: 2020, montantRestant: 2_000 }),
      ],
      0.3,
      2026,
    );
    expect(result.resultatFoncierGlobal).toBe(8_000);
    // Le plus ancien (2020, 2000€) est consommé en premier, puis 2022 pour le solde (5000-2000=3000, capé à 3000€ dispo)
    expect(result.consommationDeficitsReportes).toEqual([
      { id: 'b', anneeOrigine: 2020, type: 'hors_interets', montantConsomme: 2_000, montantRestantApres: 0 },
      { id: 'a', anneeOrigine: 2022, type: 'hors_interets', montantConsomme: 3_000, montantRestantApres: 0 },
    ]);
    expect(result.resultatFoncierImposable).toBe(3_000);
  });

  it('exclut un déficit reporté hors de la fenêtre de 10 ans', () => {
    const result = computeFoyerFoncier(
      [makeBien({ loyersBruts: 12_000, chargesHorsInterets: 4_000 })],
      [makeDeficit({ anneeOrigine: 2010, montantRestant: 5_000 })],
      0.3,
      2026,
    );
    expect(result.consommationDeficitsReportes).toEqual([]);
    expect(result.resultatFoncierImposable).toBe(8_000);
  });

  it('ne consomme rien si le résultat foncier de l’année est négatif ou nul', () => {
    const result = computeFoyerFoncier(
      [makeBien({ loyersBruts: 5_000, chargesHorsInterets: 8_000 })],
      [makeDeficit({ anneeOrigine: 2024, montantRestant: 5_000 })],
      0.3,
      2026,
    );
    expect(result.consommationDeficitsReportes).toEqual([]);
    expect(result.resultatFoncierImposable).toBe(0);
  });

  it('calcule impôt et prélèvements sociaux sur le résultat imposable après consommation des reports', () => {
    const result = computeFoyerFoncier(
      [makeBien({ loyersBruts: 12_000, chargesHorsInterets: 4_000 })],
      [makeDeficit({ anneeOrigine: 2024, montantRestant: 3_000 })],
      0.3,
      2026,
    );
    expect(result.resultatFoncierImposable).toBe(5_000);
    expect(result.impotRevenu).toBeCloseTo(1_500);
    expect(result.prelevementsSociaux).toBeCloseTo(5_000 * TAUX_PRELEVEMENTS_SOCIAUX);
  });
});
