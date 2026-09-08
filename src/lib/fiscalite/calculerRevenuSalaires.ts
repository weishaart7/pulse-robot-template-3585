import { RevenusExoneresTauxEffectifInput, RevenusSalairesInput } from './types';

/** Sous-ensemble de `RevenusExoneresTauxEffectifInput` utile au pool 1AJ/1AC par déclarant. */
export type RevenusExoneresPourPoolSalaires = Pick<
  RevenusExoneresTauxEffectifInput,
  'case1ac' | 'case1bc' | 'case1ae' | 'case1be'
>;

/**
 * Combine les frais réels du salaire France (1AK/1BK) et ceux du salaire
 * exonéré retenu pour le taux effectif (1AE/1BE) : même choix, même
 * déclarant (voir JSDoc de `calculerDeclarant`). `null` uniquement si aucun
 * des deux n'est renseigné (le contribuable n'opte pas pour les frais réels).
 */
function combinerFraisReels(fraisReelsSalaire: number | null, fraisReelsExonere: number | null): number | null {
  if (fraisReelsSalaire === null && fraisReelsExonere === null) return null;
  return (fraisReelsSalaire ?? 0) + (fraisReelsExonere ?? 0);
}

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
 * Plafond annuel d'exonération de la prime de partage de la valeur (1AD/1BD,
 * loi n° 2022-1158), par personne, tous employeurs confondus. Porté à
 * PLAFOND_EXONERATION_1AD_MAJORE si la case 1AV/1BV est cochée (accord
 * d'intéressement, versement par un organisme d'intérêt général, versement à
 * un travailleur handicapé relevant d'un ESAT). Vérifié visuellement sur la
 * brochure DGFiP (IR 2026, p.106) : « la fraction de la PPV qui excède
 * 3 000 € (ou 6 000 € le cas échéant) sera automatiquement ajoutée au
 * montant du salaire imposable » — même mécanisme que 1GH/1HH.
 */
const PLAFOND_EXONERATION_1AD = 3000;
const PLAFOND_EXONERATION_1AD_MAJORE = 6000;

/**
 * Cases du cadre 1 "Traitements et salaires" volontairement exclues du calcul
 * v1 : montants exonérés d'IR (n'entrent jamais dans le revenu imposable),
 * ou cases à cocher purement informatives sans montant propre (1GK/1GL).
 * 1GB/1HB (associés et gérants art. 62 CGI) ne sont PAS exclues : vérifié sur
 * la brochure DGFiP (IR 2026, p.107) — « cette déduction [de 10 %] est
 * applicable à tous les revenus imposés selon les règles des traitements et
 * salaires » et le choix forfaitaire/frais réels est « le même pour
 * l'ensemble de ses activités » — 1GB/1HB ne relève d'aucun régime distinct,
 * elles rejoignent le pool standard ci-dessous. 1AF/1BF (source étrangère,
 * crédit d'impôt égal à l'impôt français) ne sont PAS exclues non plus :
 * même texte de la brochure — elles rejoignent le même pool (plancher/
 * plafond et choix 10 %/frais réels uniques par déclarant), voir
 * `revenuCreditImpotEgalImpotFrancais` ci-dessous pour l'isolement
 * proportionnel de leur part dans le revenu net imposable. 1GH/1HH (heures
 * supplémentaires/RTT exonérées) ne sont PAS exclues : seule la fraction
 * sous le plafond de 7 500 €/personne est exonérée, le surplus rejoint
 * l'assiette imposable — voir son traitement dans `calculerRevenuSalaires`
 * ci-dessous. 1AD/1BD (prime de partage de la valeur) : même logique de
 * surplus taxable au-delà du seuil d'exonération (3 000 €/6 000 € selon
 * 1AV/1BV), voir `PLAFOND_EXONERATION_1AD`.
 */
export const CASES_SALAIRES_EXCLUES_DU_CALCUL = [
  'case1pb', 'case1pc', // pourboires exonérés
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
  /**
   * Part de `netImposable` attribuable à 1AC/1BC (salaires exonérés retenus
   * pour le calcul du taux effectif), isolée proportionnellement au sein du
   * même pool 10 %/frais réels que 1AJ (même déclarant, même art. 83 CGI —
   * voir JSDoc de `calculerRevenuSalaires`). Toujours 0 en dehors de
   * `calculerRevenuSalaires`.
   */
  netImposableExonereTauxEffectif: number;
}

export interface RevenuSalairesResult {
  declarant1: RevenuSalairesDeclarantDetail;
  declarant2: RevenuSalairesDeclarantDetail;
  /**
   * 1PM/1QM bruts (avant abattement), à titre informatif : le montant est
   * déjà intégré au pool abattement 10 %/frais réels de son déclarant (voir
   * `remunerations1`/`remunerations2` ci-dessous) et donc déjà reflété dans
   * `declarant1.netImposable`/`declarant2.netImposable` — ne pas le rajouter
   * à `totalNetImposable` sous peine de double comptage.
   */
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
  /**
   * Part de 1AC/1BC (salaires exonérés retenus pour le calcul du taux
   * effectif) déjà nette d'abattement 10 %/frais réels, isolée
   * proportionnellement au sein du même pool que 1AJ pour chaque déclarant
   * (voir JSDoc de `calculerDeclarant`). Transmise telle quelle à
   * `calculerRevenuExonereTauxEffectif`, qui n'a alors plus qu'à y ajouter les
   * pensions étrangères (1AH/1BH).
   */
  salairesNetImposablesExoneresTauxEffectif: number;
  casesExclues: readonly string[];
}

/**
 * Abattement forfaitaire de 10 % (ou frais réels si plus favorables) d'un
 * déclarant. Le choix 10 %/frais réels et le plancher/plafond sont uniques
 * « pour l'ensemble de ses activités » imposées selon les règles des
 * traitements et salaires (brochure DGFiP IR 2026 p.107) : cela couvre aussi
 * bien les salaires imposables en France (1AJ/1AK) que les salaires de source
 * étrangère exonérés mais retenus pour le calcul du taux effectif (1AC/1AE,
 * même art. 83 CGI) — d'où la mise en commun de `remunerationsBrutes` et
 * `remunerationsExonereesTauxEffectif` dans un seul et même pool ci-dessous,
 * plutôt qu'un choix frais réels/forfaitaire arbitré séparément pour chacun.
 *
 * `remunerationsCreditImpot` (1AF/1BF, par défaut 0) et
 * `remunerationsExonereesTauxEffectif` (1AC/1BC, par défaut 0) rejoignent
 * cette même base pour le calcul du plancher/plafond et du choix 10 %/frais
 * réels ; leur part respective dans `netImposable` est ensuite isolée
 * proportionnellement dans `netImposableCreditImpot` et
 * `netImposableExonereTauxEffectif`, pour permettre à `calculerRevenuSalaires`
 * de les exclure du revenu imposable France tout en les transmettant
 * séparément aux mécanismes du crédit d'impôt et du taux effectif.
 *
 * `abattementSpecifique` (1GA/1HA, assistants maternels/familiaux,
 * journalistes) est purement informatif côté DGFiP : le contribuable est
 * censé l'avoir déjà déduit de son salaire brut avant de le reporter en
 * 1AJ/1AA, la case 1GA ne servant qu'à documenter ce montant sans être
 * réimputée par l'administration (vérifié empiriquement contre le simulateur
 * officiel, qui ne la retranche pas — voir docs/fiscalite.md). Elle n'entre
 * donc plus dans le calcul de `netImposable` ci-dessous ; elle reste
 * seulement exposée dans le détail pour affichage.
 */
export function calculerDeclarant(
  remunerationsBrutes: number,
  abattementSpecifique: number,
  fraisReels: number | null,
  remunerationsCreditImpot = 0,
  remunerationsExonereesTauxEffectif = 0,
): RevenuSalairesDeclarantDetail {
  const baseApresAbattementSpecifique = remunerationsBrutes;
  const baseTotale = baseApresAbattementSpecifique + remunerationsCreditImpot + remunerationsExonereesTauxEffectif;

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
  const ratioExonereTauxEffectif = baseTotale > 0 ? remunerationsExonereesTauxEffectif / baseTotale : 0;
  const netImposableExonereTauxEffectif = netTotal * ratioExonereTauxEffectif;

  return {
    remunerationsBrutes,
    abattementSpecifique,
    baseApresAbattementSpecifique,
    fraisReels,
    abattementForfaitaire,
    deductionRetenue,
    netImposable: netTotal - netImposableCreditImpot - netImposableExonereTauxEffectif,
    netImposableCreditImpot,
    netImposableExonereTauxEffectif,
  };
}

/**
 * Revenu net imposable du cadre 1 "Traitements et salaires" (art. 82-83 CGI,
 * revenus 2025 / impôt 2026), limité aux cases actuellement saisissables.
 *
 * Pour chaque déclarant : rémunérations imposables soumises à abattement
 * (1AJ/1AA/1GF/1GG/1AP/1AG/1GB, et symétriques déclarant 2 — 1GB/1HB, associés
 * et gérants art. 62 CGI, ne relèvent d'aucun régime distinct, brochure DGFiP
 * IR 2026 p.107), auxquelles s'ajoutent la fraction de 1GH/1HH qui excède le
 * plafond d'exonération de 7 500 €/personne (heures supplémentaires/
 * complémentaires et RTT monétisés, art. 81 quater CGI) et la fraction de
 * 1AD/1BD qui excède le seuil d'exonération de la prime de partage de la
 * valeur (3 000 €, porté à 6 000 € par 1AV/1BV — voir PLAFOND_EXONERATION_1AD),
 * puis déduction du plus favorable entre l'abattement forfaitaire de 10 %
 * (plancher 509 €, plafond 14 555 €, jamais supérieur à la base) et les frais
 * réels (1AK/1BK). L'abattement spécifique 1GA/1HA (journalistes, assistants
 * maternels...) n'est PAS déduit ici : voir JSDoc de `calculerDeclarant`
 * ci-dessus — le contribuable est censé l'avoir déjà retranché du montant
 * saisi en 1AJ/1AA, la case étant purement informative côté DGFiP.
 *
 * 1PM/1QM (indemnités pour préjudice moral, fraction taxable au-delà d'1 M€)
 * rejoignent le même pool que les rémunérations ci-dessus : le BOFiP
 * (BOI-RSA-CHAMP-20-40-10-30, art. 80 4e alinéa CGI) les qualifie imposables
 * « dans la catégorie des traitements et salaires », donc soumises au même
 * choix abattement forfaitaire de 10 %/frais réels que le reste — pas ajoutées
 * à part hors abattement.
 *
 * 1AF/1BF (crédit d'impôt égal à l'impôt français) rejoignent le même pool
 * que les rémunérations ci-dessus (plancher/plafond et choix 10 %/frais
 * réels uniques par déclarant, brochure DGFiP IR 2026 p.107) : leur part dans
 * le revenu net imposable est isolée proportionnellement par
 * `calculerDeclarant` et exposée dans `revenuCreditImpotEgalImpotFrancais`,
 * qui n'entre pas dans `totalNetImposable`.
 *
 * Cases hors calcul : voir CASES_SALAIRES_EXCLUES_DU_CALCUL.
 *
 * `exoneres` (1AC/1BC, 1AE/1BE) : salaires de source étrangère exonérés mais
 * retenus pour le calcul du taux effectif — rejoignent le pool 1AJ de leur
 * déclarant plutôt que de faire l'objet d'un choix 10 %/frais réels séparé
 * (voir JSDoc de `calculerDeclarant`). Optionnel pour ne pas casser les
 * appels existants qui n'ont pas encore ces données.
 */
export function calculerRevenuSalaires(
  input: RevenusSalairesInput,
  exoneres?: RevenusExoneresPourPoolSalaires,
): RevenuSalairesResult {
  const surplus1gh = Math.max(0, (input.case1gh ?? 0) - PLAFOND_EXONERATION_1GH);
  const surplus1hh = Math.max(0, (input.case1hh ?? 0) - PLAFOND_EXONERATION_1GH);

  const seuil1ad = input.case1av ? PLAFOND_EXONERATION_1AD_MAJORE : PLAFOND_EXONERATION_1AD;
  const seuil1bd = input.case1bv ? PLAFOND_EXONERATION_1AD_MAJORE : PLAFOND_EXONERATION_1AD;
  const surplus1ad = Math.max(0, (input.case1ad ?? 0) - seuil1ad);
  const surplus1bd = Math.max(0, (input.case1bd ?? 0) - seuil1bd);

  const remunerations1 = (input.case1aj ?? 0) + (input.case1aa ?? 0)
    + (input.case1gf ?? 0) + (input.case1gg ?? 0) + (input.case1ap ?? 0) + (input.case1ag ?? 0)
    + (input.case1gb ?? 0) + (input.case1pm ?? 0)
    + surplus1gh + surplus1ad;
  const remunerations2 = (input.case1bj ?? 0) + (input.case1ba ?? 0)
    + (input.case1hf ?? 0) + (input.case1hg ?? 0) + (input.case1bp ?? 0) + (input.case1bg ?? 0)
    + (input.case1hb ?? 0) + (input.case1qm ?? 0)
    + surplus1hh + surplus1bd;

  const fraisReels1 = combinerFraisReels(input.case1ak, exoneres?.case1ae ?? null);
  const fraisReels2 = combinerFraisReels(input.case1bk, exoneres?.case1be ?? null);

  const declarant1 = calculerDeclarant(
    remunerations1, input.case1ga ?? 0, fraisReels1, input.case1af ?? 0, exoneres?.case1ac ?? 0,
  );
  const declarant2 = calculerDeclarant(
    remunerations2, input.case1ha ?? 0, fraisReels2, input.case1bf ?? 0, exoneres?.case1bc ?? 0,
  );

  const indemnitesPrejudiceMoral = (input.case1pm ?? 0) + (input.case1qm ?? 0);

  const revenuCreditImpotEgalImpotFrancais = declarant1.netImposableCreditImpot + declarant2.netImposableCreditImpot;
  const salairesNetImposablesExoneresTauxEffectif = declarant1.netImposableExonereTauxEffectif
    + declarant2.netImposableExonereTauxEffectif;

  return {
    declarant1,
    declarant2,
    indemnitesPrejudiceMoral,
    totalNetImposable: declarant1.netImposable + declarant2.netImposable,
    revenuCreditImpotEgalImpotFrancais,
    salairesNetImposablesExoneresTauxEffectif,
    casesExclues: CASES_SALAIRES_EXCLUES_DU_CALCUL,
  };
}
