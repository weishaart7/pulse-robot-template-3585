/**
 * Épargne retraite et écart de revenu (audit Retraite, phase 6b, 2026-09-30)
 * — fonctions pures. Paramètres : `params-retraite.json` (blocs `per` du
 * millésime et `epargneRetraite`).
 *
 * Règles validées le 2026-09-30 :
 * - Écart de revenu : revenu net retraite + revenus d'actifs qui continuent
 *   (loyers… bruts) − budget cible (charges actives à la date de départ).
 * - Projection : capitalisation au rendement retenu (réel, net de frais —
 *   hypothèses prudent 1 %, central 2 %, favorable 3 %, non sourcées) avec
 *   versements annuels constants.
 * - Capital nécessaire : valeur actuelle au départ du déficit annuel jusqu'à
 *   l'âge de référence (phase 6a), au même rendement.
 * - Sortie du PER en capital : versements déduits imposés au TMI (approche
 *   marginale du barème), gains au prélèvement forfaitaire de 12,8 % + 18,6 %.
 *   En rente : annuité jusqu'à l'âge de référence au rendement central
 *   (estimation — la rente d'un assureur est généralement plus basse),
 *   imposée comme une pension (abattement de 10 % puis TMI), prélèvements
 *   sociaux de 18,6 % sur la fraction imposable liée à l'âge.
 */

import { FRACTION_IMPOSABLE_RENTE } from '@/lib/fiscalite';
import { MILLESIME_COURANT, PARAMETRES_EPARGNE_RETRAITE } from './parametres';

/** Valeur future : capital actuel et versements annuels (fin d'année) capitalisés. */
export function capitalProjete(capitalActuel: number, versementAnnuel: number, rendement: number, annees: number): number {
  if (annees <= 0) return capitalActuel;
  const facteur = Math.pow(1 + rendement, annees);
  const versements = rendement === 0 ? versementAnnuel * annees : (versementAnnuel * (facteur - 1)) / rendement;
  return capitalActuel * facteur + versements;
}

/** Capital nécessaire au départ pour verser `montantAnnuel` pendant `annees` (annuité en début d'année). */
export function capitalNecessaire(montantAnnuel: number, rendement: number, annees: number): number {
  if (montantAnnuel <= 0 || annees <= 0) return 0;
  if (rendement === 0) return montantAnnuel * annees;
  return (montantAnnuel * (1 - Math.pow(1 + rendement, -annees)) * (1 + rendement)) / rendement;
}

/** Montant annuel constant (début d'année) qu'un capital permet de verser pendant `annees`. */
export function annuiteDepuisCapital(capital: number, rendement: number, annees: number): number {
  if (capital <= 0 || annees <= 0) return 0;
  return capital / capitalNecessaire(1, rendement, annees);
}

/** Plafond de déduction PER : 10 % des revenus d'activité, entre le minimum et le maximum du millésime. */
export function plafondDeductionPER(revenusActiviteAnnuels: number): number {
  const { plafondDeductionMinimum, plafondDeductionMaximum } = MILLESIME_COURANT.per;
  return Math.min(
    plafondDeductionMaximum,
    Math.max(plafondDeductionMinimum, revenusActiviteAnnuels * PARAMETRES_EPARGNE_RETRAITE.tauxDeductionPER)
  );
}

/** Fraction de la rente soumise aux prélèvements sociaux selon l'âge au premier versement. */
export function fractionImposableRente(ageDebut: number): number {
  if (ageDebut < 50) return FRACTION_IMPOSABLE_RENTE.moins50;
  if (ageDebut < 60) return FRACTION_IMPOSABLE_RENTE.de50a59;
  if (ageDebut < 70) return FRACTION_IMPOSABLE_RENTE.de60a69;
  return FRACTION_IMPOSABLE_RENTE.aPartirDe70;
}

export interface SortiePER {
  brut: number;
  impot: number;
  prelevementsSociaux: number;
  net: number;
}

/** Sortie du PER en capital (versements déduits au TMI, gains au forfait). */
export function sortiePERCapital(capital: number, versementsDeduits: number, tmi: number): SortiePER {
  const versements = Math.min(capital, Math.max(0, versementsDeduits));
  const gains = Math.max(0, capital - versements);
  const impot = versements * tmi + gains * PARAMETRES_EPARGNE_RETRAITE.tauxForfaitaireGains;
  const prelevementsSociaux = gains * PARAMETRES_EPARGNE_RETRAITE.prelevementsSociauxPER;
  return { brut: capital, impot, prelevementsSociaux, net: capital - impot - prelevementsSociaux };
}

