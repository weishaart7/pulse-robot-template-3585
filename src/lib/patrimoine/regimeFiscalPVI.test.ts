import { describe, it, expect } from 'vitest';
import { format, subMonths, subYears } from 'date-fns';
import { computePVIRegime } from './regimeFiscalPVI';
import { computeFiscalRegime } from './regimeFiscalPlusValue';
import { resolveAssetFiscalRegime } from './assetFiscalRegime';

// Date d'acquisition détenue depuis `years` ans révolus (+ 6 mois de marge).
const ilYa = (years: number) => format(subMonths(subYears(new Date(), years), 6), 'yyyy-MM-dd');

// Actif acquis 200 000 € + 10 000 € de frais réels, estimé 400 000 € :
// plus-value latente 190 000 €.
const base = { plusValue: 190000, valeurAcquisition: 200000, fraisAcquisition: 10000 };
const pvFiscale = (r: ReturnType<typeof computePVIRegime>) => Number(r?.note?.match(/imposable ([\d\s  ]+)/)?.[1].replace(/\D/g, ''));

describe('computePVIRegime — forfaits (art. 150 VB II CGI)', () => {
  it('onéreux, > 5 ans, bâti : forfait frais 7,5 % (plus favorable) + forfait travaux 15 %', () => {
    const r = computePVIRegime({ ...base, nature: 'Résidences secondaires', dateAcquisition: ilYa(10), acquisitionOnereuse: true });
    expect(pvFiscale(r)).toBe(190000 + 10000 - 15000 - 30000);
  });

  it('frais réels retenus quand ils dépassent 7,5 %', () => {
    const r = computePVIRegime({ ...base, fraisAcquisition: 20000, plusValue: 180000, nature: 'Résidences secondaires', dateAcquisition: ilYa(3), acquisitionOnereuse: true });
    expect(pvFiscale(r)).toBe(180000);
  });

  it('à titre gratuit : frais réels uniquement, forfait travaux maintenu', () => {
    const r = computePVIRegime({ ...base, nature: 'Résidences secondaires', dateAcquisition: ilYa(10), acquisitionOnereuse: false });
    expect(pvFiscale(r)).toBe(190000 - 30000);
  });

  it('terrain : pas de forfait travaux', () => {
    const r = computePVIRegime({ ...base, nature: 'Terrains', dateAcquisition: ilYa(10), acquisitionOnereuse: true });
    expect(pvFiscale(r)).toBe(190000 + 10000 - 15000);
  });

  it('≤ 5 ans : pas de forfait travaux', () => {
    const r = computePVIRegime({ ...base, nature: 'Résidences secondaires', dateAcquisition: ilYa(3), acquisitionOnereuse: true });
    expect(pvFiscale(r)).toBe(190000 + 10000 - 15000);
  });

  it('plus-value fiscale nulle après forfaits : « Moins-value — aucun impôt »', () => {
    const r = computePVIRegime({ plusValue: 20000, valeurAcquisition: 200000, fraisAcquisition: 0, nature: 'Résidences secondaires', dateAcquisition: ilYa(10), acquisitionOnereuse: true });
    expect(r?.badge).toBe('Moins-value — aucun impôt');
    expect(r?.total).toBe(0);
  });
});

describe('computePVIRegime — surtaxe appréciée par cédant (BOI-RFPI-TPVIE-20)', () => {
  it('couple marié, 90 000 € de plus-value : 45 000 € chacun, pas de surtaxe', () => {
    const r = computePVIRegime({ nature: 'Résidences secondaires', plusValue: 90000, dateAcquisition: ilYa(3), partsCedants: [0.5, 0.5] });
    expect(r?.totalDetail).toBeUndefined();
  });

  it('cédant unique, 90 000 € : surtaxe 2 %', () => {
    const r = computePVIRegime({ nature: 'Résidences secondaires', plusValue: 90000, dateAcquisition: ilYa(3), partsCedants: [1] });
    expect(r?.total).toBeCloseTo(90000 * 0.19 + 90000 * 0.172 + 1800);
  });

  it('badge construit depuis les constantes', () => {
    const r = computePVIRegime({ nature: 'Résidences secondaires', plusValue: 10000, dateAcquisition: ilYa(3) });
    expect(r?.badge).toBe('PVI 36,2%');
  });
});

