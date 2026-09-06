import { GainsActionnariatSalarieInput } from './types';

/**
 * CSG (9,2 %) + CRDS (0,5 %) au régime salarial, applicable à 1TP/1UP
 * (rabais excédentaire) et 1TT/1UT (gains de levée d'options / AGA
 * post-28.9.2012) : confirmé pour 1TP par impots.gouv.fr (« l'excédent est
 * soumis aux prélèvements sociaux au taux applicable aux salaires : 9,2 % de
 * CSG et 0,5 % de CRDS ») et vérifié empiriquement pour 1TT par comparaison
 * avec le détail du calcul du simulateur officiel sur le compte réel
 * (« Base CRDS sur les revenus d'activité et de remplacement » = montant de
 * 1TT exactement, montants CSG/CRDS reconstitués à l'euro près avec ces deux
 * taux — voir docs/fiscalite.md).
 */
const TAUX_CSG_CRDS_LEVEE_OPTIONS = 0.092 + 0.005;

/**
 * Carried-interest ne remplissant pas les conditions du régime de faveur
 * (1NX/1OX, requalifié salaire — voir calculerGainsActionnariatSalarie.ts) :
 * régime PS spécifique vérifié empiriquement sur le compte réel (comparaison
 * avec le détail du calcul du simulateur officiel, voir docs/fiscalite.md) —
 * trois prélèvements distincts, tous assis sur le même montant brut :
 * - CSG (10,6 %) + CRDS (0,5 %) = 11,10 % : taux 2026 (LFSS 2026, hausse de
 *   1,4 point de CSG sur les revenus du capital) déjà applicable aux revenus
 *   2025 pour cette case, car recouvrée par voie de rôle (avis d'imposition)
 *   et non prélevée à la source pendant l'année — à la différence des
 *   dividendes/intérêts (`calculerPrelevementsSociauxCapitauxMobiliers.ts`,
 *   qui restent à 17,2 % pour les revenus 2025).
 * - Prélèvement de solidarité : 7,5 %.
 * - Contribution salariale spécifique : 10 % — mécanisme distinct de la
 *   contribution salariale de 30 % (1NY/1OY, carried-interest qualifiant
 *   partiellement), et de celle de 10 % sur 3VN (options/AGA) : les trois
 *   sont vérifiées comme des prélèvements séparés, non substituables.
 */
const TAUX_CSG_CRDS_CARRIED_INTEREST_NON_QUALIFIANT = 0.106 + 0.005;
const TAUX_SOLIDARITE_CARRIED_INTEREST_NON_QUALIFIANT = 0.075;
const TAUX_CONTRIBUTION_SALARIALE_CARRIED_INTEREST_NON_QUALIFIANT = 0.10;

/** Contribution salariale sur le carried-interest soumis à ce régime spécifique (1NY/1OY, art. L137-18 CSS). */
const TAUX_CONTRIBUTION_SALARIALE_1NY = 0.30;

/** Contribution salariale sur les gains d'actionnariat salarié/options soumis à 3VN (art. L137-13 CSS). */
const TAUX_CONTRIBUTION_SALARIALE_3VN = 0.10;

/**
 * Cases hors périmètre du calcul PS : aucune ligne de prélèvements sociaux
 * correspondante trouvée dans le détail du calcul du simulateur officiel sur
 * le compte réel testé (1TP=2 000 €, 1TZ=8 000 €, 1AY=10 000 €, 1MP=5 000 €
 * déclarés, aucun des quatre montants — ni leur somme — ne réapparaît dans
 * aucune base de prélèvement social du détail) : ces gains sont
 * vraisemblablement déjà prélevés à la source par l'établissement teneur de
 * compte ou l'employeur au moment de l'opération (cession, exercice),
 * indépendamment de la liquidation de l'IR — non modélisé plutôt que deviné.
 * 3VD/3VI/3VF/3VJ/3VK (gains pré-28.9.2012) : aucune source trouvée avec
 * certitude sur leur régime PS exact — non modélisé. 1UZ/1WZ/1VZ : montants
 * d'abattement, pas un revenu. 0XX : système du quotient, hors périmètre PS
 * comme il l'est du reste de `calculerImpot.ts` pour ce module.
 */
export const CASES_PS_GAINS_ACTIONNARIAT_HORS_PERIMETRE = [
  'case1tz', 'case1uz', 'case1wz', 'case1vz',
  'case1ay', 'case1by',
  'case1mp', 'case1mq',
  'case3vd', 'case3vi', 'case3vf', 'case3vj', 'case3vk',
  'case0xx',
] as const;

