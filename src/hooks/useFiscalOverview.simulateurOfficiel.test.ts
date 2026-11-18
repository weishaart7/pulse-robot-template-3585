// @vitest-environment jsdom
/**
 * Non-régression contre le simulateur officiel impots.gouv (calc-2026.cgi, revenus 2025).
 * Foyers fictifs ; valeurs attendues relevées sur le simulateur officiel en novembre 2026.
 * Les écarts connus sont des `it.fails` : quand un correctif les résout, le test échoue
 * et doit être converti en `it` classique.
 */
import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { EnfantCharge, FoyerFiscalInput } from '@/lib/fiscalite/types';

const { donnees, hook } = vi.hoisted(() => {
  const donnees: Record<string, unknown> = {};
  return {
    donnees,
    hook: (cle: string) => () => ({ data: donnees[cle] ?? null, loading: false, refetch: () => {} }),
  };
});

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: false }) }));
vi.mock('@/hooks/useFoyerFiscal', () => ({ useFoyerFiscal: hook('foyer') }));
vi.mock('@/hooks/useRevenusSalaires', () => ({ useRevenusSalaires: hook('salaires') }));
vi.mock('@/hooks/useGainsActionnariatSalarie', () => ({ useGainsActionnariatSalarie: hook('gains') }));
vi.mock('@/hooks/useRevenusExoneresTauxEffectif', () => ({ useRevenusExoneresTauxEffectif: hook('exoneres') }));
vi.mock('@/hooks/usePensionsRetraitesRentes', () => ({ usePensionsRetraitesRentes: hook('pensions') }));
vi.mock('@/hooks/useRevenusCapitauxMobiliers', () => ({ useRevenusCapitauxMobiliers: hook('rcm') }));
vi.mock('@/hooks/usePlusValuesGainsDivers', () => ({ usePlusValuesGainsDivers: hook('plusValues') }));
vi.mock('@/hooks/useRevenusFonciers2042', () => ({ useRevenusFonciers2042: hook('fonciers') }));
vi.mock('@/hooks/useRevenusNonSalaries', () => ({ useRevenusNonSalaries: hook('nonSalaries') }));
vi.mock('@/hooks/useChargesDeductibles', () => ({ useChargesDeductibles: hook('charges') }));
vi.mock('@/hooks/useReductionsCreditsImpot', () => ({ useReductionsCreditsImpot: hook('reductions') }));
vi.mock('@/hooks/usePrelevementSourceDivers', () => ({ usePrelevementSourceDivers: hook('prelevementSource') }));

import { useFiscalOverview } from './useFiscalOverview';

const FOYER: FoyerFiscalInput = {
  situationFamille: 'celibataire', lieuResidence: 'metropole', enfantsCharge: [], personnesInvalidesCharge: [],
  enfantsMajeursRattaches: 0, parentIsole: false, ancienParentIsole: false, invaliditeDeclarant1: false,
  invaliditeDeclarant2: false, ancienCombattantDeclarant1: false, ancienCombattantDeclarant2: false,
  veufAncienCombattant: false, veuveDeGuerre: false,
};
const enfant = (anneeNaissance: number, options: Partial<EnfantCharge> = {}): EnfantCharge =>
  ({ anneeNaissance, invalide: false, residenceAlternee: false, ...options });
/** Plafond épargne retraite large : le simulateur additionne APS à DPS (4 × 15 000 €). */
const PLAFOND_PER = 60000;

interface Attendu {
  parts: number;
  revenuFiscalReference: number;
  droitsSimples: number;
  decote?: number;
  impotProportionnel?: number;
  reductions?: number;
  cehr?: number;
  /** « Impôt sur le revenu net » du simulateur : CEHR comprise, après crédits. */
  impotNet: number;
  prelevementsSociaux: number;
  tmi: number;
}

interface Cas {
  description: string;
  saisies: Record<string, unknown>;
  attendu: Attendu;
  /** Postes d'`attendu` encore en écart connu (testés en `it.fails`). */
  ecartsConnus?: (keyof Attendu)[];
}