describe('Or / métaux précieux — option plus-value réelle à 36,2 % (PS 17,2 %)', () => {
  it('3 ans de détention : abattement 5 %, taux 36,2 %', () => {
    const r = computeFiscalRegime({ nature: 'Or et métaux précieux', plusValue: 10000, valeurEstimee: 50000, dateAcquisition: ilYa(3) });
    const reelle = r.alternatives?.find((a) => a.label.startsWith('Option plus-value réelle'));
    expect(r.tone).toBe('choix');
    expect(reelle?.label).toContain('36,2%');
    expect(reelle?.total).toBeCloseTo(10000 * 0.95 * 0.362);
  });
});

describe('resolveAssetFiscalRegime — origine', () => {
  it('donation : pas de forfait frais 7,5 %', () => {
    const r = resolveAssetFiscalRegime({ nature: 'Résidences secondaires', ...base, valeurEstimee: 400000, dateAcquisition: ilYa(3), origineActif: ['Donation'] });
    expect(pvFiscale(r)).toBe(190000);
  });
});

describe('computePVIRegime — cession simulée', () => {
  const base = {
    nature: 'Immeubles locatifs (loués nus)',
    valeurAcquisition: 200_000,
    fraisAcquisition: 0,
    acquisitionOnereuse: true,
    dateAcquisition: '2016-03-01',
  };

  it('apprécie la durée de détention à la date de cession fournie', () => {
    // Plus-value brute 100 000 € ; à 9 ans révolues : abattement IR 24 %.
    const r = computePVIRegime({ ...base, plusValue: 100_000, dateCession: new Date(2025, 5, 1) });
    expect(r?.irDetail).toBe('Abattement 24%');
    const r2 = computePVIRegime({ ...base, plusValue: 100_000, dateCession: new Date(2040, 5, 1) });
    expect(r2?.irDetail).toBe('Abattement 100%');
  });

  it('retient les travaux réels s’ils sont plus favorables que le forfait de 15 %, sans cumul', () => {
    const forfait = computePVIRegime({ ...base, plusValue: 100_000, dateCession: new Date(2025, 5, 1) });
    const reels = computePVIRegime({ ...base, plusValue: 100_000, dateCession: new Date(2025, 5, 1), travauxReels: 50_000 });
    const reelsFaibles = computePVIRegime({ ...base, plusValue: 100_000, dateCession: new Date(2025, 5, 1), travauxReels: 10_000 });
    // Forfait 15 % = 30 000 € ; travaux réels 50 000 € → base réduite de 20 000 € de plus.
    expect(reels!.ir!).toBeLessThan(forfait!.ir!);
    expect(reelsFaibles!.ir!).toBeCloseTo(forfait!.ir!, 6);
  });

  it('admet les travaux réels avant 5 ans de détention (pas de forfait)', () => {
    const sans = computePVIRegime({ ...base, plusValue: 100_000, dateCession: new Date(2019, 5, 1) });
    const avec = computePVIRegime({ ...base, plusValue: 100_000, dateCession: new Date(2019, 5, 1), travauxReels: 20_000 });
    expect(avec!.ir!).toBeLessThan(sans!.ir!);
  });

  it('majore la plus-value LMNP des amortissements réintégrés, forfait 7,5 % sur le prix brut', () => {
    const lmnp = { ...base, nature: 'Immeubles locatifs (meublés)', dateCession: new Date(2025, 5, 1) };
    const sans = computePVIRegime({ ...lmnp, plusValue: 100_000 });
    const avec = computePVIRegime({ ...lmnp, plusValue: 100_000, amortissementsReintegres: 40_000 });
    // Même abattement : l'IR croît de 40 000 × (1 − 24 %) × 19 %.
    expect(avec!.ir! - sans!.ir!).toBeCloseTo(40_000 * 0.76 * 0.19, 6);
    expect(avec!.note).toContain('Amortissements déduits réintégrés');
  });
});

