import { RevenusSalairesInput } from './types';

const ABATTEMENT_TAUX = 0.10;
const ABATTEMENT_PLANCHER = 509;
const ABATTEMENT_PLAFOND = 14555;

/**
 * Plafond annuel d'exonération des heures supplémentaires/complémentaires et
 * de la monétisation des jours de repos/RTT (1GH/1HH, art. 81 quater CGI et
 * art. 5 LFR 2022), par personne (déclarant), tous employeurs confondus.
 * Vérifié visuellement sur la brochure DGFiP (IR 2026, revenus 2025, p.106) :
 * la fraction qui excède ce plafond est automatiquement réintégrée au salaire
 * imposable.
 */
const PLAFOND_EXONERATION_1GH = 7500;

/**
 * Cases du cadre 1 "Traitements et salaires" volontairement exclues du calcul
 * v1 : montants exonérés d'IR (n'entrent jamais dans le revenu imposable),
 * cases à cocher purement informatives sans montant propre (1AV/1BV, 1GK/1GL),
 * ou primes de partage de la valeur (1AD/1BD, traitées comme intégralement
 * exonérées faute d'avoir vérifié le mécanisme de surplus taxable au-delà du
 * seuil d'exonération). 1GB/1HB (associés et gérants art. 62 CGI) ne sont PAS
 * exclues : vérifié sur la brochure DGFiP (IR 2026, p.107) — « cette
 * déduction [de 10 %] est applicable à tous les revenus imposés selon les
 * règles des traitements et salaires » et le choix forfaitaire/frais réels
 * est « le même pour l'ensemble de ses activités » — 1GB/1HB ne relève
 * d'aucun régime distinct, elles rejoignent le pool standard ci-dessous.
 * 1AF/1BF (source étrangère, crédit d'impôt égal à l'impôt français) ne sont
 * PAS exclues non plus : même texte de la brochure — elles rejoignent le même
 * pool (plancher/plafond et choix 10 %/frais réels uniques par déclarant),
 * voir `revenuCreditImpotEgalImpotFrancais` ci-dessous pour l'isolement
 * proportionnel de leur part dans le revenu net imposable. 1GH/1HH (heures
 * supplémentaires/RTT exonérées) ne sont PAS exclues non plus : seule la
 * fraction sous le plafond de 7 500 €/personne est exonérée, le surplus
 * rejoint l'assiette imposable — voir son traitement dans
 * `calculerRevenuSalaires` ci-dessous.
 */
export const CASES_SALAIRES_EXCLUES_DU_CALCUL = [
  'case1pb', 'case1pc', // pourboires exonérés
  'case1ad', 'case1bd', // primes de partage de la valeur exonérées
  'case1av', 'case1bv', // majoration du seuil d'exonération de 1AD/1BD (sans effet ici : 1AD/1BD déjà traité comme intégralement exonéré)
  'case1dy', 'case1ey', // salariés impatriés, fraction exonérée
  'case1sm', 'case1dn', // sommes exonérées issues du CET
  'case1gk', 'case1gl', // "ne perçoit plus de salaires 1GB/1GF/1GG/1AG" — informatif (année suivante), aucun montant propre
  'case1aq', 'case1bq', // agents généraux d'assurance, salaires EXONÉRÉS (symétrique de 1GG/1HG, imposables)
] as const;

export interface RevenuSalairesDeclarantDetail {
  remunerationsBrutes: number;
  abattementSpecifique: number;
  baseApresAbattementSpecifique: number;
  fraisReels: number | null;
  abattementForfaitaire: number;
  deductionRetenue: 'frais_reels' | 'abattement_forfaitaire';
  netImposable: number;
  /**
   * Part de `netImposable` attribuable à 1AF/1BF (crédit d'impôt égal à
   * l'impôt français), isolée proportionnellement au sein du pool commun
   * (voir `calculerDeclarant`). Toujours 0 en dehors de
   * `calculerRevenuSalaires`.
   */
  netImposableCreditImpot: number;
}

export interface RevenuSalairesResult {
  declarant1: RevenuSalairesDeclarantDetail;
  declarant2: RevenuSalairesDeclarantDetail;
  indemnitesPrejudiceMoral: number;
  totalNetImposable: number;
  /**
   * 1AF/1BF (salaires de source étrangère avec crédit d'impôt égal à l'impôt
   * français) : abattement forfaitaire de 10 % standard (plancher/plafond),
   * SANS option frais réels — la brochure ne prévoit pas de case frais réels
   * dédiée à 1AF/1BF (seule 1AK/1BK existe, déjà utilisée pour le pool
   * 1AJ/1AA/1GF/1GG/1AP/1AG ci-dessus) ; hypothèse à documenter, pas une
   * lecture certaine de la brochure. N'entre PAS dans `totalNetImposable` :
   * traité séparément par `useFiscalOverview.ts`, sur le même principe que le
   * taux effectif (mathématiquement équivalent lorsque imputé avant réduction
   * outre-mer et décote — hypothèse retenue, voir docs/fiscalite.md).
   */
  revenuCreditImpotEgalImpotFrancais: number;
  casesExclues: readonly string[];
}

/**
 * Abattement forfaitaire de 10 % (ou frais réels si plus favorables) d'un
 * déclarant, réutilisé par calculerRevenuExonereTauxEffectif.ts pour les
 * salaires exonérés retenus pour le calcul du taux effectif (même art. 83
 * CGI, même mécanique d'abattement).
 *
 * `remunerationsCreditImpot` (1AF/1BF, par défaut 0) rejoint la même base
 * que `remunerationsBrutes` pour le calcul du plancher/plafond et du choix
 * 10 %/frais réels (brochure DGFiP IR 2026 p.107 : mécanisme unique « pour
 * l'ensemble de ses activités » imposées selon les règles des traitements et
 * salaires) ; sa part dans `netImposable` est ensuite isolée
 * proportionnellement dans `netImposableCreditImpot`, pour permettre à
 * `calculerRevenuSalaires` de l'exclure du revenu imposable France tout en
 * la transmettant séparément au mécanisme du crédit d'impôt.
 */
