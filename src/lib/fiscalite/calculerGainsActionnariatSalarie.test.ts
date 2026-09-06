import { describe, expect, it } from 'vitest';
import { calculerGainsActionnariatSalarie } from './calculerGainsActionnariatSalarie';
import { GainsActionnariatSalarieInput } from './types';

function makeInput(overrides: Partial<GainsActionnariatSalarieInput> = {}): GainsActionnariatSalarieInput {
  return {
    case1tp: null, case1up: null,
    case1tt: null, case1ut: null,
    case1tz: null, case1uz: null, case1wz: null, case1vz: null,
    case1nx: null, case1ox: null,
    case1ny: null, case1oy: null,
    case1ay: null, case1by: null,
    case1mp: null, case1mq: null,
    case3vd: null, case3vi: null, case3vf: null,
    case3vj: null, case3vk: null,
    case3vn: null,
    case0xx: null,
    ...overrides,
  };
}

describe('calculerGainsActionnariatSalarie — cases imposables au barème', () => {
  it('foyer sans gains : net imposable nul', () => {
    expect(calculerGainsActionnariatSalarie(makeInput()).totalNetImposable).toBe(0);
  });

  it('agrège 1TP/1UP (rabais excédentaire), abattement de 10 % par déclarant', () => {
    const result = calculerGainsActionnariatSalarie(makeInput({ case1tp: 1000, case1up: 2000 }));
    expect(result.totalNetImposable).toBe(900 + 1800); // 1000*0,9 + 2000*0,9
  });

  it('agrège 1TT/1UT (gains post-28.9.2012), abattement de 10 % par déclarant', () => {
    const result = calculerGainsActionnariatSalarie(makeInput({ case1tt: 5000, case1ut: 6000 }));
    expect(result.totalNetImposable).toBe(4500 + 5400);
  });

  it('ajoute 1TZ tel quel (déjà net des abattements, pas le forfaitaire de 10 %)', () => {
    const result = calculerGainsActionnariatSalarie(makeInput({ case1tz: 4000 }));
    expect(result.totalNetImposable).toBe(4000);
  });

  it('applique l\'abattement de 10 % à 1AY/1BY (BSPCE, gain taxable)', () => {
    const result = calculerGainsActionnariatSalarie(makeInput({ case1ay: 3000, case1by: 1000 }));
    expect(result.totalNetImposable).toBe(2700 + 900);
  });

  it('applique l\'abattement de 10 % à 1MP/1MQ (management packages, part taxable)', () => {
    const result = calculerGainsActionnariatSalarie(makeInput({ case1mp: 7000, case1mq: 2000 }));
    expect(result.totalNetImposable).toBe(6300 + 1800);
  });

  it('agrège 3VJ/3VK (option barème pré-28.9.2012), abattement de 10 % par déclarant', () => {
    const result = calculerGainsActionnariatSalarie(makeInput({ case3vj: 1500, case3vk: 2500 }));
    expect(result.totalNetImposable).toBe(1350 + 2250);
  });

  it('l\'abattement de 10 % porte sur la somme des 5 cases du même déclarant, pas case par case', () => {
    // Déclarant 1 : 1TP (400) + 1TT (600) = 1000 -> abattement 100, net 900 (pas 40+60=100 arrondis séparément, ici identique mais démontre le pool commun)
    const result = calculerGainsActionnariatSalarie(makeInput({
      case1tp: 400, case1tt: 600, case1ay: 500, case1mp: 500, case3vj: 500,
    }));
    // base déclarant 1 = 400+600+500+500+500 = 2500, net = 2250
    expect(result.totalNetImposable).toBe(2250);
  });

  it('additionne toutes les cases barème simultanément (déclarant 1 et 2, plus 1TZ sans abattement)', () => {
    const result = calculerGainsActionnariatSalarie(makeInput({
      case1tp: 100, case1up: 100, case1tt: 100, case1ut: 100,
      case1tz: 100, case3vj: 100, case3vk: 100,
    }));
    // déclarant 1 : 1TP+1TT+3VJ = 300 -> net 270 ; déclarant 2 : 1UP+1UT+3VK = 300 -> net 270 ; + 1TZ 100
    expect(result.totalNetImposable).toBe(270 + 270 + 100);
  });
});

