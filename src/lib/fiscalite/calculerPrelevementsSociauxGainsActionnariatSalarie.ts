import { TAUX_PS_PLUS_VALUES } from './calculerPlusValuesGainsDivers';
import { GainsActionnariatSalarieInput } from './types';

/**
 * CSG (9,2 %) + CRDS (0,5 %) au régime salarial, applicable à 1TT/1UT (gains
 * de levée d'options / AGA post-28.9.2012) : vérifié empiriquement par
 * comparaison avec le détail du calcul du simulateur officiel sur le compte
 * réel (« Base CRDS sur les revenus d'activité et de remplacement » =
 * montant de 1TT exactement, montants CSG/CRDS reconstitués à l'euro près
 * avec ces deux taux, total PS du foyer reconstitué à l'euro près — voir
 * docs/fiscalite.md).
 *
 * **1TP/1UP (rabais excédentaire) volontairement exclu de ce pool, malgré
 * une source impots.gouv.fr indiquant le même régime salarial 9,7 %** :
 * le rapprochement empirique avec le compte réel (1TP=2 000 € déclaré) ne
 * montre AUCUNE ligne de prélèvement social correspondante, et l'inclure au
 * même taux que 1TT aurait fait dévier le total du foyer de 194 € par
 * rapport au total officiel (7 175 €) — écart qui disparaît exactement en
 * excluant 1TP. La source documentaire décrit apparemment le régime légal du
 * rabais excédentaire sans que ce prélèvement transite par la liquidation de
 * l'IR dans ce cas précis — la vérification empirique prévaut sur la lecture
 * documentaire isolée.
 */
const TAUX_CSG_CRDS_LEVEE_OPTIONS = 0.092 + 0.005;
/**
 * Contribution salariale de 10 % (art. L137-14 CSS) sur 1TT/1UT, due
 * automatiquement : brochure IR 2026 — « automatiquement soumis à la
 * contribution salariale de 10 %. Ne les reportez pas ligne 3VN ». Confirmé
 * par ClickImpôts (1TT = 100 000 € → 19 700 € de PS). Le rapprochement du
 * compte réel (7 175 €) ne la faisait pas apparaître : la brochure prévaut.
 */
const TAUX_CONTRIBUTION_SALARIALE_1TT = 0.10;

/**
 * Carried-interest non qualifiant (1NX/1OX, requalifié salaire) : aucun prélèvement social liquidé avec
 * l'IR (simulateur officiel 2026 : 1NX = 5 000 € → 0 €), seule la contribution de 30 % sur 1NY/1OY
 * est due. Choix aligné sur le simulateur, contre l'ancien rapprochement d'un compte réel (voir docs).
 */

/** Contribution salariale sur le carried-interest soumis à ce régime spécifique (1NY/1OY, art. L137-18 CSS). */
const TAUX_CONTRIBUTION_SALARIALE_1NY = 0.30;

/** Contribution salariale sur les gains d'actionnariat salarié/options soumis à 3VN (art. L137-13 CSS). */
const TAUX_CONTRIBUTION_SALARIALE_3VN = 0.10;

/** Contribution salariale de 10 % sur les management packages 1MP/1MQ (simulateur officiel 2026 : 5 000 € → 500 €). */
const TAUX_CONTRIBUTION_SALARIALE_1MP = 0.10;

/**
 * Gains d'acquisition d'actions gratuites (1TZ, avec ses abattements
 * 1UZ/1WZ/1VZ) et BSPCE sur option salaires (1AY/1BY) : prélèvements sociaux
 * sur les revenus du patrimoine. Brochure DGFiP IR 2026 p.111 — gain 1TZ
 * « soumis aux prélèvements sociaux applicables aux revenus du patrimoine »,
 * 1UZ/1VZ/1WZ déclarés comme « abattement soumis aux prélèvements sociaux »
 * (assiette = gain avant abattements) ; p.112 — « Les montants déclarés en
 * ligne 1AY ou 1BY sont soumis aux prélèvements sociaux dus au titre des
 * revenus du patrimoine ».
 *
 * Taux provisoire : 18,6 % (`TAUX_PS_PLUS_VALUES`, CSG 10,6 % LFSS 2026),
 * cohérent avec les autres revenus du patrimoine recouvrés par voie de rôle.
 * La brochure cite 17,2 % pour la fraction ≤ 300 000 € des AGA — taux à
 * vérifier case par case (dette, voir docs/fiscalite.md).
 *
 * Écart assumé avec le simulateur officiel : sur le compte réel testé
 * (1TZ = 8 000 €, 1AY = 10 000 €), aucune ligne PS correspondante n'apparaît
 * dans son détail. La brochure prévaut ; un avis d'imposition réel
 * départagerait.
 */
