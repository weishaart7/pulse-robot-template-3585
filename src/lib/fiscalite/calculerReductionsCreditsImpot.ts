import { FoyerFiscalInput, ReductionsCreditsImpotInput } from './types';

/** Dons aux personnes en difficulté à 75 % (art. 200 1 ter CGI) : 1 000 € jusqu'au 13.10.2025, 2 000 € sur l'année. */
export const PLAFOND_DONS_75_AVANT_14_10 = 1000;
export const PLAFOND_DONS_75_ANNEE = 2000;
/** Dons pour le patrimoine religieux à 75 % (art. 200 1 quater CGI). */
export const PLAFOND_DONS_PATRIMOINE_RELIGIEUX = 1000;
/** Dons à 66 % dans la limite de 20 % du revenu imposable (art. 200 1 CGI). */
export const LIMITE_DONS_66_REVENU = 0.20;

/** Plafonds des dépenses de services à la personne (art. 199 sexdecies CGI). */
export const PLAFOND_SERVICES_PERSONNE = 12000;
export const PLAFOND_SERVICES_PERSONNE_MAJORE = 15000;
export const PLAFOND_SERVICES_PERSONNE_PREMIERE_ANNEE = 15000;
export const PLAFOND_SERVICES_PERSONNE_PREMIERE_ANNEE_MAJORE = 18000;
export const PLAFOND_SERVICES_PERSONNE_INVALIDITE = 20000;
export const MAJORATION_SERVICES_PERSONNE = 1500;

const montant = (v: number | null) => Math.max(0, v ?? 0);

export interface ReductionsCreditsImpotResult {
  /** 75 % des dons 7UD/7UQ et 7UJ dans leurs plafonds. */
  reductionDons75: number;
  /** 66 % de 7UF et de l'excédent des dons à 75 %, dans la limite de 20 % du revenu imposable. */
  reductionDons66: number;
  /** Fraction des dons à 66 % au-delà de 20 % du revenu imposable : reportable 5 ans, sans effet cette année. */
  donsExcedentaires: number;
  /** Réductions non restituables, imputées sur l'impôt après décote (voir calculerImpot.ts). */
  totalReductions: number;
  /** Plafond des dépenses de services à la personne retenu. */
  plafondServicesPersonne: number;
  /** 50 % de (7DB − 7DR) dans le plafond : crédit restituable. */
  creditServicesPersonne: number;
}

/**
 * Cadre 7 de la 2042 (revenus 2025/impôt 2026). `revenuImposable` est le
 * revenu net imposable du foyer (base de la limite de 20 % des dons).
 *
 * Plafond services à la personne : 12 000 €, majoré de 1 500 € par enfant
 * à charge (750 € en résidence alternée), enfant majeur rattaché, personne
 * invalide à charge, ascendant 7DL et membre du foyer de plus de 65 ans,
 * sans dépasser 15 000 € ; 15 000 € (18 000 € majoré) avec 7DQ ; 20 000 €
 * sans majoration avec 7DG. Le plafonnement global des niches (10 000 €)
 * est sans effet sur le seul crédit du cadre 7, qui ne peut l'atteindre.
 */
export function calculerReductionsCreditsImpot(
  input: ReductionsCreditsImpotInput,
  foyer: FoyerFiscalInput,
  revenuImposable: number,
): ReductionsCreditsImpotResult {
  const dons1 = montant(input.case7ud);
  const dons2 = montant(input.case7uq);
  const retenus1 = Math.min(dons1, PLAFOND_DONS_75_AVANT_14_10);
  const retenusDifficulte = Math.min(retenus1 + dons2, PLAFOND_DONS_75_ANNEE);
  const religieux = montant(input.case7uj);
  const retenusReligieux = Math.min(religieux, PLAFOND_DONS_PATRIMOINE_RELIGIEUX);
  const excedent75 = dons1 + dons2 - retenusDifficulte + religieux - retenusReligieux;

  const base66 = montant(input.case7uf) + excedent75;
  const limite66 = Math.max(0, revenuImposable) * LIMITE_DONS_66_REVENU;
  const retenus66 = Math.min(base66, limite66);

  const reductionDons75 = Math.round((retenusDifficulte + retenusReligieux) * 0.75);
  const reductionDons66 = Math.round(retenus66 * 0.66);

  const majorations = foyer.enfantsCharge.reduce((s, e) => s + (e.residenceAlternee ? MAJORATION_SERVICES_PERSONNE / 2 : MAJORATION_SERVICES_PERSONNE), 0)
    + (foyer.enfantsMajeursRattaches + foyer.personnesInvalidesCharge.length
      + montant(input.case7dl) + montant(input.membresPlus65Ans)) * MAJORATION_SERVICES_PERSONNE;
  const plafondServicesPersonne = input.case7dg
    ? PLAFOND_SERVICES_PERSONNE_INVALIDITE
    : input.case7dq
      ? Math.min(PLAFOND_SERVICES_PERSONNE_PREMIERE_ANNEE + majorations, PLAFOND_SERVICES_PERSONNE_PREMIERE_ANNEE_MAJORE)
      : Math.min(PLAFOND_SERVICES_PERSONNE + majorations, PLAFOND_SERVICES_PERSONNE_MAJORE);
  const depensesNettes = Math.max(0, montant(input.case7db) - montant(input.case7dr));
  const creditServicesPersonne = Math.round(Math.min(depensesNettes, plafondServicesPersonne) * 0.5);

  return {
    reductionDons75,
    reductionDons66,
    donsExcedentaires: base66 - retenus66,
    totalReductions: reductionDons75 + reductionDons66,
    plafondServicesPersonne,
    creditServicesPersonne,
  };
}