describe('computePVIRegime — natures immobilières (référentiel 2026-10-18)', () => {
  it('parts (SCPI, SCI, groupements) : aucun forfait (art. 150 UB)', () => {
    for (const nature of ['Parts de SCPI', 'Parts de SCI', 'Parts de groupements fonciers']) {
      const r = computePVIRegime({ ...base, nature, dateAcquisition: ilYa(10), acquisitionOnereuse: true });
      expect(pvFiscale(r)).toBe(190000);
    }
  });

  it('prix de cession ≤ 15 000 € : exonération, sauf pour les parts', () => {
    const parking = computePVIRegime({ nature: 'Parking / Garage / Box', plusValue: 5000, dateAcquisition: ilYa(3), prixCession: 14000 });
    expect(parking?.total).toBe(0);
    const scpi = computePVIRegime({ nature: 'Parts de SCPI', plusValue: 5000, dateAcquisition: ilYa(3), prixCession: 14000 });
    expect(scpi?.total).toBeGreaterThan(0);
  });

  it('terrain à bâtir : pas de surtaxe', () => {
    const args = { nature: 'Terrains', plusValue: 300000, dateAcquisition: ilYa(3) };
    const nonConstructible = computePVIRegime(args)!;
    const constructible = computePVIRegime({ ...args, terrainConstructible: true })!;
    expect(nonConstructible.total! - constructible.total!).toBeCloseTo(0.06 * 300000, 0);
  });

  it('terrains agricoles et bois & forêts : régime général', () => {
    expect(computePVIRegime({ nature: 'Terrains agricoles', plusValue: 10000, dateAcquisition: ilYa(3) })?.tone).toBe('pfu');
    expect(computePVIRegime({ nature: 'Bois & forêts', plusValue: 10000, dateAcquisition: ilYa(3) })?.tone).toBe('pfu');
  });

  it('bois & forêts : IR réduit de 10 €/ha/an', () => {
    const sans = computePVIRegime({ nature: 'Bois & forêts', plusValue: 100000, dateAcquisition: ilYa(3) })!;
    const avec = computePVIRegime({ nature: 'Bois & forêts', plusValue: 100000, dateAcquisition: ilYa(3), surfaceBoiseeHa: 20.7 })!;
    expect(sans.ir! - avec.ir!).toBe(20 * 3 * 10);
    expect(avec.ps).toBe(sans.ps);
  });

  it('maison mobile non fixée : bien meuble (5 %/an après 2 ans, exonérée ≤ 5 000 €)', () => {
    const r = computePVIRegime({ nature: 'Maison mobile (péniche, etc.)', plusValue: 10000, dateAcquisition: ilYa(4), prixCession: 80000 })!;
    expect(r.total).toBeCloseTo(10000 * 0.9 * 0.362, 6);
    expect(computePVIRegime({ nature: 'Maison mobile (péniche, etc.)', plusValue: 1000, dateAcquisition: ilYa(4), prixCession: 4000 })?.total).toBe(0);
    const fixee = computePVIRegime({ nature: 'Maison mobile (péniche, etc.)', plusValue: 10000, dateAcquisition: ilYa(4), prixCession: 80000, fixeAuSol: true })!;
    expect(fixee.total).toBeCloseTo(10000 * 0.362, 6);
  });

  it('LMP : régime professionnel informatif', () => {
    expect(computePVIRegime({ nature: 'Immeubles locatifs (meublés)', typeLocation: 'Location meublée professionnelle (LMP)', plusValue: 10000, dateAcquisition: ilYa(3) })?.tone).toBe('informatif');
  });
});

