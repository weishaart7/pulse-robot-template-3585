import { calculerDeclarant } from './calculerRevenuSalaires';
import { RevenusExoneresTauxEffectifInput } from './types';

export interface RevenuExonereTauxEffectifResult {
  salairesNetImposables: number;
  pensionsBrutes: number;
  totalRetenu: number;
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
 * Pensions étrangères (1AH/1BH) : ajoutées **brutes, sans abattement** — le
 * repo ne modélise aucune pension française et donc aucun abattement pension
 * calibré (plancher/plafond distincts du régime salaires) ; simplification
 * documentée qui surestime légèrement le taux effectif (voir docs/fiscalite.md).
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

  return {
    salairesNetImposables,
    pensionsBrutes,
    totalRetenu: salairesNetImposables + pensionsBrutes,
  };
}
