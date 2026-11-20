import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { calculerDonnees2044, chargerDonnees2044 } from '@/services/declaration2044Donnees';
import { revenusFonciersPour2042, type Declaration2044Result, type RevenusFonciers2042 } from '@/lib/fiscalite/calculerDeclaration2044';
import { calculerDonneesIFI, chargerDonneesIFI, type DonneesIFI, type Plafonnement2042 } from '@/services/declarationIFIDonnees';
import type { DeclarationIFIResultat } from '@/lib/fiscalite/calculerDeclarationIFI';
import { controlerSaisie2042 } from '@/lib/fiscalite/controlerSaisie2042';
import { casesSupprimees2027Saisies, masquerCases2027, masquerCasesSupprimees2027 } from '@/lib/fiscalite/cases2027';
import { useFoyerFiscal } from './useFoyerFiscal';
import { useRevenusSalaires } from './useRevenusSalaires';
import { useGainsActionnariatSalarie } from './useGainsActionnariatSalarie';
import { useRevenusExoneresTauxEffectif } from './useRevenusExoneresTauxEffectif';
import { usePensionsRetraitesRentes } from './usePensionsRetraitesRentes';
import { useRevenusCapitauxMobiliers } from './useRevenusCapitauxMobiliers';
import { usePlusValuesGainsDivers } from './usePlusValuesGainsDivers';
import { useRevenusFonciers2042 } from './useRevenusFonciers2042';
import { useRevenusNonSalaries } from './useRevenusNonSalaries';
import { useChargesDeductibles } from './useChargesDeductibles';
import { useReductionsCreditsImpot } from './useReductionsCreditsImpot';
import { usePrelevementSourceDivers } from './usePrelevementSourceDivers';
import { calculerCEHR } from '@/lib/fiscalite/calculerCEHR';
import { calculerCDHR, type CDHRResult } from '@/lib/fiscalite/calculerCDHR';
import { TAUX_BREVETS } from '@/lib/fiscalite/calculerRevenusNonSalaries';
import { ANNEE_REVENUS_PAR_DEFAUT, type ParametresFiscaux } from '@/lib/fiscalite/parametres';
import { useMillesimeFiscal } from '@/contexts/MillesimeFiscalContext';
import { arrondirPrelevementsSociaux } from '@/lib/fiscalite/arrondirPrelevementsSociaux';
import { calculerAbattementsSpeciaux, type AbattementsSpeciauxResult } from '@/lib/fiscalite/calculerAbattementsSpeciaux';
import {
  calculerGainsActionnariatSalarie,
  calculerImpot,
  calculerPartsFiscales,
  calculerPensionsRetraitesRentes,
  calculerPlusValuesGainsDivers,
  calculerPrelevementsSociauxCapitauxMobiliers,
  calculerPrelevementsSociauxGainsActionnariatSalarie,
  calculerPrelevementsSociauxPensionsRetraitesRentes,
  calculerRevenuCapitauxMobiliers,
  calculerRevenuExonereTauxEffectif,
  calculerRevenuSalaires,
  calculerRevenusFonciers2042,
  calculerRevenusNonSalaries,
  calculerChargesDeductibles,
  csgDeductibleAnticipee,
  alertesChargesDeductibles,
  calculerReductionsCreditsImpot,
  calculerPlafonnementNiches,
  calculerInvestissementsOutreMer,
  calculerSouscriptionsCapital,
  controle8TK,
  CASES_CREDIT_IMPOT_FRANCAIS_CADRE_5,
  aRevenuProfessionnelReel,
  calculerInvestissementsForestiers,
  calculerInvestissementsLocatifs,
  calculerInvestissementsPinel,
  calculerInvestissementsScellier,
  calculerInvestissementsCensiBouvard,
  PlafonnementNichesResult,
  calculerPrelevementSourceDivers,
  PRELEVEMENT_SOURCE_DIVERS_VIDE,
  exonerationTotaleCsgCrds,
  exonerationPartielleCsgCrdsOuverte,
  calculerSoldeImpot,
  creditImpotEgalImpotEtranger,
  FoyerFiscalInput,
  GainsActionnariatSalarieInput,
  GainsActionnariatSalarieResult,
  ImpotResult,
  PartsFiscalesResult,
  PensionsRetraitesRentesInput,
  PensionsRetraitesRentesResult,
  PlusValuesGainsDiversInput,
  PlusValuesGainsDiversResult,
  PrelevementsSociauxCapitauxMobiliersResult,
  PrelevementsSociauxGainsActionnariatResult,
  PrelevementsSociauxPensionsResult,
  RevenuCapitauxMobiliersResult,
  RevenuExonereTauxEffectifResult,
  RevenuSalairesResult,
  RevenusCapitauxMobiliersInput,
  RevenusFonciers2042Input,
  RevenusFonciers2042Result,
  REVENUS_NON_SALARIES_VIDE,
  RevenusNonSalariesResult,
  ChargesDeductiblesInput,
  ChargesDeductiblesResult,
  ReductionsCreditsImpotInput,
  ReductionsCreditsImpotResult,
  PrelevementSourceDiversResult,
  SoldeImpotResult,
  RevenusExoneresTauxEffectifInput,
  RevenusSalairesInput,
} from '@/lib/fiscalite';

const FOYER_PAR_DEFAUT: FoyerFiscalInput = {
  situationFamille: 'celibataire',
  lieuResidence: 'metropole',
  enfantsCharge: [],
  personnesInvalidesCharge: [],
  enfantsMajeursRattaches: 0,
  parentIsole: false,
  ancienParentIsole: false,
  invaliditeDeclarant1: false,
  invaliditeDeclarant2: false,
  ancienCombattantDeclarant1: false,
  ancienCombattantDeclarant2: false,
  veufAncienCombattant: false,
  veuveDeGuerre: false,
};

const GAINS_ACTIONNARIAT_PAR_DEFAUT: GainsActionnariatSalarieInput = {
  case1tp: null, case1up: null,
  case1tt: null, case1ut: null,
  case1tz: null, case1uz: null, case1wz: null, case1vz: null,
  case1nx: null, case1ox: null,
  case1ny: null, case1oy: null,
  case1ay: null, case1by: null,
  case1mp: null, case1mq: null,
  case3vd: null, case3vi: null, case3vf: null,
  case3vj: null, case3vk: null,
  case3vn: null,
  case0xx: null,
};

const REVENUS_EXONERES_PAR_DEFAUT: RevenusExoneresTauxEffectifInput = {
  case1ac: null, case1bc: null,
  case1ge: false, case1he: false,
  case1ae: null, case1be: null,
  case1ah: null, case1bh: null,
  caseRse: null, caseRsf: null,
};

const PENSIONS_RETRAITES_RENTES_PAR_DEFAUT: PensionsRetraitesRentesInput = {
  case1as: null, case1bs: null,
  case1at: null, case1bt: null,
  case1ai: null, case1bi: null,
  case1az: null, case1bz: null,
  case1ao: null, case1bo: null,
  case1al: null, case1bl: null,
  case1am: null, case1bm: null,
  case1aw: null, case1bw: null, case1cw: null, case1dw: null,
  case1ar: null, case1br: null, case1cr: null, case1dr: null,
  case1hk: false, case1hl: false,
};

