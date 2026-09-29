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
 *   décotée : le plus favorable entre la grille par âge (âge en années
 *   révolues — choix prudent, la règle infra-annuelle n'ayant pas été
 *   trouvée) et la grille par trimestres manquants (≤ 20 trimestres).
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
  const { coefficientsAnticipationParAge, coefficientsAnticipationParTrimestresManquants } = PARAMETRES_AGIRC_ARRCO;

  const agesConnus = Object.keys(coefficientsAnticipationParAge).map(Number);
  const ageMin = Math.min(...agesConnus);
  const ageMax = Math.max(...agesConnus);
  const coefficientAge =
    ageDepartAnnees === null
      ? 0
      : coefficientsAnticipationParAge[String(Math.min(ageMax, Math.max(ageMin, Math.floor(ageDepartAnnees))))];

  const manquants = Math.max(0, Math.ceil(trimestresManquants));
  const coefficientTrimestres =
    manquants === 0 ? 1 : coefficientsAnticipationParTrimestresManquants[String(manquants)] ?? 0;

  return Math.max(coefficientAge, coefficientTrimestres);
}

export interface DetailAgircArrco {
  pointsAcquis: number;
  pointsProjetes: number;
  valeurServicePoint: number;
  pensionAvantCoefficient: number;
  coefficientAnticipation: number;
  majorationEnfants: number;
  pensionAnnuelle: number;
}

/**
 * Pension Agirc-Arrco annuelle : points (acquis + projetés) × valeur de
 * service × coefficient d'anticipation, plus la majoration enfants.
 */
export function pensionAgircArrco(params: {
  pointsAcquis: number;
  pointsProjetes: number;
  coefficientAnticipation: number;
  nombreEnfantsEligibles: number;
}): DetailAgircArrco {
  const { pointsAcquis, pointsProjetes, coefficientAnticipation, nombreEnfantsEligibles } = params;
  const valeurServicePoint = MILLESIME_COURANT.agircArrcoValeurServicePoint;
  const pensionAvantCoefficient = (pointsAcquis + pointsProjetes) * valeurServicePoint;
  const majorationEnfants =
    nombreEnfantsEligibles >= 3
      ? Math.min(
          pensionAvantCoefficient * PARAMETRES_AGIRC_ARRCO.tauxMajorationEnfants,
          MILLESIME_COURANT.agircArrcoPlafondMajorationEnfantsAnnuel
        )
      : 0;
  return {
    pointsAcquis,
    pointsProjetes,
    valeurServicePoint,
    pensionAvantCoefficient,
    coefficientAnticipation,
    majorationEnfants,
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
