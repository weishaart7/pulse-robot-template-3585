import { useMemo } from 'react';
import { useFoyerFiscal } from './useFoyerFiscal';
import { useRevenusSalaires } from './useRevenusSalaires';
import { useGainsActionnariatSalarie } from './useGainsActionnariatSalarie';
import { useRevenusExoneresTauxEffectif } from './useRevenusExoneresTauxEffectif';
import { usePensionsRetraitesRentes } from './usePensionsRetraitesRentes';
import { useRevenusCapitauxMobiliers } from './useRevenusCapitauxMobiliers';
import {
  calculerGainsActionnariatSalarie,
  calculerImpot,
  calculerPartsFiscales,
  calculerPensionsRetraitesRentes,
  calculerRevenuCapitauxMobiliers,
  calculerRevenuExonereTauxEffectif,
  calculerRevenuSalaires,
  FoyerFiscalInput,
  GainsActionnariatSalarieInput,
  GainsActionnariatSalarieResult,
  ImpotResult,
  PartsFiscalesResult,
  PensionsRetraitesRentesInput,
  PensionsRetraitesRentesResult,
  RevenuCapitauxMobiliersResult,
  RevenuExonereTauxEffectifResult,
  RevenuSalairesResult,
  RevenusCapitauxMobiliersInput,
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

export interface FiscalOverview {
  loading: boolean;
  foyerRenseigne: boolean;
  revenusRenseignes: boolean;
  revenuSalaires: RevenuSalairesResult;
  gainsActionnariat: GainsActionnariatSalarieResult;
  revenuExonereTauxEffectif: RevenuExonereTauxEffectifResult;
  pensionsRetraitesRentes: PensionsRetraitesRentesResult;
  revenuCapitauxMobiliers: RevenuCapitauxMobiliersResult;
  parts: PartsFiscalesResult;
  impot: ImpotResult;
  /** Recharge les 6 sources Supabase — à appeler après une saisie dans la 2042 (voir FiscaliteSection.tsx). */
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

  const refetch = () => {
    refetchFoyer();
    refetchRevenus();
    refetchGains();
    refetchExoneres();
    refetchPensions();
    refetchCapitauxMobiliers();
  };

  const overview = useMemo(() => {
    const foyerInput = foyer ?? FOYER_PAR_DEFAUT;
    const revenusInput = revenus ?? REVENUS_SALAIRES_PAR_DEFAUT;
    const gainsInput = gains ?? GAINS_ACTIONNARIAT_PAR_DEFAUT;
    const exoneresInput = exoneres ?? REVENUS_EXONERES_PAR_DEFAUT;
    const pensionsInput = pensions ?? PENSIONS_RETRAITES_RENTES_PAR_DEFAUT;
    const capitauxMobiliersInput = capitauxMobiliers ?? REVENUS_CAPITAUX_MOBILIERS_PAR_DEFAUT;

    const revenuSalaires = calculerRevenuSalaires(revenusInput);
    const gainsActionnariat = calculerGainsActionnariatSalarie(gainsInput);
    const revenuExonereTauxEffectif = calculerRevenuExonereTauxEffectif(exoneresInput);
    const pensionsRetraitesRentes = calculerPensionsRetraitesRentes(pensionsInput);
    const revenuCapitauxMobiliers = calculerRevenuCapitauxMobiliers(capitauxMobiliersInput, foyerInput.situationFamille);
    const parts = calculerPartsFiscales(foyerInput);
    const revenuImposableTotal = revenuSalaires.totalNetImposable + gainsActionnariat.totalNetImposable
      + pensionsRetraitesRentes.totalNetImposable + revenuCapitauxMobiliers.totalNetImposable;
    const impotForfaitaireTotal = gainsActionnariat.impotForfaitaire + pensionsRetraitesRentes.impotForfaitaire
      + revenuCapitauxMobiliers.impotForfaitaire;
    // Crédit d'impôt égal à l'impôt français (1AF/1BF, 1AL/1BL, 1AR/1BR/1CR/1DR) : additionné au
    // revenu retenu pour le taux effectif, mathématiquement équivalent dans les deux cas (imputé
    // avant réduction outre-mer/décote) — hypothèse retenue, voir docs/fiscalite.md.
    const revenuExonereEtCreditImpot = revenuExonereTauxEffectif.totalRetenu
      + revenuSalaires.revenuCreditImpotEgalImpotFrancais
      + pensionsRetraitesRentes.revenuCreditImpotEgalImpotFrancais;
    const impot = calculerImpot(
      revenuImposableTotal,
      parts,
      foyerInput.situationFamille,
      revenuExonereEtCreditImpot,
      foyerInput.lieuResidence,
      impotForfaitaireTotal,
      gainsActionnariat.revenuExceptionnelQuotient,
      revenuCapitauxMobiliers.creditImpotAssuranceVie,
    );

    return {
      loading: loadingFoyer || loadingRevenus || loadingGains || loadingExoneres || loadingPensions || loadingCapitauxMobiliers,
      foyerRenseigne: foyer !== null,
      revenusRenseignes: revenus !== null || gains !== null || exoneres !== null || pensions !== null || capitauxMobiliers !== null,
      revenuSalaires,
      gainsActionnariat,
      revenuExonereTauxEffectif,
      pensionsRetraitesRentes,
      revenuCapitauxMobiliers,
      parts,
      impot,
    };
  }, [foyer, revenus, gains, exoneres, pensions, capitauxMobiliers, loadingFoyer, loadingRevenus, loadingGains, loadingExoneres, loadingPensions, loadingCapitauxMobiliers]);

  return { ...overview, refetch };
}
