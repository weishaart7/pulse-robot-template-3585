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

  it('1PM/1QM (préjudice moral) rejoignent le pool abattement 10 %/frais réels du déclarant', () => {
    const result = calculerRevenuSalaires(makeInput({ case1aj: 30000, case1pm: 50000 }));
    expect(result.indemnitesPrejudiceMoral).toBe(50000);
    // base = 30000 + 50000 = 80000, abattement forfaitaire = 8000 (10 %, sous le plafond de 14555)
    expect(result.declarant1.netImposable).toBe(80000 - 8000);
    expect(result.totalNetImposable).toBe(80000 - 8000);
  });
});

describe('calculerRevenuSalaires — abattement spécifique 1GA/1HA', () => {
  it("est purement informatif et n'a aucun effet sur le revenu net imposable (déjà déduit par le contribuable en amont, dans le montant saisi en 1AJ)", () => {
    const result = calculerRevenuSalaires(makeInput({ case1aj: 30000, case1ga: 7650 }));
    expect(result.declarant1.baseApresAbattementSpecifique).toBe(30000);
    expect(result.declarant1.abattementForfaitaire).toBe(3000);
    expect(result.declarant1.netImposable).toBe(30000 - 3000);
  });
});

describe('calculerRevenuSalaires — cases exclues du calcul', () => {
  it('les cases exonérées ou hors périmètre n\'entrent pas dans le revenu imposable', () => {
    const result = calculerRevenuSalaires(makeInput({
      case1pb: 500, case1dy: 20000, case1sm: 1000, case1aq: 8000,
    }));
    expect(result.totalNetImposable).toBe(0);
    expect(result.casesExclues).toContain('case1aq');
    expect(result.casesExclues).not.toContain('case1af');
    expect(result.casesExclues).not.toContain('case1gb');
    expect(result.casesExclues).not.toContain('case1ad');
    expect(result.casesExclues).not.toContain('case1gh');
    expect(result.casesExclues).not.toContain('case1hh');
  });
});

describe('calculerRevenuSalaires — plafond d\'exonération 1AD/1BD (prime de partage de la valeur)', () => {
  it('sous le seuil de 3 000 € : aucun effet sur le revenu imposable', () => {
    const result = calculerRevenuSalaires(makeInput({ case1ad: 2000 }));
    expect(result.totalNetImposable).toBe(0);
  });

  it('au-dessus du seuil de 3 000 € : le surplus rejoint l\'assiette imposable', () => {
    const result = calculerRevenuSalaires(makeInput({ case1ad: 5000 }));
    expect(result.declarant1.remunerationsBrutes).toBe(2000);
    expect(result.declarant1.netImposable).toBe(2000 - 509);
  });

  it('1AV coché : seuil porté à 6 000 €', () => {
    const result = calculerRevenuSalaires(makeInput({ case1ad: 5000, case1av: true }));
    expect(result.totalNetImposable).toBe(0);
  });

  it('1AV coché mais dépassement au-delà de 6 000 € : le surplus reste taxable', () => {
    const result = calculerRevenuSalaires(makeInput({ case1ad: 8000, case1av: true }));
    expect(result.declarant1.remunerationsBrutes).toBe(2000);
  });

  it('le seuil est indépendant entre déclarant 1 (1AV) et déclarant 2 (1BV)', () => {
    const result = calculerRevenuSalaires(makeInput({ case1ad: 5000, case1bd: 5000, case1bv: true }));
    expect(result.declarant1.remunerationsBrutes).toBe(2000);
    expect(result.declarant2.remunerationsBrutes).toBe(0);
  });
});

describe('calculerRevenuSalaires — 1GB/1HB (associés et gérants art. 62 CGI)', () => {
  it('rejoint le pool standard : même abattement 10 %/frais réels que 1AJ', () => {
    const result = calculerRevenuSalaires(makeInput({ case1gb: 30000 }));
    expect(result.declarant1.remunerationsBrutes).toBe(30000);
    expect(result.declarant1.netImposable).toBe(27000);
    expect(result.totalNetImposable).toBe(27000);
  });

  it('se cumule avec 1AJ dans le même pool avant abattement', () => {
    const result = calculerRevenuSalaires(makeInput({ case1aj: 20000, case1gb: 10000 }));
    expect(result.declarant1.remunerationsBrutes).toBe(30000);
    expect(result.declarant1.netImposable).toBe(27000);
  });
});

