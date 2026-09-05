import { describe, expect, it } from 'vitest';
import { calculerRevenuCapitauxMobiliers } from './calculerRevenuCapitauxMobiliers';
import { RevenusCapitauxMobiliersInput } from './types';

function makeInput(overrides: Partial<RevenusCapitauxMobiliersInput> = {}): RevenusCapitauxMobiliersInput {
  return {
    case2dh: null, case2ch: null, case2uu: null, case2vv: null, case2ww: null,
    case2xx: null, case2yy: null, case2zz: null,
    case2dc: null, case2fu: null,
    case2tr: null, case2tt: null, case2tq: null, case2ts: null, case2tz: null, case2go: null,
    case2tu: null, case2tv: null, case2tw: null, case2tx: null, case2ty: null,
    case2cg: null, case2bh: null, case2df: null, case2dg: null, case2di: null,
    case2ca: null, case2ab: null, case2ck: null, case2ee: null,
    case2aa: null, case2al: null, case2am: null, case2an: null, case2aq: null, case2ar: null,
    case2vm: null, case2vn: null, case2vo: null, case2vp: null,
    case2vq: null, case2vr: null, case2vs: null, case2vt: null, case2vu: null,
    case2op: false,
    ...overrides,
  };
}

describe('calculerRevenuCapitauxMobiliers — foyer sans revenu', () => {
  it('totalNetImposable et impotForfaitaire nuls', () => {
    const result = calculerRevenuCapitauxMobiliers(makeInput());
    expect(result.totalNetImposable).toBe(0);
    expect(result.impotForfaitaire).toBe(0);
  });
});

describe('calculerRevenuCapitauxMobiliers — sans option barème (PFU 12,8 %)', () => {
  it('taxe les dividendes au PFU, sans abattement', () => {
    const result = calculerRevenuCapitauxMobiliers(makeInput({ case2dc: 10000 }));
    expect(result.totalNetImposable).toBe(0);
    expect(result.impotForfaitaire).toBeCloseTo(10000 * 0.128);
  });

  it('agrège 2FU avec 2DC', () => {
    const result = calculerRevenuCapitauxMobiliers(makeInput({ case2dc: 10000, case2fu: 5000 }));
    expect(result.impotForfaitaire).toBeCloseTo(15000 * 0.128);
  });

  it('agrège les revenus sans abattement (2TS/2TR/2TT/2TQ/2TZ)', () => {
    const result = calculerRevenuCapitauxMobiliers(makeInput({
      case2ts: 1000, case2tr: 2000, case2tt: 3000, case2tq: 4000, case2tz: 5000,
    }));
    expect(result.impotForfaitaire).toBeCloseTo(15000 * 0.128);
  });

  it('applique le coefficient de 1,25 sur 2GO', () => {
    const result = calculerRevenuCapitauxMobiliers(makeInput({ case2go: 1000 }));
    expect(result.impotForfaitaire).toBeCloseTo(1250 * 0.128);
  });

  it('ignore frais (2CA) et déficits antérieurs (2AA-2AR) sans option barème', () => {
    const result = calculerRevenuCapitauxMobiliers(makeInput({
      case2dc: 10000, case2ca: 500, case2aa: 2000,
    }));
    expect(result.impotForfaitaire).toBeCloseTo(10000 * 0.128);
  });
});

describe('calculerRevenuCapitauxMobiliers — avec option barème (2OP)', () => {
  it('applique un abattement de 40 % sur les dividendes (2DC/2FU)', () => {
    const result = calculerRevenuCapitauxMobiliers(makeInput({ case2op: true, case2dc: 10000 }));
    expect(result.totalNetImposable).toBe(6000);
    expect(result.impotForfaitaire).toBe(0);
  });

  it("n'applique pas l'abattement de 40 % aux revenus sans abattement", () => {
    const result = calculerRevenuCapitauxMobiliers(makeInput({ case2op: true, case2tr: 10000 }));
    expect(result.totalNetImposable).toBe(10000);
  });

  it('applique le coefficient de 1,25 sur 2GO même avec option barème', () => {
    const result = calculerRevenuCapitauxMobiliers(makeInput({ case2op: true, case2go: 1000 }));
    expect(result.totalNetImposable).toBe(1250);
  });

  it('déduit les frais et charges (2CA) de la base globale', () => {
    const result = calculerRevenuCapitauxMobiliers(makeInput({ case2op: true, case2tr: 10000, case2ca: 1500 }));
    expect(result.totalNetImposable).toBe(8500);
  });

  it('impute les déficits antérieurs (2AA-2AR), plancher à 0', () => {
    const result = calculerRevenuCapitauxMobiliers(makeInput({
      case2op: true, case2tr: 5000, case2aa: 2000, case2al: 1000,
    }));
    expect(result.totalNetImposable).toBe(2000);
  });

  it('plafonne le net imposable à 0 si les déficits dépassent la base (pas de report ici)', () => {
    const result = calculerRevenuCapitauxMobiliers(makeInput({
      case2op: true, case2tr: 1000, case2aa: 5000,
    }));
    expect(result.totalNetImposable).toBe(0);
  });

  it('combine abattement, base sans abattement, 2GO, frais et déficits', () => {
    const result = calculerRevenuCapitauxMobiliers(makeInput({
      case2op: true,
      case2dc: 10000, // -> 6000 après abattement 40 %
      case2tr: 2000,
      case2go: 1000, // -> 1250 après coefficient
      case2ca: 500,
      case2aa: 1000,
    }));
    // 6000 + 2000 + 1250 - 500 - 1000 = 7750
    expect(result.totalNetImposable).toBe(7750);
  });
});

