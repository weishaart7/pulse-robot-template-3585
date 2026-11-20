import { describe, expect, it } from 'vitest';
import { CASES_2027, JUMELLES_CADRE_7_2027, masquerCases2027 } from './cases2027';
import { LIBELLES_CADRE_7_2027 } from './libellesCases2027';
import { REGLES_PINEL } from './calculerInvestissementsPinel';
import { REGLES_SCELLIER } from './calculerInvestissementsScellier';
import { REGLES_CENSI_BOUVARD } from './calculerInvestissementsCensiBouvard';
import { REGLES_OUTRE_MER } from './calculerInvestissementsOutreMer';
import { calculerPrelevementSourceDivers, PRELEVEMENT_SOURCE_DIVERS_VIDE } from './calculerPrelevementSourceDivers';

const tables = [REGLES_PINEL, REGLES_SCELLIER, REGLES_CENSI_BOUVARD, REGLES_OUTRE_MER] as Partial<Record<string, object>>[];
const sansLibelle = (r: object | undefined) => { const { libelle: _l, ...reste } = (r ?? {}) as { libelle?: string }; return reste; };

describe('cases de la déclaration 2027', () => {
  it('chaque case du cadre 7 reprend exactement la règle de sa jumelle (nature, taux, plafond, millésime)', () => {
    for (const [nouvelle, jumelle] of Object.entries(JUMELLES_CADRE_7_2027)) {
      const table = tables.find(t => t[jumelle]);
      expect(table, `${nouvelle} → ${jumelle}`).toBeDefined();
      expect(sansLibelle(table?.[nouvelle])).toEqual(sansLibelle(table?.[jumelle]));
    }
  });

  it('111 cases au cadre 7, toutes libellées dans la section 2027 du formulaire', () => {
    expect(CASES_2027.reductions).toHaveLength(111);
    expect(new Set(LIBELLES_CADRE_7_2027.map(l => l.cle))).toEqual(new Set(CASES_2027.reductions));
  });

  it('neutralisées pour les revenus 2025, conservées à partir des revenus 2026', () => {
    const saisie = { case7ud: 100, case7ni: 1000, case7cz: 5000 };
    expect(masquerCases2027(saisie, 'reductions', 2025)).toEqual({ case7ud: 100, case7ni: null, case7cz: null });
    expect(masquerCases2027(saisie, 'reductions', 2026)).toBe(saisie);
    expect(masquerCases2027({ case8hc: 2000, case8hx: 300 }, 'prelevementSource', 2025)).toEqual({ case8hc: null, case8hx: 300 });
    expect(masquerCases2027(null, 'gains', 2025)).toBeNull();
  });

  it('cadre 8 : acomptes de PS 8HU/8IU, taxe holdings 8HC, crédit 8WB et report 8PX (simulateur calc-2027)', () => {
    const r = calculerPrelevementSourceDivers({ ...PRELEVEMENT_SOURCE_DIVERS_VIDE, case8hx: 200, case8hu: 300, case8iu: 100,
      case8hc: 2000, case8wb: 3000, case8px: 500 });
    expect(r.prelevementsSociauxDejaPayes).toBe(600);
    expect(r.taxeHoldings).toBe(2000);
    expect(r.creditsRestituables).toBe(3000);
    expect(r.reductions).toBe(500);
  });
});
