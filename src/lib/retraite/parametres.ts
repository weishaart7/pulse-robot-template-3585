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
  rafpValeurAcquisitionPoint: number;
  agircArrcoValeurServicePoint: number;
  agircArrcoPlafondMajorationEnfantsAnnuel: number;
  reversionRegimeGeneral: {
    plafondRessourcesSeulAnnuel: number;
    plafondRessourcesCoupleAnnuel: number;
    minimumMensuel: number;
    maximumMensuel: number;
  };
  per: { plafondDeductionMinimum: number; plafondDeductionMaximum: number };
  prelevementsSociauxPensions: {
    seuilsRfrUnePart: { exoneration: number; tauxReduit: number; tauxMedian: number };
    majorationSeuilsParDemiPart: { exoneration: number; tauxReduit: number; tauxMedian: number };
  };
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
  /** Majoration par enfant à charge à la date d'effet (sans plafond). */
  tauxMajorationEnfantACharge: number;
  /** Clé = âge en années au trimestre près (« 62.25 » = 62 ans 3 mois), générations 1965 et suivantes. */
  coefficientsAnticipationParAgeTrimestriel: Record<string, number>;
  coefficientsAnticipationParTrimestresManquants: Record<string, number>;
}

export interface ParametresMDA {
  source: string;
  trimestresMaterniteAdoption: number;
  trimestresEducation: number;
  /** Durée d'assurance minimale tous régimes pour les trimestres éducation. */
  dureeMinimaleEducation: number;
  /** Avant cette date : trimestres éducation à la mère, sans répartition. */
  dateChargeRepartitionEducation: string;
  /** Fonction publique : bonification avant cette date, majoration de durée à partir. */
  fpDateChargeMajoration: string;
  fpTrimestresMajorationDuree: number;
  fpTrimestresBonification: number;
  fpTauxMaximalAvecBonificationsPct: number;
}

export interface ParametresProjectionStatut {
  source: string;
  rafpTauxCotisationTotal: number;
  rafpPlafondPrimesEnPartDuTIB: number;
  cnavplPointsMaxT1: number;
  cnavplPointsMaxT2: number;
  cnavplPlafondT2EnPass: number;
}

export interface TrancheSurcoteCaisse {
  /** Âge de début : âge légal de la génération ou âge fixe. */
  depuis: 'ageLegal' | number;
  jusquA: number;
  tauxParTrimestre: number;
  /** Majoration appliquée sur le coefficient atteint à la tranche précédente. */
  multiplicatif?: boolean;
}

export type AcquisitionCaissePoints =
  | { mode: 'revenuParPoint'; revenuParPoint: number; pointsMaxAnnuels: number }
  | { mode: 'forfaitPlusRevenuParPoint'; pointsForfait: number; revenuParPoint: number; pointsMaxProportionnels: number }
  | { mode: 'tranchesPrixAchat'; prixAchatPoint: number; tranches: { jusquAPass: number; taux: number }[] };

export interface ParametresCaissePoints {
  nom: string;
  /** Expression reconnaissant le régime dans le libellé du RIS. */
  motifNom: string;
  exclureMotifNom?: string;
  /** Caisse déclarée par un libéral (`retraite_data.caisse_liberale`). */
  caisseLiberale: string;
  conventionneSeulement?: boolean;
  source: string;
  valeurServicePoint: number;
  acquisition: AcquisitionCaissePoints;
  /** Minoration identique à celle de la retraite de base (1,25 %/trimestre manquant, âge ou durée). */
  decoteCommeBase?: boolean;
  surcote: TrancheSurcoteCaisse[];
  majorationTroisEnfantsPct: number;
  tauxReversion: number;
}

export interface ParametresRAFP {
  source: string;
  seuilRentePoints: number;
  coefficientsMajorationParAge: Record<string, number>;
  coefficientsConversionCapitalParAge: Record<string, number>;
}

export type TrancheCSGPension = 'exoneration' | 'tauxReduit' | 'tauxMedian' | 'tauxNormal';

export interface TauxPrelevementsPension {
  csg: number;
  csgDeductible: number;
  crds: number;
  casa: number;
  maladieComplementaire: number;
}

export interface ParametresReversion {
  source: string;
  tauxRegimeGeneral: number;
  tauxCNAVPL: number;
  tauxAgircArrco: number;
  tauxFonctionPublique: number;
  tauxRAFP: number;
  trimestresMinimumComplet: number;
}

export interface ParametresCarriereLongue {
  source: string;
  dateEffetMinimale: string;
  trimestresDebutActivite: number;
  trimestresDebutActiviteNeAuQuatriemeTrimestre: number;
  plafondsReputesCotises: { maladie: number; chomageIndemnise: number };
  generations: {
    naissanceMin: string; // "AAAA-MM"
    naissanceMax: string;
    ages: { debutAvant: number; ans: number; mois: number }[];
  }[];
}

export interface ParametresEsperanceVie {
  source: string;
  annee: number;
  a60: { hommes: number; femmes: number };
  a65: { hommes: number; femmes: number };
}

export type ScenarioEpargne = 'prudent' | 'central' | 'favorable';

export interface ParametresEpargneRetraite {
  source: string;
  tauxDeductionPER: number;
  prelevementsSociauxPER: number;
  prelevementsSociauxAssuranceVie: number;
  tauxForfaitaireGains: number;
  tauxAssuranceVieApres8Ans: number;
  abattementAssuranceVieSeul: number;
  abattementAssuranceVieCouple: number;
  rendementsHypotheses: Record<ScenarioEpargne, number>;
  ecartEsperanceVieScenarios: number;
}

interface ParamsRetraite {
  millesimes: MillesimeRetraite[];
  agircArrco: ParametresAgircArrco;
  mda: ParametresMDA;
  projectionStatut: ParametresProjectionStatut;
  caissesPoints: { carmf: ParametresCaissePoints; carmfAsv: ParametresCaissePoints; cipav: ParametresCaissePoints };
  rafp: ParametresRAFP;
  reversion: ParametresReversion;
  carriereLongue: ParametresCarriereLongue;
  esperanceVie: ParametresEsperanceVie;
  epargneRetraite: ParametresEpargneRetraite;
  prelevementsSociauxPensions: { source: string; tranches: Record<TrancheCSGPension, TauxPrelevementsPension> };
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
export const PARAMETRES_MDA: ParametresMDA = PARAMS.mda;
export const PARAMETRES_CAISSES_POINTS = PARAMS.caissesPoints;
export const PARAMETRES_PROJECTION_STATUT: ParametresProjectionStatut = PARAMS.projectionStatut;
export const TAUX_PRELEVEMENTS_PENSIONS: Record<TrancheCSGPension, TauxPrelevementsPension> =
  PARAMS.prelevementsSociauxPensions.tranches;
export const PARAMETRES_REVERSION: ParametresReversion = PARAMS.reversion;
export const PARAMETRES_CARRIERE_LONGUE: ParametresCarriereLongue = PARAMS.carriereLongue;
export const PARAMETRES_ESPERANCE_VIE: ParametresEsperanceVie = PARAMS.esperanceVie;
export const PARAMETRES_EPARGNE_RETRAITE: ParametresEpargneRetraite = PARAMS.epargneRetraite;
