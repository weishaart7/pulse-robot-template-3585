import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { calculerDonnees2044, chargerDonnees2044 } from '@/services/declaration2044Donnees';
import { revenusFonciersPour2042, type Declaration2044Result, type RevenusFonciers2042 } from '@/lib/fiscalite/calculerDeclaration2044';
import { calculerDonneesIFI, chargerDonneesIFI, type DonneesIFI, type Plafonnement2042 } from '@/services/declarationIFIDonnees';
import type { DeclarationIFIResultat } from '@/lib/fiscalite/calculerDeclarationIFI';
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
  calculerReductionsCreditsImpot,
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
  SEUIL_DEFICIT_AGRICOLE,
  RevenusNonSalariesResult,
  ChargesDeductiblesInput,
  ChargesDeductiblesResult,
  ReductionsCreditsImpotInput,
  ReductionsCreditsImpotResult,
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
  case2vq: null, case2vr: null, case2vs: null, case2vt: null, case2vu: null,
  case2op: false,
};

const PLUS_VALUES_PAR_DEFAUT: PlusValuesGainsDiversInput = {
  case3vg: null, case3sg: null, case3vh: null, case3ua: null, case3sl: null, case3va: null,
  case3vt: null, case3pi: null, case3sb: null, case3we: null,
  case3an: null, case3bn: null, case3cn: false,
  case3vz: null, case3vw: null,
  case3sj: null, case3tj: null, case3tk: null, case3sk: null, case3tl: null, case3tm: null, case3pc: null, case3pe: null,
  case3vq: null, case3vr: null, case3vc: null, case3ex: null,
};

const REVENUS_FONCIERS_2042_PAR_DEFAUT: RevenusFonciers2042Input = {
  case4be: null, case4bk: null, case4bl: null, case4bn: false, case4bz: false,
  case4by: null, case4ea: null, case4eb: null,
};

const CHARGES_DEDUCTIBLES_PAR_DEFAUT: ChargesDeductiblesInput = {
  case6de: null, case6el: null, case6em: null, case6gu: null, case6gi: null, case6gj: null, case6gp: null,
  case6ns: null, case6nt: null, case6rs: null, case6rt: null, case6ps: null, case6pt: null,
  case6qr: false, case6qw: false, case6os: null, case6ot: null, case6qs: null, case6qt: null,
  case6dg: null, case6dd: null, case6ev: null, case6eu: null, case6hp: null, case6hq: null, case6hr: null,
  case6gh: null, case6fa: null, case6fb: null, case6fc: null, case6fd: null, case6fe: null, case6fl: null,
};

const REDUCTIONS_CREDITS_IMPOT_PAR_DEFAUT: ReductionsCreditsImpotInput = {
  case7ud: null, case7uq: null, case7uj: null, case7uf: null,
  case7db: null, case7dr: null, case7dl: null, case7dq: false, case7dg: false, membresPlus65Ans: null,
};

/** Année des revenus du barème appliqué (BAREME_2026 : revenus 2025), celle de la 2044 reprise. */
export const ANNEE_REVENUS = 2025;
/** IFI au 1er janvier suivant l'année des revenus : son plafonnement reprend l'impôt de ces revenus. */
export const ANNEE_IFI = ANNEE_REVENUS + 1;

