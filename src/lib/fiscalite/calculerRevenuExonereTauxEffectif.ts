import { calculerDeclarant } from './calculerRevenuSalaires';
import { RevenusExoneresTauxEffectifInput } from './types';

const PENSION_ABATTEMENT_TAUX = 0.10;
const PENSION_ABATTEMENT_PLANCHER = 454;
/** Plafond global par foyer de l'abattement de 10 % sur les pensions (art. 158-5-a CGI), réutilisé par calculerPensionsRetraitesRentes.ts. */
export const PENSION_ABATTEMENT_PLAFOND_FOYER = 4439;

/**
 * Cases purement informatives de cet encart, sans effet sur le calcul (voir
 * JSDoc de calculerRevenuExonereTauxEffectif) — pattern identique à
 * CASES_SALAIRES_EXCLUES_DU_CALCUL / CASES_GAINS_ACTIONNARIAT_EXCLUES_DU_CALCUL.
 */
export const CASES_EXONERES_TAUX_EFFECTIF_EXCLUES_DU_CALCUL = [
  'case1ge', 'case1he', // case à cocher marins-pêcheurs hors eaux territoriales
  'caseRse', 'caseRsf', // pays de provenance des revenus de source étrangère (texte libre)
] as const;

export interface RevenuExonereTauxEffectifResult {
  salairesNetImposables: number;
  pensionsBrutes: number;
  abattementPension: number;
  pensionsNettes: number;
  totalRetenu: number;
  casesExclues: readonly string[];
}

/**
 * Abattement de 10 % sur une pension (plancher 454 €, jamais supérieur à la
 * pension elle-même). Le plafond de 4 439 € s'applique globalement à la somme
 * des abattements du foyer, pas par pensionné — appliqué séparément sur le
 * total par l'appelant (voir calculerRevenuExonereTauxEffectif ci-dessous et
 * calculerPensionsRetraitesRentes.ts, même calcul réutilisé).
 */
export function abattementPensionDeclarant(pension: number): number {
  if (pension <= 0) return 0;
  return Math.min(pension, Math.max(PENSION_ABATTEMENT_PLANCHER, pension * PENSION_ABATTEMENT_TAUX));
}

/**
 * Revenus exonérés retenus pour le calcul du taux effectif (salaires et
 * pensions de source étrangère exonérés par convention fiscale, ou art. 81 A
 * CGI pour les détachés) : jamais imposés en France, mais utilisés en aval
 * par calculerImpot.ts pour majorer le taux appliqué au revenu français
 * (progressivité préservée).
 *
 * Salaires (1AC/1BC) : même abattement 10 %/frais réels (1AE/1BE) que
 * calculerRevenuSalaires.ts (même art. 83 CGI).
 *
 * Pensions étrangères (1AH/1BH) : abattement de 10 % (plancher 454 €/pensionné,
 * plafond global 4 439 € pour l'ensemble du foyer, revenus 2025/impôt 2026 —
 * même barème que les pensions françaises, la nature étrangère de la pension
 * n'y change rien pour le calcul du taux effectif).
 *
 * 1GE/1HE (case à cocher marins-pêcheurs) et RSE/RSF (pays de provenance,
 * texte libre) sont purement informatifs, sans effet sur ce calcul.
 */
export function calculerRevenuExonereTauxEffectif(
  input: RevenusExoneresTauxEffectifInput,
): RevenuExonereTauxEffectifResult {
  const declarant1 = calculerDeclarant(input.case1ac ?? 0, 0, input.case1ae);
  const declarant2 = calculerDeclarant(input.case1bc ?? 0, 0, input.case1be);
  const salairesNetImposables = declarant1.netImposable + declarant2.netImposable;

  const pensionsBrutes = (input.case1ah ?? 0) + (input.case1bh ?? 0);
  const abattementPension = Math.min(
    PENSION_ABATTEMENT_PLAFOND_FOYER,
    abattementPensionDeclarant(input.case1ah ?? 0) + abattementPensionDeclarant(input.case1bh ?? 0),
  );
  const pensionsNettes = Math.max(0, pensionsBrutes - abattementPension);

  return {
    salairesNetImposables,
    pensionsBrutes,
    abattementPension,
    pensionsNettes,
    totalRetenu: salairesNetImposables + pensionsNettes,
    casesExclues: CASES_EXONERES_TAUX_EFFECTIF_EXCLUES_DU_CALCUL,
  };
}
