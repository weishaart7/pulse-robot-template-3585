import { describe, expect, it } from 'vitest';
import { calculerSouscriptionsCapital } from './calculerSouscriptionsCapital';
import { calculerPlafonnementNiches } from './calculerPlafonnementNiches';
import { calculerReductionsCreditsImpot } from './calculerReductionsCreditsImpot';
import { calculerImpot } from './calculerImpot';
import { aRevenuProfessionnelReel, REVENUS_NON_SALARIES_VIDE } from './calculerRevenusNonSalaries';
import { calculerPartsFiscales } from './calculerPartsFiscales';
import { FoyerFiscalInput, ReductionsCreditsImpotInput } from './types';

/** Valeurs relevées sur le simulateur officiel 2026 (couple, RNI 470 890 €, sauf mention). */
const RNI = 470890;
const r = (o: Partial<ReductionsCreditsImpotInput>, couple = true, rni = RNI) =>
  calculerSouscriptionsCapital(o as ReductionsCreditsImpotInput, couple, rni);

describe('calculerSouscriptionsCapital', () => {
  it.each([
    ['case7ci', 180], ['case7co', 250], ['case7cr', 300], ['case7dz', 500], ['case7gw', 250],
    ['case7ct', 180], ['case7cu', 180], ['case7cw', 250], ['case7cp', 180], ['case7cq', 250],
    ['case7cv', 180], ['case7do', 180], ['case7dp', 250], ['case7ca', 250], ['case7gq', 180],
    ['case7gr', 250], ['case7fm', 300], ['case7fl', 300], ['case7fn', 300], ['case7gn', 360], ['case7en', 480],
    ['case7dc', 250], ['case7bs', 250], ['case7bt', 250], ['case7bu', 250], ['case7bw', 250], ['case7ek', 1000],
    ['case7cy', 1000], ['case7dy', 1000], ['case7ey', 1000], ['case7fy', 1000], ['case7gy', 1000],
    ['case7mx', 300], ['case7my', 500], ['case7nz', 180], ['case7uc', 500], ['case7fh', 250],
  ])('%s 1 000 € → %i €', (cle, attendu) => {
    expect(r({ [cle]: 1000 }).reductions).toBe(attendu);
  });
  it('plafond commun PME/ESUS, 25 % imputé en premier', () => {
    expect(r({ case7ci: 60000, case7ct: 60000 }).reductions).toBe(18000);
    expect(r({ case7ci: 60000, case7co: 60000 }).reductions).toBe(22200);
  });
  it('ordre d’imputation relevé par paires (ni le taux ni la date)', () => {
    expect(r({ case7dc: 60000, case7ci: 60000 }).reductions).toBe(22200);
    expect(r({ case7bs: 60000, case7ci: 60000 }).reductions).toBe(20800);
    expect(r({ case7ct: 60000, case7cw: 60000 }).reductions).toBe(20800);
    expect(r({ case7cu: 60000, case7cw: 60000 }).reductions).toBe(22200);
    expect(r({ case7cv: 60000, case7dp: 60000 }).reductions).toBe(22200);
    expect(r({ case7cv: 60000, case7co: 60000 }).reductions).toBe(20800);
    expect(r({ case7bs: 60000, case7dc: 60000 }).reductions).toBe(25000);
  });
  it('7DO déduite deux fois du plafond pour les cases imputées après elle (simulateur)', () => {
    expect(r({ case7do: 20000, case7co: 20000 }, false).reductions).toBe(6100);
    expect(r({ case7do: 10000, case7co: 30000 }, false).reductions).toBe(9300);
    expect(r({ case7do: 49000, case7co: 4000 }).reductions).toBe(9320);
    expect(r({ case7do: 48000, case7co: 8000 }).reductions).toBe(9640);
    expect(r({ case7do: 50000, case7co: 4000 }).reductions).toBe(9000);
    expect(r({ case7do: 55000, case7co: 4000 }).reductions).toBe(9900);
    expect(r({ case7do: 60000, case7co: 60000 }).reductions).toBe(10800);
    expect(r({ case7do: 50000, case7dp: 4000 }).reductions).toBe(10000);
  });
  it('plafonds propres : presse, objets MH, DFCI, reprise de société', () => {
    expect(r({ case7mx: 15000, case7my: 15000 }).reductions).toBe(9000);
    expect(r({ case7mx: 100000 }, false).reductions).toBe(3000);
    expect(r({ case7nz: 100000 }).reductions).toBe(3600);
    expect(r({ case7uc: 100000 }).horsPlafond).toBe(500);
    expect(r({ case7fh: 100000 }).horsPlafond).toBe(10000);
    expect(r({ case7fh: 100000 }, false).horsPlafond).toBe(5000);
  });
  it('JEI et JEIR : plafonds propres, hors plafond global', () => {
    expect(r({ case7cr: 200000 }).horsPlafond).toBe(45000);
    expect(r({ case7dz: 200000 }).horsPlafond).toBe(50000);
    expect(r({ case7cr: 100000, case7dz: 100000 }, false).horsPlafond).toBe(47500);
    expect(r({ case7dz: 100000, case7cr: 10000 }, false).horsPlafond).toBe(28000);
  });
  it('FCPI commun, FIP Corse séparé', () => {
    expect(r({ case7gq: 20000, case7gr: 20000 }).reductions).toBe(5720);
    expect(r({ case7gq: 30000, case7fm: 30000 }).reductions).toBe(11520);
  });
  it('SOFICA : 18 000 € ou 25 % du revenu, 48 % puis 36 % puis 30 %', () => {
    expect(r({ case7en: 100000 }).sofica).toBe(8640);
    expect(r({ case7fn: 10000, case7gn: 10000, case7en: 10000 }).sofica).toBe(7680);
    expect(r({ case7en: 18000 }, false, 36000).sofica).toBe(4320);
  });
});

