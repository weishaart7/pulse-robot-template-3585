import { describe, expect, it } from 'vitest';
import type { Asset, AssetCharge, AssetRevenu } from '@/services/assetService';
import {
  buildBienFoncierInput,
  buildPartsFoncieresInput,
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

  it('impute les intérêts en priorité sur les loyers : le déficit restant est imputable sur le revenu global', () => {
    // Loyers 5 000 couvrent les intérêts 3 000 ; le déficit (6 000) vient des autres charges.
    const result = computeFoyerFoncier(
      [makeBien({ loyersBruts: 5_000, chargesHorsInterets: 8_000, interetsEtAssuranceEmprunt: 3_000 })],
      [],
      0.3,
    );
    expect(result.resultatFoncierGlobal).toBe(-6_000);
    expect(result.deficitImputableRevenuGlobal).toBe(6_000);
    expect(result.nouveauDeficitReportableInterets).toBe(0);
    expect(result.nouveauDeficitReportableHorsInterets).toBe(0);
  });

  it('impute sur le revenu global un déficit dû aux intérêts tant que les loyers couvrent ces intérêts', () => {
    const result = computeFoyerFoncier(
      [makeBien({ loyersBruts: 10_000, chargesHorsInterets: 2_000, interetsEtAssuranceEmprunt: 9_000 })],
      [],
      0.3,
    );
    expect(result.resultatAvantInterets).toBe(8_000);
    expect(result.resultatFoncierGlobal).toBe(-1_000);
    expect(result.deficitImputableRevenuGlobal).toBe(1_000);
    expect(result.nouveauDeficitReportableInterets).toBe(0);
    expect(result.nouveauDeficitReportableHorsInterets).toBe(0);
  });

  it('reporte la seule fraction des intérêts qui dépasse les loyers', () => {
    // Intérêts 4 000 > loyers 2 000 : 2 000 d'intérêts reportés, les 5 000 de charges imputables.
    const result = computeFoyerFoncier(
      [makeBien({ loyersBruts: 2_000, chargesHorsInterets: 5_000, interetsEtAssuranceEmprunt: 4_000 })],
      [],
      0.3,
    );
    expect(result.deficitImputableRevenuGlobal).toBe(5_000);
    expect(result.nouveauDeficitReportableInterets).toBe(2_000);
    expect(result.nouveauDeficitReportableHorsInterets).toBe(0);
  });

  it('cumule plafond et report d’intérêts quand les deux s’appliquent', () => {
    const result = computeFoyerFoncier(
      [makeBien({ loyersBruts: 1_000, chargesHorsInterets: 20_000, interetsEtAssuranceEmprunt: 3_000 })],
      [],
      0.3,
    );
    expect(result.nouveauDeficitReportableInterets).toBe(2_000);
    expect(result.deficitImputableRevenuGlobal).toBe(PLAFOND_DEFICIT_FONCIER);
    expect(result.nouveauDeficitReportableHorsInterets).toBe(20_000 - PLAFOND_DEFICIT_FONCIER);
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

describe('parts de société au régime des revenus fonciers (SCPI)', () => {
  const direct = { quotePart: 100, loyersBruts: 6000, chargesHorsInterets: 1000, interetsEtAssuranceEmprunt: 0 };
  const scpi = buildPartsFoncieresInput({ id: 's', nature: 'Parts de SCPI', revenus_distribues_12m: 3500, pourcentage_utilisateur: 50, pourcentage_conjoint: 50 } as never);

  it('revenus distribués à la quote-part du foyer, sans charges ni intérêts', () => {
    expect(scpi).toMatchObject({ loyersBruts: 3500, chargesHorsInterets: 0, interetsEtAssuranceEmprunt: 0, quotePart: 100, partsSociete: true, revenusDistribues: true });
  });

  it('avec un bien loué nu en direct : comptées dans le seuil, micro-foncier ouvert', () => {
    const r = computeFoyerFoncier([direct, scpi], [], 0.3);
    expect(r.loyersBrutsFoyer).toBe(9500);
    expect(r.microFoncierFermeParts).toBe(false);
    expect(r.eligibleMicroFoncier).toBe(true);
  });

  it('parts seules : micro-foncier fermé (art. 32 CGI), réel obligatoire', () => {
    const r = computeFoyerFoncier([scpi], [], 0.3);
    expect(r.microFoncierFermeParts).toBe(true);
    expect(r.eligibleMicroFoncier).toBe(false);
    expect(r.regimeReelObligatoire).toBe(true);
    expect(r.resultatFoncierImposable).toBe(3500);
  });
});
