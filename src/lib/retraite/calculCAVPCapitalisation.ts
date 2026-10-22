/**
 * Volet par capitalisation du régime complémentaire des pharmaciens (CAVP) —
 * fonctions pures, bloc `cavpCapitalisation` de `params-retraite.json`.
 *
 * Estimation (validée le 2026-10-22, option A) : capital acquis (extrait de
 * compte CAVP, `retraite_data.cavp_capital_capitalisation`) + part capitalisée
 * de la classe correspondant au revenu futur, versée chaque année projetée,
 * au rendement réel central du module Épargne ; rente = annuité constante
 * jusqu'à l'âge de référence INSEE (sexe inconnu : moyenne), sans réversion.
 * Le coefficient de conversion de la CAVP (tables, taux technique, option de
 * réversion) n'est pas publié : montant indicatif.
 */

import { PARAMETRES_CAVP_CAPITALISATION, PARAMETRES_EPARGNE_RETRAITE, PARAMETRES_ESPERANCE_VIE } from './parametres';
import { annuiteDepuisCapital, capitalProjete } from './calculEpargneRetraite';

/** Part capitalisée annuelle de la classe correspondant au revenu. */
export function cotisationCapitalisationCAVP(revenuAnnuel: number): number {
  const classes = PARAMETRES_CAVP_CAPITALISATION.cotisationParClasse;
  const classe = classes.find((c) => c.revenuMax === null || revenuAnnuel <= c.revenuMax) ?? classes[classes.length - 1];
  return classe.cotisation;
}

export interface ResultatCAVPCapitalisation {
  capitalAuDepart: number;
  renteAnnuelle: number;
}

export function renteCAVPCapitalisation(
  capitalActuel: number,
  revenuAnnuel: number | null,
  anneesProjetees: number,
  ageDepart: number
): ResultatCAVPCapitalisation {
  const rendement = PARAMETRES_EPARGNE_RETRAITE.rendementsHypotheses.central;
  const versement = revenuAnnuel !== null && anneesProjetees > 0 ? cotisationCapitalisationCAVP(revenuAnnuel) : 0;
  const capitalAuDepart = capitalProjete(Math.max(0, capitalActuel), versement, rendement, Math.max(0, anneesProjetees));
  // Âge de référence comme decisionDepart.ageReferenceDeces(null) (import direct évité : cycle).
  const { hommes, femmes } = PARAMETRES_ESPERANCE_VIE.a65;
  const annees = 65 + (hommes + femmes) / 2 - ageDepart;
  return { capitalAuDepart, renteAnnuelle: annuiteDepuisCapital(capitalAuDepart, rendement, annees) };
}
