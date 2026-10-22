/**
 * Retraite complémentaire Agirc-Arrco et RAFP (audit Retraite du 2026-09-29,
 * R1/R9) — fonctions pures, sans JSX ni state React. Paramètres :
 * `params-retraite.json` (millésime courant + blocs `agircArrco` et `rafp`).
 *
 * Règles validées le 2026-09-29 :
 * - Points futurs Agirc-Arrco : (salaire ≤ 1 PASS × 6,20 % + salaire entre 1
 *   et 8 PASS × 17 %) ÷ prix d'achat du point, au prorata des trimestres
 *   projetés. Seul le taux contractuel génère des points (le taux d'appel de
 *   127 % n'en crée pas). Euros constants : prix d'achat, valeur de service
 *   et PASS du millésime courant.
 * - Coefficient d'anticipation, uniquement si la retraite de base est
 *   décotée (Fidroit Agirc-Arrco §5.4.1) : jusqu'à 20 trimestres manquants,
 *   le plus favorable entre la grille par âge (au trimestre d'âge révolu,
 *   grille des générations 1965 et suivantes appliquée à toutes) et la grille
 *   par trimestres manquants ; au-delà de 20, la grille par âge seule.
 *   S'applique au montant hors majoration.
 * - Majoration pour enfant à charge à la date d'effet (§5.5.1.2) : 5 % par
 *   enfant des droits avant minoration, sans plafond. Non cumulable avec la
 *   majoration pour 3 enfants : la plus élevée est retenue. Figée à la date
 *   d'effet (sa disparition quand l'enfant cesse d'être à charge n'est pas
 *   modélisée).
 * - Majoration pour 3 enfants ou plus : 10 % des droits avant coefficient
 *   d'anticipation, plafonnée, appliquée à tous les points — approximation
 *   légèrement favorable pour les points acquis avant 2012 (taux alors de 5
 *   à 8 % selon la caisse d'origine). La majoration n'est pas elle-même
 *   minorée (lecture littérale de « calculée sur les droits avant
 *   application d'un éventuel coefficient de minoration »).
 * - RAFP : rente si au moins 5 125 points (points × valeur de service ×
 *   coefficient de majoration par âge révolu), capital sinon (× coefficient
 *   de conversion en capital, interpolé au mois).
 */

import { RegimeDetecte } from './parseRIS';
import { PARAMETRES_AGIRC_ARRCO, PARAMETRES_RAFP, MILLESIME_COURANT } from './parametres';

const RE_AGIRC_ARRCO = /agirc|arrco/i;

export function estRegimeAgircArrco(nom: string): boolean {
  return RE_AGIRC_ARRCO.test(nom);
}

/** Points Agirc-Arrco acquis sur une année complète pour un salaire brut annuel. */
export function pointsAgircArrcoAnnuels(salaireBrutAnnuel: number): number {
  if (salaireBrutAnnuel <= 0) return 0;
  const { tauxContractuelT1, tauxContractuelT2, plafondT2EnPass } = PARAMETRES_AGIRC_ARRCO;
  const pass = MILLESIME_COURANT.pass;
  const tranche1 = Math.min(salaireBrutAnnuel, pass);
  const tranche2 = Math.max(0, Math.min(salaireBrutAnnuel, plafondT2EnPass * pass) - pass);
  const cotisationsGenerantDesPoints = tranche1 * tauxContractuelT1 + tranche2 * tauxContractuelT2;
  return cotisationsGenerantDesPoints / MILLESIME_COURANT.agircArrcoPrixAchatPoint;
}

/**
 * Coefficient d'anticipation Agirc-Arrco. 1 si la retraite de base n'est pas
 * décotée. Sinon, le plus favorable (le plus élevé) des deux grilles.
 */
export function coefficientAnticipationAgircArrco(
  retraiteDeBaseDecotee: boolean,
  ageDepartAnnees: number | null,
  trimestresManquants: number
): number {
  if (!retraiteDeBaseDecotee) return 1;
  const { coefficientsAnticipationParAgeTrimestriel, coefficientsAnticipationParTrimestresManquants } =
    PARAMETRES_AGIRC_ARRCO;

  const agesConnus = Object.keys(coefficientsAnticipationParAgeTrimestriel).map(Number);
  const ageMin = Math.min(...agesConnus);
  const ageMax = Math.max(...agesConnus);
  // Trimestre d'âge révolu (epsilon : 62,25 calculé en flottant peut valoir 62,2499…).
  const ageAuTrimestre =
    ageDepartAnnees === null ? null : Math.floor(ageDepartAnnees * 4 + 1e-6) / 4;
  const coefficientAge =
    ageAuTrimestre === null
      ? 0
      : coefficientsAnticipationParAgeTrimestriel[Math.min(ageMax, Math.max(ageMin, ageAuTrimestre)).toFixed(2)];

  const manquants = Math.max(0, Math.ceil(trimestresManquants));
  if (manquants === 0) return 1;
  // Plus de 20 trimestres manquants : seule la grille par âge s'applique.
  const coefficientTrimestres = coefficientsAnticipationParTrimestresManquants[String(manquants)] ?? 0;

  return Math.max(coefficientAge, coefficientTrimestres);
}

export interface DetailAgircArrco {
  pointsAcquis: number;
  pointsProjetes: number;
  valeurServicePoint: number;
  pensionAvantCoefficient: number;
  coefficientAnticipation: number;
  majorationEnfants: number;
  /** Majoration retenue (non cumulables : la plus élevée), `null` si aucune. */
  typeMajorationEnfants: 'troisEnfants' | 'enfantsACharge' | null;
  nombreEnfantsACharge: number;
  pensionAnnuelle: number;
}