const REVENUS_SALAIRES_PAR_DEFAUT: RevenusSalairesInput = {
  case1aj: null, case1bj: null,
  case1aa: null, case1ba: null,
  case1ga: null, case1ha: null,
  case1gh: null, case1hh: null,
  case1pb: null, case1pc: null,
  case1ad: null, case1bd: null,
  case1av: false, case1bv: false,
  case1gb: null, case1hb: null,
  case1gk: false, case1gl: false,
  case1gf: null, case1hf: null,
  case1gg: null, case1hg: null,
  case1aq: null, case1bq: null,
  case1ap: null, case1bp: null,
  case1af: null, case1bf: null,
  case1ag: null, case1bg: null,
  case1ak: null, case1bk: null,
  case1pm: null, case1qm: null,
  case1dy: null, case1ey: null,
  case1sm: null, case1dn: null,
};

const REVENUS_CAPITAUX_MOBILIERS_PAR_DEFAUT: RevenusCapitauxMobiliersInput = {
  case2dh: null, case2ch: null, case2uu: null, case2vv: null, case2ww: null,
  case2xx: null, case2yy: null, case2zz: null,
  case2dc: null, case2fu: null,
  case2tr: null, case2tt: null, case2tq: null, case2ts: null, case2tz: null, case2go: null,
  case2tu: null, case2tv: null, case2tw: null, case2tx: null, case2ty: null,
  case2cg: null, case2bh: null, case2df: null, case2dg: null, case2di: null,
  case2ca: null, case2ab: null, case2ck: null, case2ee: null,
  case2aa: null, case2al: null, case2am: null, case2an: null, case2aq: null, case2ar: null,
  case2vm: null, case2vn: null, case2vo: null, case2vp: null,
  case2vq: null, case2vr: null, case2vs: null, case2vt: null, case2vu: null, case2dm: null,
  case2op: null,
};

const PLUS_VALUES_PAR_DEFAUT: PlusValuesGainsDiversInput = {
  case3vg: null, case3sg: null, case3vh: null, case3ua: null, case3sl: null, case3va: null,
  case3vt: null, case3pi: null, case3sb: null, case3sz: null, case3we: null,
  case3an: null, case3bn: null, case3cn: false,
  case3vz: null, case3vw: null,
  case3sj: null, case3tj: null, case3tk: null, case3sk: null, case3tl: null, case3tm: null, case3pc: null, case3pe: null,
  case3vq: null, case3vr: null, case3vc: null, case3ex: null,
};

const REVENUS_FONCIERS_2042_PAR_DEFAUT: RevenusFonciers2042Input = {
  case4ba: null, case4bd: null, case4be: null, case4bk: null, case4bl: null, case4bn: false, case4bz: false,
  case4by: null, case4ea: null, case4eb: null,
};

const CHARGES_DEDUCTIBLES_PAR_DEFAUT: ChargesDeductiblesInput = {
  case6de: null, case6el: null, case6em: null, case6gu: null, case6gi: null, case6gj: null, case6gp: null,
  case6ns: null, case6nt: null, case6rs: null, case6rt: null, case6ps: null, case6pt: null,
  case6qr: false, case6qw: false, case6os: null, case6ot: null, case6qs: null, case6qt: null,
  case6nu: null, case6ru: null, case6pu: null, case6ou: null, case6qu: null,
  case6dg: null, case6dd: null, case6ev: null, case6eu: null, case6hp: null, case6hq: null, case6hr: null,
  case6gh: null, case6fa: null, case6fb: null, case6fc: null, case6fd: null, case6fe: null, case6fl: null,
  entretienSeul6el: false, entretienSeul6em: false,
};

const REDUCTIONS_CREDITS_IMPOT_PAR_DEFAUT: ReductionsCreditsImpotInput = {
  case7ud: null, case7uq: null, case7uj: null, case7uf: null,
  case7db: null, case7dr: null, case7dl: null, case7dq: false, case7dg: false, membresPlus65Ans: null,
};

const COUPLE_IMPOSITION_COMMUNE: FoyerFiscalInput['situationFamille'][] = ['marie', 'pacse'];

/**
 * Millésime par défaut, hors contexte. Le calcul suit le millésime choisi (`useMillesimeFiscal`),
 * exposé par `FiscalOverview.anneeRevenus` / `anneeIFI` / `parametres`.
 */
export const ANNEE_REVENUS = ANNEE_REVENUS_PAR_DEFAUT;
/** IFI au 1er janvier suivant l'année des revenus : son plafonnement reprend l'impôt de ces revenus. */
export const ANNEE_IFI = ANNEE_REVENUS + 1;

/**
 * Comparatif de l'option globale pour le barème (2OP) : impôt net du foyer
 * recalculé avec 2OP coché et décoché, toutes autres saisies égales (cadre 2
 * et plus-values du cadre 3). Les prélèvements sociaux ne dépendent pas de
 * 2OP ; la CSG déductible (2BH) est comprise via calculerChargesDeductibles.
 * Null quand les deux options donnent le même impôt.
 */
/** Une colonne du comparatif PFU/barème (montants arrondis par l'affichage). */
export interface ColonneComparatif {
  revenuBrutGlobal: number;
  impotBareme: number;
  impotProportionnel: number;
  prelevementsSociaux: number;
  /** Réductions et crédits imputés (cadre 7, crédits du cadre 2, crédits égaux à l'impôt). */
  reductions: number;
  cehr: number;
  cdhr: number;
  /** IR + CEHR + CDHR + PS + PFL de 2DH, comme l'imposition totale de la vue d'ensemble. */
  imposition: number;
}

export interface ComparaisonOptionBareme {
  pfu: ColonneComparatif;
  bareme: ColonneComparatif;
  /** CSG déductible anticipée sur les revenus de l'année suivante, avec l'option (`csgDeductibleAnticipee`). */
  csgDeductibleAnticipee: number;
  /** TMI de la colonne barème, retenu pour l'année suivante. */
  tmiAnticipe: number;
  gainFiscalAnticipe: number;
  /** Mode retenu dans le calcul (true = barème). */
  optionActuelle: boolean;
  /** Mode le plus favorable choisi automatiquement (2OP non tranchée). */
  automatique: boolean;
  impotAvecOption: number;
  impotSansOption: number;
}

