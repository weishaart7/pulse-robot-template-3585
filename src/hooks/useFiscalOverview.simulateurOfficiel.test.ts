// @vitest-environment jsdom
/**
 * Non-régression contre le simulateur officiel impots.gouv (calc-2026.cgi, revenus 2025).
 * Foyers fictifs ; valeurs attendues relevées sur le simulateur officiel en novembre 2026.
 * Les écarts connus sont des `it.fails` : quand un correctif les résout, le test échoue
 * et doit être converti en `it` classique.
 */
import { describe, expect, it, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { MillesimeFiscalProvider } from '@/contexts/MillesimeFiscalContext';
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
  cdhr?: number;
  /** « Montant restant à payer » : impôt net après prélèvement à la source et avances (8EA, 7HB). */
  solde?: number;
  /** Excédent du plafonnement global des avantages fiscaux (art. 200-0 A). */
  plafonnement?: number;
  /** « Impôt sur le revenu net » du simulateur : CEHR et CDHR comprises, après crédits. */
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
      reductions: 5370, cehr: 2651, cdhr: 0, impotNet: 86037, prelevementsSociaux: 71980, tmi: 0.3 },
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
    // Réduction complémentaire 2 702 € (art. 197 I 2), affichée à part des dons (2 640 €).
    attendu: { parts: 4.25, revenuFiscalReference: 290585, droitsSimples: 55649, reductions: 2640, impotNet: 42807,
      prelevementsSociaux: 10145, tmi: 0.41 },
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
    // Réduction complémentaire 524 €, puis 2 475 € de dons imputés.
    attendu: { parts: 3.5, revenuFiscalReference: 63100, droitsSimples: 2999, reductions: 2475, impotNet: -4500,
      prelevementsSociaux: 7585, tmi: 0.3 },
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
      reductions: 65399, cehr: 37718, cdhr: 0, impotNet: 248073, prelevementsSociaux: 151680, tmi: 0.45 },
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
  },
  S10: {
    description: 'CDHR : célibataire, 1 enfant, dividendes au PFU, emploi à domicile (crédit non réintégré)',
    saisies: {
      foyer: { ...FOYER, anneeNaissanceDeclarant1: 1975, enfantsCharge: [enfant(2012)] },
      rcm: { case2dc: 400000, case2op: false },
      reductions: { case7db: 10000 },
    },
    attendu: { parts: 1.5, revenuFiscalReference: 400000, droitsSimples: 0, impotProportionnel: 51200, cehr: 4500,
      cdhr: 27800, impotNet: 78500, prelevementsSociaux: 74400, tmi: 0 },
  },
  S11: {
    description: 'CDHR : salaire et PFU, dons non réintégrés en revenus 2025, réintégrés en revenus 2026',
    saisies: {
      foyer: { ...FOYER, anneeNaissanceDeclarant1: 1975 },
      salaires: { case1aj: 100000 },
      rcm: { case2dc: 300000, case2op: false },
      reductions: { case7uf: 10000 },
    },
    attendu: { parts: 1, revenuFiscalReference: 390000, droitsSimples: 20701, reductions: 6600, impotProportionnel: 38400,
      cehr: 4200, cdhr: 21299, impotNet: 78000, prelevementsSociaux: 55800, tmi: 0.41 },
  },
  S12: {
    description: 'réductions imputées sur le seul impôt au barème : PFU dû en entier malgré les dons',
    saisies: {
      foyer: { ...FOYER, anneeNaissanceDeclarant1: 1975 },
      salaires: { case1aj: 30000 },
      rcm: { case2dc: 20000, case2op: false },
      reductions: { case7uf: 3000 },
    },
    attendu: { parts: 1, revenuFiscalReference: 47000, droitsSimples: 1694, decote: 130, reductions: 1564,
      impotProportionnel: 2560, impotNet: 2560, prelevementsSociaux: 3720, tmi: 0.11 },
  },
  S13: {
    description: 'plafonnement global : PFU seul, PME non imputée faute d\'impôt au barème, aucun excédent',
    saisies: {
      foyer: { ...FOYER, anneeNaissanceDeclarant1: 1975 },
      rcm: { case2dc: 200000, case2op: false },
      reductions: { case7db: 12000, case7cp: 50000 },
    },
    attendu: { parts: 1, revenuFiscalReference: 200000, droitsSimples: 0, reductions: 0, plafonnement: 0,
      impotProportionnel: 25600, impotNet: 19600, prelevementsSociaux: 37200, tmi: 0 },
  },
  S14: {
    description: 'plafonnement global : PME imputée en partie (8 764 €) et emploi à domicile, excédent 4 764 €',
    saisies: {
      foyer: { ...FOYER, anneeNaissanceDeclarant1: 1975 },
      salaires: { case1aj: 58000 },
      reductions: { case7db: 12000, case7cp: 50000 },
    },
    attendu: { parts: 1, revenuFiscalReference: 52200, droitsSimples: 8764, reductions: 8764, plafonnement: 4764, prelevementsSociaux: 0,
      impotNet: -1236, tmi: 0.3 },
  },
  S15: {
    description: 'plafonnement global : dons imputés avant la PME, excédent 2 784 €',
    saisies: {
      foyer: { ...FOYER, anneeNaissanceDeclarant1: 1975 },
      salaires: { case1aj: 58000 },
      reductions: { case7uf: 3000, case7db: 12000, case7cp: 50000 },
    },
    attendu: { parts: 1, revenuFiscalReference: 52200, droitsSimples: 8764, reductions: 8764, plafonnement: 2784, prelevementsSociaux: 0,
      impotNet: -3216, tmi: 0.3 },
  },
  S16: {
    description: 'veuf, 1 enfant : réduction complémentaire de 2 011 € sur la part de veuvage',
    saisies: {
      foyer: { ...FOYER, situationFamille: 'veuf', anneeNaissanceDeclarant1: 1975, enfantsCharge: [enfant(2015)] },
      salaires: { case1aj: 66667 },
    },
    attendu: { parts: 2.5, revenuFiscalReference: 60000, droitsSimples: 5683, impotNet: 3672, prelevementsSociaux: 0, tmi: 0.3 },
  },
  S17: {
    description: 'veuf avec seulement une personne invalide à charge : 3 parts, 2 011 + 1 801 €',
    saisies: {
      foyer: { ...FOYER, situationFamille: 'veuf', anneeNaissanceDeclarant1: 1975, personnesInvalidesCharge: [{ anneeNaissance: 1950 }] },
      salaires: { case1aj: 100000 },
    },
    attendu: { parts: 3, revenuFiscalReference: 90000, droitsSimples: 13473, impotNet: 9661, prelevementsSociaux: 0, tmi: 0.41 },
  },
  S18: {
    description: 'parent isolé (T) avec seulement une personne invalide à charge : 2,5 parts',
    saisies: {
      foyer: { ...FOYER, parentIsole: true, anneeNaissanceDeclarant1: 1975, personnesInvalidesCharge: [{ anneeNaissance: 1950 }] },
      salaires: { case1aj: 100000 },
    },
    attendu: { parts: 2.5, revenuFiscalReference: 90000, droitsSimples: 15280, impotNet: 13479, prelevementsSociaux: 0, tmi: 0.41 },
  },
  S19: {
    description: "arrondis à l'euro des abattements : salaires, pensions, dividendes au barème",
    saisies: {
      foyer: { ...FOYER, anneeNaissanceDeclarant1: 1975 },
      salaires: { case1aj: 33336 },
      pensions: { case1as: 33336 },
      rcm: { case2dc: 10007, case2bh: 10007, case2op: true },
    },
    attendu: { parts: 1, revenuFiscalReference: 69331, droitsSimples: 12702, impotNet: 12702, prelevementsSociaux: 0, tmi: 0.3 },
  },
  S20: {
    description: "crédit égal à l'impôt français (1AF/8TK) : CEHR diminuée au prorata du revenu concerné",
    saisies: {
      foyer: { ...FOYER, anneeNaissanceDeclarant1: 1975 },
      salaires: { case1aj: 150000, case1af: 300000 },
      prelevementSource: { case8tk: 300000 },
    },
    attendu: { parts: 1, revenuFiscalReference: 435445, droitsSimples: 172474, cehr: 1854, cdhr: 0, impotNet: 59345,
      prelevementsSociaux: 0, tmi: 0.45 },
  },
  S21: {
    description: "crédit égal à l'impôt français : CEHR et CDHR diminuées au même prorata",
    saisies: {
      foyer: { ...FOYER, anneeNaissanceDeclarant1: 1975 },
      salaires: { case1af: 100000 },
      rcm: { case2dc: 400000, case2op: false },
      prelevementSource: { case8tk: 100000 },
    },
    attendu: { parts: 1, revenuFiscalReference: 490000, droitsSimples: 20701, impotProportionnel: 51200, cehr: 5878,
      cdhr: 15428, impotNet: 72506, prelevementsSociaux: 74400, tmi: 0.41 },
  },
  S22: {
    description: 'avance immédiate 7HB et avance 8EA ajoutées au solde à payer',
    saisies: {
      foyer: { ...FOYER, anneeNaissanceDeclarant1: 1975 },
      salaires: { case1aj: 50000 },
      reductions: { case7db: 10000, case7hb: 3000 },
      prelevementSource: { case8ea: 1000 },
    },
    attendu: { parts: 1, revenuFiscalReference: 45000, droitsSimples: 6604, impotNet: 1604, solde: 5604,
      prelevementsSociaux: 0, tmi: 0.3 },
  },
  S23: {
    description: 'divorcé, case T, 2 enfants alternés, BNC réel, PFU, cryptos, PER, FCPI 7GQ, CEHR',
    saisies: {
      foyer: { ...FOYER, situationFamille: 'divorce', parentIsole: true, anneeNaissanceDeclarant1: 1984,
        enfantsCharge: [enfant(2012, { residenceAlternee: true }), enfant(2016, { residenceAlternee: true })] },
      salaires: { case1aj: 220000 },
      nonSalaries: { case5qc: 60000 },
      rcm: { case2dc: 50000, case2op: false },
      plusValues: { case3vg: 40000, case3an: 10000 },
      charges: { case6ns: 15000, case6ps: PLAFOND_PER },
      reductions: { case7gq: 8000, case7db: 6000 },
    },
    attendu: { parts: 2, revenuFiscalReference: 365445, droitsSimples: 84962, impotProportionnel: 12800,
      reductions: 1440, cehr: 3463, cdhr: 0, impotNet: 96785, prelevementsSociaux: 18600, tmi: 0.45 },
  },
  S24: {
    description: 'marié très haut revenu, PFU, plus-value, foncier réel, FCPI 7GQ et dons, CEHR',
    saisies: {
      foyer: { ...FOYER, situationFamille: 'marie', anneeNaissanceDeclarant1: 1970, anneeNaissanceDeclarant2: 1972 },
      salaires: { case1aj: 400000, case1bj: 200000 },
      rcm: { case2dc: 100000, case2op: false },
      plusValues: { case3vg: 200000 },
      fonciers: { case4ba: 30000 },
      reductions: { case7gq: 10000, case7uf: 20000 },
    },
    attendu: { parts: 2, revenuFiscalReference: 900890, droitsSimples: 223448, impotProportionnel: 38400,
      reductions: 15000, cehr: 12027, cdhr: 0, impotNet: 258875, prelevementsSociaux: 60960, tmi: 0.45 },
  },
  S25: {
    description: 'micro-entrepreneur au versement libératoire (5TB) : droits simples au taux effectif',
    saisies: {
      foyer: { ...FOYER, anneeNaissanceDeclarant1: 1992 },
      salaires: { case1aj: 40000 },
      nonSalaries: { case5tb: 20000 },
    },
    attendu: { parts: 1, revenuFiscalReference: 46000, droitsSimples: 5403, impotNet: 5403, prelevementsSociaux: 0, tmi: 0.3 },
  },
  S26: {
    description: 'concubin, 2 enfants + 1 personne invalide à charge : la personne invalide prend le 3e rang (3,5 parts)',
    saisies: {
      foyer: { ...FOYER, anneeNaissanceDeclarant1: 1980, enfantsCharge: [enfant(2012), enfant(2015)], personnesInvalidesCharge: [{ anneeNaissance: 1950 }] },
      salaires: { case1aj: 70000 },
    },
    attendu: { parts: 3.5, revenuFiscalReference: 63000, droitsSimples: 2969, impotNet: 2464, prelevementsSociaux: 0, tmi: 0.3 },
  },
  S27: {
    description: 'célibataire, 3 personnes invalides à charge : part entière au 3e rang (4,5 parts)',
    saisies: {
      foyer: { ...FOYER, anneeNaissanceDeclarant1: 1980, personnesInvalidesCharge: [{ anneeNaissance: 1950 }, { anneeNaissance: 1950 }, { anneeNaissance: 1950 }] },
      salaires: { case1aj: 70000 },
    },
    attendu: { parts: 4.5, revenuFiscalReference: 63000, droitsSimples: 1188, impotNet: 829, prelevementsSociaux: 0, tmi: 0.11 },
  },
  S28: {
    description: 'marié, 1 enfant + 2 personnes invalides à charge (5 parts), décote',
    saisies: {
      foyer: { ...FOYER, situationFamille: 'marie', anneeNaissanceDeclarant1: 1980, anneeNaissanceDeclarant2: 1980,
        enfantsCharge: [enfant(2012)], personnesInvalidesCharge: [{ anneeNaissance: 1950 }, { anneeNaissance: 1950 }] },
      salaires: { case1aj: 70000 },
    },
    attendu: { parts: 5, revenuFiscalReference: 63000, droitsSimples: 550, impotNet: 0, prelevementsSociaux: 0, tmi: 0.11 },
  },
  S29: {
    description: 'dirigeant retraité : 3UA 600 000, abattement fixe 3VA 500 000, PFU ; CDHR nulle (RFR autonome 136 000)',
    saisies: { foyer: { ...FOYER, anneeNaissanceDeclarant1: 1960 }, pensions: { case1as: 40000 }, plusValues: { case3ua: 600000, case3va: 500000 }, rcm: { case2op: false } },
    attendu: { parts: 1, revenuFiscalReference: 636000, droitsSimples: 3904, impotProportionnel: 12800, cehr: 12940, cdhr: 0, impotNet: 29644, prelevementsSociaux: 111600, tmi: 0.3 },
  },
  S30: {
    description: 'dirigeant retraité : plus-value entièrement couverte par 3VA, PS sur le montant brut',
    saisies: { foyer: { ...FOYER, anneeNaissanceDeclarant1: 1960 }, pensions: { case1as: 40000 }, plusValues: { case3ua: 300000, case3va: 300000 }, rcm: { case2op: false } },
    attendu: { parts: 1, revenuFiscalReference: 336000, droitsSimples: 3904, cehr: 2580, cdhr: 0, impotNet: 6484, prelevementsSociaux: 55800, tmi: 0.3 },
  },
  S31: {
    description: 'dirigeant retraité au barème : 3UA 700 000, 3VA 500 000 et abattement renforcé 3SL',
    saisies: { foyer: { ...FOYER, anneeNaissanceDeclarant1: 1960 }, pensions: { case1as: 40000 }, plusValues: { case3ua: 700000, case3va: 500000, case3sl: 130000 }, rcm: { case2op: true } },
    attendu: { parts: 1, revenuFiscalReference: 736000, droitsSimples: 27261, cehr: 16940, cdhr: 0, impotNet: 44201, prelevementsSociaux: 130200, tmi: 0.41 },
  },
  S32: {
    description: 'CDHR : RFR autonome hors abattement fixe 3VA (900 000 → 400 000)',
    saisies: { foyer: { ...FOYER, anneeNaissanceDeclarant1: 1960 }, rcm: { case2dc: 300000, case2op: false }, plusValues: { case3ua: 600000, case3va: 500000 } },
    attendu: { parts: 1, revenuFiscalReference: 900000, droitsSimples: 0, impotProportionnel: 51200, cehr: 23500, cdhr: 5300, impotNet: 80000, prelevementsSociaux: 167400, tmi: 0 },
  },
  S33: {
    description: 'CDHR : RFR autonome hors 3VA (750 000 → 450 000)',
    saisies: { foyer: { ...FOYER, anneeNaissanceDeclarant1: 1960 }, rcm: { case2dc: 350000, case2op: false }, plusValues: { case3ua: 400000, case3va: 300000 } },
    attendu: { parts: 1, revenuFiscalReference: 750000, droitsSimples: 0, impotProportionnel: 57600, cehr: 17500, cdhr: 14900, impotNet: 90000, prelevementsSociaux: 139500, tmi: 0 },
  },
  S34: {
    description: 'CDHR : abattement fixe dirigeant sur gains de BSPCE (3TJ/3TK) retiré du RFR autonome, comme 3VA',
    saisies: { foyer: { ...FOYER, anneeNaissanceDeclarant1: 1960 }, rcm: { case2dc: 300000, case2op: false }, plusValues: { case3tj: 600000, case3tk: 500000 } },
    attendu: { parts: 1, revenuFiscalReference: 900000, droitsSimples: 0, impotProportionnel: 51200, cehr: 23500, cdhr: 5300, impotNet: 80000, prelevementsSociaux: 167400, tmi: 0 },
  },
  S35: {
    description: 'CDHR : abattement fixe dirigeant sur gains de BSPCE (3TL/3TM) retiré du RFR autonome, comme 3VA',
    saisies: { foyer: { ...FOYER, anneeNaissanceDeclarant1: 1960 }, rcm: { case2dc: 300000, case2op: false }, plusValues: { case3tl: 600000, case3tm: 500000 } },
    attendu: { parts: 1, revenuFiscalReference: 900000, droitsSimples: 0, impotProportionnel: 51200, cehr: 23500, cdhr: 5300, impotNet: 80000, prelevementsSociaux: 167400, tmi: 0 },
  },
  S36: {
    description: 'plafond 10 % imputé d\'abord sur 1AJ : 1AC retenu en entier pour le taux effectif',
    saisies: {
      foyer: { ...FOYER, situationFamille: 'marie', anneeNaissanceDeclarant1: 1975, anneeNaissanceDeclarant2: 1977 },
      salaires: { case1aj: 150000 },
      exoneres: { case1ac: 50000 },
    },
    attendu: { parts: 2, revenuFiscalReference: 185445, droitsSimples: 31869, impotNet: 31869, prelevementsSociaux: 0, tmi: 0.41 },
  },
  S37: {
    description: 'plafond pensions imputé d\'abord sur 1AS : 1AH ne reçoit que le reliquat (439 €)',
    saisies: {
      foyer: { ...FOYER, situationFamille: 'marie', anneeNaissanceDeclarant1: 1956, anneeNaissanceDeclarant2: 1958 },
      pensions: { case1as: 40000 },
      exoneres: { case1ah: 10000 },
      fonciers: { case4be: 7200 },
    },
    attendu: { parts: 2, revenuFiscalReference: 50601, droitsSimples: 2445, decote: 377, impotNet: 2068, prelevementsSociaux: 867, tmi: 0.11 },
  },
  S38: {
    description: 'plancher 10 % sur 1AJ seul (509 €), 1AC reçoit le reste de l\'abattement du total',
    saisies: {
      foyer: { ...FOYER, anneeNaissanceDeclarant1: 1975 },
      salaires: { case1aj: 3000 },
      exoneres: { case1ac: 30000 },
    },
    attendu: { parts: 1, revenuFiscalReference: 29700, droitsSimples: 169, decote: 169, impotNet: 0, prelevementsSociaux: 0, tmi: 0.3 },
  },
  S39: {
    description: 'crédit égal à l\'impôt français (1BL/8TK) calculé sur les droits avant décote',
    saisies: {
      foyer: { ...FOYER, situationFamille: 'marie', anneeNaissanceDeclarant1: 1956, anneeNaissanceDeclarant2: 1958 },
      pensions: { case1as: 30000, case1bl: 15000 },
      fonciers: { case4be: 7200 },
      prelevementSource: { case8tk: 15000 },
    },
    attendu: { parts: 2, revenuFiscalReference: 45601, droitsSimples: 2464, decote: 368, impotNet: 1365, prelevementsSociaux: 867, tmi: 0.11 },
  },
  S40: {
    description: 'crédit égal à l\'impôt français (1AF/8TK) avant décote, plafonné à l\'impôt après décote',
    saisies: {
      foyer: { ...FOYER, situationFamille: 'marie', anneeNaissanceDeclarant1: 1975, anneeNaissanceDeclarant2: 1977 },
      salaires: { case1aj: 20000, case1bj: 12000, case1af: 15000 },
      prelevementSource: { case8tk: 15000 },
    },
    attendu: { parts: 2, revenuFiscalReference: 42300, droitsSimples: 2101, decote: 532, impotNet: 898, prelevementsSociaux: 0, tmi: 0.11 },
  },
  S41: {
    description: 'seuil personnes âgées apprécié avec les revenus 8TK (1AL) : aucun abattement',
    saisies: {
      foyer: { ...FOYER, situationFamille: 'marie', anneeNaissanceDeclarant1: 1956, anneeNaissanceDeclarant2: 1958 },
      pensions: { case1as: 25000, case1al: 12000 },
      fonciers: { case4be: 7200 },
      prelevementSource: { case8tk: 12000 },
    },
    attendu: { parts: 2, revenuFiscalReference: 38340, droitsSimples: 1665, decote: 730, impotNet: 466, prelevementsSociaux: 867, tmi: 0.11 },
  },
  S42: {
    description: 'exonération de CSG-CRDS 8RF sans case 8SH/8SI : ignorée',
    saisies: {
      foyer: { ...FOYER, situationFamille: 'marie', anneeNaissanceDeclarant1: 1975, anneeNaissanceDeclarant2: 1977 },
      salaires: { case1aj: 52000 },
      fonciers: { case4be: 7200 },
      prelevementSource: { case8rf: 5040 },
    },
    attendu: { parts: 2, revenuFiscalReference: 51840, droitsSimples: 3150, decote: 58, impotNet: 3092, prelevementsSociaux: 867, tmi: 0.11 },
  },
  S43: {
    description: 'exonération de CSG-CRDS 8RF avec 8SI (un conjoint affilié) : CSG-CRDS du foncier retranchée',
    saisies: {
      foyer: { ...FOYER, situationFamille: 'marie', anneeNaissanceDeclarant1: 1975, anneeNaissanceDeclarant2: 1977 },
      salaires: { case1aj: 52000 },
      fonciers: { case4be: 7200 },
      prelevementSource: { case8rf: 5040, case8si: true },
    },
    attendu: { parts: 2, revenuFiscalReference: 51840, droitsSimples: 3150, decote: 58, impotNet: 3092, prelevementsSociaux: 378, tmi: 0.11 },
  },
  S44: {
    description: "personne à charge : salaire étranger 1CF avec crédit égal à l'impôt français (8TK)",
    saisies: {
      foyer: { ...FOYER, situationFamille: 'marie', anneeNaissanceDeclarant1: 1975, anneeNaissanceDeclarant2: 1977, enfantsCharge: [enfant(2012), enfant(2015)] },
      salaires: { case1aj: 52000, case1cf: 10000 },
      prelevementSource: { case8tk: 10000 },
    },
    attendu: { parts: 3, revenuFiscalReference: 55800, droitsSimples: 2310, decote: 438, impotNet: 1499, prelevementsSociaux: 0, tmi: 0.11 },
  },
  S45: {
    description: "personne à charge : pension étrangère 1CL avec crédit égal à l'impôt français (8TK)",
    saisies: {
      foyer: { ...FOYER, situationFamille: 'marie', anneeNaissanceDeclarant1: 1975, anneeNaissanceDeclarant2: 1977, enfantsCharge: [enfant(2012), enfant(2015)] },
      salaires: { case1aj: 52000 },
      pensions: { case1cl: 8000 },
      prelevementSource: { case8tk: 8000 },
    },
    attendu: { parts: 3, revenuFiscalReference: 54000, droitsSimples: 2112, decote: 527, impotNet: 1303, prelevementsSociaux: 0, tmi: 0.11 },
  },
  S46: {
    description: "personne à charge : BA étranger 5CK avec crédit égal à l'impôt français (8TK)",
    saisies: {
      foyer: { ...FOYER, situationFamille: 'marie', anneeNaissanceDeclarant1: 1975, anneeNaissanceDeclarant2: 1977, enfantsCharge: [enfant(2012), enfant(2015)] },
      salaires: { case1aj: 52000 },
      nonSalaries: { case5ck: 10000 },
      prelevementSource: { case8tk: 10000 },
    },
    attendu: { parts: 3, revenuFiscalReference: 56800, droitsSimples: 2420, decote: 388, impotNet: 1606, prelevementsSociaux: 0, tmi: 0.11 },
  },
  S47: {
    description: 'personne à charge : BIC non professionnels, moins-value 5SZ et déficit 5PF imputés sur la catégorie',
    saisies: {
      foyer: { ...FOYER, situationFamille: 'marie', anneeNaissanceDeclarant1: 1975, anneeNaissanceDeclarant2: 1977, enfantsCharge: [enfant(2012), enfant(2015)] },
      salaires: { case1aj: 52000 },
      nonSalaries: { case5po: 30000, case5sz: 3000, case5pc: 20000, case5pf: 10000 },
    },
    attendu: { parts: 3, revenuFiscalReference: 62500, droitsSimples: 3047, decote: 104, impotNet: 2943, prelevementsSociaux: 0, tmi: 0.11 },
  },
  S48: {
    description: 'personne à charge : déficit LMNP 5PY imputé sur le revenu LMNP, PS compris',
    saisies: {
      foyer: { ...FOYER, situationFamille: 'marie', anneeNaissanceDeclarant1: 1975, anneeNaissanceDeclarant2: 1977, enfantsCharge: [enfant(2012), enfant(2015)] },
      salaires: { case1aj: 52000 },
      nonSalaries: { case5pa: 15000, case5py: 8000 },
    },
    attendu: { parts: 3, revenuFiscalReference: 53800, droitsSimples: 2090, decote: 537, impotNet: 1553, prelevementsSociaux: 1302, tmi: 0.11 },
  },
  S49: {
    description: 'personne à charge : BNC non professionnels, moins-value 5MD et déficit 5SG',
    saisies: {
      foyer: { ...FOYER, situationFamille: 'marie', anneeNaissanceDeclarant1: 1975, anneeNaissanceDeclarant2: 1977, enfantsCharge: [enfant(2012), enfant(2015)] },
      salaires: { case1aj: 52000 },
      nonSalaries: { case5mu: 20000, case5md: 3000, case5sf: 15000, case5sg: 8000 },
    },
    attendu: { parts: 3, revenuFiscalReference: 64000, droitsSimples: 3212, decote: 30, impotNet: 3182, prelevementsSociaux: 0, tmi: 0.11 },
  },
  S50: {
    description: 'micro-BA : moyenne triennale 5XB / 5XM / 5YM',
    saisies: {
      foyer: { ...FOYER, situationFamille: 'marie', anneeNaissanceDeclarant1: 1975, anneeNaissanceDeclarant2: 1977, enfantsCharge: [enfant(2012), enfant(2015)] },
      salaires: { case1aj: 52000 },
      nonSalaries: { case5xb: 40000, case5xm: 70000, case5ym: 100000 },
    },
    attendu: { parts: 3, revenuFiscalReference: 55900, droitsSimples: 2321, decote: 433, impotNet: 1888, prelevementsSociaux: 0, tmi: 0.11 },
  },
  S51: {
    description: 'micro-BA : moyennes D2 (5YB/5YT) et personne à charge (5ZB/5ZT/5ZU)',
    saisies: {
      foyer: { ...FOYER, situationFamille: 'marie', anneeNaissanceDeclarant1: 1975, anneeNaissanceDeclarant2: 1977, enfantsCharge: [enfant(2012), enfant(2015)] },
      salaires: { case1aj: 52000 },
      nonSalaries: { case5yb: 40001, case5yt: 70000, case5zb: 30000, case5zt: 50000, case5zu: 20000 },
    },
    attendu: { parts: 3, revenuFiscalReference: 58283, droitsSimples: 2583, decote: 314, impotNet: 2269, prelevementsSociaux: 0, tmi: 0.11 },
  },
  S52: {
    description: 'plus-value au quotient RUA : abattement fixe RVA puis abattement renforcé RSL sur le reliquat',
    saisies: {
      foyer: { ...FOYER, situationFamille: 'marie', anneeNaissanceDeclarant1: 1975, anneeNaissanceDeclarant2: 1977, enfantsCharge: [enfant(2012), enfant(2015)] },
      salaires: { case1aj: 52000 },
      rcm: { case2op: true },
      plusValues: { caseRua: 200000, caseNua: 4, caseRva: 100000, caseRsl: 50000 },
    },
    attendu: { parts: 3, revenuFiscalReference: 209300, droitsSimples: 1320, impotNet: 6820, prelevementsSociaux: 37200, tmi: 0.11 },
    // Présentation : le simulateur affiche les droits simples et le TMI hors revenus au quotient.
    ecartsConnus: ['droitsSimples', 'tmi'],
  },
  S53: {
    description: 'personne à charge : déficit LMNP 5YE relevant des organismes de sécurité sociale',
    saisies: {
      foyer: { ...FOYER, situationFamille: 'marie', anneeNaissanceDeclarant1: 1975, anneeNaissanceDeclarant2: 1977, enfantsCharge: [enfant(2012), enfant(2015)] },
      salaires: { case1aj: 52000 },
      nonSalaries: { case5pm: 15000, case5ye: 8000 },
    },
    attendu: { parts: 3, revenuFiscalReference: 53800, droitsSimples: 2090, decote: 537, impotNet: 1553, prelevementsSociaux: 0, tmi: 0.11 },
  },
};