describe('resolveAssetFiscalRegime — parts de SCI selon le régime de la société', () => {
  const args = { nature: 'Parts de SCI', plusValue: 10000, valeurEstimee: 100000, dateAcquisition: ilYa(10) };
  it('IS : PFU 31,4 % sans abattement', () => {
    expect(resolveAssetFiscalRegime({ ...args, regimeSociete: 'Impôt sur les sociétés' }).total).toBeCloseTo(3140, 6);
  });
  it('IR : plus-value immobilière avec abattements', () => {
    expect(resolveAssetFiscalRegime({ ...args, regimeSociete: 'Impôt sur le revenu' }).irDetail).toBe('Abattement 30%');
  });
  it('régime inconnu : non déterminé', () => {
    expect(resolveAssetFiscalRegime(args).tone).toBe('non_determine');
  });
});

describe('computeFiscalRegime — placements financiers (2026-10-18)', () => {
  it('FIP / FCPI : PFU avant 5 ans, PS seuls après', () => {
    expect(computeFiscalRegime({ nature: 'Parts de FCPI', plusValue: 1000, valeurEstimee: 5000, dateAcquisition: ilYa(3) }).total).toBeCloseTo(314, 6);
    expect(computeFiscalRegime({ nature: 'Parts de FIP', plusValue: 1000, valeurEstimee: 5000, dateAcquisition: ilYa(6) }).total).toBeCloseTo(186, 6);
  });

  it('club deals, SPV, SOFICA, autres valeurs mobilières : PFU', () => {
    for (const nature of ['Club deals', "SPV d'investissement (structures ad hoc)", 'Parts de SOFICA', 'Autres valeurs mobilières']) {
      expect(computeFiscalRegime({ nature, plusValue: 1000, valeurEstimee: 5000 }).total).toBeCloseTo(314, 6);
    }
  });

  it('autres placements divers : PFU par hypothèse', () => {
    expect(computeFiscalRegime({ nature: 'Autres placements divers', plusValue: 1000, valeurEstimee: 5000 }).total).toBeCloseTo(314, 6);
  });

  it('NFT : régime selon la qualification, non déterminé sans elle', () => {
    const base = { nature: 'Objets numériques (NFT, etc.)', plusValue: 2000, valeurEstimee: 10000, dateAcquisition: ilYa(4) };
    expect(resolveAssetFiscalRegime(base).tone).toBe('non_determine');
    expect(resolveAssetFiscalRegime({ ...base, qualificationNft: 'actif_numerique' }).total).toBeCloseTo(628, 6);
    expect(resolveAssetFiscalRegime({ ...base, qualificationNft: 'titre_financier' }).total).toBeCloseTo(628, 6);
    expect(resolveAssetFiscalRegime({ ...base, qualificationNft: 'oeuvre_art' }).alternatives?.[0].total).toBeCloseTo(650, 6);
    expect(resolveAssetFiscalRegime({ ...base, qualificationNft: 'bien_meuble' }).total).toBeCloseTo(2000 * 0.9 * 0.362, 6);
  });

  it('métaux précieux : taxe forfaitaire due quel que soit le prix', () => {
    const r = computeFiscalRegime({ nature: 'Or et métaux précieux', plusValue: 1000, valeurEstimee: 4500 });
    expect(r.tone).toBe('choix');
    expect(r.alternatives?.[0].total).toBeCloseTo(4500 * 0.115, 6);
  });

  it('régimes de retraite étrangers : non pris en compte', () => {
    const r = resolveAssetFiscalRegime({ nature: 'Régimes de retraite étrangers', plusValue: 1000, valeurEstimee: 5000 });
    expect(r.badge).toBe('Non pris en compte');
  });
});

describe('computeFiscalRegime — épargne salariale', () => {
  it('PEE / PEI : IR exonéré, PS 18,6 %', () => {
    for (const nature of ['PEE', 'PEI']) {
      const r = computeFiscalRegime({ nature, plusValue: 1000, valeurEstimee: 5000 });
      expect(r.ir).toBe(0);
      expect(r.total).toBeCloseTo(186, 6);
    }
  });
});

