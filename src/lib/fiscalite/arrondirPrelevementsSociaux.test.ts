import { describe, expect, it } from 'vitest';
import { arrondirPrelevementsSociaux, BasesPrelevementsSociaux } from './arrondirPrelevementsSociaux';

const bases = (b: Partial<BasesPrelevementsSociaux> = {}): BasesPrelevementsSociaux => ({
  patrimoine: 0, csgCrdsPatrimoineSeule: 0, foncier: 0, assuranceVie: 0, neutralisePatrimoine: 0, neutraliseFoncier: 0,
  exonerationTotaleCsgCrds: false, exonerePatrimoine: 0, exonereFoncier: 0, activite: 0,
  contributionSalariale10: 0, carriedInterest: 0, contributionSalariale30: 0, ...b,
});

describe('arrondirPrelevementsSociaux', () => {
  it('rentes 1AW 25 000 + 1CW 30 000 (base 29 500) : 3 275 + 2 213 = 5 488 € (ClickImpôts)', () => {
    const r = arrondirPrelevementsSociaux(bases({ patrimoine: 29500 }));
    expect(r.csgCrdsPatrimoine).toBe(3275);
    expect(r.solidarite).toBe(2213);
    expect(r.total).toBe(5488);
  });

  it('chaque case réduite de 1 € (base 29 498,90) : arrondi inférieur, 5 486 € (ClickImpôts)', () => {
    expect(arrondirPrelevementsSociaux(bases({ patrimoine: 24999 * 0.7 + 29999 * 0.4 })).total).toBe(5486);
  });

  it('additionne les bases du foyer avant arrondi', () => {
    // Dividendes 4,50 € + rente 4,50 € : 1 € de CSG-CRDS sur 9 €, contre 2 × 0 € arrondis séparément.
    expect(arrondirPrelevementsSociaux(bases({ patrimoine: 9 })).csgCrdsPatrimoine).toBe(1);
  });

  it('solidarité commune au patrimoine et au foncier, CSG-CRDS distincte', () => {
    const r = arrondirPrelevementsSociaux(bases({ patrimoine: 10000, foncier: 10000 }));
    expect(r.csgCrdsPatrimoine).toBe(1110);
    expect(r.csgCrdsFoncier).toBe(970);
    expect(r.solidarite).toBe(1500);
  });

  it('1TT 100 000 + 3VN 50 000 : 9 700 + 15 000 = 24 700 € (ClickImpôts)', () => {
    const r = arrondirPrelevementsSociaux(bases({ activite: 100000, contributionSalariale10: 150000 }));
    expect(r.total).toBe(24700);
  });

  it('exonération totale : seule la solidarité reste due, carried-interest non exonéré', () => {
    const r = arrondirPrelevementsSociaux(bases({ patrimoine: 10000, foncier: 10000, carriedInterest: 1000, exonerationTotaleCsgCrds: true }));
    expect(r.csgCrdsPatrimoine).toBe(111);
    expect(r.csgCrdsFoncier).toBe(0);
    expect(r.reductionExoneration).toBe(2080);
  });

  it('8TK réduit toutes les contributions, plafonné à la base', () => {
    const r = arrondirPrelevementsSociaux(bases({ patrimoine: 10000, neutralisePatrimoine: 15000 }));
    expect(r.total).toBe(0);
    expect(r.neutralisation8TK).toBe(1860);
  });

  it('assurance-vie à 17,2 % : 2CH = 50 000 € → 8 600 € (ClickImpôts)', () => {
    const r = arrondirPrelevementsSociaux(bases({ assuranceVie: 50000 }));
    expect(r.csgCrdsFoncier).toBe(4850);
    expect(r.solidarite).toBe(3750);
    expect(r.total).toBe(8600);
  });
});