function calculer(saisies: Record<string, unknown>, anneeRevenus: number) {
  for (const cle of Object.keys(donnees)) delete donnees[cle];
  Object.assign(donnees, saisies);
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(MillesimeFiscalProvider, { anneeInitiale: anneeRevenus, children });
  const { result } = renderHook(() => useFiscalOverview(), { wrapper });
  const r = result.current;
  expect(r.anneeRevenus).toBe(anneeRevenus);
  const obtenu: Required<Attendu> = {
    parts: r.parts.nombreParts,
    revenuFiscalReference: r.impot.revenuFiscalReference,
    // « Droits simples » du simulateur : après taux effectif (revenus exonérés, VFL), avant la réduction complémentaire.
    droitsSimples: Math.round(r.impot.impotProportionnel + r.impot.reductionComplementaireQuotientFamilial),
    decote: Math.round(r.impot.decote),
    impotProportionnel: r.impot.impotForfaitaire,
    reductions: r.impot.reductionsImpot,
    cehr: r.cehr,
    cdhr: r.cdhr.cdhr,
    plafonnement: r.plafonnementNiches.excedent,
    solde: r.solde?.soldeImpot ?? Number.NaN,
    impotNet: r.impot.impotNet + r.cehr + r.cdhr.cdhr,
    prelevementsSociaux: r.prelevementsSociauxTotal,
    tmi: r.impot.tmi,
  };
  return obtenu;
}

