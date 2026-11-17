import { ReductionsCreditsImpotInput } from './types';

/**
 * Souscriptions au capital et fin du bloc « entreprises » de la 2042-RICI (revenus 2025/impôt 2026).
 * Montants versés saisis, sauf 7EK et 7CY…7GY (montant de la réduction). Réductions non restituables.
 * Règles relevées sur le simulateur officiel 2026 (1 000 €, 100 000 €, cumuls, paires de cases) :
 * - PME, ESUS, SFS et leurs reports (7DC compris) : plafond de versements commun de 50 000 €
 *   (100 000 € pour un couple), imputé dans l'ordre de `GROUPE_PME` (relevé par paires : ni le taux ni
 *   la date). Plafonnement global à 10 000 €, majoré de 3 000 € pour la seule part de 7DC, 7BS et 7EK.
 *   Écart connu : 7DO avec 7CO, 7GW ou 7BS au-delà du plafond (60 000 € + 60 000 €) → le simulateur ne
 *   retient que 7DO (10 800 €), ici 20 800 € ;
 * - JEI/JEU/JEIC (7CR) : 30 %, 75 000 € (150 000 €) ; JEIR (7DZ) : 50 %, 50 000 € (100 000 €) ;
 *   reprise de société (7FH) : 25 %, 20 000 € (40 000 €) ; DFCI (7UC) : 50 %, 1 000 € par foyer ;
 *   plafonds propres, hors plafonnement global ;
 * - FCPI : 7GR (25 %) puis 7GQ (18 %), 12 000 € (24 000 €) en commun ; FIP Corse (7FM) et FIP
 *   outre-mer (7FL) : 30 %, 12 000 € (24 000 €) chacun ;
 * - presse : 7MY (50 %) puis 7MX (30 %), 10 000 € (20 000 €) en commun ; objets classés monuments
 *   historiques (7NZ) : 18 %, 20 000 € par foyer ; reports au titre du plafonnement global (7CY…7GY) ;
 * - SOFICA : 7EN (48 %), 7GN (36 %), 7FN (30 %) dans cet ordre, versements limités à
 *   min(25 % du revenu net imposable, 18 000 €) ; retenues au plafonnement global avec la majoration
 *   de 8 000 € partagée avec l'outre-mer (7EN 40 000 € + HOZ 8 000 € + crédit 7DB → 18 000 €).
 * 7US (mécénat d'entreprise) non saisie : « calcul impossible » sur le simulateur.
 */
export const PLAFOND_PME = 50_000;
export const PLAFOND_JEI = 75_000;
export const PLAFOND_JEIR = 50_000;
export const PLAFOND_FCPI_FIP = 12_000;
export const PLAFOND_SOFICA = 18_000;
export const LIMITE_SOFICA_REVENU = 0.25;
export const PLAFOND_PRESSE = 10_000;
export const PLAFOND_OBJETS_MH = 20_000;
export const PLAFOND_DFCI = 1_000;
export const PLAFOND_REPRISE_SOCIETE = 20_000;

type Cle = keyof ReductionsCreditsImpotInput;
type Tranche = [Cle, number][];

/** Groupe PME/ESUS/SFS, dans l'ordre d'imputation du simulateur. */
const GROUPE_PME: Tranche = [
  ['case7dc', 0.25], ['case7ca', 0.25], ['case7ct', 0.18], ['case7cw', 0.25], ['case7cu', 0.18],
  ['case7cq', 0.25], ['case7cp', 0.18], ['case7dp', 0.25], ['case7cv', 0.18], ['case7do', 0.18],
  ['case7co', 0.25], ['case7ci', 0.18], ['case7gw', 0.25], ['case7bs', 0.25], ['case7bt', 0.25],
  ['case7bu', 0.25], ['case7bw', 0.25],
];
/** Cases du groupe PME ouvrant la majoration ESUS de 3 000 €. */
const CASES_ESUS_MAJORANTES: Cle[] = ['case7dc', 'case7bs'];
const GROUPE_FCPI: Tranche = [['case7gr', 0.25], ['case7gq', 0.18]];
const GROUPE_SOFICA: Tranche = [['case7en', 0.48], ['case7gn', 0.36], ['case7fn', 0.30]];
const GROUPE_PRESSE: Tranche = [['case7my', 0.50], ['case7mx', 0.30]];
const REPORTS_PLAFONNEMENT: Cle[] = ['case7cy', 'case7dy', 'case7ey', 'case7fy', 'case7gy'];