describe('souscriptions branchées sur le plafonnement global', () => {
  const FOYER = {
    situationFamille: 'marie', lieuResidence: 'metropole', enfantsCharge: [], personnesInvalidesCharge: [],
    enfantsMajeursRattaches: 0, parentIsole: false, ancienParentIsole: false, invaliditeDeclarant1: false,
    invaliditeDeclarant2: false, ancienCombattantDeclarant1: false, ancienCombattantDeclarant2: false,
    veufAncienCombattant: false, veuveDeGuerre: false,
  } as FoyerFiscalInput;
  const parts = calculerPartsFiscales(FOYER);
  const impotNet = (o: Partial<ReductionsCreditsImpotInput>, outreMer = 0) => {
    const input = o as ReductionsCreditsImpotInput;
    const c = calculerReductionsCreditsImpot(input, FOYER, RNI);
    const s = calculerSouscriptionsCapital(input, true, RNI);
    const p = calculerPlafonnementNiches({
      courants: c.avantagesPlafonnesCourants + s.avantagesPlafonnesCourants,
      esus: s.esus, outreMer, sofica: s.sofica,
    });
    return calculerImpot(RNI, parts, 'marie', 0, 'metropole', 0, 0, 0, 0, 0, 0,
      c.totalReductions + s.reductions + outreMer, c.totalCredits, 0, p.excedent).impotNet;
  };
  const base = impotNet({});
  it.each<[Partial<ReductionsCreditsImpotInput>, number]>([
    [{ case7ci: 100000 }, 10000],
    [{ case7co: 40000 }, 10000],
    [{ case7cr: 200000 }, 45000],
    [{ case7cr: 60000, case7ci: 60000 }, 28000],
    [{ case7en: 40000, case7db: 20000, case7dg: true }, 18000],
    [{ case7dc: 40000, case7co: 40000 }, 13000],
    [{ case7dc: 100000 }, 13000],
    [{ case7bs: 100000 }, 13000],
    [{ case7bt: 100000 }, 10000],
    [{ case7ek: 2000, case7ci: 50000 }, 11000],
    [{ case7cy: 100000 }, 10000],
    [{ case7mx: 20000, case7db: 20000, case7dg: true }, 10000],
    [{ case7nz: 20000, case7db: 20000, case7dg: true }, 10000],
    [{ case7uc: 20000, case7db: 20000, case7dg: true }, 10500],
    [{ case7fh: 20000, case7db: 20000, case7dg: true }, 15000],
  ])('%o → baisse de %i €', (o, baisse) => {
    expect(base - impotNet(o)).toBe(baisse);
  });
  it('majoration de 8 000 € partagée entre SOFICA et outre-mer', () => {
    expect(base - impotNet({ case7en: 40000, case7db: 20000, case7dg: true }, 8000)).toBe(18000);
  });
});

describe("mécénat d'entreprise (7US)", () => {
  it('retenu en entier, hors plafonnement global, avec un revenu au réel', () => {
    const r = calculerSouscriptionsCapital({ case7us: 15000 } as ReductionsCreditsImpotInput, true, 200000, true);
    expect(r.reductions).toBe(15000);
    expect(r.horsPlafond).toBe(15000);
    expect(r.avantagesPlafonnesCourants).toBe(0);
  });
  it('ignoré sans revenu professionnel au réel', () => {
    expect(calculerSouscriptionsCapital({ case7us: 15000 } as ReductionsCreditsImpotInput, true, 200000).reductions).toBe(0);
  });
  it('prérequis : réel des déclarants ou des personnes à charge, pas le micro', () => {
    const v = { ...REVENUS_NON_SALARIES_VIDE };
    expect(aRevenuProfessionnelReel(v)).toBe(false);
    expect(aRevenuProfessionnelReel({ ...v, case5kp: 50000 })).toBe(false);
    expect(aRevenuProfessionnelReel({ ...v, case5kc: 50000 })).toBe(true);
    expect(aRevenuProfessionnelReel({ ...v, case5qc: 50000 })).toBe(true);
    expect(aRevenuProfessionnelReel({ ...v, case5jg: 50000 })).toBe(true);
    expect(aRevenuProfessionnelReel({ ...v, case5mc: 50000 })).toBe(true);
    expect(aRevenuProfessionnelReel({ ...v, case5mp: 50000 })).toBe(false);
  });
});