const CAS: Record<string, Cas> = {
  S1: {
    description: 'marié, 3 enfants dont 1 alterné, dividendes au barème, micro-foncier, PER',
    saisies: {
      foyer: { ...FOYER, situationFamille: 'marie', anneeNaissanceDeclarant1: 1978, anneeNaissanceDeclarant2: 1980,
        enfantsCharge: [enfant(2012), enfant(2015), enfant(2019, { residenceAlternee: true })] },
      salaires: { case1aj: 95000, case1bj: 58000 },
      rcm: { case2dc: 18000, case2ck: 5400, case2bh: 18000, case2op: true },
      fonciers: { case4be: 14000 },
      charges: { case6ns: 9000, case6nt: 4000, case6ps: PLAFOND_PER, case6pt: PLAFOND_PER },
      reductions: { case7uf: 2500, case7db: 7000 },
    },
    attendu: { parts: 3.5, revenuFiscalReference: 164276, droitsSimples: 24010, reductions: 1650, impotNet: 13460,
      prelevementsSociaux: 1686, tmi: 0.3 },
  },
  S2: {
    description: 'parent isolé, frais réels, PFU, foncier réel avec déficit antérieur, pension alimentaire',
    saisies: {
      foyer: { ...FOYER, parentIsole: true, anneeNaissanceDeclarant1: 1985, enfantsCharge: [enfant(2014)] },
      salaires: { case1aj: 48000, case1ak: 9000 },
      rcm: { case2tr: 3000, case2bh: 3000, case2op: false },
      plusValues: { case3vg: 25000 },
      fonciers: { case4ba: 8000, case4bd: 3000 },
      charges: { case6gu: 3600 },
      reductions: { case7uf: 800, case7db: 4000 },
    },
    attendu: { parts: 2, revenuFiscalReference: 68400, droitsSimples: 1892, decote: 41, impotProportionnel: 3584,
      reductions: 528, impotNet: 2907, prelevementsSociaux: 5510, tmi: 0.11 },
  },
  S3: {
    description: 'pacsés retraités, assurance-vie, PFU, grosse plus-value, CEHR',
    saisies: {
      foyer: { ...FOYER, situationFamille: 'pacse', anneeNaissanceDeclarant1: 1955, anneeNaissanceDeclarant2: 1957 },
      pensions: { case1as: 72000, case1bs: 48000 },
      rcm: { case2ch: 12000, case2dc: 60000, case2tr: 20000, case2bh: 92000, case2op: false },
      plusValues: { case3vg: 350000 },
      fonciers: { case4ba: 40000 },
      reductions: { case7ud: 3000, case7uf: 5000 },
    },
    attendu: { parts: 2, revenuFiscalReference: 588361, droitsSimples: 33716, impotProportionnel: 55040,
      reductions: 5370, cehr: 2651, impotNet: 86037, prelevementsSociaux: 71980, tmi: 0.3 },
  },
  S4: {
    description: 'marié, conjoint invalide, enfant invalide alterné, 2OP + abattement 3SG, rente viagère, PER',
    saisies: {
      foyer: { ...FOYER, situationFamille: 'marie', anneeNaissanceDeclarant1: 1960, anneeNaissanceDeclarant2: 1962,
        invaliditeDeclarant2: true,
        enfantsCharge: [enfant(2012), enfant(2015), enfant(2018, { invalide: true, residenceAlternee: true })] },
      salaires: { case1aj: 180000 },
      pensions: { case1bs: 30000, case1aw: 6000 },
      rcm: { case2dc: 40000, case2tr: 5000, case2bh: 45000, case2op: true },
      plusValues: { case3vg: 30000, case3sg: 20000 },
      fonciers: { case4ba: 22000 },
      charges: { case6ns: 20000, case6ps: PLAFOND_PER },
      reductions: { case7db: 15000, case7uf: 4000 },
    },
    // Officiel : réduction complémentaire 2 702 € (art. 197 I 2) affichée à part des dons (2 640 €).
    attendu: { parts: 4.25, revenuFiscalReference: 290585, droitsSimples: 55649, reductions: 2640, impotNet: 42807,
      prelevementsSociaux: 10145, tmi: 0.41 },
    ecartsConnus: ['impotNet', 'tmi'],
  },
  S5: {
    description: 'veuf invalide, enfant invalide, rente viagère, assurance-vie, micro-foncier, dons 7UD',
    saisies: {
      foyer: { ...FOYER, situationFamille: 'veuf', anneeNaissanceDeclarant1: 1950, invaliditeDeclarant1: true,
        enfantsCharge: [enfant(2010, { invalide: true })] },
      pensions: { case1as: 35000, case1aw: 8000 },
      rcm: { case2ch: 30000, case2op: false },
      fonciers: { case4be: 8000 },
      charges: { case6gu: 5000 },
      reductions: { case7ud: 1500, case7uf: 3000, case7db: 9000 },
    },
    // Officiel : réduction complémentaire 524 €, puis 2 475 € de dons imputés.
    attendu: { parts: 3.5, revenuFiscalReference: 63100, droitsSimples: 2999, reductions: 2475, impotNet: -4500,
      prelevementsSociaux: 7585, tmi: 0.3 },
    ecartsConnus: ['reductions', 'tmi'],
  },
  S6: {
    description: 'célibataire très haut revenu, PFU, plafond 20 % des dons, CEHR',
    saisies: {
      foyer: { ...FOYER, anneeNaissanceDeclarant1: 1975 },
      salaires: { case1aj: 450000 },
      rcm: { case2dc: 120000, case2tr: 40000, case2ck: 15000, case2op: false },
      plusValues: { case3vg: 600000 },
      fonciers: { case4ba: 60000 },
      reductions: { case7uf: 150000, case7db: 12000 },
    },
    attendu: { parts: 1, revenuFiscalReference: 1255445, droitsSimples: 199474, impotProportionnel: 97280,
      reductions: 65399, cehr: 37718, impotNet: 248073, prelevementsSociaux: 151680, tmi: 0.45 },
  },
  S7: {
    description: 'pacsés, micro-BNC pro, micro-BIC services, LMNP micro, frais réels, 2OP, PER',
    saisies: {
      foyer: { ...FOYER, situationFamille: 'pacse', anneeNaissanceDeclarant1: 1983, anneeNaissanceDeclarant2: 1985,
        enfantsCharge: [enfant(2016), enfant(2020)] },
      nonSalaries: { case5hq: 70000, case5np: 9000, case5ni: 14000 },
      salaires: { case1bj: 42000, case1bk: 6500 },
      rcm: { case2tr: 4000, case2bh: 4000, case2op: true },
      charges: { case6ns: 6000, case6ps: PLAFOND_PER, case6pt: PLAFOND_PER },
      reductions: { case7db: 5000 },
    },
    attendu: { parts: 3, revenuFiscalReference: 96928, droitsSimples: 9872, impotNet: 7372,
      prelevementsSociaux: 1302, tmi: 0.3 },
  },
  S8: {
    description: 'ancien parent isolé (L) âgé, salaire + pension, décote, crédits restituables',
    saisies: {
      foyer: { ...FOYER, ancienParentIsole: true, anneeNaissanceDeclarant1: 1958 },
      salaires: { case1aj: 22000 },
      pensions: { case1as: 8000 },
      rcm: { case2tr: 1200, case2ck: 156, case2bh: 1200, case2op: true },
      reductions: { case7uf: 300, case7db: 3000 },
    },
    attendu: { parts: 1.5, revenuFiscalReference: 26707, droitsSimples: 1024, decote: 434, reductions: 198,
      impotNet: -1264, prelevementsSociaux: 0, tmi: 0.11 },
  },
  S9: {
    description: 'marié, assurance-vie 2CH/2VV/2WW, PFU, foncier réel, PER, plafonnement du quotient',
    saisies: {
      foyer: { ...FOYER, situationFamille: 'marie', anneeNaissanceDeclarant1: 1968, anneeNaissanceDeclarant2: 1970,
        enfantsCharge: [enfant(2011)] },
      salaires: { case1aj: 120000, case1bj: 90000 },
      rcm: { case2ch: 15000, case2vv: 10000, case2ww: 20000, case2dc: 25000, case2op: false },
      plusValues: { case3vg: 60000 },
      fonciers: { case4ba: 15000, case4bd: 5000 },
      charges: { case6ns: 12000, case6nt: 10000, case6ps: PLAFOND_PER, case6pt: PLAFOND_PER },
      reductions: { case7uf: 6000, case7ud: 1000, case7db: 10000 },
    },
    attendu: { parts: 2.5, revenuFiscalReference: 319800, droitsSimples: 40742, impotProportionnel: 14190,
      reductions: 4710, impotNet: 45222, prelevementsSociaux: 25900, tmi: 0.41 },
    ecartsConnus: ['tmi'],
  },
};

