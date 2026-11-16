import { FoyerFiscalInput, ReductionsCreditsImpotInput } from './types';

/** Dons aux personnes en difficulté à 75 % (art. 200 1 ter CGI) : 1 000 € jusqu'au 13.10.2025, 2 000 € sur l'année. */
export const PLAFOND_DONS_75_AVANT_14_10 = 1000;
const COUPLES: FoyerFiscalInput['situationFamille'][] = ['marie', 'pacse'];
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

/** Frais de garde des jeunes enfants (art. 200 quater B CGI) : 50 % dans la limite de 3 500 € par enfant (1 750 € en résidence alternée). */
export const PLAFOND_GARDE_ENFANT = 3500;
/** Frais de scolarité (art. 199 quater F CGI), par enfant ; moitié en résidence alternée. */
export const REDUCTION_SCOLARITE = { college: 61, lycee: 153, superieur: 183 } as const;
/** Cotisations syndicales (art. 199 quater C CGI) : 66 % dans la limite de 1 % des salaires et pensions bruts du déclarant. */
export const LIMITE_COTISATIONS_SYNDICALES = 0.01;
/** Prestations compensatoires (art. 199 octodecies CGI) : 25 %, versements retenus dans la limite de 30 500 €. */
export const PLAFOND_PRESTATION_COMPENSATOIRE = 30500;
/** Dons aux partis politiques (art. 200 3 CGI) : 66 %, 15 000 € par foyer, dans la limite commune de 20 % avec 7UF. */
export const PLAFOND_DONS_PARTIS = 15000;
/** Report ESUS 2021 (7DC) : 25 % ; plafond 50 000 € (100 000 € pour un couple). */
export const PLAFOND_ESUS = 50000;

const montant = (v: number | null | undefined) => Math.max(0, v ?? 0);

/** Salaires et pensions bruts de chaque déclarant, base de la limite de 1 % des cotisations syndicales. */
export interface RevenusActiviteDeclarants {
  declarant1: number;
  declarant2: number;
}

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
  /** Frais de scolarité 7EA…7EG (réduction). */
  reductionScolarite: number;
  /** Prestations compensatoires 7WN/7WO (réduction). */
  reductionPrestationCompensatoire: number;
  /** Report ESUS 7DC (réduction). */
  reductionEsus: number;
  /** Frais de garde 7GA…7GG (crédit restituable). */
  creditGardeEnfants: number;
  /** Cotisations syndicales 7AC/7AE (crédit restituable). */
  creditCotisationsSyndicales: number;
  /** Crédits restituables du cadre 7 : services à la personne, garde, cotisations syndicales. */
  totalCredits: number;
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
  revenusActivite: RevenusActiviteDeclarants = { declarant1: 0, declarant2: 0 },
): ReductionsCreditsImpotResult {
  const dons1 = montant(input.case7ud);
  const dons2 = montant(input.case7uq);
  const retenus1 = Math.min(dons1, PLAFOND_DONS_75_AVANT_14_10);
  const retenusDifficulte = Math.min(retenus1 + dons2, PLAFOND_DONS_75_ANNEE);
  const religieux = montant(input.case7uj);
  const retenusReligieux = Math.min(religieux, PLAFOND_DONS_PATRIMOINE_RELIGIEUX);
  const excedent75 = dons1 + dons2 - retenusDifficulte + religieux - retenusReligieux;

  // 7UH entre dans la même limite de 20 % que 7UF (simulateur officiel 2026 : 7UH 8 000 € + 7UF 8 000 €, RNI 54 000 € → 7 128 €).
  const base66 = montant(input.case7uf) + excedent75 + Math.min(montant(input.case7uh), PLAFOND_DONS_PARTIS);
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

  const garde = (v: number | null | undefined, alternee: boolean) =>
    Math.min(montant(v), alternee ? PLAFOND_GARDE_ENFANT / 2 : PLAFOND_GARDE_ENFANT);
  const creditGardeEnfants = Math.round(0.5 * (garde(input.case7ga, false) + garde(input.case7gb, false)
    + garde(input.case7gc, false) + garde(input.case7ge, true) + garde(input.case7gf, true) + garde(input.case7gg, true)));

  const reductionScolarite = Math.round(
    REDUCTION_SCOLARITE.college * (montant(input.case7ea) + montant(input.case7eb) / 2)
    + REDUCTION_SCOLARITE.lycee * (montant(input.case7ec) + montant(input.case7ed) / 2)
    + REDUCTION_SCOLARITE.superieur * (montant(input.case7ef) + montant(input.case7eg) / 2),
  );

  const syndicats = (v: number | null | undefined, revenus: number) =>
    Math.min(montant(v), Math.max(0, revenus) * LIMITE_COTISATIONS_SYNDICALES);
  const creditCotisationsSyndicales = Math.round(0.66 * (syndicats(input.case7ac, revenusActivite.declarant1)
    + syndicats(input.case7ae, revenusActivite.declarant2)));

  // 7WM (capital en substitution de rente) n'a aucun effet sur le simulateur officiel 2026 (6 combinaisons testées).
  const versements = montant(input.case7wn);
  const totalJugement = montant(input.case7wo);
  const versementsRetenus = totalJugement > PLAFOND_PRESTATION_COMPENSATOIRE
    ? versements * PLAFOND_PRESTATION_COMPENSATOIRE / totalJugement
    : Math.min(versements, PLAFOND_PRESTATION_COMPENSATOIRE);
  const reductionPrestationCompensatoire = Math.round(versementsRetenus * 0.25);

  // Plafond global de 10 000 € des niches non appliqué : le simulateur officiel 2026 accorde 25 000 € sur 7DC 100 000 €.
  const plafondEsus = COUPLES.includes(foyer.situationFamille) ? PLAFOND_ESUS * 2 : PLAFOND_ESUS;
  const reductionEsus = Math.round(Math.min(montant(input.case7dc), plafondEsus) * 0.25);

  return {
    reductionDons75,
    reductionDons66,
    donsExcedentaires: base66 - retenus66,
    totalReductions: reductionDons75 + reductionDons66 + reductionScolarite + reductionPrestationCompensatoire + reductionEsus,
    plafondServicesPersonne,
    creditServicesPersonne,
    reductionScolarite,
    reductionPrestationCompensatoire,
    reductionEsus,
    creditGardeEnfants,
    creditCotisationsSyndicales,
    totalCredits: creditServicesPersonne + creditGardeEnfants + creditCotisationsSyndicales,
  };
}