const TAUX_PS_GAINS_REVENUS_PATRIMOINE = TAUX_PS_PLUS_VALUES;

/**
 * Gains de levée d'options attribuées avant le 28.9.2012 imposés aux taux
 * forfaitaires (3VD 18 %, 3VI 30 %, 3VF 41 %) : PS sur les revenus du
 * patrimoine au même taux que 1TZ/1AY, confirmé par ClickImpôts (3VD =
 * 30 000 € → 5 580 € de PS). La contribution salariale de 10 % reste portée
 * par 3VN.
 */
const TAUX_PS_GAINS_HISTORIQUES_TAUX_FORFAITAIRE = TAUX_PS_PLUS_VALUES;

/**
 * Cases hors périmètre du calcul PS : 1TP/1UP (aucune ligne PS sur le compte réel testé, voir
 * TAUX_CSG_CRDS_LEVEE_OPTIONS) et 0XX (système du quotient, hors périmètre PS de ce module).
 * 3VJ/3VK rejoignent la base patrimoine (18,6 %) et 1MP/1MQ la contribution de 10 % (simulateur 2026).
 */
export const CASES_PS_GAINS_ACTIONNARIAT_HORS_PERIMETRE = [
  'case1tp', 'case1up',
  'case0xx',
] as const;

export interface PrelevementsSociauxGainsActionnariatResult {
  /** Base 1TT/1UT, soumise à 9,7 % (CSG 9,2 % + CRDS 0,5 %, régime salarial). 1TP/1UP volontairement exclu — voir TAUX_CSG_CRDS_LEVEE_OPTIONS. */
  baseLeveeOptions: number;
  prelevementsSociauxLeveeOptions: number;
  /** Contribution salariale de 10 % sur la même base 1TT/1UT (voir TAUX_CONTRIBUTION_SALARIALE_1TT). */
  contributionSalarialeLeveeOptions: number;
  /** Base 1NY/1OY, soumise à la contribution salariale spécifique de 30 %. */
  baseCarriedInterest1NY: number;
  contributionSalariale1NY: number;
  /** Base 1MP/1MQ, soumise à la contribution salariale de 10 %. */
  base1MP: number;
  contributionSalariale1MP: number;
  /** Base 3VN, soumise à la contribution salariale de 10 %. */
  base3VN: number;
  contributionSalariale3VN: number;
  /** Base 1TZ+1UZ+1WZ+1VZ+1AY+1BY+3VJ+3VK, soumise aux PS sur les revenus du patrimoine (voir TAUX_PS_GAINS_REVENUS_PATRIMOINE). */
  baseGainsRevenusPatrimoine: number;
  prelevementsSociauxGainsRevenusPatrimoine: number;
  /** Base 3VD+3VI+3VF, soumise aux PS sur les revenus du patrimoine (voir TAUX_PS_GAINS_HISTORIQUES_TAUX_FORFAITAIRE). */
  baseGainsHistoriquesTauxForfaitaire: number;
  prelevementsSociauxGainsHistoriquesTauxForfaitaire: number;
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
 * les montants effectivement déclarés sur un compte réel, **jusqu'au total
 * du foyer reconstitué à l'euro près** (7 175 € — voir docs/fiscalite.md
 * pour le détail du rapprochement).
 *
 * 1. **1TT/1UT** : régime salarial, CSG 9,2 % + CRDS 0,5 %, plus la
 *    contribution salariale de 10 % due d'office (hors 3VN). 1TP/1UP
 *    volontairement exclu malgré une source documentaire isolée suggérant le
 *    même régime — voir TAUX_CSG_CRDS_LEVEE_OPTIONS.
 * 2. **1NX/1OX** (carried-interest non qualifiant) : aucun prélèvement
 *    (simulateur officiel 2026).
 * 3. **1NY/1OY** : contribution salariale de 30 %, sur 1NY/1OY seuls.
 * 4. **1MP/1MQ** et **3VN** : contribution salariale de 10 %.
 * 5. **1TZ/1UZ/1WZ/1VZ, 1AY/1BY et 3VJ/3VK** : PS sur les revenus du
 *    patrimoine, 18,6 % — voir TAUX_PS_GAINS_REVENUS_PATRIMOINE.
 * 6. **3VD/3VI/3VF** : PS sur les revenus du patrimoine, 18,6 % — voir
 *    TAUX_PS_GAINS_HISTORIQUES_TAUX_FORFAITAIRE.
 *
 * Cases hors calcul : voir CASES_PS_GAINS_ACTIONNARIAT_HORS_PERIMETRE (1TP/1UP, 0XX).
 */
