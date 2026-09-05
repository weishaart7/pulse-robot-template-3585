import { describe, expect, it } from 'vitest';
import { calculerRevenuSalaires } from './calculerRevenuSalaires';
import { RevenusSalairesInput } from './types';

function makeInput(overrides: Partial<RevenusSalairesInput> = {}): RevenusSalairesInput {
  return {
    case1aj: null, case1bj: null,
    case1aa: null, case1ba: null,
    case1ga: null, case1ha: null,
    case1gh: null, case1hh: null,
    case1pb: null, case1pc: null,
    case1ad: null, case1bd: null,
    case1av: false, case1bv: false,
    case1gb: null, case1hb: null,
    case1gk: false, case1gl: false,
    case1gf: null, case1hf: null,
    case1gg: null, case1hg: null,
    case1aq: null, case1bq: null,
    case1ap: null, case1bp: null,
    case1af: null, case1bf: null,
    case1ag: null, case1bg: null,
    case1ak: null, case1bk: null,
    case1pm: null, case1qm: null,
    case1dy: null, case1ey: null,
    case1sm: null, case1dn: null,
    ...overrides,
  };
}

describe('calculerRevenuSalaires — abattement forfaitaire 10 %', () => {
  it('foyer sans revenu : net imposable nul', () => {
    expect(calculerRevenuSalaires(makeInput()).totalNetImposable).toBe(0);
  });

  it('salaire courant (déclarant 1 seul) : abattement 10 % standard', () => {
    const result = calculerRevenuSalaires(makeInput({ case1aj: 30000 }));
    expect(result.declarant1.abattementForfaitaire).toBe(3000);
    expect(result.declarant1.deductionRetenue).toBe('abattement_forfaitaire');
    expect(result.declarant1.netImposable).toBe(27000);
    expect(result.totalNetImposable).toBe(27000);
  });

  it('applique le plancher de 509 € sur un petit salaire', () => {
    const result = calculerRevenuSalaires(makeInput({ case1aj: 3000 }));
    expect(result.declarant1.abattementForfaitaire).toBe(509);
    expect(result.declarant1.netImposable).toBe(3000 - 509);
  });

  it('le plancher ne dépasse jamais la base (très petit salaire)', () => {
    const result = calculerRevenuSalaires(makeInput({ case1aj: 200 }));
    expect(result.declarant1.abattementForfaitaire).toBe(200);
    expect(result.declarant1.netImposable).toBe(0);
  });

  it('applique le plafond de 14 555 € sur un gros salaire', () => {
    const result = calculerRevenuSalaires(makeInput({ case1aj: 200000 }));
    expect(result.declarant1.abattementForfaitaire).toBe(14555);
    expect(result.declarant1.netImposable).toBe(200000 - 14555);
  });

  it('deux déclarants : abattement calculé indépendamment pour chacun', () => {
    const result = calculerRevenuSalaires(makeInput({ case1aj: 30000, case1bj: 20000 }));
    expect(result.declarant1.netImposable).toBe(27000);
    expect(result.declarant2.netImposable).toBe(18000);
    expect(result.totalNetImposable).toBe(45000);
  });
});

describe('calculerRevenuSalaires — frais réels', () => {
  it("retient les frais réels s'ils dépassent l'abattement de 10 %", () => {
    const result = calculerRevenuSalaires(makeInput({ case1aj: 30000, case1ak: 5000 }));
    expect(result.declarant1.deductionRetenue).toBe('frais_reels');
    expect(result.declarant1.netImposable).toBe(25000);
  });

  it("ignore les frais réels s'ils sont inférieurs à l'abattement de 10 %", () => {
    const result = calculerRevenuSalaires(makeInput({ case1aj: 30000, case1ak: 1000 }));
    expect(result.declarant1.deductionRetenue).toBe('abattement_forfaitaire');
    expect(result.declarant1.netImposable).toBe(27000);
  });

  it('plafonne les frais réels à la base imposable', () => {
    const result = calculerRevenuSalaires(makeInput({ case1aj: 3000, case1ak: 10000 }));
    expect(result.declarant1.netImposable).toBe(0);
  });
});

describe('calculerRevenuSalaires — cases annexes imposables', () => {
  it('agrège 1AA, 1GF, 1GG, 1AP, 1AG avec 1AJ avant abattement', () => {
    const result = calculerRevenuSalaires(makeInput({
      case1aj: 10000, case1aa: 1000, case1gf: 1000,
      case1gg: 1000, case1ap: 1000, case1ag: 1000,
    }));
    expect(result.declarant1.remunerationsBrutes).toBe(15000);
  });

  it('1PM/1QM (préjudice moral) s\'ajoutent sans abattement', () => {
    const result = calculerRevenuSalaires(makeInput({ case1aj: 30000, case1pm: 50000 }));
    expect(result.indemnitesPrejudiceMoral).toBe(50000);
    expect(result.totalNetImposable).toBe(27000 + 50000);
  });
});

describe('calculerRevenuSalaires — abattement spécifique 1GA/1HA', () => {
  it("réduit la base avant application de l'abattement de 10 %", () => {
    const result = calculerRevenuSalaires(makeInput({ case1aj: 30000, case1ga: 7650 }));
    expect(result.declarant1.baseApresAbattementSpecifique).toBe(22350);
    expect(result.declarant1.abattementForfaitaire).toBe(2235);
    expect(result.declarant1.netImposable).toBe(22350 - 2235);
  });
});

describe('calculerRevenuSalaires — cases exclues du calcul', () => {
  it('les cases exonérées ou hors périmètre n\'entrent pas dans le revenu imposable', () => {
    const result = calculerRevenuSalaires(makeInput({
      case1gh: 5000, case1pb: 500, case1ad: 3000, case1dy: 20000, case1sm: 1000, case1gb: 10000, case1aq: 8000,
    }));
    expect(result.totalNetImposable).toBe(0);
    expect(result.casesExclues).toContain('case1gb');
    expect(result.casesExclues).toContain('case1aq');
    expect(result.casesExclues).not.toContain('case1af');
  });
});

describe('calculerRevenuSalaires — crédit d\'impôt égal à l\'impôt français (1AF/1BF)', () => {
  it("n'entre pas dans totalNetImposable", () => {
    const result = calculerRevenuSalaires(makeInput({ case1af: 15000 }));
    expect(result.totalNetImposable).toBe(0);
  });

  it('applique l\'abattement forfaitaire de 10 % (plancher/plafond standard)', () => {
    const result = calculerRevenuSalaires(makeInput({ case1af: 30000, case1bf: 3000 }));
    expect(result.revenuCreditImpotEgalImpotFrancais).toBe((30000 - 3000) + (3000 - 509));
  });

  it('nul par défaut', () => {
    expect(calculerRevenuSalaires(makeInput()).revenuCreditImpotEgalImpotFrancais).toBe(0);
  });
});
