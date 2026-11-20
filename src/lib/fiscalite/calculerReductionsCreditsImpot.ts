import { FoyerFiscalInput, ReductionsCreditsImpotInput } from './types';
import { PARAMETRES_PAR_DEFAUT, type ParametresFiscaux } from './parametres';

/** Dons à 75 % (art. 200 1 ter CGI), millésime par défaut (valeurs : `parametres.reductionsCredits`). */
export const PLAFOND_DONS_75_AVANT_14_10 = PARAMETRES_PAR_DEFAUT.reductionsCredits.plafondDons75Premiere;
export const PLAFOND_DONS_75_ANNEE = PARAMETRES_PAR_DEFAUT.reductionsCredits.plafondDons75Annee;
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
/** Dons pour Mayotte (cyclone Chido, 7UO) : 75 % dans la limite propre de 2 000 €, excédent à 66 %. */
export const PLAFOND_DONS_MAYOTTE = 2000;
/** Bas du cadre 7, relevé sur le simulateur officiel 2026. */
export const PLAFOND_PPRT = 20000;
export const PLAFOND_RENTE_SURVIE = 1525;
export const MAJORATION_RENTE_SURVIE_ENFANT = 300;
export const PLAFOND_DEPENDANCE_PAR_PERSONNE = 10000;
export const PLAFOND_AUTONOMIE = 5000;
/** Seuils de RFR de 7WI du millésime par défaut ; RFR N−2 ou N−1 au choix. */
export const SEUILS_RFR_AUTONOMIE = PARAMETRES_PAR_DEFAUT.reductionsCredits.seuilsRfrAutonomie;
/** Reports de dons excédentaires 2020-2024. */
const COUPLES_AUTONOMIE: FoyerFiscalInput['situationFamille'][] = ['marie', 'pacse'];
const REPORTS_DONS = ['case7xs', 'case7xt', 'case7xu', 'case7xw', 'case7xy'] as const;

const montant = (v: number | null | undefined) => Math.max(0, v ?? 0);

/** Salaires et pensions bruts de chaque déclarant, base de la limite de 1 % des cotisations syndicales. */
export interface RevenusActiviteDeclarants {
  declarant1: number;
  declarant2: number;
  /** Salaires des personnes à charge (base de 7AG). */
  personnesCharge?: number;
}