export function calculerPrelevementsSociauxGainsActionnariatSalarie(
  input: GainsActionnariatSalarieInput,
): PrelevementsSociauxGainsActionnariatResult {
  const baseLeveeOptions = (input.case1tt ?? 0) + (input.case1ut ?? 0);
  const prelevementsSociauxLeveeOptions = baseLeveeOptions * TAUX_CSG_CRDS_LEVEE_OPTIONS;
  const contributionSalarialeLeveeOptions = baseLeveeOptions * TAUX_CONTRIBUTION_SALARIALE_1TT;

  const baseCarriedInterest1NY = (input.case1ny ?? 0) + (input.case1oy ?? 0);
  const contributionSalariale1NY = baseCarriedInterest1NY * TAUX_CONTRIBUTION_SALARIALE_1NY;

  // 1PP/1PQ (déclaration 2027, report expiré) : même contribution de 10 % que 1MP/1MQ (simulateur calc-2027).
  const base1MP = (input.case1mp ?? 0) + (input.case1mq ?? 0) + (input.case1pp ?? 0) + (input.case1pq ?? 0);
  const contributionSalariale1MP = base1MP * TAUX_CONTRIBUTION_SALARIALE_1MP;

  const base3VN = input.case3vn ?? 0;
  const contributionSalariale3VN = base3VN * TAUX_CONTRIBUTION_SALARIALE_3VN;

  const baseGainsRevenusPatrimoine = (input.case1tz ?? 0) + (input.case1uz ?? 0) + (input.case1wz ?? 0)
    + (input.case1vz ?? 0) + (input.case1ay ?? 0) + (input.case1by ?? 0) + (input.case3vj ?? 0) + (input.case3vk ?? 0);
  const prelevementsSociauxGainsRevenusPatrimoine = baseGainsRevenusPatrimoine * TAUX_PS_GAINS_REVENUS_PATRIMOINE;

  const baseGainsHistoriquesTauxForfaitaire = (input.case3vd ?? 0) + (input.case3vi ?? 0) + (input.case3vf ?? 0);
  const prelevementsSociauxGainsHistoriquesTauxForfaitaire =
    baseGainsHistoriquesTauxForfaitaire * TAUX_PS_GAINS_HISTORIQUES_TAUX_FORFAITAIRE;

  return {
    baseLeveeOptions,
    prelevementsSociauxLeveeOptions,
    contributionSalarialeLeveeOptions,
    baseCarriedInterest1NY,
    contributionSalariale1NY,
    base1MP,
    contributionSalariale1MP,
    base3VN,
    contributionSalariale3VN,
    baseGainsRevenusPatrimoine,
    prelevementsSociauxGainsRevenusPatrimoine,
    baseGainsHistoriquesTauxForfaitaire,
    prelevementsSociauxGainsHistoriquesTauxForfaitaire,
    prelevementsSociaux: prelevementsSociauxLeveeOptions
      + contributionSalarialeLeveeOptions
      + contributionSalariale1MP
      + contributionSalariale1NY
      + contributionSalariale3VN
      + prelevementsSociauxGainsRevenusPatrimoine
      + prelevementsSociauxGainsHistoriquesTauxForfaitaire,
    casesHorsPerimetre: CASES_PS_GAINS_ACTIONNARIAT_HORS_PERIMETRE,
  };
}
