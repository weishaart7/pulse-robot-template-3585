import { PensionsRetraitesRentesInput, RevenusExoneresTauxEffectifInput } from './types';
import { PARAMETRES_PAR_DEFAUT, type ParametresFiscaux } from './parametres';

type AbattementPensions = ParametresFiscaux['abattementsDixPourCent']['pensions'];

const PENSION_ABATTEMENT_TAUX = 0.10;
/**
 * Plafond global par foyer de l'abattement de 10 % sur les pensions (art. 158-5-a CGI), commun à toutes
 * les pensions du foyer y compris 1AH — millésime par défaut (projections retraite).
 */
export const PENSION_ABATTEMENT_PLAFOND_FOYER = PARAMETRES_PAR_DEFAUT.abattementsDixPourCent.pensions.plafondFoyer;

/**
 * Abattement de 10 % sur une pension (plancher 454 €, jamais supérieur à la
 * pension elle-même). Le plafond de 4 439 € s'applique globalement à la somme
 * des abattements du foyer, pas par pensionné — appliqué séparément sur le
 * total par l'appelant (voir calculerPensionsRetraitesRentes ci-dessous).
 */
export function abattementPensionDeclarant(
  pension: number,
  abattement: AbattementPensions = PARAMETRES_PAR_DEFAUT.abattementsDixPourCent.pensions,
): number {
  if (pension <= 0) return 0;
  // Arrondi à l'euro le plus proche, comme le simulateur officiel 2026 (1AS 10 007 € → net 9 006 €).
  return Math.round(Math.min(pension, Math.max(abattement.plancher, pension * PENSION_ABATTEMENT_TAUX)));
}

type PensionsExonerees = Pick<RevenusExoneresTauxEffectifInput, 'case1ah' | 'case1bh' | 'case1ch' | 'case1dh'>;

const PENSIONS_EXONEREES_VIDES: PensionsExonerees = {
  case1ah: null,
  case1bh: null,
};

/** Option pour l'imposition forfaitaire des pensions de retraite en capital (1AT), art. 163 bis CGI. */
const CAPITAL_RETRAITE_ABATTEMENT_TAUX = 0.10; // spécifique à 1AT, non plafonné (distinct de l'abattement pension classique)
const CAPITAL_RETRAITE_TAUX_FORFAITAIRE = 0.075;

/**
 * Fraction imposable d'une rente viagère à titre onéreux selon l'âge d'entrée
 * en jouissance (art. 158-6 CGI), vérifiée sur la brochure DGFiP (2042-K,
 * revenus 2025, page 119 ; exemples chiffrés page 120). Exportée : réutilisée telle
 * quelle par calculerPrelevementsSociauxPensionsRetraitesRentes.ts (même
 * fraction imposable, seul le taux appliqué diffère entre IR et PS).
 */
export const FRACTION_IMPOSABLE_RENTE = {
  moins50: 0.70,
  de50a59: 0.50,
  de60a69: 0.40,
  aPartirDe70: 0.30,
} as const;

/**
 * Cases exclues du calcul : 1HK/1HL sont purement informatives. 1AL (pensions
 * étrangères) ouvre droit à un crédit d'impôt égal à l'impôt français, traité
 * séparément (voir `revenuCreditImpotEgalImpotFrancais` ci-dessous) ; les rentes
 * étrangères 1AR…1DR n'y ouvrent pas droit sur le simulateur officiel 2026.
 */
export const CASES_PENSIONS_EXCLUES_DU_CALCUL = [
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
  /**
   * Pensions (1AL/1BL) et rentes viagères (1AR/1BR/1CR/1DR) perçues par des
   * non-résidents ou de source étrangère, ouvrant droit à un crédit d'impôt
   * égal à l'impôt français — net d'imposition isolé proportionnellement au
   * sein du pool d'abattement commun pour 1AL/1BL (voir plus bas), fraction
   * par tranche d'âge sans abattement pour 1AR (comme 1AW), n'entre PAS dans
   * `totalNetImposable`. Traité par
   * `useFiscalOverview.ts` sur le même principe que le taux effectif
   * (mathématiquement équivalent lorsque imputé avant réduction outre-mer et
   * décote — hypothèse retenue, voir docs/fiscalite.md).
   */
  revenuCreditImpotEgalImpotFrancais: number;
  /** Fraction imposable de 1AR…1DR ouvrant droit au crédit (revenus 2026), comprise dans la ligne précédente. */
  rentesCreditImpotFrancais: number;
  /**
   * Part nette de 1AH/1BH (pensions exonérées retenues pour le taux effectif),
   * isolée proportionnellement au sein du pool d'abattement commun — reprise
   * telle quelle par `calculerRevenuExonereTauxEffectif`. N'entre PAS dans
   * `totalNetImposable`.
   */
  pensionsExonereesTauxEffectifNettes: number;
  /** 1AT/1BT après abattement de 10 % (non plafonné), retenus au RFR (art. 1417 IV c, art. 163 bis II). */
  revenuExonereRetenuPourRFR: number;
  casesExclues: readonly string[];
}