export interface PrelevementsSociauxGainsActionnariatResult {
  /** Base 1TP/1UP + 1TT/1UT, soumise à 9,7 % (CSG 9,2 % + CRDS 0,5 %, régime salarial). */
  baseLeveeOptions: number;
  prelevementsSociauxLeveeOptions: number;
  /** Base 1NX/1OX (carried-interest non qualifiant), soumise aux 3 prélèvements distincts détaillés ci-dessus. */
  baseCarriedInterestNonQualifiant: number;
  prelevementsSociauxCarriedInterestNonQualifiant: number;
  /** Base 1NY/1OY, soumise à la contribution salariale spécifique de 30 %. */
  baseCarriedInterest1NY: number;
  contributionSalariale1NY: number;
  /** Base 3VN, soumise à la contribution salariale de 10 %. */
  base3VN: number;
  contributionSalariale3VN: number;
  prelevementsSociaux: number;
  casesHorsPerimetre: readonly string[];
}

/**
 * Prélèvements sociaux du cadre 1 « Gains d'actionnariat salarié » (Phase 3
 * du chantier PS, voir docs/fiscalite.md), le périmètre le plus fragmenté du
 * chantier : chaque sous-catégorie a un régime PS propre, et les recherches
 * documentaires généralistes se sont révélées contradictoires (17,2 % contre
 * 18,6 %, 8 % contre 9,7 % selon les sources pour les mêmes cases). Plutôt
 * que d'arbitrer entre des sources en désaccord, le périmètre retenu ici
 * s'appuie sur une vérification empirique : comparaison ligne à ligne du
 * détail du calcul PS du simulateur officiel de l'impôt sur le revenu avec
 * les montants effectivement déclarés sur un compte réel (voir
 * docs/fiscalite.md pour le détail du rapprochement, à l'euro près).
 *
 * 1. **1TP/1UP + 1TT/1UT** : régime salarial, CSG 9,2 % + CRDS 0,5 %.
 * 2. **1NX/1OX** (carried-interest non qualifiant) : CSG+CRDS 11,10 %
 *    (taux 2026, déjà applicable aux revenus 2025 pour ce type de revenu
 *    recouvré par voie de rôle) + prélèvement de solidarité 7,5 % +
 *    contribution salariale spécifique 10 % — trois prélèvements distincts
 *    sur la même base, non cumulables avec le régime salarial de 1TP/1TT.
 * 3. **1NY/1OY** : contribution salariale de 30 % (carried-interest soumis à
 *    ce régime spécifique, distinct de 1NX).
 * 4. **3VN** : contribution salariale de 10 % (options/AGA).
 *
 * Cases hors calcul : voir CASES_PS_GAINS_ACTIONNARIAT_HORS_PERIMETRE
 * (1TZ/1AY/1MP — déjà prélevés hors du calcul de l'IR, confirmé par
 * l'absence de toute ligne PS correspondante dans la vérification empirique
 * — et 3VD/3VI/3VF/3VJ/3VK, régime PS non confirmé avec certitude).
 */
export function calculerPrelevementsSociauxGainsActionnariatSalarie(
  input: GainsActionnariatSalarieInput,
): PrelevementsSociauxGainsActionnariatResult {
  const baseLeveeOptions = (input.case1tp ?? 0) + (input.case1up ?? 0)
    + (input.case1tt ?? 0) + (input.case1ut ?? 0);
  const prelevementsSociauxLeveeOptions = baseLeveeOptions * TAUX_CSG_CRDS_LEVEE_OPTIONS;

  const baseCarriedInterestNonQualifiant = (input.case1nx ?? 0) + (input.case1ox ?? 0);
  const prelevementsSociauxCarriedInterestNonQualifiant = baseCarriedInterestNonQualifiant * (
    TAUX_CSG_CRDS_CARRIED_INTEREST_NON_QUALIFIANT
    + TAUX_SOLIDARITE_CARRIED_INTEREST_NON_QUALIFIANT
    + TAUX_CONTRIBUTION_SALARIALE_CARRIED_INTEREST_NON_QUALIFIANT
  );

  const baseCarriedInterest1NY = (input.case1ny ?? 0) + (input.case1oy ?? 0);
  const contributionSalariale1NY = baseCarriedInterest1NY * TAUX_CONTRIBUTION_SALARIALE_1NY;

  const base3VN = input.case3vn ?? 0;
  const contributionSalariale3VN = base3VN * TAUX_CONTRIBUTION_SALARIALE_3VN;

  return {
    baseLeveeOptions,
    prelevementsSociauxLeveeOptions,
    baseCarriedInterestNonQualifiant,
    prelevementsSociauxCarriedInterestNonQualifiant,
    baseCarriedInterest1NY,
    contributionSalariale1NY,
    base3VN,
    contributionSalariale3VN,
    prelevementsSociaux: prelevementsSociauxLeveeOptions
      + prelevementsSociauxCarriedInterestNonQualifiant
      + contributionSalariale1NY
      + contributionSalariale3VN,
    casesHorsPerimetre: CASES_PS_GAINS_ACTIONNARIAT_HORS_PERIMETRE,
  };
}