/**
 * calc-2027.cgi (revenus 2026, novembre 2026) avec le millésime provisoire : mêmes valeurs que
 * calc-2026.cgi, sauf les dons 7UD plafonnés à 2 000 € et la FCPI 7GQ à 25 % (S3 : 1 500 € à 75 % au lieu de 750 €).
 */
const ECARTS_2027: Record<string, Partial<Attendu>> = {
  S3: { reductions: 5460, impotNet: 85947 },
  // Dons réintégrés dans l'impôt retenu par la CDHR à partir des revenus 2026.
  S11: { cdhr: 14699, impotNet: 71400 },
  // FCPI 7GQ à 25 % (7GR supprimée).
  S23: { reductions: 2000, impotNet: 96225 },
  S24: { reductions: 15700, impotNet: 258175 },
  // CEHR retenue par la CDHR au prorata RFR autonome / RFR.
  S32: { cdhr: 18356, impotNet: 93056 },
  S33: { cdhr: 21900, impotNet: 97000 },
  S34: { cdhr: 18356, impotNet: 93056 },
  S35: { cdhr: 18356, impotNet: 93056 },
};

function decrireCampagne(titre: string, anneeRevenus: number, ecarts: Record<string, Partial<Attendu>> = {}) {
  describe(titre, () => {
    for (const [nom, cas] of Object.entries(CAS)) {
      const attendu = { ...cas.attendu, ...ecarts[nom] };
      describe(`${nom} : ${cas.description}`, () => {
        for (const poste of Object.keys(attendu) as (keyof Attendu)[]) {
          const enEcart = cas.ecartsConnus?.includes(poste) ?? false;
          (enEcart ? it.fails : it)(`${poste}${enEcart ? ' (écart connu)' : ''}`, () => {
            expect(calculer(cas.saisies, anneeRevenus)[poste]).toBe(attendu[poste]);
          });
        }
      });
    }
  });
}

decrireCampagne('useFiscalOverview — simulateur officiel 2026 (revenus 2025)', 2025);
decrireCampagne('useFiscalOverview — simulateur officiel 2027 (revenus 2026, millésime provisoire)', 2026, ECARTS_2027);