describe('calculerRevenuSalaires — plafond d\'exonération 1GH/1HH (heures supplémentaires/RTT)', () => {
  it('sous le plafond de 7 500 € : aucun effet sur le revenu imposable', () => {
    const result = calculerRevenuSalaires(makeInput({ case1gh: 5000 }));
    expect(result.totalNetImposable).toBe(0);
  });

  it('au plafond exact de 7 500 € : aucun effet sur le revenu imposable', () => {
    const result = calculerRevenuSalaires(makeInput({ case1gh: 7500 }));
    expect(result.totalNetImposable).toBe(0);
  });

  it('au-dessus du plafond : le surplus rejoint l\'assiette imposable et subit l\'abattement de 10 %', () => {
    const result = calculerRevenuSalaires(makeInput({ case1gh: 10000 }));
    expect(result.declarant1.remunerationsBrutes).toBe(2500);
    expect(result.declarant1.netImposable).toBe(2500 - 509);
    expect(result.totalNetImposable).toBe(2500 - 509);
  });

  it('le plafond est indépendant entre déclarant 1 et déclarant 2', () => {
    const result = calculerRevenuSalaires(makeInput({ case1gh: 10000, case1hh: 8000 }));
    expect(result.declarant1.remunerationsBrutes).toBe(2500);
    expect(result.declarant2.remunerationsBrutes).toBe(500);
  });

  it('se cumule avec les autres cases du même pool avant abattement', () => {
    const result = calculerRevenuSalaires(makeInput({ case1aj: 30000, case1gh: 10000 }));
    expect(result.declarant1.remunerationsBrutes).toBe(32500);
    expect(result.declarant1.abattementForfaitaire).toBe(3250);
    expect(result.declarant1.netImposable).toBe(32500 - 3250);
  });
});

describe('calculerRevenuSalaires — crédit d\'impôt égal à l\'impôt français (1AF/1BF)', () => {
  it("seul dans le pool : n'entre pas dans totalNetImposable, isolé dans revenuCreditImpotEgalImpotFrancais", () => {
    const result = calculerRevenuSalaires(makeInput({ case1af: 15000 }));
    expect(result.totalNetImposable).toBe(0);
    expect(result.revenuCreditImpotEgalImpotFrancais).toBe(15000 - 1500);
  });

  it('applique le plancher de 509 € sur un petit montant isolé', () => {
    const result = calculerRevenuSalaires(makeInput({ case1bf: 3000 }));
    expect(result.revenuCreditImpotEgalImpotFrancais).toBe(3000 - 509);
  });

  it('rejoint le même pool que 1AJ : plancher/plafond et choix 10 %/frais réels partagés, part isolée proportionnellement', () => {
    // Base totale déclarant 1 = 30000 (1AJ) + 10000 (1AF) = 40000 ; abattement 10 % = 4000 ; net total = 36000.
    // Part 1AF = 10000/40000 = 25 % du net total => 9000 ; part 1AJ = 27000.
    const result = calculerRevenuSalaires(makeInput({ case1aj: 30000, case1af: 10000 }));
    expect(result.revenuCreditImpotEgalImpotFrancais).toBe(9000);
    expect(result.declarant1.netImposable).toBe(27000);
    expect(result.totalNetImposable).toBe(27000);
  });

  it('partage le choix frais réels avec le pool 1AJ quand il est plus favorable', () => {
    // Base totale = 30000 (1AJ) + 10000 (1AF) = 40000 ; frais réels 20000 > abattement 10 % (4000) => frais réels retenus.
    // Net total = 20000 ; part 1AF = 25 % => 5000 ; part 1AJ = 15000.
    const result = calculerRevenuSalaires(makeInput({ case1aj: 30000, case1af: 10000, case1ak: 20000 }));
    expect(result.declarant1.deductionRetenue).toBe('frais_reels');
    expect(result.revenuCreditImpotEgalImpotFrancais).toBe(5000);
    expect(result.declarant1.netImposable).toBe(15000);
  });

  it('nul par défaut', () => {
    expect(calculerRevenuSalaires(makeInput()).revenuCreditImpotEgalImpotFrancais).toBe(0);
  });
});