describe('calculerRevenuCapitauxMobiliers — contrats de moins de 8 ans (Phase 2a)', () => {
  it('2YY est toujours imposé au barème, sans option 2OP', () => {
    const result = calculerRevenuCapitauxMobiliers(makeInput({ case2yy: 4000 }));
    expect(result.totalNetImposable).toBe(4000);
    expect(result.impotForfaitaire).toBe(0);
  });

  it('2YY est imposé au barème et cumulé avec le reste, option 2OP cochée', () => {
    const result = calculerRevenuCapitauxMobiliers(makeInput({ case2op: true, case2yy: 4000, case2tr: 1000 }));
    expect(result.totalNetImposable).toBe(5000);
  });

  it('2ZZ suit le switch 2OP : PFU 12,8 % sans option', () => {
    const result = calculerRevenuCapitauxMobiliers(makeInput({ case2zz: 4000 }));
    expect(result.totalNetImposable).toBe(0);
    expect(result.impotForfaitaire).toBeCloseTo(4000 * 0.128);
  });

  it('2ZZ rejoint le barème avec option 2OP (sans abattement 40 %, ce n\'est pas un dividende)', () => {
    const result = calculerRevenuCapitauxMobiliers(makeInput({ case2op: true, case2zz: 4000 }));
    expect(result.totalNetImposable).toBe(4000);
    expect(result.impotForfaitaire).toBe(0);
  });

  it('2XX (déjà taxé à la source) reste sans aucun effet, avec ou sans option', () => {
    const sansOption = calculerRevenuCapitauxMobiliers(makeInput({ case2xx: 5000 }));
    expect(sansOption.impotForfaitaire).toBe(0);
    const avecOption = calculerRevenuCapitauxMobiliers(makeInput({ case2op: true, case2xx: 5000 }));
    expect(avecOption.totalNetImposable).toBe(0);
  });

  it('combine 2YY (toujours barème) et 2ZZ (PFU) sans option 2OP', () => {
    const result = calculerRevenuCapitauxMobiliers(makeInput({ case2yy: 2000, case2zz: 3000 }));
    expect(result.totalNetImposable).toBe(2000);
    expect(result.impotForfaitaire).toBeCloseTo(3000 * 0.128);
  });
});

describe('calculerRevenuCapitauxMobiliers — cases exclues du calcul', () => {
  it("les cases hors périmètre n'ont aucun effet, avec ou sans option barème", () => {
    const input = makeInput({
      case2dh: 1000, case2ch: 1000, case2uu: 1000, case2vv: 1000, case2ww: 1000,
      case2xx: 1000,
      case2vm: 1000, case2vn: 1000, case2vo: 1000, case2vp: 1000,
      case2vq: 1000, case2vr: 1000, case2vs: 1000, case2vt: 1000, case2vu: 1000,
      case2tu: 1000, case2tv: 1000, case2tw: 1000, case2tx: 1000, case2ty: 1000,
      case2cg: 1000, case2bh: 1000, case2df: 1000, case2dg: 1000, case2di: 1000, case2ee: 1000,
      case2ab: 1000, case2ck: 1000,
    });

    const sansOption = calculerRevenuCapitauxMobiliers(input);
    expect(sansOption.impotForfaitaire).toBe(0);

    const avecOption = calculerRevenuCapitauxMobiliers({ ...input, case2op: true });
    expect(avecOption.totalNetImposable).toBe(0);
  });

  it('expose la liste des cases exclues', () => {
    const result = calculerRevenuCapitauxMobiliers(makeInput());
    expect(result.casesExclues).toContain('case2dh');
    expect(result.casesExclues).toContain('case2vq');
    expect(result.casesExclues).toContain('case2ab');
    expect(result.casesExclues).toContain('case2xx');
    expect(result.casesExclues).not.toContain('case2dc');
    expect(result.casesExclues).not.toContain('case2go');
    expect(result.casesExclues).not.toContain('case2aa');
    expect(result.casesExclues).not.toContain('case2yy');
    expect(result.casesExclues).not.toContain('case2zz');
  });
});
