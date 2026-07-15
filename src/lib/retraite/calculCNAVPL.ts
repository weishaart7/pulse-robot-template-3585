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
 * Décote/surcote : réutilise decoteSurTrimestresPlafond25() de calcul.ts
 * (1,25 %/trimestre, plafond -25 % à 20 trimestres — identique à la
 * fonction publique), sur la durée d'assurance tous régimes confondus
 * (trimestresRequisPourGeneration()) — pas de logique dupliquée ici.
 *
 * Source : CNAVPL (cnavpl.fr), confirmé par plusieurs guides 2026
 * concordants. Valeur du point 2026 : 0,6599 € — à passer en paramètre
 * `valeurPoint` par l'appelant (UI), pas codée en dur ici.
 */

/**
 * Pension de base CNAVPL = points × valeur du point × taux de liquidation
 * (100 % à taux plein, réduit par la décote ou majoré par la surcote — pas
 * 50 % comme le régime général).
 *
 * decoteOuSurcote est un pourcentage (ex: -25, 0, +10), calculé en amont via
 * decoteSurTrimestresPlafond25() de calcul.ts — pas de logique dupliquée ici.
 */
export function pensionBaseCNAVPL(
  points: number,
  valeurPoint: number,
  decoteOuSurcote: number
): number {
  const tauxLiquidationPlein = 1;
  return points * valeurPoint * tauxLiquidationPlein * (1 + decoteOuSurcote / 100);
}
