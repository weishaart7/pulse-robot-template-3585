import { RevenusSalairesInput } from './types';

const ABATTEMENT_TAUX = 0.10;
const ABATTEMENT_PLANCHER = 509;
const ABATTEMENT_PLAFOND = 14555;

/**
 * Cases du cadre 1 "Traitements et salaires" volontairement exclues du calcul
 * v1 : montants exonérés d'IR (n'entrent jamais dans le revenu imposable),
 * régime dont l'articulation est trop complexe pour être fiabilisée sans
 * validation métier dédiée (1AF/1BF : méthode du taux effectif), ou cases à
 * cocher purement informatives sans montant propre (1AV/1BV, 1GK/1GL).
 */
export const CASES_SALAIRES_EXCLUES_DU_CALCUL = [
  'case1gh', 'case1hh', // heures supplémentaires et jours RTT exonérés
  'case1pb', 'case1pc', // pourboires exonérés
  'case1ad', 'case1bd', // primes de partage de la valeur exonérées
  'case1av', 'case1bv', // majoration du seuil d'exonération de 1AD/1BD (sans effet ici : 1AD/1BD déjà traité comme intégralement exonéré)
  'case1dy', 'case1ey', // salariés impatriés, fraction exonérée
  'case1sm', 'case1dn', // sommes exonérées issues du CET
  'case1af', 'case1bf', // source étrangère, crédit d'impôt égal à l'impôt français (taux effectif non implémenté)
  'case1gb', 'case1hb', // gérants et associés art. 62 CGI (régime de frais professionnels particulier, non arbitré)
  'case1gk', 'case1gl', // "ne perçoit plus de salaires 1GB/1GF/1GG/1AG" — informatif (année suivante), aucun montant propre
] as const;

export interface RevenuSalairesDeclarantDetail {
  remunerationsBrutes: number;
  abattementSpecifique: number;
  baseApresAbattementSpecifique: number;
  fraisReels: number | null;
  abattementForfaitaire: number;
  deductionRetenue: 'frais_reels' | 'abattement_forfaitaire';
  netImposable: number;
}

export interface RevenuSalairesResult {
  declarant1: RevenuSalairesDeclarantDetail;
  declarant2: RevenuSalairesDeclarantDetail;
  indemnitesPrejudiceMoral: number;
  totalNetImposable: number;
  casesExclues: readonly string[];
}

/**
 * Abattement forfaitaire de 10 % (ou frais réels si plus favorables) d'un
 * déclarant, réutilisé par calculerRevenuExonereTauxEffectif.ts pour les
 * salaires exonérés retenus pour le calcul du taux effectif (même art. 83
 * CGI, même mécanique d'abattement).
 */
export function calculerDeclarant(
  remunerationsBrutes: number,
  abattementSpecifique: number,
  fraisReels: number | null,
): RevenuSalairesDeclarantDetail {
  const baseApresAbattementSpecifique = Math.max(0, remunerationsBrutes - abattementSpecifique);

  const abattementForfaitaire = baseApresAbattementSpecifique <= 0
    ? 0
    : Math.min(
        ABATTEMENT_PLAFOND,
        Math.max(ABATTEMENT_PLANCHER, baseApresAbattementSpecifique * ABATTEMENT_TAUX),
        baseApresAbattementSpecifique,
      );

  const utiliseFraisReels = fraisReels !== null && fraisReels > abattementForfaitaire;
  const deductionRetenue = utiliseFraisReels ? 'frais_reels' : 'abattement_forfaitaire';
  const deduction = utiliseFraisReels
    ? Math.min(fraisReels as number, baseApresAbattementSpecifique)
    : abattementForfaitaire;

  return {
    remunerationsBrutes,
    abattementSpecifique,
    baseApresAbattementSpecifique,
    fraisReels,
    abattementForfaitaire,
    deductionRetenue,
    netImposable: Math.max(0, baseApresAbattementSpecifique - deduction),
  };
}

/**
 * Revenu net imposable du cadre 1 "Traitements et salaires" (art. 82-83 CGI,
 * revenus 2025 / impôt 2026), limité aux cases actuellement saisissables.
 *
 * Pour chaque déclarant : rémunérations imposables soumises à abattement
 * (1AJ/1AA/1GF/1GG/1AP/1AG, et symétriques déclarant 2) moins l'abattement
 * spécifique 1GA/1HA (journalistes, assistants maternels...), puis déduction
 * du plus favorable entre l'abattement forfaitaire de 10 % (plancher 509 €,
 * plafond 14 555 €, jamais supérieur à la base) et les frais réels (1AK/1BK).
 *
 * 1PM/1QM (indemnités pour préjudice moral) sont ajoutées telles quelles : le
 * champ ne capture déjà que la fraction taxable au-delà d'1 M€, non soumise à
 * l'abattement forfaitaire.
 *
 * Cases hors calcul : voir CASES_SALAIRES_EXCLUES_DU_CALCUL.
 */
export function calculerRevenuSalaires(input: RevenusSalairesInput): RevenuSalairesResult {
  const remunerations1 = (input.case1aj ?? 0) + (input.case1aa ?? 0)
    + (input.case1gf ?? 0) + (input.case1gg ?? 0) + (input.case1ap ?? 0) + (input.case1ag ?? 0);
  const remunerations2 = (input.case1bj ?? 0) + (input.case1ba ?? 0)
    + (input.case1hf ?? 0) + (input.case1hg ?? 0) + (input.case1bp ?? 0) + (input.case1bg ?? 0);

  const declarant1 = calculerDeclarant(remunerations1, input.case1ga ?? 0, input.case1ak);
  const declarant2 = calculerDeclarant(remunerations2, input.case1ha ?? 0, input.case1bk);

  const indemnitesPrejudiceMoral = (input.case1pm ?? 0) + (input.case1qm ?? 0);

  return {
    declarant1,
    declarant2,
    indemnitesPrejudiceMoral,
    totalNetImposable: declarant1.netImposable + declarant2.netImposable + indemnitesPrejudiceMoral,
    casesExclues: CASES_SALAIRES_EXCLUES_DU_CALCUL,
  };
}
