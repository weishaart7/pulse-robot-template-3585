import { describe, expect, it } from 'vitest';
import { calculerInvestissementsForestiers } from './calculerInvestissementsForestiers';
import { ReductionsCreditsImpotInput } from './types';

/** Valeurs relevées sur le simulateur officiel 2026 (baisse de l'impôt ou restitution). */
const c = (o: Partial<ReductionsCreditsImpotInput>, couple = true) =>
  calculerInvestissementsForestiers(o as ReductionsCreditsImpotInput, couple).credit;

describe('calculerInvestissementsForestiers', () => {
  it.each([
    ['case7un', 250], ['case7ul', 760], ['case7up', 250], ['case7ut', 250],
    ['case7tr', 180], ['case7ts', 250], ['case7tt', 180], ['case7tu', 250], ['case7tv', 180], ['case7tw', 250],
    ['case7ta', 180], ['case7tb', 250], ['case7vq', 180], ['case7te', 180], ['case7vr', 250], ['case7tf', 250],
    ['case7vs', 180], ['case7th', 180], ['case7vu', 250], ['case7ti', 250], ['case7vv', 250], ['case7tj', 250],
    ['case7vt', 250], ['case7tk', 250],
  ])('%s 1 000 € → %i €', (cle, attendu) => {
    expect(c({ [cle]: 1000 })).toBe(attendu);
  });
  it('plafonds de 12 500 € (couple) et 6 250 € (seul)', () => {
    expect(c({ case7up: 100000 })).toBe(3125);
    expect(c({ case7tr: 100000 })).toBe(2250);
    expect(c({ case7ul: 100000 })).toBe(9500);
    expect(c({ case7up: 100000 }, false)).toBe(1563);
    expect(c({ case7ul: 100000 }, false)).toBe(4750);
  });
  it('acquisition et assurance hors du plafond des travaux', () => {
    expect(c({ case7un: 10000, case7up: 10000 })).toBe(5000);
    expect(c({ case7un: 20000, case7up: 20000, case7ul: 1000 })).toBe(7010);
  });
  it('travaux : plafond commun, reports d’abord, du plus ancien au plus récent', () => {
    expect(c({ case7up: 10000, case7ut: 10000 })).toBe(3125);
    expect(c({ case7tr: 10000, case7ts: 10000 })).toBe(2950);
    expect(c({ case7tr: 5000, case7up: 10000 })).toBe(2775);
    expect(c({ case7tr: 2000, case7up: 10000 })).toBe(2860);
    expect(c({ case7tr: 11000, case7up: 10000 })).toBe(2355);
    expect(c({ case7vq: 12500, case7vt: 12500 })).toBe(2250);
    expect(c({ case7ts: 10000, case7up: 10000, case7tr: 10000 })).toBe(2950);
    expect(c({ case7up: 4000, case7tk: 4000, case7vq: 4000 })).toBe(2720);
  });
});
