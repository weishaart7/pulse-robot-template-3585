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
 * Décote/surcote : réutilise decoteSurTrimestresPlafond25() et decoteSurAge()
 * de calcul.ts (1,25 %/trimestre, plafond -25 % à 20 trimestres — identique
 * à la fonction publique), sur la durée d'assurance tous régimes confondus
 * (trimestresRequisPourGeneration()) — pas de logique dupliquée ici. La
 * combinaison des deux comptages est assurée par `decoteCNAVPL()` ci-dessous.
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

import { decoteApplicable, decoteSurAge, decoteSurTrimestresPlafond25 } from './calcul';

/** Âge d'obtention du taux plein CNAVPL, quel que soit le nombre de
 * trimestres (art. L. 643-4 CSS). Même valeur que l'âge du taux plein
 * automatique du régime général, mais fondement juridique distinct. */
export const AGE_TAUX_PLEIN_CNAVPL = 67;

export interface EntreeDecoteCNAVPL {
  trimestresCNAVPL: number;
  /** Trimestres validés dans les AUTRES régimes (régime général, FP...). */
  trimestresAutresRegimes: number;
  trimestresRequis: number;
  /**
   * Âge à la date d'effet. `null`/`undefined` => le comptage en âge ne
   * s'applique pas et seul le comptage en trimestres joue.
   */
  age?: number | null;
}

/**
 * Décote CNAVPL : applique la **règle du plus petit des deux comptages**
 * entre le comptage en trimestres (tous régimes confondus, plafond -25 %) et
 * le comptage en âge.
 *
 * ⚠️ Le taux plein CNAVPL est acquis de plein droit à 67 ans **quel que soit
 * le nombre de trimestres** (art. L. 643-4 CSS) : un assuré de 67 ans ou plus
 * ne subit aucune décote, même très incomplet en durée. Le code ne retenait
 * auparavant que le comptage en trimestres et décotait donc à tort ces
 * assurés.
 *
 * ⚠️ Ne modifie en rien l'absence de proratisation propre à la CNAVPL : les
 * points accumulés reflètent déjà la carrière réelle, il n'y a pas de ratio
 * durée/durée requise à appliquer ici (contrairement au régime général et à
 * la fonction publique). Seul le taux de liquidation est ajusté.
 *
 * Fonction unique et partagée (`pensionConsolidee.ts` et `CarriereCNAVPL.tsx`)
 * — ne pas réintroduire de calcul local chez un appelant.
 *
 * Résultat toujours <= 0 : la branche positive de
 * `decoteSurTrimestresPlafond25()` n'est pas une surcote légitime et est
 * écrêtée ici, la vraie surcote étant calculée séparément par les appelants.
 */
export function decoteCNAVPL({
  trimestresCNAVPL,
  trimestresAutresRegimes,
  trimestresRequis,
  age,
}: EntreeDecoteCNAVPL): number {
  const decoteTrimestres = Math.min(
    decoteSurTrimestresPlafond25(trimestresCNAVPL + trimestresAutresRegimes, trimestresRequis),
    0
  );
  if (typeof age !== 'number' || !Number.isFinite(age)) {
    return decoteTrimestres;
  }
  return decoteApplicable(decoteTrimestres, decoteSurAge(age, AGE_TAUX_PLEIN_CNAVPL));
}

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
