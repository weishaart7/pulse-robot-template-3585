/**
 * Moteur de calcul de la pension de base CNAVPL (professions libérales non
 * réglementées), en complément du régime général dans
 * src/lib/retraite/calcul.ts. Fonctions pures, sans JSX ni state React.
 *
 * Contrairement aux complémentaires à points génériques (Agirc-Arrco, RAFP,
 * CIPAV, etc., via regimes_points / pensionComplementaireAnnuelle), CNAVPL
 * est un régime de BASE à points : sa pension applique un taux de
 * liquidation (décote/surcote), que le mécanisme générique n'applique
 * jamais. D'où une fonction dédiée plutôt qu'un simple ajout au panier
 * regimes_points.
 *
 * Décote : `decoteCNAVPL()` ci-dessous — la plus favorable des décotes sur
 * la durée tous régimes et sur l'âge (taux plein à 67 ans), mêmes règles
 * que le régime général (référentiel §5.3).
 *
 * Source : CNAVPL (cnavpl.fr), confirmé par plusieurs guides 2026
 * concordants. Valeur du point 2026 : 0,6599 € — à passer en paramètre
 * `valeurPoint` par l'appelant (UI), pas codée en dur ici.
 *
 * Majoration pour 3 enfants ou plus (référentiel §3.8, §5.4 : « mêmes règles
 * qu'au régime général ») : réutilise `majorationTroisEnfants()` de
 * calcul.ts directement, appliquée sur le résultat de `pensionBaseCNAVPL()`
 * — PAS d'étage MICO à intercaler (référentiel §5.5 : « pas de MICO » pour
 * ce régime), à la différence du régime général. Aucune fonction dédiée ici.
 */

import { decoteApplicable, decoteSurAge, decoteSurTrimestres } from './calcul';

/**
 * Pension de base CNAVPL = points × valeur du point × taux de liquidation
 * (100 % à taux plein, réduit par la décote ou majoré par la surcote — pas
 * 50 % comme le régime général).
 *
 * decoteOuSurcote est un pourcentage (ex: -25, 0, +10), calculé en amont via
 * `decoteCNAVPL()` ci-dessous.
 */
export function pensionBaseCNAVPL(
  points: number,
  valeurPoint: number,
  decoteOuSurcote: number
): number {
  const tauxLiquidationPlein = 1;
  return points * valeurPoint * tauxLiquidationPlein * (1 + decoteOuSurcote / 100);
}

/**
 * Décote CNAVPL (référentiel §5.3, art. L. 643-4) : 1,25 % par trimestre
 * manquant selon le plus petit des deux comptages — durée tous régimes par
 * rapport à la durée requise, ou âge de départ par rapport à 67 ans (taux
 * plein automatique) —, plafonnée à -25 %. Jamais positive. `ageDepartAnnees`
 * (âge au mois près à la date d'effet) `null` si inconnu : seule la décote
 * sur la durée s'applique. Partagée par pensionConsolidee.ts et
 * CarriereCNAVPL.tsx.
 */
export function decoteCNAVPL(
  trimestresTousRegimes: number,
  trimestresRequis: number,
  ageDepartAnnees: number | null
): number {
  const decoteDuree = Math.min(decoteSurTrimestres(trimestresTousRegimes, trimestresRequis), 0);
  return ageDepartAnnees === null ? decoteDuree : decoteApplicable(decoteDuree, decoteSurAge(ageDepartAnnees));
}