export interface FiscalOverview {
  loading: boolean;
  foyerRenseigne: boolean;
  revenusRenseignes: boolean;
  revenuSalaires: RevenuSalairesResult;
  gainsActionnariat: GainsActionnariatSalarieResult;
  revenuExonereTauxEffectif: RevenuExonereTauxEffectifResult;
  pensionsRetraitesRentes: PensionsRetraitesRentesResult;
  revenuCapitauxMobiliers: RevenuCapitauxMobiliersResult;
  /** Cadre 3 (phase 3.1) : barème, PFU 12,8 %, RFR et prélèvements sociaux à 18,6 % — voir calculerPlusValuesGainsDivers.ts. */
  plusValuesGainsDivers: PlusValuesGainsDiversResult;
  /**
   * Prélèvements sociaux (17,2 %) — périmètre partiel : seuls les capitaux
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
   * sources généralistes se contredisaient) : 1TP/1TT au régime salarial
   * (9,7 %), 1NX au régime carried-interest non qualifiant (28,6 % combiné),
   * 1NY/3VN aux contributions salariales spécifiques (30 %/10 %). 1TZ/1AY/
   * 1MP et les gains historiques 3VD/3VI/3VF/3VJ hors périmètre.
   */
  prelevementsSociauxGainsActionnariat: PrelevementsSociauxGainsActionnariatResult;
  parts: PartsFiscalesResult;
  /** Cases foncières saisies dans la 2042 (micro-foncier 4BE, 4BK/4BL, 4EA/4EB, 4BY) — voir calculerRevenusFonciers2042.ts. */
  revenusFonciers2042: RevenusFonciers2042Result;
  /** Cadre 5 (2042-C-PRO), régimes micro — voir calculerRevenusNonSalaries.ts. */
  revenusNonSalaries: RevenusNonSalariesResult;
  /** Déficit agricole de l'année retranché du revenu global (0 si les autres revenus nets dépassent SEUIL_DEFICIT_AGRICOLE). */
  deficitAgricoleImpute: number;
  /** Cadre 6 (charges déductibles, déficits globaux antérieurs, 6GH) — voir calculerChargesDeductibles.ts. */
  chargesDeductibles: ChargesDeductiblesResult;
  /** Cadre 7 (dons, services à la personne) — voir calculerReductionsCreditsImpot.ts. */
  reductionsCreditsImpot: ReductionsCreditsImpotResult;
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
export function useFiscalOverview(): FiscalOverview {
  const { data: foyer, loading: loadingFoyer, refetch: refetchFoyer } = useFoyerFiscal();
  const { data: revenus, loading: loadingRevenus, refetch: refetchRevenus } = useRevenusSalaires();
  const { data: gains, loading: loadingGains, refetch: refetchGains } = useGainsActionnariatSalarie();
  const { data: exoneres, loading: loadingExoneres, refetch: refetchExoneres } = useRevenusExoneresTauxEffectif();
  const { data: pensions, loading: loadingPensions, refetch: refetchPensions } = usePensionsRetraitesRentes();
  const { data: capitauxMobiliers, loading: loadingCapitauxMobiliers, refetch: refetchCapitauxMobiliers } = useRevenusCapitauxMobiliers();

  const { data: plusValues, loading: loadingPlusValues, refetch: refetchPlusValues } = usePlusValuesGainsDivers();

  const { data: fonciers2042, loading: loadingFonciers2042, refetch: refetchFonciers2042 } = useRevenusFonciers2042();
  const { data: nonSalaries, loading: loadingNonSalaries, refetch: refetchNonSalaries } = useRevenusNonSalaries();
  const { data: charges, loading: loadingCharges, refetch: refetchCharges } = useChargesDeductibles();
  const { data: reductions, loading: loadingReductions, refetch: refetchReductions } = useReductionsCreditsImpot();
  const { isAuthenticated } = useAuth();
  const [declaration2044, setDeclaration2044] = useState<Declaration2044Result | null>(null);
  const [loading2044, setLoading2044] = useState(true);
  const charger2044 = useCallback(() => {
    if (!isAuthenticated) { setLoading2044(false); return; }
    setLoading2044(true);
    // Sans création : seule une 2044 déjà ouverte pour l'année des revenus compte dans l'impôt.
    chargerDonnees2044(ANNEE_REVENUS, false)
      .then((d) => setDeclaration2044(d ? calculerDonnees2044(ANNEE_REVENUS, d) : null))
      .catch((error) => { if (import.meta.env.DEV) console.error('Erreur chargement 2044:', error); setDeclaration2044(null); })
      .finally(() => setLoading2044(false));
  }, [isAuthenticated]);
  useEffect(() => { charger2044(); }, [charger2044]);

  const [donneesIFI, setDonneesIFI] = useState<DonneesIFI | null>(null);
  const [loadingIFI, setLoadingIFI] = useState(true);
  const chargerIFI = useCallback(() => {
    if (!isAuthenticated) { setLoadingIFI(false); return; }
    setLoadingIFI(true);
    // Sans création : seule une 2042-IFI déjà ouverte pour l'année est reprise.
    chargerDonneesIFI(ANNEE_IFI, false)
      .then(setDonneesIFI)
      .catch((error) => { if (import.meta.env.DEV) console.error('Erreur chargement IFI:', error); setDonneesIFI(null); })
      .finally(() => setLoadingIFI(false));
  }, [isAuthenticated]);
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
  };

