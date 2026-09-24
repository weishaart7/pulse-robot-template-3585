import { describe, it, expect } from 'vitest';
import { ageEnAnnees, formatAgeCourt } from './age';

const today = new Date(2026, 8, 24); // 24/09/2026

describe('ageEnAnnees', () => {
  it('compte l\'anniversaire du jour', () => {
    expect(ageEnAnnees(new Date(2000, 8, 24), today)).toBe(26);
  });
  it('retire un an avant l\'anniversaire', () => {
    expect(ageEnAnnees(new Date(2000, 8, 25), today)).toBe(25);
  });
});

describe('formatAgeCourt', () => {
  it('années au-delà d\'un an', () => {
    expect(formatAgeCourt(new Date(2020, 0, 1), today)).toBe('6 ans');
    expect(formatAgeCourt(new Date(2025, 8, 24), today)).toBe('1 an');
  });
  it('mois avant un an', () => {
    expect(formatAgeCourt(new Date(2026, 2, 10), today)).toBe('6 mois');
  });
  it('jours avant un mois', () => {
    expect(formatAgeCourt(new Date(2026, 8, 20), today)).toBe('4 jours');
  });
  it('tiret sans date', () => {
    expect(formatAgeCourt(undefined, today)).toBe('-');
  });
});
