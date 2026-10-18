import { differenceInCalendarMonths } from 'date-fns';
import type { Asset } from '@/services/assetService';
import type { Emprunt } from '@/services/passifService';
import { computePVIRegime } from '@/lib/patrimoine/regimeFiscalPVI';
import type { FiscalRegimeResult } from '@/lib/patrimoine/regimeFiscalPlusValue';
import { BienNonQualifieError, getRepartitionFoyer } from '@/lib/patrimoine/succession';
import { ORIGINES_PROPRES } from '@/lib/patrimoine/qualification';
import { capitalRestantDuAu } from './credit';
import {
  computeAmortissementImmeubleLMNP,
  computeQuotePart,
  creditsBien,
  ZONE_TERRAIN_PERCENTAGES,
} from './rentabilite';

// Simulation de revente d'un bien (décision du 2026-10-17, docs/immobilier.md) : plus-value des
// particuliers via le moteur de Patrimoine (computePVIRegime : abattements, IR 19 %, PS 17,2 %,
// surtaxe par cédant, forfaits 7,5 % / 15 %), à la date de cession simulée, puis remboursement du
// crédit (capital restant dû à cette date + pénalités de remboursement anticipé) et net perçu par le
// foyer. Toutes les hypothèses sont modifiables ; les valeurs par défaut viennent des fonctions
// ci-dessous.

export const NATURE_LMNP = 'Immeubles locatifs (LMNP)';
const NATURE_LMP = 'Immeubles locatifs (LMP)';
/** Cessions à compter desquelles les amortissements LMNP sont réintégrés (LF 2025, art. 84). */
export const DATE_REINTEGRATION_AMORTISSEMENTS_LMNP = new Date(2025, 1, 15);

export interface HypothesesRevente {
  dateVente: Date;
  prixVente: number;
  /** Frais de cession à la charge du vendeur (agence, diagnostics), déduits du prix. */
  fraisVente: number;
  /** Travaux réels retenus (amélioration, construction, agrandissement facturés, jamais déduits). */
  travauxReels: number;
  /** LMNP : cumul des amortissements déduits (réintégrés sauf résidences services). */
  amortissementsDeduits: number;
  /** LMNP : résidence étudiante, seniors ou EHPAD — pas de réintégration. */
  residenceServices: boolean;
  /** Pénalités de remboursement anticipé, à la part du foyer ; null = plafond légal. */
  penalitesRemboursement: number | null;
}

/** Prix d'achat retenu : prix de l'immeuble saisi dans Immobilier, sinon valeur d'acquisition Patrimoine. */
export const prixAchatBien = (asset: Asset): number => asset.montant_immeuble || asset.valeur_acquisition || 0;

/** Frais d'acquisition réels déductibles : notaire et agence (pas les frais bancaires ni d'hypothèque). */
export function fraisAcquisitionReels(asset: Asset): number {
  const detail = (asset.frais_notaire || 0) + (asset.frais_agence || 0);
  return detail > 0 ? detail : asset.frais_acquisition || 0;
}

export const estBienLoue = (asset: Asset): boolean =>
  !!asset.type_location || asset.nature === NATURE_LMNP || asset.nature === NATURE_LMP
  || asset.nature === 'Immeubles locatifs (loués nus)';

/**
 * Travaux réels proposés par défaut (art. 150 VB II 4° CGI : amélioration, construction,
 * agrandissement non déduits). Bien meublé : 0 (travaux amortis, déjà pris en compte) ; bien loué nu :
 * construction seule (la rénovation est en principe déduite des loyers) ; bien non loué : rénovation +
 * construction. Le champ « rénovation » ne distingue pas amélioration et entretien : à vérifier.
 */
export function travauxReelsParDefaut(asset: Asset): number {
  if (asset.nature === NATURE_LMNP || asset.nature === NATURE_LMP) return 0;
  if (estBienLoue(asset)) return asset.travaux_construction || 0;
  return (asset.travaux_renovation || 0) + (asset.travaux_construction || 0);
}

/**
 * Estimation du cumul des amortissements de l'immeuble (hors mobilier) déduits entre l'acquisition et
 * la vente : amortissement annuel de chaque composant × années écoulées, borné à sa durée. C'est un
 * maximum — l'amortissement déductible chaque année est plafonné au résultat — à corriger au besoin.
 */
export function estimationAmortissementsLMNP(asset: Asset, dateVente: Date): number {
  if (!asset.date_acquisition) return 0;
  const annees = Math.max(0, differenceInCalendarMonths(dateVente, new Date(asset.date_acquisition)) / 12);
  const terrainPct = asset.pourcentage_terrain_force || ZONE_TERRAIN_PERCENTAGES[asset.zone_bien || ''] || 0;
  const travaux = (asset.travaux_renovation || 0) + (asset.travaux_construction || 0);
  return computeAmortissementImmeubleLMNP(asset.montant_immeuble || 0, terrainPct, 0, travaux)
    .reduce((s, l) => s + l.amortissementAnnuel * Math.min(annees, l.duree), 0);
}

/** Part du foyer dans le bien et répartition entre cédants (même règle que Patrimoine). */
function repartitionCedants(asset: Asset): { partFoyer: number; partsCedants: number[] } {
  try {
    const { user, spouse } = getRepartitionFoyer(asset);
    const partFoyer = user + spouse;
    if (partFoyer > 0) {
      return { partFoyer, partsCedants: [user / partFoyer, spouse / partFoyer].filter((p) => p > 0) };
    }
  } catch (error) {
    if (!(error instanceof BienNonQualifieError)) throw error;
  }
  return { partFoyer: computeQuotePart(asset) / 100, partsCedants: [1] };
}