describe('calculerRevenuSalaires — salaires exonérés retenus pour le taux effectif (1AC/1BC, 1AE/1BE)', () => {
  it("seul dans le pool : n'entre pas dans totalNetImposable, isolé dans salairesNetImposablesExoneresTauxEffectif", () => {
    const result = calculerRevenuSalaires(makeInput(), { case1ac: 30000, case1bc: null, case1ae: null, case1be: null });
    expect(result.totalNetImposable).toBe(0);
    expect(result.salairesNetImposablesExoneresTauxEffectif).toBe(30000 - 3000);
  });

  it('nul par défaut (aucune donnée exonérée transmise)', () => {
    expect(calculerRevenuSalaires(makeInput()).salairesNetImposablesExoneresTauxEffectif).toBe(0);
  });

  it("cas régression : le choix 10 %/frais réels est unique par déclarant, partagé entre 1AJ et 1AC", () => {
    // Déclarant 1 : 1AJ = 50 000 (France) + 1AC = 35 000 (exonéré) => base commune 85 000.
    // Frais réels déclarés uniquement sur la part exonérée (1AE = 4 000), mais le choix porte
    // sur l'ensemble : abattement 10 % de 85 000 = 8 500 > 4 000 => le forfaitaire l'emporte
    // pour TOUTE la base, y compris la part exonérée (qui ne doit donc PAS utiliser les 4 000
    // de frais réels alors qu'ils sont > 10 % de son seul montant à elle, 3 500).
    const result = calculerRevenuSalaires(
      makeInput({ case1aj: 50000 }),
      { case1ac: 35000, case1bc: null, case1ae: 4000, case1be: null },
    );
    expect(result.declarant1.deductionRetenue).toBe('abattement_forfaitaire');
    expect(result.declarant1.netImposable).toBe(45000); // 50000 - 10 % de 50000
    expect(result.salairesNetImposablesExoneresTauxEffectif).toBe(31500); // 35000 - 10 % de 35000
  });

  it('les frais réels combinés (1AK + 1AE) l\'emportent quand ils dépassent l\'abattement 10 % sur la base totale', () => {
    // Base totale = 50000 (1AJ) + 35000 (1AC) = 85000 ; frais réels combinés = 6000 (1AK) + 4000 (1AE) = 10000
    // > abattement forfaitaire (8500) => frais réels retenus pour l'ensemble du pool.
    const result = calculerRevenuSalaires(
      makeInput({ case1aj: 50000, case1ak: 6000 }),
      { case1ac: 35000, case1bc: null, case1ae: 4000, case1be: null },
    );
    expect(result.declarant1.deductionRetenue).toBe('frais_reels');
    // chaque source déduit son propre frais réel (pas de répartition proportionnelle) :
    // 1AJ 50000 - 6000 (1AK) = 44000 ; 1AC 35000 - 4000 (1AE) = 31000
    expect(result.declarant1.netImposable).toBe(44000);
    expect(result.salairesNetImposablesExoneresTauxEffectif).toBe(31000);
  });

  it('deux déclarants : pool et choix frais réels/forfaitaire indépendants pour chacun', () => {
    const result = calculerRevenuSalaires(
      makeInput({ case1aj: 50000 }),
      { case1ac: null, case1bc: 20000, case1ae: null, case1be: null },
    );
    expect(result.declarant1.netImposable).toBe(45000);
    expect(result.salairesNetImposablesExoneresTauxEffectif).toBe(18000); // 20000 - 10 %
  });
});
