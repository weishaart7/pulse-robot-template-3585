import { describe, expect, it } from 'vitest';
import { calculerRevenuCapitauxMobiliers } from './calculerRevenuCapitauxMobiliers';
import { FoyerFiscalInput, RevenusCapitauxMobiliersInput } from './types';

function calculer(
  input: RevenusCapitauxMobiliersInput,
  situationFamille: FoyerFiscalInput['situationFamille'] = 'celibataire',
) {
  return calculerRevenuCapitauxMobiliers(input, situationFamille);
}

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
    const result = calculer(makeInput());
    expect(result.totalNetImposable).toBe(0);
    expect(result.impotForfaitaire).toBe(0);
  });
});

describe('calculerRevenuCapitauxMobiliers — sans option barème (PFU 12,8 %)', () => {
  it('taxe les dividendes au PFU, sans abattement', () => {
    const result = calculer(makeInput({ case2dc: 10000 }));
    expect(result.totalNetImposable).toBe(0);
    expect(result.impotForfaitaire).toBeCloseTo(10000 * 0.128);
  });

  it('agrège 2FU avec 2DC', () => {
    const result = calculer(makeInput({ case2dc: 10000, case2fu: 5000 }));
    expect(result.impotForfaitaire).toBeCloseTo(15000 * 0.128);
  });

  it('agrège les revenus sans abattement (2TS/2TR/2TT/2TQ/2TZ)', () => {
    const result = calculer(makeInput({
      case2ts: 1000, case2tr: 2000, case2tt: 3000, case2tq: 4000, case2tz: 5000,
    }));
    expect(result.impotForfaitaire).toBeCloseTo(15000 * 0.128);
  });

  it('applique le coefficient de 1,25 sur 2GO', () => {
    const result = calculer(makeInput({ case2go: 1000 }));
    expect(result.impotForfaitaire).toBeCloseTo(1250 * 0.128);
  });

  it('ignore frais (2CA) et déficits antérieurs (2AA-2AR) sans option barème', () => {
    const result = calculer(makeInput({
      case2dc: 10000, case2ca: 500, case2aa: 2000,
    }));
    expect(result.impotForfaitaire).toBeCloseTo(10000 * 0.128);
  });
});

