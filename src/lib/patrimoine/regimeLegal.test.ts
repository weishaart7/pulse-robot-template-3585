import { describe, it, expect } from 'vitest';
import { determinerRegimeLegal } from './regimeLegal';

// Loi du 13 juillet 1965 : communauté réduite aux acquêts pour les mariages
// célébrés à compter du 1er février 1966.
describe('determinerRegimeLegal', () => {
  it('1er février 1966 : communauté réduite aux acquêts', () => {
    expect(determinerRegimeLegal('1966-02-01')).toBe('Communauté réduite aux acquêts');
  });

  it('31 janvier 1966 : communauté de meubles et d\'acquêts', () => {
    expect(determinerRegimeLegal('1966-01-31')).toBe('Communauté de meubles et d\'acquêts');
  });

  it('sans date : communauté réduite aux acquêts', () => {
    expect(determinerRegimeLegal(undefined)).toBe('Communauté réduite aux acquêts');
  });
});