export function calculerDeclarant(
  remunerationsBrutes: number,
  abattementSpecifique: number,
  fraisReels: number | null,
  remunerationsCreditImpot = 0,
): RevenuSalairesDeclarantDetail {
  const baseApresAbattementSpecifique = Math.max(0, remunerationsBrutes - abattementSpecifique);
  const baseTotale = baseApresAbattementSpecifique + remunerationsCreditImpot;

  const abattementForfaitaire = baseTotale <= 0
    ? 0
    : Math.min(
        ABATTEMENT_PLAFOND,
        Math.max(ABATTEMENT_PLANCHER, baseTotale * ABATTEMENT_TAUX),
        baseTotale,
      );

  const utiliseFraisReels = fraisReels !== null && fraisReels > abattementForfaitaire;
  const deductionRetenue = utiliseFraisReels ? 'frais_reels' : 'abattement_forfaitaire';
  const deduction = utiliseFraisReels
    ? Math.min(fraisReels as number, baseTotale)
    : abattementForfaitaire;

  const netTotal = Math.max(0, baseTotale - deduction);
  const ratioCreditImpot = baseTotale > 0 ? remunerationsCreditImpot / baseTotale : 0;
  const netImposableCreditImpot = netTotal * ratioCreditImpot;

  return {
    remunerationsBrutes,
    abattementSpecifique,
    baseApresAbattementSpecifique,
    fraisReels,
    abattementForfaitaire,
    deductionRetenue,
    netImposable: netTotal - netImposableCreditImpot,
    netImposableCreditImpot,
  };
}

/**
 * Revenu net imposable du cadre 1 "Traitements et salaires" (art. 82-83 CGI,
 * revenus 2025 / impôt 2026), limité aux cases actuellement saisissables.
 *
 * Pour chaque déclarant : rémunérations imposables soumises à abattement
 * (1AJ/1AA/1GF/1GG/1AP/1AG/1GB, et symétriques déclarant 2 — 1GB/1HB, associés
 * et gérants art. 62 CGI, ne relèvent d'aucun régime distinct, brochure DGFiP
 * IR 2026 p.107), auxquelles s'ajoute la fraction de 1GH/1HH qui excède le
 * plafond d'exonération de 7 500 €/personne (heures supplémentaires/
 * complémentaires et RTT monétisés, art. 81 quater CGI — vérifié brochure
 * DGFiP, voir PLAFOND_EXONERATION_1GH), moins l'abattement spécifique 1GA/1HA
 * (journalistes, assistants maternels...), puis déduction du plus favorable
 * entre l'abattement forfaitaire de 10 % (plancher 509 €, plafond 14 555 €,
 * jamais supérieur à la base) et les frais réels (1AK/1BK).
 *
 * 1PM/1QM (indemnités pour préjudice moral) sont ajoutées telles quelles : le
 * champ ne capture déjà que la fraction taxable au-delà d'1 M€, non soumise à
 * l'abattement forfaitaire.
 *
 * 1AF/1BF (crédit d'impôt égal à l'impôt français) rejoignent le même pool
 * que les rémunérations ci-dessus (plancher/plafond et choix 10 %/frais
 * réels uniques par déclarant, brochure DGFiP IR 2026 p.107) : leur part dans
 * le revenu net imposable est isolée proportionnellement par
 * `calculerDeclarant` et exposée dans `revenuCreditImpotEgalImpotFrancais`,
 * qui n'entre pas dans `totalNetImposable`.
 *
 * Cases hors calcul : voir CASES_SALAIRES_EXCLUES_DU_CALCUL.
 */
export function calculerRevenuSalaires(input: RevenusSalairesInput): RevenuSalairesResult {
  const surplus1gh = Math.max(0, (input.case1gh ?? 0) - PLAFOND_EXONERATION_1GH);
  const surplus1hh = Math.max(0, (input.case1hh ?? 0) - PLAFOND_EXONERATION_1GH);

  const remunerations1 = (input.case1aj ?? 0) + (input.case1aa ?? 0)
    + (input.case1gf ?? 0) + (input.case1gg ?? 0) + (input.case1ap ?? 0) + (input.case1ag ?? 0)
    + (input.case1gb ?? 0)
    + surplus1gh;
  const remunerations2 = (input.case1bj ?? 0) + (input.case1ba ?? 0)
    + (input.case1hf ?? 0) + (input.case1hg ?? 0) + (input.case1bp ?? 0) + (input.case1bg ?? 0)
    + (input.case1hb ?? 0)
    + surplus1hh;

  const declarant1 = calculerDeclarant(remunerations1, input.case1ga ?? 0, input.case1ak, input.case1af ?? 0);
  const declarant2 = calculerDeclarant(remunerations2, input.case1ha ?? 0, input.case1bk, input.case1bf ?? 0);

  const indemnitesPrejudiceMoral = (input.case1pm ?? 0) + (input.case1qm ?? 0);

  const revenuCreditImpotEgalImpotFrancais = declarant1.netImposableCreditImpot + declarant2.netImposableCreditImpot;

  return {
    declarant1,
    declarant2,
    indemnitesPrejudiceMoral,
    totalNetImposable: declarant1.netImposable + declarant2.netImposable + indemnitesPrejudiceMoral,
    revenuCreditImpotEgalImpotFrancais,
    casesExclues: CASES_SALAIRES_EXCLUES_DU_CALCUL,
  };
}
