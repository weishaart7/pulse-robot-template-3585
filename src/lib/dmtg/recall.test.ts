/**
 * Exonération de droits de succession pour frère/sœur (art. 796-0 ter CGI),
 * purement déclarative (Beneficiary.exonerationSuccession, reporté depuis
 * family_links.exoneration_succession — aucune des 3 conditions légales
 * n'est vérifiée par l'app). Même mécanique que conjoint/pacs : abattement
 * infini (recall.ts) + retour anticipé taxe: 0 (tax.ts).
 */
import { describe, it, expect } from 'vitest';
import { computeRecallAndAllowances } from './recall';
import { computeProgressiveTax } from './tax';
import { Beneficiary, DmtgParams } from './types';
import dmtgParamsData from './params-dmtg.json';

const params = dmtgParamsData as DmtgParams;

const frereSoeur = (exonerationSuccession: boolean): Beneficiary => ({
  id: 'frere',
  lien: 'frere_soeur',
  exonerationSuccession,
});

describe('computeRecallAndAllowances — frère/sœur exonéré (art. 796-0 ter CGI)', () => {
  it('exonerationSuccession = true : abattement infini, comme conjoint/pacs', () => {
    const result = computeRecallAndAllowances({
      beneficiary: frereSoeur(true),
      donations15y: [],
      params,
    });

    expect(result.allowanceGeneralResidual).toBe(Infinity);
    expect(result.details.abattementBase).toBe(Infinity);
  });

  it('exonerationSuccession = false : abattement frère/sœur normal (15 932€), non-régression', () => {
    const result = computeRecallAndAllowances({
      beneficiary: frereSoeur(false),
      donations15y: [],
      params,
    });

    expect(result.allowanceGeneralResidual).toBe(15932);
    expect(result.details.abattementBase).toBe(15932);
  });

  it('exonerationSuccession absent (undefined) : se comporte comme false, non-régression', () => {
    const result = computeRecallAndAllowances({
      beneficiary: { id: 'frere', lien: 'frere_soeur' },
      donations15y: [],
      params,
    });

    expect(result.allowanceGeneralResidual).toBe(15932);
  });
});

describe('computeProgressiveTax — frère/sœur exonéré', () => {
  it('exonerationSuccession = true : taxe nulle quel que soit le montant, retour anticipé comme conjoint/pacs', () => {
    const result = computeProgressiveTax(500000, 'frere_soeur', 0, params, false, true);

    expect(result.taxe).toBe(0);
    expect(result.trancheDetails).toEqual([{ from: 0, to: 500000, rate: 0, base: 500000, duty: 0 }]);
  });

  it('exonerationSuccession = false : barème frère/sœur normal appliqué, non-régression', () => {
    const result = computeProgressiveTax(84068, 'frere_soeur', 0, params, false, false);

    // 24 430 × 35% + (84 068 − 24 430) × 45% = 8 550,5 + 26 837,1 = 35 387,6 → 35 388
    expect(result.taxe).toBe(35388);
    expect(result.taxe).toBeGreaterThan(0);
  });
});

describe('droits totaux frère/sœur — chaînage abattement + barème (mécanique de dmtg/index.ts)', () => {
  const computeDroits = (exonere: boolean) => {
    const beneficiary = frereSoeur(exonere);
    const baseApresFrais = 100000;

    const recallResult = computeRecallAndAllowances({ beneficiary, donations15y: [], params });
    const taxableAfterAllowance = Math.max(
      0,
      baseApresFrais - (recallResult.allowanceGeneralResidual === Infinity ? baseApresFrais : recallResult.allowanceGeneralResidual)
    );
    const taxResult = computeProgressiveTax(
      taxableAfterAllowance,
      beneficiary.lien,
      recallResult.consumedBracketsAmount,
      params,
      beneficiary.comesFromRepresentationWithPlurality,
      beneficiary.exonerationSuccession
    );
    return taxResult.taxe;
  };

  it('exoneration_succession = true : ne paie aucun droit', () => {
    expect(computeDroits(true)).toBe(0);
  });

  it('exoneration_succession = false : continue de payer normalement (non-régression)', () => {
    expect(computeDroits(false)).toBeGreaterThan(0);
    // 100 000 − 15 932 = 84 068 imposables → mêmes 35 388€ que le test ci-dessus.
    expect(computeDroits(false)).toBe(35388);
  });
});