const montant = (v: unknown) => Math.max(0, typeof v === 'number' ? v : 0);

/** Impute les versements d'un groupe dans l'ordre, dans la limite commune `plafond`. */
function imputer(input: ReductionsCreditsImpotInput, groupe: Tranche, plafond: number, majorantes: Cle[] = []) {
  let reste = Math.max(0, plafond);
  let reduction = 0;
  let majorante = 0;
  for (const [cle, taux] of groupe) {
    const retenu = Math.min(montant(input[cle]), reste);
    reste -= retenu;
    reduction += retenu * taux;
    if (majorantes.includes(cle)) majorante += retenu * taux;
  }
  return { reduction: Math.round(reduction), majorante: Math.round(majorante) };
}

const plafonne = (v: unknown, plafond: number, taux: number) => Math.min(montant(v), plafond) * taux;

export interface SouscriptionsCapitalResult {
  /** Total des réductions (non restituables). */
  reductions: number;
  /** Part soumise au seul plafond de 10 000 €. */
  avantagesPlafonnesCourants: number;
  /** Part ESUS majorant le plafond de 3 000 € (7DC, 7BS, 7EK). */
  esus: number;
  /** SOFICA : plafond de 10 000 € majoré de 8 000 € partagés avec l'outre-mer. */
  sofica: number;
  /** JEI/JEIR, reprise de société, DFCI : hors plafonnement global. */
  horsPlafond: number;
}

export function calculerSouscriptionsCapital(
  input: ReductionsCreditsImpotInput,
  couple: boolean,
  revenuImposable: number,
): SouscriptionsCapitalResult {
  const k = couple ? 2 : 1;
  const pme = imputer(input, GROUPE_PME, PLAFOND_PME * k, CASES_ESUS_MAJORANTES);
  const esus = pme.majorante + Math.round(montant(input.case7ek));
  const fcpi = imputer(input, GROUPE_FCPI, PLAFOND_FCPI_FIP * k).reduction;
  const fip = Math.round(plafonne(input.case7fm, PLAFOND_FCPI_FIP * k, 0.30) + plafonne(input.case7fl, PLAFOND_FCPI_FIP * k, 0.30));
  const presse = imputer(input, GROUPE_PRESSE, PLAFOND_PRESSE * k).reduction;
  const objetsMH = Math.round(plafonne(input.case7nz, PLAFOND_OBJETS_MH, 0.18));
  const reports = Math.round(REPORTS_PLAFONNEMENT.reduce((s, cle) => s + montant(input[cle]), 0));
  const sofica = imputer(input, GROUPE_SOFICA,
    Math.min(Math.max(0, revenuImposable) * LIMITE_SOFICA_REVENU, PLAFOND_SOFICA)).reduction;
  const horsPlafond = Math.round(plafonne(input.case7cr, PLAFOND_JEI * k, 0.30)
    + plafonne(input.case7dz, PLAFOND_JEIR * k, 0.50)
    + plafonne(input.case7fh, PLAFOND_REPRISE_SOCIETE * k, 0.25)
    + plafonne(input.case7uc, PLAFOND_DFCI, 0.50));
  const courants = pme.reduction - pme.majorante + fcpi + fip + presse + objetsMH + reports;
  return {
    reductions: courants + esus + sofica + horsPlafond,
    avantagesPlafonnesCourants: courants,
    esus,
    sofica,
    horsPlafond,
  };
}
