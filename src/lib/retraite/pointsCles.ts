/**
 * Points clés de la retraite (phase 5, en-tête de la Synthèse sur le modèle
 * du bilan Sapiendo p. 3) — fonctions pures.
 *
 * - Âge légal : date d'effet du départ à l'âge légal (`dateEffetDepartAgeLegal`).
 * - Taux plein : première date, à partir de l'âge légal, où les trimestres
 *   tous régimes (acquis + projetés jusqu'à cette date en carrière continue
 *   + trimestres enfants) atteignent la durée requise ; dates testées de
 *   trimestre civil en trimestre civil, plafonnées à 67 ans (taux plein par
 *   l'âge). Logique du régime général : l'âge d'annulation de la décote de
 *   la fonction publique (catégorie active) n'est pas pris en compte.
 * - Cumul emploi-retraite intégral : liquidation avant le 01/01/2027 à taux
 *   plein ; à compter du 01/01/2027, 67 ans (art. 102 LFSS 2026, décrets non
 *   publiés). Toutes les pensions doivent être liquidées.
 */

import { DateNaissance, ageEnMois, dateEffetDepartAgeLegal, trimestresRequisPourGeneration } from './calcul';

/** Âge d'obtention automatique du taux plein (régime général). */
export const AGE_TAUX_PLEIN_AUTOMATIQUE = 67;

/** Première date d'effet soumise aux règles de cumul de l'art. 102 LFSS 2026. */
export const DATE_REFORME_CUMUL_EMPLOI_RETRAITE = new Date(Date.UTC(2027, 0, 1));

/** Règles de cumul applicables à une date de liquidation. */
export function cumulSelonReformeLFSS2026(dateLiquidation: Date): boolean {
  return dateLiquidation.getTime() >= DATE_REFORME_CUMUL_EMPLOI_RETRAITE.getTime();
}

/** Date d'effet du départ à 67 ans : 1er jour du mois suivant l'anniversaire. */
export function dateEffetAgeTauxPleinAutomatique(dateNaissance: DateNaissance): Date {
  return new Date(Date.UTC(dateNaissance.annee + AGE_TAUX_PLEIN_AUTOMATIQUE, dateNaissance.mois, 1));
}

export interface AgeAnsMois {
  ans: number;
  mois: number;
}

export function ageAnsMois(dateNaissance: DateNaissance, date: Date): AgeAnsMois {
  const mois = ageEnMois(dateNaissance, date);
  return { ans: Math.floor(mois / 12), mois: mois % 12 };
}

export interface EntreePointsCles {
  dateNaissance: DateNaissance;
  aujourdHui: Date;
  /** Trimestres acquis aujourd'hui tous régimes, hors trimestres enfants. */
  trimestresAcquis: number;
  /** Trimestres enfants (MDA) retenus à l'âge légal. */
  trimestresEnfants: number;
  /** Trimestres projetés d'aujourd'hui (inclus) au trimestre précédant `date`. */
  trimestresProjetesJusqua: (date: Date) => number;
  /** Première date de départ anticipé carrière longue, `null` si non ouverte. */
  dateCarriereLongue: Date | null;
}

export interface PointsCles {
  dateAgeLegal: Date;
  ageLegal: AgeAnsMois;
  dateTauxPlein: Date;
  ageTauxPlein: AgeAnsMois;
  /** Taux plein obtenu par l'âge (67 ans) et non par la durée. */
  tauxPleinParAge: boolean;
  /** Carrière longue ouvrant un départ à taux plein avant l'âge légal. */
  dateCarriereLongue: Date | null;
  trimestresAcquis: number;
  trimestresRequis: number;
  /** Trimestres manquants à l'âge légal, projection comprise. */
  trimestresManquantsAgeLegal: number;
  dateCumulIntegral: Date;
  /** Date de cumul intégral soumise aux règles de l'art. 102 LFSS 2026. */
  cumulSelonReforme: boolean;
}

/** `null` si l'âge légal n'est pas déterminable (barème non stable). */
export function calculerPointsCles(entree: EntreePointsCles): PointsCles | null {
  const { dateNaissance, aujourdHui } = entree;
  const dateAgeLegal = dateEffetDepartAgeLegal(dateNaissance, aujourdHui);
  if (!dateAgeLegal) return null;

  const trimestresA = (date: Date) =>
    entree.trimestresAcquis + entree.trimestresEnfants + entree.trimestresProjetesJusqua(date);
  const date67 = dateEffetAgeTauxPleinAutomatique(dateNaissance);

  let dateTauxPlein = date67;
  for (let date = dateAgeLegal; date.getTime() < date67.getTime(); ) {
    if (trimestresA(date) >= trimestresRequisPourGeneration(dateNaissance, date)) {
      dateTauxPlein = date;
      break;
    }
    // Trimestre civil suivant (les trimestres se valident par trimestre civil).
    date = new Date(Date.UTC(date.getUTCFullYear(), Math.floor(date.getUTCMonth() / 3) * 3 + 3, 1));
  }
  const tauxPleinParAge = dateTauxPlein.getTime() === date67.getTime();

  const trimestresRequis = trimestresRequisPourGeneration(dateNaissance, dateAgeLegal);
  const cumulSelonReforme = cumulSelonReformeLFSS2026(dateTauxPlein);
  const dateCarriereLongue =
    entree.dateCarriereLongue && entree.dateCarriereLongue.getTime() < dateAgeLegal.getTime()
      ? entree.dateCarriereLongue
      : null;

  return {
    dateAgeLegal,
    ageLegal: ageAnsMois(dateNaissance, dateAgeLegal),
    dateTauxPlein,
    ageTauxPlein: ageAnsMois(dateNaissance, dateTauxPlein),
    tauxPleinParAge,
    dateCarriereLongue,
    trimestresAcquis: entree.trimestresAcquis + entree.trimestresEnfants,
    trimestresRequis,
    trimestresManquantsAgeLegal: Math.max(0, trimestresRequis - trimestresA(dateAgeLegal)),
    dateCumulIntegral: cumulSelonReforme ? date67 : dateTauxPlein,
    cumulSelonReforme,
  };
}
