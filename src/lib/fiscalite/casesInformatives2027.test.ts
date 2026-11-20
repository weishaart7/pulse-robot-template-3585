import { describe, expect, it } from 'vitest';
import { CASES_INFORMATIVES_2027, TOUTES_CASES_INFORMATIVES_2027 } from './casesInformatives2027';
import { CASES_2027 } from './cases2027';

describe('cases informatives de la déclaration 2027', () => {
  it('114 cases (4BB saisie dans le cadre 4), sans doublon ni recouvrement avec les cases 2027 à effet', () => {
    const codes = TOUTES_CASES_INFORMATIVES_2027.map((c) => c.code);
    expect(codes).toHaveLength(114);
    expect(new Set(codes).size).toBe(114);
    const avecEffet = new Set(Object.values(CASES_2027).flat().map((c) => c.replace(/^case/, '').toUpperCase()));
    expect(codes.filter((c) => avecEffet.has(c))).toEqual([]);
  });

  it('hors non-résidents (3SE, exit tax, 8TD, 8TM, 8TN)', () => {
    const codes = new Set(TOUTES_CASES_INFORMATIVES_2027.map((c) => c.code));
    for (const c of ['3SE', '3TA', '3WM', '3YB', '8TD', '8TM', '8TN']) expect(codes.has(c)).toBe(false);
  });

  it('une ligne a au plus trois colonnes', () => {
    for (const l of CASES_INFORMATIVES_2027) expect(l.cases.length).toBeLessThanOrEqual(3);
  });
});
