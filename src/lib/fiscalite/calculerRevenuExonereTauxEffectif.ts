import { RevenusExoneresTauxEffectifInput } from './types';

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
 * Revenus exonérés retenus pour le calcul du taux effectif (salaires et
 * pensions de source étrangère exonérés par convention fiscale, ou art. 81 A
 * CGI pour les détachés) : jamais imposés en France, mais utilisés en aval
 * par calculerImpot.ts pour majorer le taux appliqué au revenu français
 * (progressivité préservée).
 *
 * Salaires (1AC/1BC, avec frais réels 1AE/1BE) : `salairesNetImposablesExoneresTauxEffectif`
 * doit provenir de `calculerRevenuSalaires`, qui met 1AC/1AE en commun avec le
 * pool 1AJ/1AK du même déclarant — le choix 10 %/frais réels (art. 83 CGI) est
 * unique par déclarant pour l'ensemble de ses traitements et salaires, qu'ils
 * soient imposables en France ou seulement retenus pour le taux effectif.
 * Cette fonction ne fait que reprendre ce montant déjà arbitré.
 *
 * Pensions étrangères (1AH/1BH) : `pensionsNettesExonereesTauxEffectif` doit
 * provenir de `calculerPensionsRetraitesRentes`, qui met 1AH/1BH dans le même
 * pool d'abattement de 10 % que les pensions imposables — plafond de 4 439 €
 * unique pour tout le foyer (art. 158-5-a CGI). Cette fonction ne fait que
 * reprendre ce montant déjà arbitré.
 *
 * 1GE/1HE (case à cocher marins-pêcheurs) et RSE/RSF (pays de provenance,
 * texte libre) sont purement informatifs, sans effet sur ce calcul.
 */
export function calculerRevenuExonereTauxEffectif(
  input: RevenusExoneresTauxEffectifInput,
  salairesNetImposablesExoneresTauxEffectif: number,
  pensionsNettesExonereesTauxEffectif: number,
): RevenuExonereTauxEffectifResult {
  const salairesNetImposables = salairesNetImposablesExoneresTauxEffectif;

  const pensionsBrutes = (input.case1ah ?? 0) + (input.case1bh ?? 0);
  const pensionsNettes = pensionsNettesExonereesTauxEffectif;
  const abattementPension = pensionsBrutes - pensionsNettes;

  return {
    salairesNetImposables,
    pensionsBrutes,
    abattementPension,
    pensionsNettes,
    totalRetenu: salairesNetImposables + pensionsNettes,
    casesExclues: CASES_EXONERES_TAUX_EFFECTIF_EXCLUES_DU_CALCUL,
  };
}
