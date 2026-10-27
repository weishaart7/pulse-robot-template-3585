import { describe, expect, it } from 'vitest';
import { calculerCEHR } from './calculerCEHR';

describe('calculerCEHR', () => {
  it('nulle sous le seuil', () => {
    expect(calculerCEHR(250_000, 'celibataire')).toBe(0);
    expect(calculerCEHR(500_000, 'marie')).toBe(0);
  });

  it('3 % dans la première tranche', () => {
    expect(calculerCEHR(400_000, 'celibataire')).toBe(4_500);
    expect(calculerCEHR(800_000, 'pacse')).toBe(9_000);
  });

  it('3 % puis 4 % au-delà de la seconde limite', () => {
    expect(calculerCEHR(700_000, 'celibataire')).toBe(7_500 + 8_000);
    expect(calculerCEHR(1_500_000, 'marie')).toBe(15_000 + 20_000);
  });

  it('seuil de personne seule hors mariés et pacsés', () => {
    expect(calculerCEHR(600_000, 'divorce')).toBe(7_500 + 4_000);
    expect(calculerCEHR(600_000, 'veuf')).toBe(7_500 + 4_000);
  });
});
