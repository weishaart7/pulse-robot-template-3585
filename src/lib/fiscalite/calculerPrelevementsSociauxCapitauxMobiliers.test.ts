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

  it('applique 18,6 % sur les dividendes bruts (2DC/2FU), sans l\'abattement de 40 %', () => {
    const result = calculerPrelevementsSociauxCapitauxMobiliers(makeInput({ case2dc: 10000, case2fu: 2000 }));
    expect(result.baseImposable).toBe(12000);
    expect(result.prelevementsSociaux).toBeCloseTo(12000 * 0.186, 6);
  });

  it('applique 18,6 % sur les intérêts/produits sans abattement (2TS/2TR/2TT/2TQ/2TZ)', () => {
    const result = calculerPrelevementsSociauxCapitauxMobiliers(makeInput({
      case2ts: 1000, case2tr: 1000, case2tt: 1000, case2tq: 1000, case2tz: 1000,
    }));
    expect(result.baseImposable).toBe(5000);
    expect(result.prelevementsSociaux).toBeCloseTo(5000 * 0.186, 6);
  });

  it('applique 18,6 % sur 2GO sans la majoration de 25 % (contrairement à l\'IR)', () => {
    const result = calculerPrelevementsSociauxCapitauxMobiliers(makeInput({ case2go: 1000 }));
    expect(result.baseImposable).toBe(1000); // pas 1250
    expect(result.prelevementsSociaux).toBeCloseTo(1000 * 0.186, 6);
  });

  it('indépendant de 2OP (PS dus que le revenu soit au barème ou au PFU)', () => {
    const avecOption = calculerPrelevementsSociauxCapitauxMobiliers(makeInput({ case2dc: 10000, case2op: true }));
    const sansOption = calculerPrelevementsSociauxCapitauxMobiliers(makeInput({ case2dc: 10000, case2op: false }));
    expect(avecOption.prelevementsSociaux).toBe(sansOption.prelevementsSociaux);
  });

  it('applique 18,6 % sur 2CH, sans l\'abattement de 4 600 €/9 200 € (réservé à l\'IR)', () => {
    const result = calculerPrelevementsSociauxCapitauxMobiliers(makeInput({ case2ch: 6000 }));
    expect(result.baseImposable).toBe(6000); // pas 1400 (net d'abattement)
    expect(result.prelevementsSociaux).toBeCloseTo(6000 * 0.186, 6);
  });

  it('cas réel utilisateur : 2GO=4000/2CH=6000 (2OP décoché) — PS = 1860 €, identique au simulateur officiel', () => {
    const result = calculerPrelevementsSociauxCapitauxMobiliers(makeInput({ case2go: 4000, case2ch: 6000 }));
    expect(result.baseImposable).toBe(10000);
    expect(result.prelevementsSociaux).toBeCloseTo(1860, 6);
  });

  it('applique 18,6 % sur 2VV seul, sur son montant brut (pas net d\'abattement) — cas réel utilisateur : PS = 930 €, identique au simulateur officiel', () => {
    const result = calculerPrelevementsSociauxCapitauxMobiliers(makeInput({ case2vv: 5000 }));
    expect(result.baseImposable).toBe(5000); // pas 400 (net après abattement de 4600, réservé à l'IR)
    expect(result.prelevementsSociaux).toBeCloseTo(930, 6);
  });

  it('applique 18,6 % sur 2WW/2YY/2ZZ/2VN/2VO/2VP, au brut (même règle que 2CH/2VV, non testées individuellement)', () => {
    const result = calculerPrelevementsSociauxCapitauxMobiliers(makeInput({
      case2ww: 1000, case2yy: 1000, case2zz: 1000, case2vn: 1000, case2vo: 1000, case2vp: 1000,
    }));
    expect(result.baseImposable).toBe(6000);
    expect(result.prelevementsSociaux).toBeCloseTo(6000 * 0.186, 6);
  });

  it('ignore les cases explicitement « soumises au prélèvement libératoire » (2DH/2XX/2VM, déjà réglées à la source)', () => {
    const result = calculerPrelevementsSociauxCapitauxMobiliers(makeInput({
      case2dh: 5000, case2xx: 5000, case2vm: 5000,
    }));
    expect(result.baseImposable).toBe(0);
    expect(result.prelevementsSociaux).toBe(0);
  });

  it('expose la liste des cases hors périmètre', () => {
    const result = calculerPrelevementsSociauxCapitauxMobiliers(makeInput());
    expect(result.casesHorsPerimetre).toContain('case2dh');
    expect(result.casesHorsPerimetre).toContain('case2vm');
    expect(result.casesHorsPerimetre).not.toContain('case2ch');
    expect(result.casesHorsPerimetre).not.toContain('case2vv');
    expect(result.casesHorsPerimetre).not.toContain('case2dc');
    expect(result.casesHorsPerimetre).not.toContain('case2go');
  });

  it('cumule toutes les bases imposables PS simultanément', () => {
    const result = calculerPrelevementsSociauxCapitauxMobiliers(makeInput({
      case2dc: 10000, case2ts: 2000, case2go: 1000,
      case2dh: 50000, // hors périmètre, ne doit rien ajouter
    }));
    expect(result.baseImposable).toBe(13000);
    expect(result.prelevementsSociaux).toBeCloseTo(13000 * 0.186, 6);
  });
});