function calculer(saisies: Record<string, unknown>) {
  for (const cle of Object.keys(donnees)) delete donnees[cle];
  Object.assign(donnees, saisies);
  const { result } = renderHook(() => useFiscalOverview());
  const r = result.current;
  const obtenu: Required<Attendu> = {
    parts: r.parts.nombreParts,
    revenuFiscalReference: r.impot.revenuFiscalReference,
    droitsSimples: Math.round(r.impot.impotApresPlafonnement),
    decote: Math.round(r.impot.decote),
    impotProportionnel: r.impot.impotForfaitaire,
    reductions: r.impot.reductionsImpot,
    cehr: r.cehr,
    impotNet: r.impot.impotNet + r.cehr,
    prelevementsSociaux: r.prelevementsSociauxTotal,
    tmi: r.impot.tmi,
  };
  return obtenu;
}

describe('useFiscalOverview — simulateur officiel 2026 (revenus 2025)', () => {
  for (const [nom, cas] of Object.entries(CAS)) {
    describe(`${nom} : ${cas.description}`, () => {
      const postes = Object.keys(cas.attendu) as (keyof Attendu)[];
      for (const poste of postes) {
        const enEcart = cas.ecartsConnus?.includes(poste) ?? false;
        (enEcart ? it.fails : it)(`${poste}${enEcart ? ' (écart connu)' : ''}`, () => {
          expect(calculer(cas.saisies)[poste]).toBe(cas.attendu[poste]);
        });
      }
    });
  }
});
