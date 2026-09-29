/**
 * Paramètres réglementaires revalorisés chaque année (MICO, plafond
 * d'écrêtement, MIGA, points RAFP/CNAVPL, PASS courant) et barème de rachat
 * — externalisés dans `params-retraite.json`, sur le modèle de
 * `src/lib/dmtg/params-dmtg.json`, avec une source par valeur.
 *
 * Un « millésime » regroupe les valeurs en vigueur au 1er janvier d'une
 * année. Les tables historiques et législatives (barème âge/durée par
 * génération, PASS et seuils de validation par année, coefficients de
 * revalorisation, durée du SAM) restent en TypeScript, à côté de leur
 * documentation de sources : ce ne sont pas des valeurs à réviser chaque
 * année au même rythme (sauf les coefficients CNAV, cf. leur en-tête).
 *
 * Mise à jour annuelle : ajouter un millésime au JSON (sans modifier les
 * précédents), avec `verifieLe` et une source par valeur.
 */

import paramsRetraiteData from './params-retraite.json';

export interface MillesimeRetraite {
  annee: number;
  verifieLe: string;
  pass: number;
  micoNonMajoreAnnuel: number;
  micoMajoreAnnuel: number;
  plafondGlobalPensionsAnnuel: number;
  migaReferenceAnnuelle: number;
  rafpValeurServicePoint: number;
  cnavplValeurPoint: number;
  agircArrcoPrixAchatPoint: number;
  agircArrcoValeurServicePoint: number;
  agircArrcoPlafondMajorationEnfantsAnnuel: number;
  sources: Record<string, string>;
}

export interface TrancheRachat {
  bas: number; // coût fixe si revenu < seuil bas
  pourcentage: number; // % du revenu entre les deux seuils
  haut: number; // coût fixe si revenu > seuil haut
}

export interface ParametresAgircArrco {
  source: string;
  tauxContractuelT1: number;
  tauxContractuelT2: number;
  plafondT2EnPass: number;
  tauxMajorationEnfants: number;
  coefficientsAnticipationParAge: Record<string, number>;
  coefficientsAnticipationParTrimestresManquants: Record<string, number>;
}

export interface ParametresRAFP {
  source: string;
  seuilRentePoints: number;
  coefficientsMajorationParAge: Record<string, number>;
  coefficientsConversionCapitalParAge: Record<string, number>;
}

interface ParamsRetraite {
  millesimes: MillesimeRetraite[];
  agircArrco: ParametresAgircArrco;
  rafp: ParametresRAFP;
  rachat: {
    source: string;
    seuilBasEnPass: number;
    seuilHautEnPass: number;
    tauxSeul: Record<string, TrancheRachat>;
    tauxEtDuree: Record<string, TrancheRachat>;
  };
}

const PARAMS = paramsRetraiteData as ParamsRetraite;

const MILLESIMES = [...PARAMS.millesimes].sort((a, b) => a.annee - b.annee);

/**
 * Millésime applicable à une date : le plus récent dont l'année est
 * inférieure ou égale à celle de la date. Au-delà du dernier millésime
 * connu (pension future), le dernier millésime est retenu — cohérent avec
 * la projection en euros constants du reste du module. Avant le premier
 * millésime, le premier est retenu (aucune valeur antérieure encodée).
 */
export function millesimePourDate(date: Date): MillesimeRetraite {
  const annee = date.getUTCFullYear();
  const candidats = MILLESIMES.filter((m) => m.annee <= annee);
  return candidats.length > 0 ? candidats[candidats.length - 1] : MILLESIMES[0];
}

/** Dernier millésime encodé — valeurs « en vigueur » au sens du module. */
export const MILLESIME_COURANT: MillesimeRetraite = MILLESIMES[MILLESIMES.length - 1];

/**
 * Contrôle de péremption : les valeurs du dernier millésime ne couvrent que
 * son année civile. À partir du 1er janvier suivant, les montants affichés
 * reposent sur des valeurs probablement dépassées (revalorisation annuelle).
 */
export function baremePerime(aujourdHui: Date): boolean {
  return aujourdHui.getUTCFullYear() > MILLESIME_COURANT.annee;
}

export const BAREME_RACHAT = PARAMS.rachat;
export const PARAMETRES_AGIRC_ARRCO: ParametresAgircArrco = PARAMS.agircArrco;
export const PARAMETRES_RAFP: ParametresRAFP = PARAMS.rafp;