describe('calculerGainsActionnariatSalarie — cases exclues du calcul', () => {
  it('ignore les montants d\'abattement 1UZ/1WZ/1VZ', () => {
    const result = calculerGainsActionnariatSalarie(makeInput({ case1tz: 4000, case1uz: 1000, case1wz: 500, case1vz: 300 }));
    expect(result.totalNetImposable).toBe(4000);
  });

  it('ignore le carried-interest (1NX/1OX) et sa contribution salariale (1NY/1OY) dans le net imposable au barème', () => {
    const result = calculerGainsActionnariatSalarie(makeInput({ case1nx: 50000, case1ox: 50000, case1ny: 20000, case1oy: 20000 }));
    expect(result.totalNetImposable).toBe(0);
  });

  it('ignore les gains à taux forfaitaire (3VD/3VI/3VF) et leur contribution salariale (3VN) dans le net imposable au barème', () => {
    const result = calculerGainsActionnariatSalarie(makeInput({ case3vd: 10000, case3vi: 10000, case3vf: 10000, case3vn: 10000 }));
    expect(result.totalNetImposable).toBe(0);
  });

  it('ignore 0XX (système du quotient) dans le net imposable au barème', () => {
    const result = calculerGainsActionnariatSalarie(makeInput({ case0xx: 40000 }));
    expect(result.totalNetImposable).toBe(0);
  });

  it('expose 0XX comme revenuExceptionnelQuotient', () => {
    const result = calculerGainsActionnariatSalarie(makeInput({ case0xx: 40000 }));
    expect(result.revenuExceptionnelQuotient).toBe(40000);
  });

  it('revenuExceptionnelQuotient nul par défaut', () => {
    expect(calculerGainsActionnariatSalarie(makeInput()).revenuExceptionnelQuotient).toBe(0);
  });

  it('expose la liste des cases exclues', () => {
    const result = calculerGainsActionnariatSalarie(makeInput());
    expect(result.casesExclues).toContain('case1ny');
    expect(result.casesExclues).toContain('case3vn');
    expect(result.casesExclues).toContain('case0xx');
    expect(result.casesExclues).not.toContain('case1tz');
    expect(result.casesExclues).not.toContain('case1nx');
    expect(result.casesExclues).not.toContain('case3vd');
  });
});

describe('calculerGainsActionnariatSalarie — impôt à taux forfaitaire', () => {
  it('foyer sans gains forfaitaires : impôt forfaitaire nul', () => {
    expect(calculerGainsActionnariatSalarie(makeInput()).impotForfaitaire).toBe(0);
  });

  it('carried-interest (1NX/1OX) taxé à 12,8 % PFU', () => {
    const result = calculerGainsActionnariatSalarie(makeInput({ case1nx: 10000, case1ox: 5000 }));
    expect(result.impotForfaitaire).toBeCloseTo(15000 * 0.128, 6);
  });

  it('3VD taxé à 18 %', () => {
    const result = calculerGainsActionnariatSalarie(makeInput({ case3vd: 10000 }));
    expect(result.impotForfaitaire).toBeCloseTo(1800, 6);
  });

  it('3VI taxé à 30 %', () => {
    const result = calculerGainsActionnariatSalarie(makeInput({ case3vi: 10000 }));
    expect(result.impotForfaitaire).toBeCloseTo(3000, 6);
  });

  it('3VF taxé à 41 %', () => {
    const result = calculerGainsActionnariatSalarie(makeInput({ case3vf: 10000 }));
    expect(result.impotForfaitaire).toBeCloseTo(4100, 6);
  });

  it('cumule carried-interest et les trois taux historiques', () => {
    const result = calculerGainsActionnariatSalarie(makeInput({
      case1nx: 10000, case1ox: 0,
      case3vd: 10000, case3vi: 10000, case3vf: 10000,
    }));
    expect(result.impotForfaitaire).toBeCloseTo(10000 * 0.128 + 1800 + 3000 + 4100, 6);
  });

  it('1NY/1OY (contribution salariale carried-interest) et 3VN (contribution salariale 10 %) n\'affectent pas l\'impôt forfaitaire', () => {
    const result = calculerGainsActionnariatSalarie(makeInput({ case1ny: 50000, case1oy: 50000, case3vn: 50000 }));
    expect(result.impotForfaitaire).toBe(0);
  });

  it('n\'affecte pas le net imposable au barème', () => {
    const result = calculerGainsActionnariatSalarie(makeInput({ case1nx: 10000, case3vd: 10000, case1tz: 500 }));
    expect(result.totalNetImposable).toBe(500);
  });
});