/**
 * Revenu net imposable et impôt forfaitaire du cadre 1 « Pensions, retraites,
 * rentes » (art. 79, 81, 158-5 CGI ; BOI-RSA-PENS), revenus 2025/impôt 2026 —
 * trois mécanismes distincts, vérifiés sur la brochure DGFiP (2042-K, pages
 * 115-120) :
 *
 * 1. **Abattement de 10 % classique** (art. 158-5-a CGI) : s'applique au
 *    total de 1AS/1AZ/1AO/1AM **et 1AL** (pensions/retraites/rentes, pensions
 *    d'invalidité, pensions alimentaires perçues, autres pensions
 *    étrangères, pensions étrangères avec crédit d'impôt — brochure DGFiP IR
 *    2026 p.117, texte explicite), par déclarant puis somme — même calcul
 *    que 1AH dans `calculerRevenuExonereTauxEffectif.ts` (plancher 454 €/
 *    pensionné, plafond global 4 439 €/foyer, réutilisé tel quel), mais avec
 *    1AL/1BL réintégrées dans la même base avant application du plancher/
 *    plafond (voir plus bas).
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
 * 1AL/1BL (pensions non-résidents/source étrangère) et 1AR/1BR/1CR/1DR
 * (rentes non-résidents/source étrangère), qui ouvrent droit à un crédit
 * d'impôt égal à l'impôt français, sont calculées séparément
 * (`revenuCreditImpotEgalImpotFrancais`) : 1AR comme 1AW (fraction par
 * tranche d'âge, sans abattement) ; 1AL/1BL rejoint le **même pool** que
 * 1AS/1AZ/1AO/1AM pour le calcul de l'abattement (brochure DGFiP IR 2026,
 * p.117, texte explicite : « l'abattement de 10 % est appliqué
 * automatiquement au total des sommes portées lignes 1AS à 1DS, 1AZ à 1DZ,
 * 1AO à 1DO, 1AL à 1DL et 1AM à 1DM »), avec un plafond de 4 439 € unique
 * pour tout le foyer — pas un second plafond indépendant. Sa part dans le
 * résultat net est ensuite isolée proportionnellement (même technique que
 * 1AF dans `calculerRevenuSalaires.ts`). N'entrent PAS dans
 * `totalNetImposable`.
 *
 * 1AH/1BH (pensions exonérées retenues pour le taux effectif, saisies dans
 * l'encart « revenus exonérés ») rejoignent aussi ce pool : l'abattement de
 * l'art. 158-5-a CGI est unique pour toutes les pensions du foyer, les
 * revenus retenus pour le taux effectif étant déterminés selon les règles de
 * droit commun — un second plafond de 4 439 € pour 1AH surestimerait
 * l'abattement. Le plafond est imputé d'abord sur les pensions imposables :
 * 1AH/1BH ne reçoivent que le reliquat (abattement calculé sur le total moins
 * abattement des seules pensions imposables, simulateur officiel 2026 et
 * 2027). Leur part nette (`pensionsExonereesTauxEffectifNettes`) n'entre PAS
 * dans `totalNetImposable`.
 *
 * Cases hors calcul : voir CASES_PENSIONS_EXCLUES_DU_CALCUL.
 */