describe('computeCorporelRegime — actifs corporels', () => {
  it('meubles meublants et véhicules : exonérés', () => {
    expect(resolveAssetFiscalRegime({ nature: 'Véhicules motorisés', plusValue: 3000, valeurEstimee: 30000 }).total).toBe(0);
  });

  it('objets précieux : exonérés ≤ 5 000 €, sinon choix taxe 6,5 % / plus-value réelle', () => {
    expect(resolveAssetFiscalRegime({ nature: 'Montres', plusValue: 100, valeurEstimee: 4500 }).total).toBe(0);
    const r = resolveAssetFiscalRegime({ nature: 'Montres', plusValue: 2000, valeurEstimee: 10000, dateAcquisition: ilYa(4) });
    expect(r.tone).toBe('choix');
    expect(r.alternatives?.[0].total).toBeCloseTo(650, 6);
    expect(r.alternatives?.[1].total).toBeCloseTo(2000 * 0.9 * 0.362, 6);
  });

  it('biens meubles ordinaires (vins, sacs, matériel) : 5 %/an après 2 ans', () => {
    const r = resolveAssetFiscalRegime({ nature: "Vins & spiritueux d'investissement", plusValue: 4000, valeurEstimee: 12000, dateAcquisition: ilYa(4) });
    expect(r.total).toBeCloseTo(4000 * 0.9 * 0.362, 6);
    expect(resolveAssetFiscalRegime({ nature: 'Sacs et accessoires de luxe', plusValue: 500, valeurEstimee: 3000, dateAcquisition: ilYa(4) }).total).toBe(0);
  });
});

describe('computeFiscalRegime — actifs professionnels', () => {
  it('droits sociaux : PFU, abattement de 500 000 € au départ à la retraite sur l\'IR seul', () => {
    const sans = computeFiscalRegime({ nature: 'Droits sociaux', plusValue: 800000, valeurEstimee: 1000000 });
    expect(sans.total).toBeCloseTo(800000 * 0.314, 6);
    const retraite = computeFiscalRegime({ nature: 'Parts de holding', plusValue: 800000, valeurEstimee: 1000000, cessionDepartRetraite: true });
    expect(retraite.ir).toBeCloseTo(300000 * 0.128, 6);
    expect(retraite.ps).toBeCloseTo(800000 * 0.186, 6);
  });

  it('entreprise individuelle : informatif', () => {
    expect(computeFiscalRegime({ nature: 'Entreprise individuelle', plusValue: 1000, valeurEstimee: 5000 }).tone).toBe('informatif');
  });
});

describe('computeFiscalRegime — autres', () => {
  it("droits d'auteur : informatif ; royalties : non déterminé", () => {
    expect(computeFiscalRegime({ nature: 'Droits de propriété littéraire ou artistique', plusValue: 1000, valeurEstimee: 5000 }).tone).toBe('informatif');
    expect(computeFiscalRegime({ nature: 'Droits à royalties', plusValue: 1000, valeurEstimee: 5000 }).tone).toBe('non_determine');
  });
});

describe('Fonds de capital-investissement : régime selon le type de fonds', () => {
  const base = { nature: 'Fonds de capital-investissement', plusValue: 1000, valeurEstimee: 5000 };

  it('FCPI / FIP / FIP Corse : PFU avant 5 ans, PS seuls après', () => {
    expect(resolveAssetFiscalRegime({ ...base, typeFonds: 'fcpi', dateAcquisition: ilYa(3) }).total).toBeCloseTo(314, 6);
    expect(resolveAssetFiscalRegime({ ...base, typeFonds: 'fip_corse', dateAcquisition: ilYa(6) }).total).toBeCloseTo(186, 6);
  });

  it('FCPR / FPCI : régime private equity', () => {
    expect(resolveAssetFiscalRegime({ ...base, typeFonds: 'fcpr_fpci', dateAcquisition: ilYa(6) }).badge).toBe('FCPR/FPCI ≥ 5 ans');
  });

  it('type non renseigné : régime à préciser, rien de deviné', () => {
    const r = resolveAssetFiscalRegime({ ...base, dateAcquisition: ilYa(6) });
    expect(r.tone).toBe('non_determine');
    expect(r.total).toBeNull();
  });
});
