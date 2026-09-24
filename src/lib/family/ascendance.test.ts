import { describe, it, expect } from 'vitest';
import { verifierCoherenceAscendance, rattachementsComplets } from './familyLinkRules';

const P1 = { id: 'p1', lien_familial: 'Parent', enfant_de: 'user', date_naissance: '1960-01-01' };
const P2 = { id: 'p2', lien_familial: 'Parent', enfant_de: 'user', date_naissance: '1962-01-01' };
const ctx = { dateNaissanceClient: '1990-05-01', dateNaissanceConjoint: '1992-03-01' };

describe('R1-R4 : deux parents au plus', () => {
  it('refuse un 3e parent du client', () => {
    const e = verifierCoherenceAscendance({ lien_familial: 'Parent', enfant_de: 'user' }, [P1, P2], ctx);
    expect(e.map(x => x.path)).toContain('enfant_de');
  });
  it('accepte un parent du conjoint quand le client en a deux', () => {
    expect(verifierCoherenceAscendance({ lien_familial: 'Parent', enfant_de: 'spouse' }, [P1, P2], ctx)).toEqual([]);
  });
  it('ne compte pas le membre modifié', () => {
    expect(verifierCoherenceAscendance({ ...P2 }, [P1, P2], { ...ctx, editingId: 'p2' })).toEqual([]);
  });
  it('limite les grands-parents par parent', () => {
    const gp = (id: string) => ({ id, lien_familial: 'Grand-parent', enfant_de: 'p1' });
    expect(rattachementsComplets('Grand-parent', [gp('g1'), gp('g2')]).has('p1')).toBe(true);
    expect(rattachementsComplets('Grand-parent', [gp('g1')]).has('p1')).toBe(false);
  });
  it('ne limite pas les enfants', () => {
    expect(rattachementsComplets('Enfant', [{ lien_familial: 'Enfant', enfant_de: 'user' }, { lien_familial: 'Enfant', enfant_de: 'user' }]).size).toBe(0);
  });
});

describe('R5 : chronologie des naissances', () => {
  it('parent né après le client', () => {
    const e = verifierCoherenceAscendance({ lien_familial: 'Parent', enfant_de: 'user', date_naissance: '1995-01-01' }, [], ctx);
    expect(e[0].path).toBe('date_naissance');
  });
  it('enfant commun né avant le conjoint', () => {
    const e = verifierCoherenceAscendance({ lien_familial: 'Enfant', enfant_de: 'both_parents', date_naissance: new Date(1991, 0, 1) }, [], ctx);
    expect(e).toHaveLength(1);
  });
  it('grand-parent né après le parent de rattachement', () => {
    const e = verifierCoherenceAscendance({ lien_familial: 'Grand-parent', enfant_de: 'p1', date_naissance: '1970-01-01' }, [P1], ctx);
    expect(e).toHaveLength(1);
  });
  it('parent modifié né avant son propre grand-parent rattaché', () => {
    const gp = { id: 'g1', lien_familial: 'Grand-parent', enfant_de: 'p1', date_naissance: '1965-01-01' };
    const e = verifierCoherenceAscendance({ ...P1 }, [P1, gp], { ...ctx, editingId: 'p1' });
    expect(e).toHaveLength(1);
  });
  it('enfant modifié né après son petit-enfant rattaché', () => {
    const c = { id: 'c1', lien_familial: 'Enfant', enfant_de: 'user', date_naissance: '2030-01-01' };
    const pe = { id: 'pe', lien_familial: 'Petit-enfant', enfant_de: 'c1', date_naissance: '2025-01-01' };
    expect(verifierCoherenceAscendance(c, [c, pe], { ...ctx, editingId: 'c1' }).some(e => e.path === 'date_naissance')).toBe(true);
  });
  it('dates absentes : pas d\'erreur', () => {
    expect(verifierCoherenceAscendance({ lien_familial: 'Parent', enfant_de: 'user' }, [], {})).toEqual([]);
  });
});