export interface ReductionsCreditsImpotResult {
  /** 75 % des dons 7UD/7UQ et 7UJ dans leurs plafonds. */
  reductionDons75: number;
  /** 66 % de 7UF et de l'excédent des dons à 75 %, dans la limite de 20 % du revenu imposable. */
  reductionDons66: number;
  /** Fraction des dons à 66 % au-delà de 20 % du revenu imposable : reportable 5 ans, sans effet cette année. */
  donsExcedentaires: number;
  /** Réductions non restituables, imputées sur le seul impôt au barème après décote (voir calculerImpot.ts). */
  totalReductions: number;
  /** Plafond des dépenses de services à la personne retenu. */
  plafondServicesPersonne: number;
  /** 50 % de (7DB − 7DR) dans le plafond : crédit restituable. */
  creditServicesPersonne: number;
  /** Frais de scolarité 7EA…7EG (réduction). */
  reductionScolarite: number;
  /** Prestations compensatoires 7WN/7WO (réduction). */
  reductionPrestationCompensatoire: number;
  /** Frais de garde 7GA…7GG (crédit restituable). */
  creditGardeEnfants: number;
  /** Cotisations syndicales 7AC/7AE (crédit restituable). */
  creditCotisationsSyndicales: number;
  /** Rente survie 7GZ, dépendance 7CD/7CE (réductions hors plafond global). */
  reductionRenteSurvieDependance: number;
  /** Travaux PPRT 7WL et perte d'autonomie 7WI (crédits restituables hors plafond global). */
  creditsTravauxLogement: number;
  /** Dont crédit perte d'autonomie 7WI (art. 200 quater A), réintégré pour la CDHR. */
  creditAutonomie: number;
  /** Crédits restituables du cadre 7 : services à la personne, garde, cotisations syndicales. */
  totalCredits: number;
  /** Avantages soumis au plafonnement global de 10 000 € (services à la personne, garde) — voir calculerPlafonnementNiches. */
  avantagesPlafonnesCourants: number;
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
  parametres: ParametresFiscaux = PARAMETRES_PAR_DEFAUT,
): ReductionsCreditsImpotResult {
  const { plafondDons75Premiere, plafondDons75Annee, seuilsRfrAutonomie, plafondDonsChambord } = parametres.reductionsCredits;
  // Dons à un organisme européen : 7VA avec 7UD, 7VM avec 7UQ, 7VC avec 7UF (simulateur officiel 2026).
  // Revenus 2026 : 7UQ (Chambord) a son propre plafond à 75 %, l'excédent rejoint les dons à 66 % (calc-2027).
  const chambord = plafondDonsChambord === null ? 0 : montant(input.case7uq);
  const retenusChambord = Math.min(chambord, plafondDonsChambord ?? 0);
  const dons1 = montant(input.case7ud) + montant(input.case7va);
  const dons2 = (plafondDonsChambord === null ? montant(input.case7uq) : 0) + montant(input.case7vm);
  const retenus1 = Math.min(dons1, plafondDons75Premiere);
  const retenusDifficulte = Math.min(retenus1 + dons2, plafondDons75Annee) + retenusChambord;
  const religieux = montant(input.case7uj);
  const retenusReligieux = Math.min(religieux, PLAFOND_DONS_PATRIMOINE_RELIGIEUX);
  const mayotte = montant(input.case7uo);
  const retenusMayotte = Math.min(mayotte, PLAFOND_DONS_MAYOTTE);
  const excedent75 = dons1 + dons2 + chambord - retenusDifficulte + religieux - retenusReligieux + mayotte - retenusMayotte;

  // 7UH entre dans la même limite de 20 % que 7UF (simulateur officiel 2026 : 7UH 8 000 € + 7UF 8 000 €, RNI 54 000 € → 7 128 €).
  // Reports de dons 7XS…7XY : 66 % dans la même limite.
  const base66 = montant(input.case7uf) + montant(input.case7vc) + excedent75
    + Math.min(montant(input.case7uh), PLAFOND_DONS_PARTIS)
    + REPORTS_DONS.reduce((s, cle) => s + montant(input[cle]), 0);
  const limite66 = Math.max(0, revenuImposable) * LIMITE_DONS_66_REVENU;
  const retenus66 = Math.min(base66, limite66);

  const reductionDons75 = Math.round((retenusDifficulte + retenusReligieux + retenusMayotte) * 0.75);
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
    + syndicats(input.case7ae, revenusActivite.declarant2)
    + syndicats(input.case7ag, revenusActivite.personnesCharge ?? 0)));

  // 7WM (capital en substitution de rente) n'a aucun effet sur le simulateur officiel 2026 (6 combinaisons testées).
  const versements = montant(input.case7wn);
  const totalJugement = montant(input.case7wo);
  const versementsRetenus = totalJugement > PLAFOND_PRESTATION_COMPENSATOIRE
    ? versements * PLAFOND_PRESTATION_COMPENSATOIRE / totalJugement
    : Math.min(versements, PLAFOND_PRESTATION_COMPENSATOIRE);
  // 7WP (report 2024) : 25 % dans la limite de 30 500 € ; au-delà, ou avec 7WN, « calcul impossible » sur le simulateur.
  const reductionPrestationCompensatoire = Math.round(
    (versementsRetenus + Math.min(montant(input.case7wp), PLAFOND_PRESTATION_COMPENSATOIRE)) * 0.25);

  // 7GZ : 25 % de 1 525 € + 300 € par enfant à charge (150 € en résidence alternée, non mesuré).
  const plafondRente = PLAFOND_RENTE_SURVIE + foyer.enfantsCharge.reduce(
    (s, e) => s + (e.residenceAlternee ? MAJORATION_RENTE_SURVIE_ENFANT / 2 : MAJORATION_RENTE_SURVIE_ENFANT), 0);
  const reductionRenteSurvieDependance = Math.round(0.25 * (Math.min(montant(input.case7gz), plafondRente)
    + Math.min(montant(input.case7cd), PLAFOND_DEPENDANCE_PAR_PERSONNE)
    + Math.min(montant(input.case7ce), PLAFOND_DEPENDANCE_PAR_PERSONNE)));

  // 7WI : crédit de 25 % si le RFR 2023 ou 2024 ne dépasse pas le seuil du foyer ; plafond de 5 000 €
  // (10 000 € couple) diminué des dépenses retenues 2021-2024 (loi ; « calcul impossible » sur le simulateur).
  const couple = COUPLES_AUTONOMIE.includes(foyer.situationFamille);
  const personnes = (couple ? 2 : 1) + foyer.enfantsCharge.length + foyer.personnesInvalidesCharge.length
    + foyer.enfantsMajeursRattaches;
  const seuilRfr = personnes === 1 ? seuilsRfrAutonomie.une
    : seuilsRfrAutonomie.deux + (personnes - 2) * seuilsRfrAutonomie.parPersonne;
  const rfrs = [input.case8ys, input.case8yu].filter((v): v is number => typeof v === 'number' && v > 0);
  const eligibleAutonomie = rfrs.some(v => v <= seuilRfr);
  const anterieures = montant(input.case7zz) + montant(input.case7zy) + montant(input.case7zx) + montant(input.case7zw);
  const plafondAutonomie = Math.max(0, PLAFOND_AUTONOMIE * (couple ? 2 : 1) - anterieures);
  const creditAutonomie = eligibleAutonomie ? Math.min(montant(input.case7wi), plafondAutonomie) * 0.25 : 0;
  const creditsTravauxLogement = Math.round(Math.min(montant(input.case7wl), PLAFOND_PPRT) * 0.40 + creditAutonomie);

  return {
    reductionRenteSurvieDependance,
    creditsTravauxLogement,
    reductionDons75,
    reductionDons66,
    creditAutonomie: Math.round(creditAutonomie),
    donsExcedentaires: base66 - retenus66,
    totalReductions: reductionDons75 + reductionDons66 + reductionScolarite + reductionPrestationCompensatoire
      + reductionRenteSurvieDependance,
    plafondServicesPersonne,
    creditServicesPersonne,
    reductionScolarite,
    reductionPrestationCompensatoire,
    creditGardeEnfants,
    creditCotisationsSyndicales,
    totalCredits: creditServicesPersonne + creditGardeEnfants + creditCotisationsSyndicales + creditsTravauxLogement,
    avantagesPlafonnesCourants: creditServicesPersonne + creditGardeEnfants,
  };
}