export function calculerPensionsRetraitesRentes(
  input: PensionsRetraitesRentesInput,
  pensionsExonerees: PensionsExonerees = PENSIONS_EXONEREES_VIDES,
  parametres: ParametresFiscaux = PARAMETRES_PAR_DEFAUT,
): PensionsRetraitesRentesResult {
  const abattement = parametres.abattementsDixPourCent.pensions;
  const pensionDeclarant1 = (input.case1as ?? 0) + (input.case1az ?? 0) + (input.case1ao ?? 0) + (input.case1am ?? 0);
  const pensionDeclarant2 = (input.case1bs ?? 0) + (input.case1bz ?? 0) + (input.case1bo ?? 0) + (input.case1bm ?? 0);
  // Personnes à charge (jumelles 1CS/1CZ/1CO/1CM ↔ 1AS/1AZ/1AO/1AM, 1CH ↔ 1AH) : abattement de 10 %
  // propre, mais le plafond de 4 439 € reste commun à tout le foyer (simulateur officiel 2026).
  const pensionPac1 = (input.case1cs ?? 0) + (input.case1cz ?? 0) + (input.case1co ?? 0) + (input.case1cm ?? 0);
  const pensionPac2 = (input.case1ds ?? 0) + (input.case1dz ?? 0) + (input.case1do ?? 0) + (input.case1dm ?? 0);
  const pensionsBrutes = pensionDeclarant1 + pensionDeclarant2 + pensionPac1 + pensionPac2;

  const pensionEtrangere1 = input.case1al ?? 0;
  const pensionEtrangere2 = input.case1bl ?? 0;
  // Bases imposables (1AL compris) et exonérées (1AH…1DH) par personne : D1, D2, PAC 1, PAC 2.
  // 1CL/1DL : pensions étrangères des personnes à charge, jumelles de 1AL/1BL (simulateur officiel 2026 et 2027).
  const etrangeres = [pensionEtrangere1, pensionEtrangere2, input.case1cl ?? 0, input.case1dl ?? 0];
  const imposables = [pensionDeclarant1, pensionDeclarant2, pensionPac1, pensionPac2].map((b, i) => b + etrangeres[i]);
  const exonerees = [pensionsExonerees.case1ah, pensionsExonerees.case1bh, pensionsExonerees.case1ch, pensionsExonerees.case1dh]
    .map(v => Math.max(0, v ?? 0));
  // Plafond foyer imputé d'abord sur les pensions imposables ; les pensions exonérées retenues pour le
  // taux effectif ne reçoivent que le reliquat (abattement sur le total moins abattement sur l'imposable,
  // simulateur officiel 2026 et 2027 : 1AS 40 000 + 1AH 10 000 → 1AH retenu 9 561, pas 8 448).
  const abattementsImposables = imposables.map(b => abattementPensionDeclarant(b, abattement));
  const sommeAbattementsImposables = abattementsImposables.reduce((t, v) => t + v, 0);
  const abattementImposable = Math.min(abattement.plafondFoyer, sommeAbattementsImposables);
  // Plafond atteint sur le total : réparti au prorata entre l'ensemble des pensions imposables et
  // l'ensemble des pensions exonérées du foyer, chaque part arrondie à l'euro, 0,50 vers le bas
  // (simulateur officiel 2026 : 1AS 25 000 + 1AH 25 000 → 2 219 + 2 219 = 4 438 €, RFR 45 562 ;
  // 1AS 20 000 + 1AH 30 000 → 1 776 + 2 663 = 4 439 €). Écart connu de 1 € quand les parts tombent
  // sur un tiers (1AS 15 000 + 1AH 15 000 + 1BH 15 000 : 4 438 € au simulateur, 4 439 € ici).
  const abattementsTotaux = imposables.map((b, i) => abattementPensionDeclarant(b + exonerees[i], abattement));
  const sommeAbattementsTotaux = abattementsTotaux.reduce((t, v) => t + v, 0);
  const arrondiDemiBas = (v: number) => Math.ceil(Math.round(v * 1e6) / 1e6 - 0.5);
  const partExoneree = abattementsTotaux
    .reduce((t, a, i) => t + (imposables[i] + exonerees[i] > 0 ? a * exonerees[i] / (imposables[i] + exonerees[i]) : 0), 0);
  const abattementTotal = sommeAbattementsTotaux <= abattement.plafondFoyer
    ? sommeAbattementsTotaux
    : arrondiDemiBas(abattement.plafondFoyer * (sommeAbattementsTotaux - partExoneree) / sommeAbattementsTotaux)
      + arrondiDemiBas(abattement.plafondFoyer * partExoneree / sommeAbattementsTotaux);
  // Sans plancher à 0 : l'arrondi des parts peut laisser −1 € (simulateur officiel 2026 : 1AS 44 390 +
  // 1AH 44 390 → 1AH retenu 44 391, RFR 84 342).
  const abattementExonere = abattementTotal - abattementImposable;
  const facteurPlafond = sommeAbattementsImposables > 0 ? abattementImposable / sommeAbattementsImposables : 0;

  const netsImposables = imposables.map((b, i) => b - abattementsImposables[i] * facteurPlafond);
  const pensionEtrangereNette = netsImposables
    .reduce((t, net, i) => t + (imposables[i] > 0 ? net * etrangeres[i] / imposables[i] : 0), 0);
  const pensionsNettes = netsImposables.reduce((t, net) => t + net, 0) - pensionEtrangereNette;
  const totalExonere = exonerees.reduce((t, v) => t + v, 0);
  const pensionsExonereesTauxEffectifNettes = Math.max(0, totalExonere - abattementExonere);
  const abattementPension = pensionsBrutes - pensionsNettes;

  const capitalPER = (input.case1ai ?? 0) + (input.case1bi ?? 0) + (input.case1ci ?? 0) + (input.case1di ?? 0);

  const rentesViageresImposables = (input.case1aw ?? 0) * FRACTION_IMPOSABLE_RENTE.moins50
    + (input.case1bw ?? 0) * FRACTION_IMPOSABLE_RENTE.de50a59
    + (input.case1cw ?? 0) * FRACTION_IMPOSABLE_RENTE.de60a69
    + (input.case1dw ?? 0) * FRACTION_IMPOSABLE_RENTE.aPartirDe70;

  const rentesEtrangeresImposables = (input.case1ar ?? 0) * FRACTION_IMPOSABLE_RENTE.moins50
    + (input.case1br ?? 0) * FRACTION_IMPOSABLE_RENTE.de50a59
    + (input.case1cr ?? 0) * FRACTION_IMPOSABLE_RENTE.de60a69
    + (input.case1dr ?? 0) * FRACTION_IMPOSABLE_RENTE.aPartirDe70;
  // Rentes étrangères 1AR…1DR : imposées comme 1AW, sans crédit (simulateur officiel 2026) ; à partir des
  // revenus 2026, fraction imposable ouvrant droit au crédit égal à l'impôt français, tenue hors de la base
  // comme 1AL (calc-2027 : crédit au prorata, accordé si 8TK égale le montant brut).
  const rentesCreditImpotFrancais = parametres.reductionsCredits.rentesCreditImpotFrancais ? rentesEtrangeresImposables : 0;
  const totalNetImposable = pensionsNettes + capitalPER + rentesViageresImposables + rentesEtrangeresImposables
    - rentesCreditImpotFrancais;

  const capitalRetraite = (input.case1at ?? 0) + (input.case1bt ?? 0) + (input.case1ct ?? 0) + (input.case1dt ?? 0);
  const impotForfaitaire = capitalRetraite * (1 - CAPITAL_RETRAITE_ABATTEMENT_TAUX) * CAPITAL_RETRAITE_TAUX_FORFAITAIRE;


  // Rentes 1AR…1DR : sans crédit pour les revenus 2025 (simulateur officiel 2026 : 1AR 5 000 € → impôt
  // inchangé quel que soit 8TK), avec crédit à partir des revenus 2026.
  const revenuCreditImpotEgalImpotFrancais = pensionEtrangereNette + rentesCreditImpotFrancais;

  return {
    pensionsBrutes,
    abattementPension,
    pensionsNettes,
    capitalPER,
    rentesViageresImposables,
    totalNetImposable,
    impotForfaitaire,
    revenuExonereRetenuPourRFR: capitalRetraite * (1 - CAPITAL_RETRAITE_ABATTEMENT_TAUX),
    revenuCreditImpotEgalImpotFrancais,
    rentesCreditImpotFrancais,
    pensionsExonereesTauxEffectifNettes,
    casesExclues: CASES_PENSIONS_EXCLUES_DU_CALCUL,
  };
}