/** Sortie du PER en rente annuelle (versements déduits) : imposée comme une pension. */
export function sortiePERRente(renteAnnuelle: number, ageDebut: number, tmi: number): SortiePER {
  const impot = renteAnnuelle * 0.9 * tmi;
  const prelevementsSociaux =
    renteAnnuelle * fractionImposableRente(ageDebut) * PARAMETRES_EPARGNE_RETRAITE.prelevementsSociauxPER;
  return { brut: renteAnnuelle, impot, prelevementsSociaux, net: renteAnnuelle - impot - prelevementsSociaux };
}

export interface ScenarioCouverture {
  rendement: number;
  anneesVersement: number;
  capitalProjete: number;
  capitalNecessaire: number;
  /** Part du déficit couverte (1 = entièrement), `null` si aucun déficit. */
  couverture: number | null;
  /** Revenu annuel que l'épargne projetée permet de servir jusqu'à l'âge de référence. */
  revenuAnnuelPermis: number;
}

/**
 * Couverture du déficit par l'épargne projetée, pour un scénario (rendement
 * et durée de versement jusqu'à l'âge de référence).
 */
export function scenarioCouverture(params: {
  epargneActuelle: number;
  versementAnnuel: number;
  anneesAvantDepart: number;
  deficitAnnuel: number;
  rendement: number;
  anneesVersement: number;
}): ScenarioCouverture {
  const { epargneActuelle, versementAnnuel, anneesAvantDepart, deficitAnnuel, rendement, anneesVersement } = params;
  const capital = capitalProjete(epargneActuelle, versementAnnuel, rendement, anneesAvantDepart);
  const necessaire = capitalNecessaire(deficitAnnuel, rendement, anneesVersement);
  return {
    rendement,
    anneesVersement,
    capitalProjete: capital,
    capitalNecessaire: necessaire,
    couverture: necessaire > 0 ? capital / necessaire : null,
    revenuAnnuelPermis: annuiteDepuisCapital(capital, rendement, anneesVersement),
  };
}

/** Versement annuel constant (fin d'année) nécessaire pour constituer `capital` en `annees`. */
export function versementAnnuelPourCapital(capital: number, rendement: number, annees: number): number {
  if (capital <= 0) return 0;
  if (annees <= 0) return capital;
  return rendement === 0 ? capital / annees : (capital * rendement) / (Math.pow(1 + rendement, annees) - 1);
}

export interface EntreeAnalyseEcart {
  netMensuel: number;
  revenusActifsMensuels: number;
  budgetMensuel: number;
  encoursPER: number;
  encoursAssuranceVie: number;
  versementAnnuel: number;
  anneesAvantDepart: number;
  ageDepart: number;
  ageReference: number;
  rendements: Record<'prudent' | 'central' | 'favorable', number>;
}

export interface ResultatAnalyseEcart {
  ecartMensuel: number;
  deficitAnnuel: number;
  scenarios: ({ cle: 'prudent' | 'central' | 'favorable' } & ScenarioCouverture)[];
  /** Capital supplémentaire à constituer d'ici le départ (scénario central), 0 si couvert. */
  capitalManquantCentral: number;
  /** Versement annuel supplémentaire équivalent, au rendement central. */
  versementAnnuelComplementaire: number;
}

/**
 * Écart de revenu et couverture par l'épargne, pour les trois scénarios
 * (rendement, durée de retraite = âge de référence ± écart de longévité).
 * Partagé par la carte « Écart de revenu » et l'export PDF de la Synthèse.
 */
export function analyserEcartRevenu(e: EntreeAnalyseEcart): ResultatAnalyseEcart {
  const ecartMensuel = e.netMensuel + e.revenusActifsMensuels - e.budgetMensuel;
  const deficitAnnuel = Math.max(0, -ecartMensuel * 12);
  const ecartVie = PARAMETRES_EPARGNE_RETRAITE.ecartEsperanceVieScenarios;
  const scenarios = (
    [
      ['prudent', ecartVie],
      ['central', 0],
      ['favorable', -ecartVie],
    ] as const
  ).map(([cle, decalage]) => ({
    cle,
    ...scenarioCouverture({
      epargneActuelle: e.encoursPER + e.encoursAssuranceVie,
      versementAnnuel: e.versementAnnuel,
      anneesAvantDepart: e.anneesAvantDepart,
      deficitAnnuel,
      rendement: e.rendements[cle],
      anneesVersement: Math.max(1, Math.round(e.ageReference + decalage - e.ageDepart)),
    }),
  }));
  const central = scenarios[1];
  const capitalManquantCentral = Math.max(0, central.capitalNecessaire - central.capitalProjete);
  return {
    ecartMensuel,
    deficitAnnuel,
    scenarios,
    capitalManquantCentral,
    versementAnnuelComplementaire: versementAnnuelPourCapital(
      capitalManquantCentral,
      e.rendements.central,
      e.anneesAvantDepart
    ),
  };
}