describe('calculerRevenuCapitauxMobiliers — avec option barème (2OP)', () => {
  it('applique un abattement de 40 % sur les dividendes (2DC/2FU)', () => {
    const result = calculer(makeInput({ case2op: true, case2dc: 10000 }));
    expect(result.totalNetImposable).toBe(6000);
    expect(result.impotForfaitaire).toBe(0);
  });

  it("n'applique pas l'abattement de 40 % aux revenus sans abattement", () => {
    const result = calculer(makeInput({ case2op: true, case2tr: 10000 }));
    expect(result.totalNetImposable).toBe(10000);
  });

  it('applique le coefficient de 1,25 sur 2GO même avec option barème', () => {
    const result = calculer(makeInput({ case2op: true, case2go: 1000 }));
    expect(result.totalNetImposable).toBe(1250);
  });

  it('déduit les frais et charges (2CA) de la base globale', () => {
    const result = calculer(makeInput({ case2op: true, case2tr: 10000, case2ca: 1500 }));
    expect(result.totalNetImposable).toBe(8500);
  });

  it('impute les déficits antérieurs (2AA-2AR), plancher à 0', () => {
    const result = calculer(makeInput({
      case2op: true, case2tr: 5000, case2aa: 2000, case2al: 1000,
    }));
    expect(result.totalNetImposable).toBe(2000);
  });

  it('plafonne le net imposable à 0 si les déficits dépassent la base (pas de report ici)', () => {
    const result = calculer(makeInput({
      case2op: true, case2tr: 1000, case2aa: 5000,
    }));
    expect(result.totalNetImposable).toBe(0);
  });

  it('combine abattement, base sans abattement, 2GO, frais et déficits', () => {
    const result = calculer(makeInput({
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
    const result = calculer(makeInput({ case2yy: 4000 }));
    expect(result.totalNetImposable).toBe(4000);
    expect(result.impotForfaitaire).toBe(0);
  });

  it('2YY est imposé au barème et cumulé avec le reste, option 2OP cochée', () => {
    const result = calculer(makeInput({ case2op: true, case2yy: 4000, case2tr: 1000 }));
    expect(result.totalNetImposable).toBe(5000);
  });

  it('2ZZ suit le switch 2OP : PFU 12,8 % sans option', () => {
    const result = calculer(makeInput({ case2zz: 4000 }));
    expect(result.totalNetImposable).toBe(0);
    expect(result.impotForfaitaire).toBeCloseTo(4000 * 0.128);
  });

  it('2ZZ rejoint le barème avec option 2OP (sans abattement 40 %, ce n\'est pas un dividende)', () => {
    const result = calculer(makeInput({ case2op: true, case2zz: 4000 }));
    expect(result.totalNetImposable).toBe(4000);
    expect(result.impotForfaitaire).toBe(0);
  });

  it('2XX (déjà taxé à la source) reste sans aucun effet, avec ou sans option', () => {
    const sansOption = calculer(makeInput({ case2xx: 5000 }));
    expect(sansOption.impotForfaitaire).toBe(0);
    const avecOption = calculer(makeInput({ case2op: true, case2xx: 5000 }));
    expect(avecOption.totalNetImposable).toBe(0);
  });

  it('combine 2YY (toujours barème) et 2ZZ (PFU) sans option 2OP', () => {
    const result = calculer(makeInput({ case2yy: 2000, case2zz: 3000 }));
    expect(result.totalNetImposable).toBe(2000);
    expect(result.impotForfaitaire).toBeCloseTo(3000 * 0.128);
  });
});

describe('calculerRevenuCapitauxMobiliers — contrats de 8 ans et plus (Phase 2b)', () => {
  it('sous le plafond d\'abattement (célibataire, 4 600 €) : 2CH net imposable au barème', () => {
    const result = calculer(makeInput({ case2ch: 3000 }));
    expect(result.totalNetImposable).toBe(0);
    expect(result.impotForfaitaire).toBe(0);
  });

  it('2CH est toujours imposé au barème, même sans option 2OP, au-delà de l\'abattement', () => {
    const result = calculer(makeInput({ case2ch: 6000 }));
    expect(result.totalNetImposable).toBe(1400); // 6000 - 4600
    expect(result.impotForfaitaire).toBe(0);
  });

  it('applique le plafond de 9 200 € pour un couple marié/pacsé', () => {
    const result = calculer(makeInput({ case2ch: 6000 }), 'marie');
    expect(result.totalNetImposable).toBe(0); // 6000 < 9200
  });

  it('2DH ne rejoint jamais le revenu imposable, avec ou sans option', () => {
    const sansOption = calculer(makeInput({ case2dh: 10000 }));
    expect(sansOption.totalNetImposable).toBe(0);
    expect(sansOption.impotForfaitaire).toBe(0);
    const avecOption = calculer(makeInput({ case2op: true, case2dh: 10000 }));
    expect(avecOption.totalNetImposable).toBe(0);
  });

  it('2DH génère un crédit d\'impôt de 7,5 % sur la fraction d\'abattement inutilisée par 2CH', () => {
    const result = calculer(makeInput({ case2dh: 10000 })); // 4600 € imputés dessus (2CH vide)
    expect(result.creditImpotAssuranceVie).toBeCloseTo(4600 * 0.075);
  });

  it('l\'abattement est imputé en priorité sur 2CH avant 2DH', () => {
    const result = calculer(makeInput({ case2ch: 2000, case2dh: 10000 }));
    // 2000 € d'abattement absorbés par 2CH, reliquat 2600 € imputé sur 2DH
    expect(result.totalNetImposable).toBe(0); // 2000 - 2000 (abattement) = 0
    expect(result.creditImpotAssuranceVie).toBeCloseTo(2600 * 0.075);
  });

  it('2VV est taxé à 7,5 % (PFU) après reliquat d\'abattement, sans option 2OP', () => {
    const result = calculer(makeInput({ case2vv: 10000 })); // 4600 € d'abattement, reste 5400 €
    expect(result.impotForfaitaire).toBeCloseTo(5400 * 0.075);
  });

  it('2VV rejoint le barème avec option 2OP', () => {
    const result = calculer(makeInput({ case2op: true, case2vv: 10000 }));
    expect(result.totalNetImposable).toBe(5400);
    expect(result.impotForfaitaire).toBe(0);
  });

  it('2WW est taxé à 12,8 % (PFU) après reliquat d\'abattement, sans option 2OP', () => {
    const result = calculer(makeInput({ case2ww: 10000 }));
    expect(result.impotForfaitaire).toBeCloseTo(5400 * 0.128);
  });

  it('l\'abattement est imputé dans l\'ordre 2CH → 2DH → 2VV → 2WW', () => {
    const result = calculer(makeInput({ case2ch: 1000, case2dh: 1000, case2vv: 1000, case2ww: 10000 }));
    // Abattement 4600 : 1000 sur 2CH, 1000 sur 2DH, 1000 sur 2VV, 1600 restant sur 2WW
    expect(result.totalNetImposable).toBe(0); // 2CH net = 0
    expect(result.creditImpotAssuranceVie).toBeCloseTo(1000 * 0.075); // reliquat imputé sur 2DH
    expect(result.impotForfaitaire).toBeCloseTo((10000 - 1600) * 0.128); // 2VV entièrement absorbé par l'abattement
  });

  it('le crédit d\'impôt est indépendant de l\'option 2OP', () => {
    const sansOption = calculer(makeInput({ case2dh: 10000 }));
    const avecOption = calculer(makeInput({ case2op: true, case2dh: 10000 }));
    expect(sansOption.creditImpotAssuranceVie).toBe(avecOption.creditImpotAssuranceVie);
  });
});

describe('calculerRevenuCapitauxMobiliers — gains de cession de bons/contrats (Phase 2c)', () => {
  it('2VN est toujours imposé au barème, sans option 2OP', () => {
    const result = calculer(makeInput({ case2vn: 4000 }));
    expect(result.totalNetImposable).toBe(4000);
    expect(result.impotForfaitaire).toBe(0);
  });

  it('2VN est imposé au barème et cumulé avec le reste, option 2OP cochée', () => {
    const result = calculer(makeInput({ case2op: true, case2vn: 4000, case2tr: 1000 }));
    expect(result.totalNetImposable).toBe(5000);
  });

  it('2VO est taxé à 7,5 % (PFU) sans option 2OP, brut, sans aucun abattement', () => {
    const result = calculer(makeInput({ case2vo: 10000 }));
    expect(result.impotForfaitaire).toBeCloseTo(10000 * 0.075);
  });

  it('2VP est taxé à 12,8 % (PFU) sans option 2OP, brut, sans aucun abattement', () => {
    const result = calculer(makeInput({ case2vp: 10000 }));
    expect(result.impotForfaitaire).toBeCloseTo(10000 * 0.128);
  });

  it('2VO et 2VP rejoignent le barème avec option 2OP, brut, sans abattement', () => {
    const result = calculer(makeInput({ case2op: true, case2vo: 10000, case2vp: 5000 }));
    expect(result.totalNetImposable).toBe(15000);
    expect(result.impotForfaitaire).toBe(0);
  });

  it("2VO/2VP ne consomment pas l'abattement 4 600 €/9 200 € des contrats ≥ 8 ans (2CH/2DH/2VV/2WW)", () => {
    // 2CH absorbe tout l'abattement (4600 €) ; 2VO doit rester taxé sur son montant brut, pas de reliquat partagé.
    const result = calculer(makeInput({ case2ch: 10000, case2vo: 1000 }));
    expect(result.totalNetImposable).toBe(5400); // 10000 - 4600 (2CH)
    expect(result.impotForfaitaire).toBeCloseTo(1000 * 0.075); // 2VO intégralement taxé, aucun abattement partagé
  });

  it('2VM (gains déjà soumis au prélèvement libératoire) reste sans aucun effet, avec ou sans option', () => {
    const sansOption = calculer(makeInput({ case2vm: 5000 }));
    expect(sansOption.impotForfaitaire).toBe(0);
    const avecOption = calculer(makeInput({ case2op: true, case2vm: 5000 }));
    expect(avecOption.totalNetImposable).toBe(0);
  });

  it('combine 2VN (toujours barème) et 2VO/2VP (PFU) sans option 2OP', () => {
    const result = calculer(makeInput({ case2vn: 2000, case2vo: 1000, case2vp: 3000 }));
    expect(result.totalNetImposable).toBe(2000);
    expect(result.impotForfaitaire).toBeCloseTo(1000 * 0.075 + 3000 * 0.128);
  });
});

describe('calculerRevenuCapitauxMobiliers — crédits d\'impôt sur valeurs étrangères (2AB/2CK)', () => {
  it('expose 2AB et 2CK tels quels, indépendamment du switch 2OP', () => {
    const sansOption = calculer(makeInput({ case2ab: 300, case2ck: 200 }));
    expect(sansOption.creditImpotEtranger2AB).toBe(300);
    expect(sansOption.creditImpotValeursEtrangeres2CK).toBe(200);

    const avecOption = calculer(makeInput({ case2op: true, case2ab: 300, case2ck: 200 }));
    expect(avecOption.creditImpotEtranger2AB).toBe(300);
    expect(avecOption.creditImpotValeursEtrangeres2CK).toBe(200);
  });

  it('sont nuls par défaut', () => {
    const result = calculer(makeInput());
    expect(result.creditImpotEtranger2AB).toBe(0);
    expect(result.creditImpotValeursEtrangeres2CK).toBe(0);
  });
});

describe('calculerRevenuCapitauxMobiliers — cases exclues du calcul', () => {
  it("les cases hors périmètre n'ont aucun effet, avec ou sans option barème", () => {
    const input = makeInput({
      case2uu: 1000,
      case2xx: 1000,
      case2vm: 1000,
      case2vq: 1000, case2vr: 1000, case2vs: 1000, case2vt: 1000, case2vu: 1000,
      case2tu: 1000, case2tv: 1000, case2tw: 1000, case2tx: 1000, case2ty: 1000,
      case2cg: 1000, case2bh: 1000, case2df: 1000, case2dg: 1000, case2di: 1000, case2ee: 1000,
    });

    const sansOption = calculer(input);
    expect(sansOption.impotForfaitaire).toBe(0);

    const avecOption = calculer({ ...input, case2op: true });
    expect(avecOption.totalNetImposable).toBe(0);
  });

  it('expose la liste des cases exclues', () => {
    const result = calculer(makeInput());
    expect(result.casesExclues).toContain('case2uu');
    expect(result.casesExclues).toContain('case2vm');
    expect(result.casesExclues).toContain('case2vq');
    expect(result.casesExclues).toContain('case2xx');
    expect(result.casesExclues).not.toContain('case2dc');
    expect(result.casesExclues).not.toContain('case2go');
    expect(result.casesExclues).not.toContain('case2aa');
    expect(result.casesExclues).not.toContain('case2yy');
    expect(result.casesExclues).not.toContain('case2zz');
    expect(result.casesExclues).not.toContain('case2ch');
    expect(result.casesExclues).not.toContain('case2dh');
    expect(result.casesExclues).not.toContain('case2vv');
    expect(result.casesExclues).not.toContain('case2ww');
    expect(result.casesExclues).not.toContain('case2vn');
    expect(result.casesExclues).not.toContain('case2vo');
    expect(result.casesExclues).not.toContain('case2vp');
    expect(result.casesExclues).not.toContain('case2ab');
    expect(result.casesExclues).not.toContain('case2ck');
  });
});
