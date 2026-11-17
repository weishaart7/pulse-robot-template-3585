import { ReductionsCreditsImpotInput } from './types';

/**
 * Souscriptions au capital (2042-RICI, revenus 2025/impôt 2026) : montants versés saisis, réductions
 * non restituables. Règles relevées sur le simulateur officiel 2026 (1 000 €, 100 000 €, cumuls) :
 * - PME, ESUS, SFS et leurs reports : plafond de versements commun de 50 000 € (100 000 € pour un
 *   couple), cases à 25 % imputées avant celles à 18 % ; plafonnement global à 10 000 €, sans la
 *   majoration ESUS de 3 000 € (réservée à 7DC sur le simulateur) ;
 * - JEI/JEU/JEIC (7CR) : 30 %, 75 000 € (150 000 €) ; JEIR (7DZ) : 50 %, 50 000 € (100 000 €) ;
 *   plafonds propres, hors plafonnement global ;
 * - FCPI : 7GR (25 %) puis 7GQ (18 %), 12 000 € (24 000 €) en commun ; FIP Corse (7FM) et FIP
 *   outre-mer (7FL) : 30 %, 12 000 € (24 000 €) chacun ;
 * - SOFICA : 7EN (48 %), 7GN (36 %), 7FN (30 %) dans cet ordre, versements limités à
 *   min(25 % du revenu net imposable, 18 000 €) ; retenues au plafonnement global avec la majoration
 *   de 8 000 € partagée avec l'outre-mer (7EN 40 000 € + HOZ 8 000 € + crédit 7DB → 18 000 €).
 */
export const PLAFOND_PME = 50_000;
export const PLAFOND_JEI = 75_000;
export const PLAFOND_JEIR = 50_000;
export const PLAFOND_FCPI_FIP = 12_000;
export const PLAFOND_SOFICA = 18_000;
export const LIMITE_SOFICA_REVENU = 0.25;

type Cle = keyof ReductionsCreditsImpotInput;
type Tranche = [Cle, number][];

/** Groupe PME/ESUS : cases à 25 % d'abord. */
const GROUPE_PME: Tranche = [
  ['case7co', 0.25], ['case7gw', 0.25], ['case7cw', 0.25], ['case7cq', 0.25], ['case7dp', 0.25], ['case7ca', 0.25],
  ['case7ci', 0.18], ['case7ct', 0.18], ['case7cu', 0.18], ['case7cp', 0.18], ['case7cv', 0.18], ['case7do', 0.18],
];
const GROUPE_FCPI: Tranche = [['case7gr', 0.25], ['case7gq', 0.18]];
const GROUPE_SOFICA: Tranche = [['case7en', 0.48], ['case7gn', 0.36], ['case7fn', 0.30]];

const montant = (v: unknown) => Math.max(0, typeof v === 'number' ? v : 0);

/** Impute les versements d'un groupe dans l'ordre, dans la limite commune `plafond`. */
function imputer(input: ReductionsCreditsImpotInput, groupe: Tranche, plafond: number): number {
  let reste = Math.max(0, plafond);
  let reduction = 0;
  for (const [cle, taux] of groupe) {
    const retenu = Math.min(montant(input[cle]), reste);
    reste -= retenu;
    reduction += retenu * taux;
  }
  return Math.round(reduction);
}

export interface SouscriptionsCapitalResult {
  /** Total des réductions (non restituables). */
  reductions: number;
  /** Part soumise au seul plafond de 10 000 € (PME/ESUS, FCPI, FIP). */
  avantagesPlafonnesCourants: number;
  /** SOFICA : plafond de 10 000 € majoré de 8 000 € partagés avec l'outre-mer. */
  sofica: number;
  /** JEI/JEIR, hors plafonnement global. */
  horsPlafond: number;
}

export function calculerSouscriptionsCapital(
  input: ReductionsCreditsImpotInput,
  couple: boolean,
  revenuImposable: number,
): SouscriptionsCapitalResult {
  const k = couple ? 2 : 1;
  const pme = imputer(input, GROUPE_PME, PLAFOND_PME * k);
  const fcpi = imputer(input, GROUPE_FCPI, PLAFOND_FCPI_FIP * k);
  const fip = Math.round((Math.min(montant(input.case7fm), PLAFOND_FCPI_FIP * k)
    + Math.min(montant(input.case7fl), PLAFOND_FCPI_FIP * k)) * 0.30);
  const sofica = imputer(input, GROUPE_SOFICA,
    Math.min(Math.max(0, revenuImposable) * LIMITE_SOFICA_REVENU, PLAFOND_SOFICA));
  const horsPlafond = Math.round(Math.min(montant(input.case7cr), PLAFOND_JEI * k) * 0.30
    + Math.min(montant(input.case7dz), PLAFOND_JEIR * k) * 0.50);
  const courants = pme + fcpi + fip;
  return {
    reductions: courants + sofica + horsPlafond,
    avantagesPlafonnesCourants: courants,
    sofica,
    horsPlafond,
  };
}