export interface FiscalOverview {
  /** Millésime de règles appliqué (année des revenus), celui de la 2044 reprise. */
  anneeRevenus: number;
  /** Année de la 2042-IFI reprise : 1er janvier suivant l'année des revenus. */
  anneeIFI: number;
  parametres: ParametresFiscaux;
  loading: boolean;
  foyerRenseigne: boolean;
  revenusRenseignes: boolean;
  revenuSalaires: RevenuSalairesResult;
  gainsActionnariat: GainsActionnariatSalarieResult;
  revenuExonereTauxEffectif: RevenuExonereTauxEffectifResult;
  pensionsRetraitesRentes: PensionsRetraitesRentesResult;
  revenuCapitauxMobiliers: RevenuCapitauxMobiliersResult;
  /** Cadre 3 : barème, impôt forfaitaire (12,8 %, 19 %, 30 %, 50 %), RFR et prélèvements sociaux à 18,6 % — voir calculerPlusValuesGainsDivers.ts. */
  plusValuesGainsDivers: PlusValuesGainsDiversResult;
  /**
   * Prélèvements sociaux (18,6 %, assurance-vie comprise) — périmètre partiel : seuls les capitaux
   * mobiliers « prélevés à la source » sont couverts pour l'instant (voir
   * calculerPrelevementsSociauxCapitauxMobiliers.ts). Salaires, pensions et
   * gains d'actionnariat restent hors périmètre (voir docs/fiscalite.md).
   */
  prelevementsSociauxCapitauxMobiliers: PrelevementsSociauxCapitauxMobiliersResult;
  /**
   * Prélèvements sociaux sur les pensions/retraites/rentes (Phase 2 — voir
   * docs/fiscalite.md) : limités aux rentes viagères à titre onéreux
   * (18,6 %, fraction imposable par tranche d'âge). Pensions classiques,
   * 1AI (capital PER) et 1AT (capital retraite 163 bis) hors périmètre — le
   * taux de CSG/CRDS/CASA sur les pensions dépend d'un RFR N-2 non modélisé,
   * une approximation par le revenu imposable courant s'étant révélée
   * empiriquement fausse (voir docs/fiscalite.md).
   */
  prelevementsSociauxPensionsRetraitesRentes: PrelevementsSociauxPensionsResult;
  /**
   * Prélèvements sociaux sur les gains d'actionnariat salarié (Phase 3 — voir
   * docs/fiscalite.md). Périmètre établi par vérification empirique contre
   * le simulateur officiel plutôt que par recherche documentaire seule (les
   * sources généralistes se contredisaient) : 1TT au régime salarial
   * (9,7 % + contribution salariale de 10 %), 1NX au régime carried-interest non qualifiant (28,6 % combiné),
   * 1NY/3VN aux contributions salariales spécifiques (30 %/10 %). 1TZ/1AY/
   * 1MP et les gains historiques 3VD/3VI/3VF/3VJ hors périmètre.
   */
  prelevementsSociauxGainsActionnariat: PrelevementsSociauxGainsActionnariatResult;
  parts: PartsFiscalesResult;
  /** Cases foncières saisies dans la 2042 (micro-foncier 4BE, 4BK/4BL, 4EA/4EB, 4BY) — voir calculerRevenusFonciers2042.ts. */
  revenusFonciers2042: RevenusFonciers2042Result;
  /** Cadre 5 (2042-C-PRO), régimes micro — voir calculerRevenusNonSalaries.ts. */
  revenusNonSalaries: RevenusNonSalariesResult;
  /** Déficit agricole de l'année retranché du revenu global (0 si les autres revenus nets dépassent le seuil du millésime). */
  deficitAgricoleImpute: number;
  /** Cadre 6 (charges déductibles, déficits globaux antérieurs, 6GH) — voir calculerChargesDeductibles.ts. */
  chargesDeductibles: ChargesDeductiblesResult;
  /** Abattements spéciaux retranchés du revenu net global : personnes âgées ou invalides (art. 157 bis), rattachement (art. 196 B). */
  abattementsSpeciaux: AbattementsSpeciauxResult;
  /** Rappels croisant le cadre 6 et la situation de famille. */
  alertesChargesDeductibles: string[];
  /** 8TK différente du total des cases ouvrant droit au crédit égal à l'impôt français (crédit refusé). */
  alerte8TK: string | null;
  /** Saisies croisant plusieurs cadres que le simulateur officiel refuse (voir controlerSaisie2042.ts), sans effet sur le calcul. */
  alertesSaisie: string[];
  /**
   * Présentation du simulateur officiel, sans effet sur le calcul : « Total des réductions » comprend le crédit
   * égal à l'impôt français (8TK) et exclut le mécénat d'entreprise 7US, listé avec les crédits.
   */
  presentationReductions: { totalReductions: number; mecenatEntreprise: number; droitsSimples: number };
  /** Cadre 7 (dons, services à la personne) — voir calculerReductionsCreditsImpot.ts. */
  reductionsCreditsImpot: ReductionsCreditsImpotResult;
  /** Plafonnement global des avantages fiscaux (art. 200-0 A) : excédent ajouté à l'impôt. */
  plafonnementNiches: PlafonnementNichesResult;
  /** Cadre 8 (8TI/8TK, 8TF, PAS déjà payé, exonération CSG-CRDS) — voir calculerPrelevementSourceDivers.ts. */
  prelevementSourceDivers: PrelevementSourceDiversResult;
  /** Exonération de CSG-CRDS (8RF…8RM) effectivement retranchée, plafonnée aux PS du patrimoine calculés. */
  reductionPrelevementsSociaux: number;
  /** Prélèvements sociaux calculés, toutes catégories, après exonération 8RF…8RM, contributions 8TQ…8SB comprises. */
  prelevementsSociauxTotal: number;
  /** CEHR (art. 223 sexies CGI, sans lissage), sur le RFR ; hors `impot.impotNet`, qui sert au taux moyen. */
  cehr: number;
  /**
   * CDHR (art. 224 CGI), hors `impot.impotNet` comme la CEHR. `approximative` : revenus au quotient,
   * crédit égal à l'impôt français ou revenus exonérés par convention, non retraités.
   */
  cdhr: CDHRResult & { approximative: boolean };
  /** Solde après prélèvement à la source (CEHR et CDHR comprises, acomptes 8HR/8HS déduits) ; null sans cadre 8. */
  solde: SoldeImpotResult | null;
  /** Cases 4BA à 4BD de la 2044 de l'année des revenus, reprises dans l'impôt ; null sans 2044 ouverte pour cette année. */
  revenusFonciers: RevenusFonciers2042 | null;
  impot: ImpotResult;
  /**
   * Cases 9PR et 9PX de la 2042-IFI de ANNEE_IFI, reprises de ce calcul : impôt au barème après décote
   * (avant crédits d'impôt), impôt forfaitaire et prélèvements sociaux calculés ; RFR pour les revenus.
   * null tant que le foyer n'est pas renseigné : l'impôt calculé sur les valeurs par défaut fausserait le plafonnement.
   */
  plafonnementIFI: Plafonnement2042 | null;
  /** 2042-IFI de ANNEE_IFI ; null sans déclaration ouverte pour cette année. */
  ifi: DeclarationIFIResultat | null;
  /** Comparatif avec et sans option 2OP ; null si l'option est sans effet. */
  comparaisonOptionBareme: ComparaisonOptionBareme | null;
  /** Comparatif recalculé pour un cadre 2 non enregistré (formulaire), le reste de la déclaration tel qu'enregistré. */
  simulerOptionBareme: (capitauxMobiliers: RevenusCapitauxMobiliersInput) => ComparaisonOptionBareme | null;
  /** Recharge les 9 sources Supabase — à appeler après une saisie dans la 2042 (voir FiscaliteSection.tsx). */
  refetch: () => void;
}

/**
 * Agrège foyer fiscal + revenus salaires + gains d'actionnariat salarié +
 * revenus exonérés retenus pour le taux effectif + pensions/retraites/rentes +
 * revenus de capitaux mobiliers (Phase 1 — voir docs/fiscalite.md pour le
 * périmètre exact de ce dernier), et calcule le résultat IR
 * (V1 : cases imposables au barème uniquement — voir docs/fiscalite.md). Un
 * seul point de calcul partagé entre FiscalOverviewCard et TaxRateCard pour
 * éviter des appels Supabase dupliqués et deux implémentations divergentes du
 * même résultat.
 *
 * `FiscaliteSection` ne démonte jamais ce hook quand la 2042 s'ouvre en
 * overlay par-dessus : sans `refetch()` explicite au moment où l'overlay se
 * ferme, la Vision générale resterait figée sur les données du premier
 * chargement de la page.
 */