export interface CreditARembourser {
  libelle: string;
  /** Capital restant dû à la date de vente, à la part du foyer. */
  capitalRestantDu: number;
  /** Plafond légal des pénalités (min de 6 mois d'intérêts et 3 % du capital restant dû), part du foyer. */
  penalitesPlafond: number;
}

export type ResultatRevente =
  | { statut: 'hors_perimetre'; message: string }
  | {
      statut: 'ok';
      partFoyer: number;
      /** Prix de vente net de frais, à la part du foyer. */
      prixNet: number;
      /** Prix net − prix d'achat − frais réels, à la part du foyer (avant forfaits et réintégration). */
      plusValueBrute: number;
      regime: FiscalRegimeResult;
      impot: number;
      credits: CreditARembourser[];
      capitalRestantDu: number;
      penalites: number;
      /** Ce que le foyer perçoit après impôt et remboursement du crédit. */
      netPercu: number;
      notes: string[];
    };

export function simulerRevente(asset: Asset, emprunts: Emprunt[], h: HypothesesRevente): ResultatRevente {
  if (asset.nature === NATURE_LMP) {
    return { statut: 'hors_perimetre', message: 'Bien en LMP : la vente relève des plus-values professionnelles (court terme / long terme, exonération de l’art. 151 septies si recettes < 90 000 €, partielle jusqu’à 126 000 €, après 5 ans d’activité), non modélisées : recettes et ancienneté d’activité ne sont pas saisies.' };
  }
  if (asset.nature === 'Parts de SCI') {
    return { statut: 'hors_perimetre', message: 'Parts de SCI : le régime de la plus-value dépend de l’imposition de la société (IR ou IS), suivie dans le module Sociétés.' };
  }
  if (asset.mode_detention === 'Usufruit' || asset.mode_detention === 'Nue-propriété') {
    return { statut: 'hors_perimetre', message: 'Bien démembré : la cession d’un usufruit ou d’une nue-propriété (ventilation du prix) n’est pas modélisée.' };
  }

  const { partFoyer, partsCedants } = repartitionCedants(asset);
  const prixAchat = prixAchatBien(asset);
  const frais = fraisAcquisitionReels(asset);
  const prixNetTotal = Math.max(0, h.prixVente - h.fraisVente);
  const isLMNP = asset.nature === NATURE_LMNP;
  const reintegration = isLMNP && !h.residenceServices && h.dateVente >= DATE_REINTEGRATION_AMORTISSEMENTS_LMNP;

  const origines = asset.origine_actif as string[] | null | undefined;
  const regime = computePVIRegime({
    nature: asset.nature,
    plusValue: (prixNetTotal - prixAchat - frais) * partFoyer,
    dateAcquisition: asset.date_acquisition,
    valeurAcquisition: prixAchat * partFoyer,
    fraisAcquisition: frais * partFoyer,
    acquisitionOnereuse: !origines || origines.length === 0 || !origines.some((o) => ORIGINES_PROPRES.includes(o)),
    partsCedants,
    prixCession: prixNetTotal * partFoyer,
    terrainConstructible: asset.terrain_constructible ?? undefined,
    surfaceBoiseeHa: asset.surface_boisee_ha ?? undefined,
    fixeAuSol: asset.fixe_au_sol ?? undefined,
    residenceServices: isLMNP ? h.residenceServices : undefined,
    dateCession: h.dateVente,
    travauxReels: h.travauxReels * partFoyer,
    amortissementsReintegres: isLMNP ? (reintegration ? h.amortissementsDeduits * partFoyer : 0) : undefined,
  });
  if (!regime) {
    return { statut: 'hors_perimetre', message: `Plus-value non modélisée pour la nature « ${asset.nature} ».` };
  }

  const credits: CreditARembourser[] = creditsBien(asset, emprunts).map((c) => {
    const crd = capitalRestantDuAu(c.echeancier, h.dateVente);
    return {
      libelle: c.libelle || (c.source === 'financement' ? 'Crédit (fiche Immobilier)' : 'Emprunt'),
      capitalRestantDu: crd * c.part,
      // Art. L313-48 du code de la consommation : 6 mois d'intérêts au taux du prêt, plafonnés à 3 % du CRD.
      penalitesPlafond: Math.min((crd * c.tauxAnnuel) / 100 / 2, crd * 0.03) * c.part,
    };
  });
  const capitalRestantDu = credits.reduce((s, c) => s + c.capitalRestantDu, 0);
  const penalites = h.penalitesRemboursement ?? credits.reduce((s, c) => s + c.penalitesPlafond, 0);
  const impot = regime.total ?? 0;
  const prixNet = prixNetTotal * partFoyer;

  const notes: string[] = [];
  if (regime.total === null) notes.push('Impôt non calculable (date d’acquisition manquante) : compté pour 0 dans le net perçu.');

  return {
    statut: 'ok',
    partFoyer,
    prixNet,
    plusValueBrute: (prixNetTotal - prixAchat - frais) * partFoyer,
    regime,
    impot,
    credits,
    capitalRestantDu,
    penalites,
    netPercu: prixNet - impot - capitalRestantDu - penalites,
    notes,
  };
}