/**
 * Pension Agirc-Arrco annuelle : points (acquis + projetés) × valeur de
 * service × coefficient d'anticipation, plus la majoration enfants (la plus
 * élevée entre 3 enfants et enfants à charge).
 */
export function pensionAgircArrco(params: {
  pointsAcquis: number;
  pointsProjetes: number;
  coefficientAnticipation: number;
  nombreEnfantsEligibles: number;
  /** Enfants à charge à la date d'effet (cf. `nombreEnfantsAChargeAgircArrco`). */
  nombreEnfantsACharge?: number;
}): DetailAgircArrco {
  const { pointsAcquis, pointsProjetes, coefficientAnticipation, nombreEnfantsEligibles } = params;
  const nombreEnfantsACharge = Math.max(0, params.nombreEnfantsACharge ?? 0);
  const valeurServicePoint = MILLESIME_COURANT.agircArrcoValeurServicePoint;
  const pensionAvantCoefficient = (pointsAcquis + pointsProjetes) * valeurServicePoint;
  const majorationTroisEnfants =
    nombreEnfantsEligibles >= 3
      ? Math.min(
          pensionAvantCoefficient * PARAMETRES_AGIRC_ARRCO.tauxMajorationEnfants,
          MILLESIME_COURANT.agircArrcoPlafondMajorationEnfantsAnnuel
        )
      : 0;
  const majorationEnfantsACharge =
    pensionAvantCoefficient * PARAMETRES_AGIRC_ARRCO.tauxMajorationEnfantACharge * nombreEnfantsACharge;
  const majorationEnfants = Math.max(majorationTroisEnfants, majorationEnfantsACharge);
  const typeMajorationEnfants =
    majorationEnfants <= 0 ? null : majorationEnfantsACharge > majorationTroisEnfants ? 'enfantsACharge' : 'troisEnfants';
  return {
    pointsAcquis,
    pointsProjetes,
    valeurServicePoint,
    pensionAvantCoefficient,
    coefficientAnticipation,
    majorationEnfants,
    typeMajorationEnfants,
    nombreEnfantsACharge,
    pensionAnnuelle: pensionAvantCoefficient * coefficientAnticipation + majorationEnfants,
  };
}

export type PrestationRAFP =
  | { forme: 'rente'; renteAnnuelle: number; coefficientMajoration: number }
  | { forme: 'capital'; capital: number; coefficientMajoration: number; coefficientConversion: number };

function bornerAge(table: Record<string, number>, age: number): number {
  const ages = Object.keys(table).map(Number);
  return Math.min(Math.max(...ages), Math.max(Math.min(...ages), age));
}

/** Coefficient de majoration RAFP par âge révolu (1 jusqu'à 62 ans, 1,80 à partir de 75 ans). */
export function coefficientMajorationRAFP(ageDepartAnnees: number): number {
  const table = PARAMETRES_RAFP.coefficientsMajorationParAge;
  return table[String(bornerAge(table, Math.floor(ageDepartAnnees)))];
}

/** Coefficient de conversion en capital RAFP, interpolé au mois (règle ERAFP). */
export function coefficientConversionCapitalRAFP(ageDepartAnnees: number): number {
  const table = PARAMETRES_RAFP.coefficientsConversionCapitalParAge;
  const age = bornerAge(table, ageDepartAnnees);
  const ans = Math.floor(age);
  const mois = Math.round((age - ans) * 12);
  const bas = table[String(ans)];
  const haut = table[String(Math.min(ans + 1, bornerAge(table, ans + 1)))];
  return bas + ((haut - bas) * mois) / 12;
}

/**
 * Prestation RAFP selon le nombre de points et l'âge au départ. Âge inconnu :
 * rente sans majoration (comportement antérieur).
 */
export function prestationRAFP(points: number, ageDepartAnnees: number | null): PrestationRAFP {
  const valeurService = MILLESIME_COURANT.rafpValeurServicePoint;
  if (points <= 0) return { forme: 'rente', renteAnnuelle: 0, coefficientMajoration: 1 };
  const coefficientMajoration = ageDepartAnnees === null ? 1 : coefficientMajorationRAFP(ageDepartAnnees);
  if (ageDepartAnnees === null || points >= PARAMETRES_RAFP.seuilRentePoints) {
    return { forme: 'rente', renteAnnuelle: points * valeurService * coefficientMajoration, coefficientMajoration };
  }
  const coefficientConversion = coefficientConversionCapitalRAFP(ageDepartAnnees);
  return {
    forme: 'capital',
    capital: points * coefficientMajoration * valeurService * coefficientConversion,
    coefficientMajoration,
    coefficientConversion,
  };
}

/** Répartit les régimes à points du RIS entre Agirc-Arrco et les autres. */
export function separerRegimesPoints(regimesPoints: RegimeDetecte[]): {
  pointsAgircArrco: number;
  aUnRegimeAgircArrco: boolean;
  autresRegimes: RegimeDetecte[];
} {
  const agirc = regimesPoints.filter((r) => estRegimeAgircArrco(r.nom));
  return {
    pointsAgircArrco: agirc.reduce((total, r) => total + (r.points ?? 0), 0),
    aUnRegimeAgircArrco: agirc.length > 0,
    autresRegimes: regimesPoints.filter((r) => !estRegimeAgircArrco(r.nom)),
  };
}
