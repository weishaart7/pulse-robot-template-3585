import { abattementPensionDeclarant, PENSION_ABATTEMENT_PLAFOND_FOYER } from './calculerRevenuExonereTauxEffectif';
import { PensionsRetraitesRentesInput } from './types';

/** Option pour l'imposition forfaitaire des pensions de retraite en capital (1AT), art. 163 bis CGI. */
const CAPITAL_RETRAITE_ABATTEMENT_TAUX = 0.10; // spécifique à 1AT, non plafonné (distinct de l'abattement pension classique)
const CAPITAL_RETRAITE_TAUX_FORFAITAIRE = 0.075;

/**
 * Fraction imposable d'une rente viagère à titre onéreux selon l'âge d'entrée
 * en jouissance (art. 158-6 CGI), vérifiée sur la brochure DGFiP (2042-K,
 * revenus 2025, page 120, exemples chiffrés).
 */
const FRACTION_IMPOSABLE_RENTE = {
  moins50: 0.70,
  de50a59: 0.50,
  de60a69: 0.40,
  aPartirDe70: 0.30,
} as const;

/**
 * Cases exclues du calcul : 1AL (pensions étrangères) et 1AR (rentes
 * étrangères) ouvrent droit à un crédit d'impôt égal à l'impôt français —
 * mécanisme non implémenté dans le repo (même famille que 1AF/1GB dans
 * calculerRevenuSalaires.ts) ; les inclure sans le crédit compensateur
 * surestimerait l'IR. 1HK/1HL sont purement informatives.
 */
export const CASES_PENSIONS_EXCLUES_DU_CALCUL = [
  'case1al', 'case1bl',
  'case1ar', 'case1br', 'case1cr', 'case1dr',
  'case1hk', 'case1hl',
] as const;

export interface PensionsRetraitesRentesResult {
  pensionsBrutes: number;
  abattementPension: number;
  pensionsNettes: number;
  capitalPER: number;
  rentesViageresImposables: number;
  totalNetImposable: number;
  impotForfaitaire: number;
  casesExclues: readonly string[];
}

/**
 * Revenu net imposable et impôt forfaitaire du cadre 1 « Pensions, retraites,
 * rentes » (art. 79, 81, 158-5 CGI ; BOI-RSA-PENS), revenus 2025/impôt 2026 —
 * trois mécanismes distincts, vérifiés sur la brochure DGFiP (2042-K, pages
 * 115-120) :
 *
 * 1. **Abattement de 10 % classique** (art. 158-5-a CGI) : s'applique au
 *    total de 1AS/1AZ/1AO/1AM (pensions/retraites/rentes, pensions
 *    d'invalidité, pensions alimentaires perçues, autres pensions
 *    étrangères), par déclarant puis somme — même calcul que 1AH dans
 *    `calculerRevenuExonereTauxEffectif.ts` (plancher 454 €/pensionné,
 *    plafond global 4 439 €/foyer), réutilisé tel quel.
 * 2. **1AI (capital des plans d'épargne retraite)** : imposable au barème
 *    « sans abattement » (brochure DGFiP, texte explicite) — s'ajoute au
 *    revenu net imposable sans passer par l'abattement de 10 %.
 * 3. **1AT (pensions de retraite en capital, option art. 163 bis CGI)** :
 *    régime à part, hors barème — capital diminué d'un abattement
 *    spécifique de 10 % non plafonné (distinct de l'abattement classique),
 *    puis taxé à un taux forfaitaire de 7,5 %. Même famille que
 *    `impotForfaitaire` dans `calculerGainsActionnariatSalarie.ts`.
 *
 * Rentes viagères à titre onéreux (1AW) : fraction imposable selon l'âge
 * d'entrée en jouissance (art. 158-6 CGI : 70 % avant 50 ans, 50 % de 50 à
 * 59 ans, 40 % de 60 à 69 ans, 30 % à partir de 70 ans), incluse dans le
 * revenu net imposable au barème — **sans** l'abattement de 10 % classique
 * (mécanismes distincts et exclusifs l'un de l'autre).
 *
 * Cases hors calcul : voir CASES_PENSIONS_EXCLUES_DU_CALCUL.
 */
export function calculerPensionsRetraitesRentes(
  input: PensionsRetraitesRentesInput,
): PensionsRetraitesRentesResult {
  const pensionDeclarant1 = (input.case1as ?? 0) + (input.case1az ?? 0) + (input.case1ao ?? 0) + (input.case1am ?? 0);
  const pensionDeclarant2 = (input.case1bs ?? 0) + (input.case1bz ?? 0) + (input.case1bo ?? 0) + (input.case1bm ?? 0);
  const pensionsBrutes = pensionDeclarant1 + pensionDeclarant2;

  const abattementPension = Math.min(
    PENSION_ABATTEMENT_PLAFOND_FOYER,
    abattementPensionDeclarant(pensionDeclarant1) + abattementPensionDeclarant(pensionDeclarant2),
  );
  const pensionsNettes = Math.max(0, pensionsBrutes - abattementPension);

  const capitalPER = (input.case1ai ?? 0) + (input.case1bi ?? 0);

  const rentesViageresImposables = (input.case1aw ?? 0) * FRACTION_IMPOSABLE_RENTE.moins50
    + (input.case1bw ?? 0) * FRACTION_IMPOSABLE_RENTE.de50a59
    + (input.case1cw ?? 0) * FRACTION_IMPOSABLE_RENTE.de60a69
    + (input.case1dw ?? 0) * FRACTION_IMPOSABLE_RENTE.aPartirDe70;

  const totalNetImposable = pensionsNettes + capitalPER + rentesViageresImposables;

  const capitalRetraite = (input.case1at ?? 0) + (input.case1bt ?? 0);
  const impotForfaitaire = capitalRetraite * (1 - CAPITAL_RETRAITE_ABATTEMENT_TAUX) * CAPITAL_RETRAITE_TAUX_FORFAITAIRE;

  return {
    pensionsBrutes,
    abattementPension,
    pensionsNettes,
    capitalPER,
    rentesViageresImposables,
    totalNetImposable,
    impotForfaitaire,
    casesExclues: CASES_PENSIONS_EXCLUES_DU_CALCUL,
  };
}
