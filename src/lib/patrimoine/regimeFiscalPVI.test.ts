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
    const r = computeFiscalRegime({ nature: 'Or (physique)', plusValue: 10000, valeurEstimee: 50000, dateAcquisition: ilYa(3) });
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
    const lmnp = { ...base, nature: 'Immeubles locatifs (LMNP)', dateCession: new Date(2025, 5, 1) };
    const sans = computePVIRegime({ ...lmnp, plusValue: 100_000 });
    const avec = computePVIRegime({ ...lmnp, plusValue: 100_000, amortissementsReintegres: 40_000 });
    // Même abattement : l'IR croît de 40 000 × (1 − 24 %) × 19 %.
    expect(avec!.ir! - sans!.ir!).toBeCloseTo(40_000 * 0.76 * 0.19, 6);
    expect(avec!.note).toContain('Amortissements déduits réintégrés');
  });
});