/** Cases retirées du formulaire 2027 encore saisies : ignorées par le calcul à partir des revenus 2026. */
const alerteCasesSupprimees = (codes: string[]): string[] => (codes.length === 0 ? [] : [
  `${codes.join(', ')} : case${codes.length > 1 ? 's' : ''} retirée${codes.length > 1 ? 's' : ''} du formulaire 2027 (fin de dispositif ou de report), sans effet sur l'impôt des revenus 2026.`,
]);

export function useFiscalOverview(): FiscalOverview {
  const { anneeRevenus, parametres } = useMillesimeFiscal();
  const anneeIFI = anneeRevenus + 1;
  const { data: foyer, loading: loadingFoyer, refetch: refetchFoyer } = useFoyerFiscal();
  const { data: revenus, loading: loadingRevenus, refetch: refetchRevenus } = useRevenusSalaires();
  const { data: gainsSaisis, loading: loadingGains, refetch: refetchGains } = useGainsActionnariatSalarie();
  const { data: exoneres, loading: loadingExoneres, refetch: refetchExoneres } = useRevenusExoneresTauxEffectif();
  const { data: pensions, loading: loadingPensions, refetch: refetchPensions } = usePensionsRetraitesRentes();
  const { data: capitauxMobiliers, loading: loadingCapitauxMobiliers, refetch: refetchCapitauxMobiliers } = useRevenusCapitauxMobiliers();

  const { data: plusValuesSaisies, loading: loadingPlusValues, refetch: refetchPlusValues } = usePlusValuesGainsDivers();

  const { data: fonciers2042, loading: loadingFonciers2042, refetch: refetchFonciers2042 } = useRevenusFonciers2042();
  const { data: nonSalariesSaisis, loading: loadingNonSalaries, refetch: refetchNonSalaries } = useRevenusNonSalaries();
  const { data: chargesSaisies, loading: loadingCharges, refetch: refetchCharges } = useChargesDeductibles();
  const charges = useMemo(() => masquerCasesSupprimees2027(chargesSaisies, 'charges', anneeRevenus), [chargesSaisies, anneeRevenus]);
  const { data: reductionsSaisies, loading: loadingReductions, refetch: refetchReductions } = useReductionsCreditsImpot();
  const { data: prelevementSourceSaisi, loading: loadingPrelevementSource, refetch: refetchPrelevementSource } = usePrelevementSourceDivers();
  // Cases de la déclaration 2027 neutralisées pour les millésimes antérieurs (saisies communes aux millésimes).
  const gains = useMemo(() => masquerCases2027(gainsSaisis, 'gains', anneeRevenus), [gainsSaisis, anneeRevenus]);
  const plusValues = useMemo(() => masquerCases2027(plusValuesSaisies, 'plusValues', anneeRevenus), [plusValuesSaisies, anneeRevenus]);
  const nonSalaries = useMemo(() => masquerCases2027(nonSalariesSaisis, 'nonSalaries', anneeRevenus), [nonSalariesSaisis, anneeRevenus]);
  // Reports sans effet sur l'impôt de l'année (revenus 2026 : 7JT, 7KC) retirés du calcul.
  const reductions = useMemo(() => {
    // Cases retirées du formulaire 2027 neutralisées à partir des revenus 2026.
    const visibles = masquerCasesSupprimees2027(masquerCases2027(reductionsSaisies, 'reductions', anneeRevenus), 'reductions', anneeRevenus);
    const sansEffet = parametres.reductionsCredits.reportsSansEffet;
    if (!visibles || sansEffet.length === 0) return visibles;
    return { ...visibles, ...Object.fromEntries(sansEffet.map((cle) => [cle, null])) };
  }, [reductionsSaisies, anneeRevenus, parametres]);
  const prelevementSource = useMemo(
    () => masquerCases2027(prelevementSourceSaisi, 'prelevementSource', anneeRevenus), [prelevementSourceSaisi, anneeRevenus]);
  const { isAuthenticated } = useAuth();
  const [declaration2044, setDeclaration2044] = useState<Declaration2044Result | null>(null);
  const [loading2044, setLoading2044] = useState(true);
  const charger2044 = useCallback(() => {
    if (!isAuthenticated) { setLoading2044(false); return; }
    setLoading2044(true);
    // Sans création : seule une 2044 déjà ouverte pour l'année des revenus compte dans l'impôt.
    chargerDonnees2044(anneeRevenus, false)
      .then((d) => setDeclaration2044(d ? calculerDonnees2044(anneeRevenus, d) : null))
      .catch((error) => { if (import.meta.env.DEV) console.error('Erreur chargement 2044:', error); setDeclaration2044(null); })
      .finally(() => setLoading2044(false));
  }, [isAuthenticated, anneeRevenus]);
  useEffect(() => { charger2044(); }, [charger2044]);

  const [donneesIFI, setDonneesIFI] = useState<DonneesIFI | null>(null);
  const [loadingIFI, setLoadingIFI] = useState(true);
  const chargerIFI = useCallback(() => {
    if (!isAuthenticated) { setLoadingIFI(false); return; }
    setLoadingIFI(true);
    // Sans création : seule une 2042-IFI déjà ouverte pour l'année est reprise.
    chargerDonneesIFI(anneeIFI, false)
      .then(setDonneesIFI)
      .catch((error) => { if (import.meta.env.DEV) console.error('Erreur chargement IFI:', error); setDonneesIFI(null); })
      .finally(() => setLoadingIFI(false));
  }, [isAuthenticated, anneeIFI]);
  useEffect(() => { chargerIFI(); }, [chargerIFI]);

  const refetch = () => {
    charger2044();
    chargerIFI();
    refetchFoyer();
    refetchRevenus();
    refetchGains();
    refetchExoneres();
    refetchPensions();
    refetchCapitauxMobiliers();
    refetchPlusValues();
    refetchFonciers2042();
    refetchNonSalaries();
    refetchCharges();
    refetchReductions();
    refetchPrelevementSource();
  };

  const evaluer = useCallback((capitauxMobiliersSaisis: RevenusCapitauxMobiliersInput) => {
    const foyerInput = foyer ?? FOYER_PAR_DEFAUT;
    const revenusInput = revenus ?? REVENUS_SALAIRES_PAR_DEFAUT;
    const gainsInput = gains ?? GAINS_ACTIONNARIAT_PAR_DEFAUT;
    const exoneresInput = exoneres ?? REVENUS_EXONERES_PAR_DEFAUT;
    const pensionsInput = pensions ?? PENSIONS_RETRAITES_RENTES_PAR_DEFAUT;

    // Calcul complet pour un jeu de capitaux mobiliers : appelé une seconde fois avec 2OP inversé pour le comparatif.
    const simuler = (capitauxMobiliersInput: RevenusCapitauxMobiliersInput & { case2op: boolean }) => {

      // Gains d'actionnariat dans le pool 10 %/frais réels de chaque déclarant (brochure IR 2026 p.107).
      const revenuSalaires = calculerRevenuSalaires(revenusInput, exoneresInput, gainsInput, parametres);
      const gainsActionnariat = calculerGainsActionnariatSalarie(gainsInput, revenuSalaires.gainsActionnariatNetImposable);
      // 1AH/1BH dans le pool d'abattement des pensions : plafond de 4 439 € unique pour le foyer.
      const pensionsRetraitesRentes = calculerPensionsRetraitesRentes(pensionsInput, exoneresInput, parametres);
      const revenuExonereTauxEffectif = calculerRevenuExonereTauxEffectif(
        exoneresInput,
        revenuSalaires.salairesNetImposablesExoneresTauxEffectif,
        pensionsRetraitesRentes.pensionsExonereesTauxEffectifNettes,
      );
      const revenuCapitauxMobiliers = calculerRevenuCapitauxMobiliers(capitauxMobiliersInput, foyerInput.situationFamille);
      const prelevementsSociauxCapitauxMobiliers = calculerPrelevementsSociauxCapitauxMobiliers(capitauxMobiliersInput);
      // 2OP vaut pour le cadre 2 et pour les plus-values mobilières du cadre 3.
      const plusValuesGainsDivers = calculerPlusValuesGainsDivers(plusValues ?? PLUS_VALUES_PAR_DEFAUT, capitauxMobiliersInput.case2op);
      // Revenus au quotient (coefficient 4) : 0XX et plus-values RVG/RUA (option barème).
      const revenuExceptionnelQuotient = gainsActionnariat.revenuExceptionnelQuotient + plusValuesGainsDivers.revenuExceptionnelQuotient;
      const prelevementsSociauxGainsActionnariat = calculerPrelevementsSociauxGainsActionnariatSalarie(gainsInput);
      const parts = calculerPartsFiscales(foyerInput, parametres);
      const revenusFonciers = declaration2044 ? revenusFonciersPour2042(declaration2044) : null;
      const revenusNonSalaries = calculerRevenusNonSalaries(nonSalaries ?? REVENUS_NON_SALARIES_VIDE, parametres);
      const revenusFonciers2042 = calculerRevenusFonciers2042(
        fonciers2042 ?? REVENUS_FONCIERS_2042_PAR_DEFAUT,
        revenusFonciers?.revenuFoncierNetImposable ?? null,
      );
      const revenuImposableAvantDeficitAgricole = revenuSalaires.totalNetImposable + gainsActionnariat.totalNetImposable
        + pensionsRetraitesRentes.totalNetImposable + revenuCapitauxMobiliers.totalNetImposable
        + plusValuesGainsDivers.totalNetImposable
        + (revenusFonciers?.incidenceRevenuImposable ?? 0)
        + revenusFonciers2042.totalNetImposable - revenusFonciers2042.deductionReel4BL
        - revenusFonciers2042.deficitImputableRevenuGlobal
        + revenusNonSalaries.totalNetImposable;
      // Art. 156 I 1° CGI : « revenus nets d'autres sources » approchés par le revenu imposable hors déficit agricole.
      const deficitAgricoleImpute = revenuImposableAvantDeficitAgricole <= parametres.nonSalaries.seuilDeficitAgricole ? revenusNonSalaries.deficitAgricole : 0;
      const revenuBrutGlobal = revenuImposableAvantDeficitAgricole - deficitAgricoleImpute;
      const chargesDeductibles = calculerChargesDeductibles(
        charges ?? CHARGES_DEDUCTIBLES_PAR_DEFAUT, revenuBrutGlobal, capitauxMobiliersInput, parametres,
      );
      const revenuNetGlobal = revenuBrutGlobal + chargesDeductibles.incidenceRevenuImposable;
      // Revenus ouvrant droit au crédit égal à l'impôt français, tenus hors de revenuBrutGlobal.
      const revenuCategories8TK = revenuSalaires.revenuCreditImpotEgalImpotFrancais
        + pensionsRetraitesRentes.revenuCreditImpotEgalImpotFrancais
        + revenusFonciers2042.revenuCreditImpotEgalImpotFrancais
        + revenusNonSalaries.revenuCreditImpotEgalImpotFrancais;
      // Seuil 157 bis apprécié sur le revenu net global, revenus au quotient (0XX) compris pour leur total,
      // ainsi que les revenus ouvrant droit au crédit 8TK (simulateur officiel 2026 et 2027 : retraités 1AS
      // 25 000 + 1AL 12 000, revenu global 38 340 > seuil → aucun abattement).
      const abattementsSpeciaux = calculerAbattementsSpeciaux(
        foyerInput, revenuNetGlobal, anneeRevenus, revenuNetGlobal + revenuExceptionnelQuotient + revenuCategories8TK, parametres,
      );
      const revenuImposableTotal = revenuNetGlobal - abattementsSpeciaux.total;
      // Arrondi à l'euro comme l'avis (simulateur officiel 2026 et 2027) : impositions proportionnelles arrondies
      // une seule fois sur leur total (2TR 801 + 3VG 801 → 205,056 → 205), 1AT (7,5 %) à part (67,5 → 68).
      const impotForfaitaireTotal = Math.round(gainsActionnariat.impotForfaitaire
        + revenuCapitauxMobiliers.impotForfaitaire + plusValuesGainsDivers.impotForfaitaire
        + revenusNonSalaries.impotForfaitaire) + Math.round(pensionsRetraitesRentes.impotForfaitaire);
      const prelevementsSociauxPensionsRetraitesRentes = calculerPrelevementsSociauxPensionsRetraitesRentes(pensionsInput);
      // Crédit d'impôt égal à l'impôt français (1AF/1BF, 1AL/1BL, 4BK, 4BL, 5AK…) : revenu compris dans la
      // base française, crédit calculé sur les droits avant décote (voir calculerImpot.ts). Accordé seulement si 8TK
      // égale le total brut de ces cases (simulateur officiel 2026, voir controle8TK).
      const prelevementSourceInput = prelevementSource ?? PRELEVEMENT_SOURCE_DIVERS_VIDE;
      const prelevementSourceDivers = calculerPrelevementSourceDivers(prelevementSourceInput);
      const nonSalariesInput = nonSalaries ?? REVENUS_NON_SALARIES_VIDE;
      const fonciers2042Input = fonciers2042 ?? REVENUS_FONCIERS_2042_PAR_DEFAUT;
      const totalCategories8TK = [revenusInput.case1af, revenusInput.case1bf, revenusInput.case1cf, revenusInput.case1df,
        pensionsInput.case1al, pensionsInput.case1bl, pensionsInput.case1cl, pensionsInput.case1dl,
        ...(parametres.reductionsCredits.rentesCreditImpotFrancais
          ? [pensionsInput.case1ar, pensionsInput.case1br, pensionsInput.case1cr, pensionsInput.case1dr] : []),
        fonciers2042Input.case4bk, fonciers2042Input.case4bl,
        ...CASES_CREDIT_IMPOT_FRANCAIS_CADRE_5.map(cle => nonSalariesInput[cle])]
        .reduce<number>((t, v) => t + Math.max(0, v ?? 0), 0);
      const verification8TK = controle8TK(prelevementSourceDivers.montant8TK, totalCategories8TK);
      const revenuExonere = revenuExonereTauxEffectif.totalRetenu
        + revenusFonciers2042.revenuExonereTauxEffectif + revenusNonSalaries.revenuExonereTauxEffectif
        + prelevementSourceDivers.revenuTauxEffectif;
      // Crédit refusé : ces revenus, tenus hors de la base imposée, y reviennent sans crédit.
      const revenuCreditImpotFrancais = verification8TK.creditAccorde ? revenuCategories8TK : 0;
      const revenuImposableHorsCredit = revenuImposableTotal + (verification8TK.creditAccorde ? 0 : revenuCategories8TK);
      const reductionsCreditsImpot = calculerReductionsCreditsImpot(
        reductions ?? REDUCTIONS_CREDITS_IMPOT_PAR_DEFAUT, foyerInput, revenuImposableTotal,
        {
          declarant1: revenuSalaires.declarant1.remunerationsBrutes + (pensionsInput.case1as ?? 0)
            + (pensionsInput.case1az ?? 0) + (pensionsInput.case1ao ?? 0) + (pensionsInput.case1am ?? 0),
          declarant2: revenuSalaires.declarant2.remunerationsBrutes + (pensionsInput.case1bs ?? 0)
            + (pensionsInput.case1bz ?? 0) + (pensionsInput.case1bo ?? 0) + (pensionsInput.case1bm ?? 0),
          personnesCharge: revenuSalaires.pac1.remunerationsBrutes + revenuSalaires.pac2.remunerationsBrutes,
        },
        parametres,
      );
      // Plafonnement global des avantages fiscaux (art. 200-0 A) : l'excédent s'ajoute à l'impôt.
      const investissementsOutreMer = calculerInvestissementsOutreMer(reductions ?? REDUCTIONS_CREDITS_IMPOT_PAR_DEFAUT);
      const souscriptionsCapital = calculerSouscriptionsCapital(
        reductions ?? REDUCTIONS_CREDITS_IMPOT_PAR_DEFAUT,
        COUPLE_IMPOSITION_COMMUNE.includes(foyerInput.situationFamille),
        revenuImposableTotal,
        aRevenuProfessionnelReel(nonSalaries ?? REVENUS_NON_SALARIES_VIDE),
        parametres,
      );
      const investissementsForestiers = calculerInvestissementsForestiers(
        reductions ?? REDUCTIONS_CREDITS_IMPOT_PAR_DEFAUT,
        COUPLE_IMPOSITION_COMMUNE.includes(foyerInput.situationFamille),
      );
      const investissementsLocatifs = calculerInvestissementsLocatifs(reductions ?? REDUCTIONS_CREDITS_IMPOT_PAR_DEFAUT);
      const investissementsPinel = calculerInvestissementsPinel(reductions ?? REDUCTIONS_CREDITS_IMPOT_PAR_DEFAUT);
      const investissementsScellier = calculerInvestissementsScellier(reductions ?? REDUCTIONS_CREDITS_IMPOT_PAR_DEFAUT);
      const investissementsCensiBouvard = calculerInvestissementsCensiBouvard(reductions ?? REDUCTIONS_CREDITS_IMPOT_PAR_DEFAUT);
      const millesimes = { ...investissementsScellier.millesimes };
      for (const [annee, v] of Object.entries(investissementsCensiBouvard.millesimes)) {
        millesimes[Number(annee) as keyof typeof millesimes] += v;
      }
      // Le crédit égal à l'impôt étranger dépend de l'impôt français : premier calcul sans lui.
      const calculer = (creditEtranger: number, excedentPlafonnement: number) => calculerImpot(
        revenuImposableHorsCredit,
        parts,
        foyerInput.situationFamille,
        revenuExonere,
        foyerInput.lieuResidence,
        impotForfaitaireTotal,
        revenuExceptionnelQuotient,
        revenuCapitauxMobiliers.creditImpotAssuranceVie,
        revenuCapitauxMobiliers.creditImpotEtranger2AB,
        revenuCapitauxMobiliers.creditImpotValeursEtrangeres2CK,
        revenuSalaires.revenuExonereRetenuPourRFR + revenuCapitauxMobiliers.revenuExonereRetenuPourRFR
          + plusValuesGainsDivers.revenuExonereRetenuPourRFR + revenusFonciers2042.revenuExonereRetenuPourRFR
          + revenusNonSalaries.revenuExonereRetenuPourRFR + chargesDeductibles.epargneRetraiteRetenuePourRFR
          + pensionsRetraitesRentes.revenuExonereRetenuPourRFR + gainsActionnariat.revenuExonereRetenuPourRFR,
        reductionsCreditsImpot.totalReductions + prelevementSourceDivers.reductions + investissementsOutreMer.reductions
          + souscriptionsCapital.reductions + investissementsLocatifs.reductions
          + investissementsPinel.reductions + investissementsScellier.reductions
          + investissementsCensiBouvard.reductions,
        reductionsCreditsImpot.totalCredits + prelevementSourceDivers.creditsRestituables + investissementsOutreMer.credit
          + investissementsForestiers.credit + investissementsLocatifs.credits,
        creditEtranger,
        prelevementSourceDivers.reprises + excedentPlafonnement,
        revenusNonSalaries.revenuImposableTauxMarginal,
        revenusNonSalaries.taxeAgentsGeneraux + prelevementSourceDivers.taxeHoldings,
        revenuCreditImpotFrancais,
        prelevementSourceDivers.revenuMondial8ZR,
        parametres,
      );
      // Plafonnement global (art. 200-0 A) sur les seuls avantages imputés (simulateur officiel 2026) : réductions
      // non plafonnées (cadres 7 et 8) imputées d'abord, puis les réductions d'investissement, dont la part
      // perdue faute d'impôt au barème est répartie au prorata entre catégories ; crédits plafonnés retenus en entier.
      // L'excédent s'ajoute après les réductions : un premier calcul sans excédent donne les réductions imputées.
      const reductionsNonPlafonnees = reductionsCreditsImpot.totalReductions + prelevementSourceDivers.reductions;
      const reductionsInvestissement = investissementsOutreMer.reductions + souscriptionsCapital.reductions
        + investissementsLocatifs.reductions + investissementsPinel.reductions + investissementsScellier.reductions
        + investissementsCensiBouvard.reductions;
      const reductionsImputees = calculer(0, 0).reductionsImpot;
      const tauxImputation = reductionsInvestissement > 0
        ? Math.min(1, Math.max(0, (reductionsImputees - reductionsNonPlafonnees) / reductionsInvestissement))
        : 1;
      const imputee = (v: number) => v * tauxImputation;
      const plafonnementNiches = calculerPlafonnementNiches({
        millesimes: Object.fromEntries(Object.entries(millesimes).map(([a, v]) => [a, imputee(v)])),
        revenuNetImposable: revenuImposableTotal,
        courants: reductionsCreditsImpot.avantagesPlafonnesCourants + investissementsForestiers.credit
          + investissementsLocatifs.creditBornes
          + imputee(souscriptionsCapital.avantagesPlafonnesCourants
            + investissementsLocatifs.avantagesPlafonnesCourants - investissementsLocatifs.creditBornes
            + investissementsPinel.avantagesPlafonnesCourants + investissementsCensiBouvard.avantagesPlafonnesCourants),
        sofica: imputee(souscriptionsCapital.sofica),
        esus: imputee(souscriptionsCapital.esus),
        outreMer: imputee(investissementsOutreMer.avantagesPlafonnes + investissementsPinel.outreMer),
      });
      const impotSansCreditEtranger = calculer(0, plafonnementNiches.excedent);
      const exonerationTotale = exonerationTotaleCsgCrds(prelevementSourceInput, COUPLE_IMPOSITION_COMMUNE.includes(foyerInput.situationFamille));
      const creditEtranger = creditImpotEgalImpotEtranger(prelevementSourceInput, {
        impotBareme: impotSansCreditEtranger.impotApresDecote - impotSansCreditEtranger.creditImpotFrancais
          - impotSansCreditEtranger.reductionsImpot,
        revenuImposable: revenuImposableHorsCredit,
        optionBareme: capitauxMobiliersInput.case2op,
        exonerationCsgCrds: exonerationTotale,
      });
      // 8TC/8TG/8TO : non restituables, imputés avec le crédit égal à l'impôt étranger.
      const impot = calculer(creditEtranger.creditImpot + prelevementSourceDivers.creditsNonRestituables, plafonnementNiches.excedent);
      const somme = (...v: (number | null)[]) => v.reduce<number>((t, x) => t + Math.max(0, x ?? 0), 0);
      const exonerationPartielleOuverte = exonerationPartielleCsgCrdsOuverte(prelevementSourceInput);
      // Bases du foyer par contribution, arrondies une seule fois (voir arrondirPrelevementsSociaux.ts).
      // Fraction 4BK/4BL : crédit égal à l'impôt français, qui neutralise aussi ses PS.
      const ps = arrondirPrelevementsSociaux({
        patrimoine: prelevementsSociauxCapitauxMobiliers.baseImposable + prelevementsSociauxCapitauxMobiliers.baseAssuranceVie
          + prelevementsSociauxPensionsRetraitesRentes.baseImposableRentesViageres
          + prelevementsSociauxGainsActionnariat.baseGainsRevenusPatrimoine
          + prelevementsSociauxGainsActionnariat.baseGainsHistoriquesTauxForfaitaire
          + plusValuesGainsDivers.basePrelevementsSociaux
          + revenusNonSalaries.basePrelevementsSociaux,
        csgCrdsPatrimoineSeule: somme(capitauxMobiliersInput.case2di),
        // Foncier entier, fraction 4BK/4BL comprise : ses PS sont retranchés arrondis (neutraliseFoncier).
        foncier: (revenusFonciers?.revenuFoncierNetImposable ?? 0) + revenusFonciers2042.totalNetImposable
          + revenusFonciers2042.revenuCreditImpotEgalImpotFrancais - revenusFonciers2042.deductionReel4BL
          + plusValuesGainsDivers.basePrelevementsSociaux172,
        // 3XN (report, taux 2017 de 17,2 %) suit les lignes du foncier (simulateur officiel 2026).
        historique155: plusValuesGainsDivers.basePrelevementsSociaux155,
        // Rentes 1AR…1DR (revenus 2026) : crédit égal à l'impôt français, PS neutralisés (calc-2027).
        neutralisePatrimoine: verification8TK.creditAccorde ? pensionsRetraitesRentes.rentesCreditImpotFrancais : 0,
        neutraliseFoncier: verification8TK.creditAccorde ? revenusFonciers2042.revenuCreditImpotEgalImpotFrancais : 0,
        exonerationTotaleCsgCrds: exonerationTotale,
        exonerePatrimoine: exonerationPartielleOuverte
          ? somme(prelevementSourceInput.case8rv, prelevementSourceInput.case8rc, prelevementSourceInput.case8rm) : 0,
        exonereFoncier: exonerationPartielleOuverte ? somme(prelevementSourceInput.case8rf) : 0,
        activite: prelevementsSociauxGainsActionnariat.baseLeveeOptions,
        contributionSalariale10: prelevementsSociauxGainsActionnariat.baseLeveeOptions + prelevementsSociauxGainsActionnariat.base1MP
          + prelevementsSociauxGainsActionnariat.base3VN,
        contributionSalariale30: prelevementsSociauxGainsActionnariat.baseCarriedInterest1NY,
      });
      const reductionPrelevementsSociaux = ps.reductionExoneration;
      // Reliquat du crédit 8VL imputé sur les PS dus au titre de 8PL, sans excéder les PS dus.
      const creditEtrangerPrelevementsSociaux = Math.min(creditEtranger.creditPrelevementsSociaux, ps.total);
      const prelevementsSociauxTotal = ps.total - creditEtrangerPrelevementsSociaux
        + prelevementSourceDivers.contributionsSocialesRevenusActivite;
      // Crédit égal à l'impôt français (1AF…, 8TK) : CEHR et CDHR diminuées au prorata de ce revenu dans le RFR
      // (simulateur officiel 2026 : 1AJ 150 000 € + 1AF 300 000 € → CEHR 5 563 × 1/3 = 1 854 €).
      const partHorsCreditFrancais = impot.revenuFiscalReference > 0
        ? Math.max(0, 1 - revenuCreditImpotFrancais / impot.revenuFiscalReference)
        : 1;
      const cehrBrute = calculerCEHR(impot.revenuFiscalReference, foyerInput.situationFamille, impot.revenuExceptionnelQuotient, parametres);
      const cehr = Math.round(cehrBrute * partHorsCreditFrancais);
      // CDHR : impôt retenu IR1 = impôt net, hors acomptes et crédits restituables d'acompte (2CK, assurance-vie),
      // hors crédits conventionnels et avantages listés (réintégrés, dans la limite de l'impôt), hors brevets.
      const reductionsListees = investissementsOutreMer.reductions + souscriptionsCapital.reductions
        + investissementsLocatifs.reductions + investissementsPinel.reductions + investissementsScellier.reductions
        + investissementsCensiBouvard.reductions
        + (parametres.cdhr.donsReintegres ? reductionsCreditsImpot.reductionDons75 + reductionsCreditsImpot.reductionDons66 : 0);
      const creditsListes = investissementsOutreMer.credit + investissementsForestiers.credit
        + investissementsLocatifs.creditBornes + reductionsCreditsImpot.creditAutonomie;
      const impotRetenuCDHR = impot.impotNet - impot.taxesAnnexes
        + impot.creditImpotValeursEtrangeres2CK + impot.creditImpotAssuranceVie
        + impot.creditImpotEtranger2AB + impot.creditImpotEtrangerCadre8 + impot.creditImpotFrancais
        + Math.min(reductionsListees, impot.reductionsImpot) + Math.min(creditsListes, impot.creditsImpotCadre7)
        - Math.round(revenusNonSalaries.produitsBrevets * TAUX_BREVETS);
      const cdhrBrute = calculerCDHR({
          revenuFiscalReference: impot.revenuFiscalReference,
          revenuExceptionnelQuotient: impot.revenuExceptionnelQuotient,
          abattementDividendes: revenuCapitauxMobiliers.abattementDividendes,
          produitsBrevets: revenusNonSalaries.produitsBrevets,
          abattementFixeDirigeant: Math.min(plusValues?.case3va ?? 0, plusValues?.case3ua ?? 0)
            + Math.min(plusValues?.case3tk ?? 0, plusValues?.case3tj ?? 0) + Math.min(plusValues?.case3tm ?? 0, plusValues?.case3tl ?? 0),
          impotRetenu: impotRetenuCDHR,
          cehr: cehrBrute,
          prelevementsLiberatoires: prelevementsSociauxCapitauxMobiliers.prelevementLiberatoire2DH,
          situationFamille: foyerInput.situationFamille,
          personnesCharge: foyerInput.enfantsCharge.length + foyerInput.personnesInvalidesCharge.length
            + foyerInput.enfantsMajeursRattaches + (foyerInput.personnesRattacheesFoyerDistinct ?? 0),
        }, parametres);
      const cdhr = {
        ...cdhrBrute,
        cdhr: Math.round(cdhrBrute.cdhr * partHorsCreditFrancais),
        // Revenus au quotient : règle du quart (BOI-IR-CDHR-10 §140, §250) non modélisée.
        approximative: impot.revenuExceptionnelQuotient > 0,
      };
      // 7HB (avance immédiate, CESU+) : solde calculé même sans cadre 8 ; le simulateur l'exige avec 7DB.
      const avance7HB = Math.max(0, reductions?.case7hb ?? 0);
      const solde = prelevementSource || avance7HB > 0
        ? calculerSoldeImpot(prelevementSourceDivers, impot.impotNet + cehr + cdhr.cdhr, prelevementsSociauxTotal, avance7HB)
        : null;

      const plafonnementIFI: Plafonnement2042 | null = foyer === null ? null : {
        impots: impot.impotApresDecote + impot.impotForfaitaire + cehr + prelevementsSociauxTotal,
        revenus: impot.revenuFiscalReference,
      };
      const ifi = donneesIFI ? calculerDonneesIFI(anneeIFI, donneesIFI, plafonnementIFI, parametres) : null;

      return {
        anneeRevenus,
        anneeIFI,
        parametres,
        loading: loadingIFI || loading2044 || loadingFoyer || loadingRevenus || loadingGains || loadingExoneres || loadingPensions || loadingCapitauxMobiliers || loadingPlusValues || loadingFonciers2042 || loadingNonSalaries || loadingCharges || loadingReductions || loadingPrelevementSource,
        foyerRenseigne: foyer !== null,
        revenusRenseignes: revenus !== null || gains !== null || exoneres !== null || pensions !== null || capitauxMobiliers !== null || plusValues !== null || fonciers2042 !== null || nonSalaries !== null || charges !== null || reductions !== null || prelevementSource !== null || declaration2044 !== null,
        revenuSalaires,
        gainsActionnariat,
        revenuExonereTauxEffectif,
        pensionsRetraitesRentes,
        revenuCapitauxMobiliers,
        plusValuesGainsDivers,
        prelevementsSociauxCapitauxMobiliers,
        prelevementsSociauxPensionsRetraitesRentes,
        prelevementsSociauxGainsActionnariat,
        parts,
        revenusFonciers,
        revenusFonciers2042,
        revenusNonSalaries,
        deficitAgricoleImpute,
        chargesDeductibles,
        abattementsSpeciaux,
        alertesChargesDeductibles: alertesChargesDeductibles(charges ?? CHARGES_DEDUCTIBLES_PAR_DEFAUT, foyerInput, anneeRevenus),
        alerte8TK: verification8TK.alerte,
        presentationReductions: (() => {
          const mecenatEntreprise = Math.min(souscriptionsCapital.mecenatEntreprise, impot.reductionsImpot);
          // « Droits simples » du simulateur : après taux effectif, avant la réduction complémentaire du quotient
          // familial, hors impôt sur les revenus au quotient (RVG/RUA, 0XX), ajouté plus loin dans son calcul.
          const droitsSimples = Math.round(impot.impotProportionnel + impot.reductionComplementaireQuotientFamilial
            - impot.impotSupplementaireQuotientExceptionnel);
          return { totalReductions: impot.reductionsImpot - mecenatEntreprise + impot.creditImpotFrancais, mecenatEntreprise, droitsSimples };
        })(),
        alertesSaisie: controlerSaisie2042({
          foyer: foyerInput, anneeRevenus, salaires: revenusInput, gains, pensions: pensionsInput,
          capitauxMobiliers: capitauxMobiliersInput, plusValues, fonciers: fonciers2042Input, nonSalaries: nonSalariesInput,
          charges, reductions, prelevementSource: prelevementSourceInput,
        }).concat(alerteCasesSupprimees(casesSupprimees2027Saisies({ reductions: reductionsSaisies, charges: chargesSaisies }, anneeRevenus))),
        reductionsCreditsImpot,
        plafonnementNiches,
        prelevementSourceDivers,
        reductionPrelevementsSociaux,
        prelevementsSociauxTotal,
        cehr,
        cdhr,
        solde,
        revenuBrutGlobal,
        impot,
        plafonnementIFI,
        ifi,
      };
    };

    const avecOption = simuler({ ...capitauxMobiliersSaisis, case2op: true });
    const sansOption = simuler({ ...capitauxMobiliersSaisis, case2op: false });
    const colonne = (r: typeof avecOption): ColonneComparatif => {
      const impotProportionnel = r.impot.impotForfaitaire + r.impot.impotTauxMarginal + r.impot.taxesAnnexes;
      return {
        revenuBrutGlobal: r.revenuBrutGlobal,
        impotBareme: r.impot.impotApresDecote,
        impotProportionnel,
        prelevementsSociaux: r.prelevementsSociauxTotal,
        reductions: r.impot.impotApresDecote + impotProportionnel + r.impot.reprisesImpot - r.impot.impotNet,
        cehr: r.cehr,
        cdhr: r.cdhr.cdhr,
        imposition: r.impot.impotNet + r.cehr + r.cdhr.cdhr + r.prelevementsSociauxTotal
          + r.prelevementsSociauxCapitauxMobiliers.prelevementLiberatoire2DH,
      };
    };
    const pfu = colonne(sansOption);
    const bareme = colonne(avecOption);
    // Gain anticipé de la CSG déductible l'année suivante, au TMI de la colonne barème (comme ClickImpôts).
    const csgAnticipee = csgDeductibleAnticipee(capitauxMobiliersSaisis);
    const tmiAnticipe = avecOption.impot.tmi;
    const gainFiscalAnticipe = Math.round(csgAnticipee * tmiAnticipe);
    const impotSansOption = pfu.imposition;
    const impotAvecOption = bareme.imposition - gainFiscalAnticipe;
    // Mode le plus favorable (2OP non tranchée) : barème seulement s'il réduit l'imposition à comparer, PFU à égalité.
    const automatique = capitauxMobiliersSaisis.case2op === null;
    const optionActuelle = automatique ? impotAvecOption < impotSansOption : capitauxMobiliersSaisis.case2op === true;
    const resultat = optionActuelle ? avecOption : sansOption;
    const comparaisonOptionBareme: ComparaisonOptionBareme | null = Math.round(impotAvecOption) === Math.round(impotSansOption)
      ? null
      : {
        pfu, bareme, csgDeductibleAnticipee: csgAnticipee, tmiAnticipe, gainFiscalAnticipe,
        optionActuelle, automatique, impotAvecOption, impotSansOption,
      };

    return { ...resultat, comparaisonOptionBareme };
  }, [anneeRevenus, anneeIFI, parametres, donneesIFI, loadingIFI, declaration2044, loading2044, foyer, revenus, gains, exoneres, pensions, capitauxMobiliers, plusValues, loadingPlusValues, fonciers2042, loadingFonciers2042, nonSalaries, loadingNonSalaries, charges, chargesSaisies, loadingCharges, reductions, reductionsSaisies, loadingReductions, prelevementSource, loadingPrelevementSource, loadingFoyer, loadingRevenus, loadingGains, loadingExoneres, loadingPensions, loadingCapitauxMobiliers]);

  const overview = useMemo(
    () => evaluer(capitauxMobiliers ?? REVENUS_CAPITAUX_MOBILIERS_PAR_DEFAUT),
    [evaluer, capitauxMobiliers],
  );
  const simulerOptionBareme = useCallback(
    (cm: RevenusCapitauxMobiliersInput) => evaluer(cm).comparaisonOptionBareme,
    [evaluer],
  );

  return { ...overview, simulerOptionBareme, refetch };
}
