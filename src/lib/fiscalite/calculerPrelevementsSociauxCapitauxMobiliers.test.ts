import { describe, expect, it } from 'vitest';
import { calculerPrelevementsSociauxCapitauxMobiliers } from './calculerPrelevementsSociauxCapitauxMobiliers';
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

describe('calculerPrelevementsSociauxCapitauxMobiliers', () => {
  it('foyer sans capitaux mobiliers : PS nuls', () => {
    const result = calculerPrelevementsSociauxCapitauxMobiliers(makeInput());
    expect(result.baseImposable).toBe(0);
    expect(result.prelevementsSociaux).toBe(0);
  });

  it('applique 17,2 % sur les dividendes bruts (2DC/2FU), sans l\'abattement de 40 %', () => {
    const result = calculerPrelevementsSociauxCapitauxMobiliers(makeInput({ case2dc: 10000, case2fu: 2000 }));
    expect(result.baseImposable).toBe(12000);
    expect(result.prelevementsSociaux).toBeCloseTo(12000 * 0.172, 6);
  });

  it('applique 17,2 % sur les intérêts/produits sans abattement (2TS/2TR/2TT/2TQ/2TZ)', () => {
    const result = calculerPrelevementsSociauxCapitauxMobiliers(makeInput({
      case2ts: 1000, case2tr: 1000, case2tt: 1000, case2tq: 1000, case2tz: 1000,
    }));
    expect(result.baseImposable).toBe(5000);
    expect(result.prelevementsSociaux).toBeCloseTo(5000 * 0.172, 6);
  });

  it('applique 17,2 % sur 2GO sans la majoration de 25 % (contrairement à l\'IR)', () => {
    const result = calculerPrelevementsSociauxCapitauxMobiliers(makeInput({ case2go: 1000 }));
    expect(result.baseImposable).toBe(1000); // pas 1250
    expect(result.prelevementsSociaux).toBeCloseTo(1000 * 0.172, 6);
  });

  it('indépendant de 2OP (PS dus que le revenu soit au barème ou au PFU)', () => {
    const avecOption = calculerPrelevementsSociauxCapitauxMobiliers(makeInput({ case2dc: 10000, case2op: true }));
    const sansOption = calculerPrelevementsSociauxCapitauxMobiliers(makeInput({ case2dc: 10000, case2op: false }));
    expect(avecOption.prelevementsSociaux).toBe(sansOption.prelevementsSociaux);
  });

  it('ignore les contrats d\'assurance-vie/capitalisation (taux historiques non reconstituables)', () => {
    const result = calculerPrelevementsSociauxCapitauxMobiliers(makeInput({
      case2ch: 5000, case2dh: 5000, case2vv: 5000, case2ww: 5000,
      case2xx: 5000, case2yy: 5000, case2zz: 5000,
      case2vm: 5000, case2vn: 5000, case2vo: 5000, case2vp: 5000,
    }));
    expect(result.baseImposable).toBe(0);
    expect(result.prelevementsSociaux).toBe(0);
  });

  it('expose la liste des cases hors périmètre', () => {
    const result = calculerPrelevementsSociauxCapitauxMobiliers(makeInput());
    expect(result.casesHorsPerimetre).toContain('case2ch');
    expect(result.casesHorsPerimetre).toContain('case2vm');
    expect(result.casesHorsPerimetre).not.toContain('case2dc');
    expect(result.casesHorsPerimetre).not.toContain('case2go');
  });

  it('cumule toutes les bases imposables PS simultanément', () => {
    const result = calculerPrelevementsSociauxCapitauxMobiliers(makeInput({
      case2dc: 10000, case2ts: 2000, case2go: 1000,
      case2ch: 50000, // hors périmètre, ne doit rien ajouter
    }));
    expect(result.baseImposable).toBe(13000);
    expect(result.prelevementsSociaux).toBeCloseTo(13000 * 0.172, 6);
  });
});