  const overview = useMemo(() => {
    const foyerInput = foyer ?? FOYER_PAR_DEFAUT;
    const revenusInput = revenus ?? REVENUS_SALAIRES_PAR_DEFAUT;
    const gainsInput = gains ?? GAINS_ACTIONNARIAT_PAR_DEFAUT;
    const exoneresInput = exoneres ?? REVENUS_EXONERES_PAR_DEFAUT;
    const pensionsInput = pensions ?? PENSIONS_RETRAITES_RENTES_PAR_DEFAUT;
    const capitauxMobiliersInput = capitauxMobiliers ?? REVENUS_CAPITAUX_MOBILIERS_PAR_DEFAUT;

    const revenuSalaires = calculerRevenuSalaires(revenusInput, exoneresInput);
    const gainsActionnariat = calculerGainsActionnariatSalarie(gainsInput);
    const revenuExonereTauxEffectif = calculerRevenuExonereTauxEffectif(
      exoneresInput,
      revenuSalaires.salairesNetImposablesExoneresTauxEffectif,
    );
    const pensionsRetraitesRentes = calculerPensionsRetraitesRentes(pensionsInput);
    const revenuCapitauxMobiliers = calculerRevenuCapitauxMobiliers(capitauxMobiliersInput, foyerInput.situationFamille);
    const prelevementsSociauxCapitauxMobiliers = calculerPrelevementsSociauxCapitauxMobiliers(capitauxMobiliersInput);
    // 2OP vaut pour le cadre 2 et pour les plus-values mobilières du cadre 3.
    const plusValuesGainsDivers = calculerPlusValuesGainsDivers(plusValues ?? PLUS_VALUES_PAR_DEFAUT, capitauxMobiliersInput.case2op);
    const prelevementsSociauxGainsActionnariat = calculerPrelevementsSociauxGainsActionnariatSalarie(gainsInput);
    const parts = calculerPartsFiscales(foyerInput);
    const revenusFonciers = declaration2044 ? revenusFonciersPour2042(declaration2044) : null;
    const revenusNonSalaries = calculerRevenusNonSalaries(nonSalaries ?? REVENUS_NON_SALARIES_VIDE);
    const revenusFonciers2042 = calculerRevenusFonciers2042(
      fonciers2042 ?? REVENUS_FONCIERS_2042_PAR_DEFAUT,
      revenusFonciers?.revenuFoncierNetImposable ?? null,
    );
    const revenuImposableAvantDeficitAgricole = revenuSalaires.totalNetImposable + gainsActionnariat.totalNetImposable
      + pensionsRetraitesRentes.totalNetImposable + revenuCapitauxMobiliers.totalNetImposable
      + plusValuesGainsDivers.totalNetImposable
      + (revenusFonciers?.incidenceRevenuImposable ?? 0)
      + revenusFonciers2042.totalNetImposable - revenusFonciers2042.deductionReel4BL
      + revenusNonSalaries.totalNetImposable;
    // Art. 156 I 1° CGI : « revenus nets d'autres sources » approchés par le revenu imposable hors déficit agricole.
    const deficitAgricoleImpute = revenuImposableAvantDeficitAgricole <= SEUIL_DEFICIT_AGRICOLE ? revenusNonSalaries.deficitAgricole : 0;
    const revenuBrutGlobal = revenuImposableAvantDeficitAgricole - deficitAgricoleImpute;
    const chargesDeductibles = calculerChargesDeductibles(charges ?? CHARGES_DEDUCTIBLES_PAR_DEFAUT, revenuBrutGlobal);
    const revenuImposableTotal = revenuBrutGlobal + chargesDeductibles.incidenceRevenuImposable;
    const impotForfaitaireTotal = gainsActionnariat.impotForfaitaire + pensionsRetraitesRentes.impotForfaitaire
      + revenuCapitauxMobiliers.impotForfaitaire + plusValuesGainsDivers.impotForfaitaire
      + revenusNonSalaries.impotForfaitaire;
    const prelevementsSociauxPensionsRetraitesRentes = calculerPrelevementsSociauxPensionsRetraitesRentes(pensionsInput);
    // Crédit d'impôt égal à l'impôt français (1AF/1BF, 1AL/1BL, 1AR/1BR/1CR/1DR) : additionné au
    // revenu retenu pour le taux effectif, mathématiquement équivalent dans les deux cas (imputé
    // avant réduction outre-mer/décote) — hypothèse retenue, voir docs/fiscalite.md.
    const revenuExonereEtCreditImpot = revenuExonereTauxEffectif.totalRetenu
      + revenuSalaires.revenuCreditImpotEgalImpotFrancais
      + pensionsRetraitesRentes.revenuCreditImpotEgalImpotFrancais
      + revenusFonciers2042.revenuCreditImpotEgalImpotFrancais + revenusFonciers2042.revenuExonereTauxEffectif
      + revenusNonSalaries.revenuExonereTauxEffectif + revenusNonSalaries.revenuCreditImpotEgalImpotFrancais;
    const reductionsCreditsImpot = calculerReductionsCreditsImpot(
      reductions ?? REDUCTIONS_CREDITS_IMPOT_PAR_DEFAUT, foyerInput, revenuImposableTotal,
    );
    const impot = calculerImpot(
      revenuImposableTotal,
      parts,
      foyerInput.situationFamille,
      revenuExonereEtCreditImpot,
      foyerInput.lieuResidence,
      impotForfaitaireTotal,
      gainsActionnariat.revenuExceptionnelQuotient,
      revenuCapitauxMobiliers.creditImpotAssuranceVie,
      revenuCapitauxMobiliers.creditImpotEtranger2AB,
      revenuCapitauxMobiliers.creditImpotValeursEtrangeres2CK,
      revenuSalaires.revenuExonereRetenuPourRFR + revenuCapitauxMobiliers.revenuExonereRetenuPourRFR
        + plusValuesGainsDivers.revenuExonereRetenuPourRFR + revenusFonciers2042.revenuExonereRetenuPourRFR
        + revenusNonSalaries.revenuExonereRetenuPourRFR + chargesDeductibles.epargneRetraiteRetenuePourRFR,
      reductionsCreditsImpot.totalReductions,
      reductionsCreditsImpot.creditServicesPersonne,
    );

    const plafonnementIFI: Plafonnement2042 | null = foyer === null ? null : {
      impots: impot.impotApresDecote + impot.impotForfaitaire
        + prelevementsSociauxCapitauxMobiliers.prelevementsSociaux
        + prelevementsSociauxPensionsRetraitesRentes.prelevementsSociaux
        + prelevementsSociauxGainsActionnariat.prelevementsSociaux
        + plusValuesGainsDivers.prelevementsSociaux
        + (revenusFonciers?.prelevementsSociaux ?? 0)
        + revenusFonciers2042.prelevementsSociaux
        + revenusNonSalaries.prelevementsSociaux,
      revenus: impot.revenuFiscalReference,
    };
    const ifi = donneesIFI ? calculerDonneesIFI(ANNEE_IFI, donneesIFI, plafonnementIFI) : null;

    return {
      loading: loadingIFI || loading2044 || loadingFoyer || loadingRevenus || loadingGains || loadingExoneres || loadingPensions || loadingCapitauxMobiliers || loadingPlusValues || loadingFonciers2042 || loadingNonSalaries || loadingCharges || loadingReductions,
      foyerRenseigne: foyer !== null,
      revenusRenseignes: revenus !== null || gains !== null || exoneres !== null || pensions !== null || capitauxMobiliers !== null || plusValues !== null || fonciers2042 !== null || nonSalaries !== null || charges !== null || reductions !== null || declaration2044 !== null,
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
      reductionsCreditsImpot,
      impot,
      plafonnementIFI,
      ifi,
    };
  }, [donneesIFI, loadingIFI, declaration2044, loading2044, foyer, revenus, gains, exoneres, pensions, capitauxMobiliers, plusValues, loadingPlusValues, fonciers2042, loadingFonciers2042, nonSalaries, loadingNonSalaries, charges, loadingCharges, reductions, loadingReductions, loadingFoyer, loadingRevenus, loadingGains, loadingExoneres, loadingPensions, loadingCapitauxMobiliers]);

  return { ...overview, refetch };
}
