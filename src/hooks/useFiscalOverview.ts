import { useMemo } from 'react';
import { useFoyerFiscal } from './useFoyerFiscal';
import { useRevenusSalaires } from './useRevenusSalaires';
import { useGainsActionnariatSalarie } from './useGainsActionnariatSalarie';
import { useRevenusExoneresTauxEffectif } from './useRevenusExoneresTauxEffectif';
import {
  calculerGainsActionnariatSalarie,
  calculerImpot,
  calculerPartsFiscales,
  calculerRevenuExonereTauxEffectif,
  calculerRevenuSalaires,
  FoyerFiscalInput,
  GainsActionnariatSalarieInput,
  GainsActionnariatSalarieResult,
  ImpotResult,
  PartsFiscalesResult,
  RevenuExonereTauxEffectifResult,
  RevenuSalairesResult,
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
  case3vd: null, case3vi: null, case3vf: null,
  case3vj: null, case3vk: null,
  case3vn: null,
};

const REVENUS_EXONERES_PAR_DEFAUT: RevenusExoneresTauxEffectifInput = {
  case1ac: null, case1bc: null,
  case1ge: false, case1he: false,
  case1ae: null, case1be: null,
  case1ah: null, case1bh: null,
  caseRse: null, caseRsf: null,
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
  case1ap: null, case1bp: null,
  case1af: null, case1bf: null,
  case1ag: null, case1bg: null,
  case1ak: null, case1bk: null,
  case1pm: null, case1qm: null,
  case1dy: null, case1ey: null,
  case1sm: null, case1dn: null,
};

export interface FiscalOverview {
  loading: boolean;
  foyerRenseigne: boolean;
  revenusRenseignes: boolean;
  revenuSalaires: RevenuSalairesResult;
  gainsActionnariat: GainsActionnariatSalarieResult;
  revenuExonereTauxEffectif: RevenuExonereTauxEffectifResult;
  parts: PartsFiscalesResult;
  impot: ImpotResult;
  /** Recharge les 4 sources Supabase — à appeler après une saisie dans la 2042 (voir FiscaliteSection.tsx). */
  refetch: () => void;
}

/**
 * Agrège foyer fiscal + revenus salaires + gains d'actionnariat salarié +
 * revenus exonérés retenus pour le taux effectif, et calcule le résultat IR
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

  const refetch = () => {
    refetchFoyer();
    refetchRevenus();
    refetchGains();
    refetchExoneres();
  };

  const overview = useMemo(() => {
    const foyerInput = foyer ?? FOYER_PAR_DEFAUT;
    const revenusInput = revenus ?? REVENUS_SALAIRES_PAR_DEFAUT;
    const gainsInput = gains ?? GAINS_ACTIONNARIAT_PAR_DEFAUT;
    const exoneresInput = exoneres ?? REVENUS_EXONERES_PAR_DEFAUT;

    const revenuSalaires = calculerRevenuSalaires(revenusInput);
    const gainsActionnariat = calculerGainsActionnariatSalarie(gainsInput);
    const revenuExonereTauxEffectif = calculerRevenuExonereTauxEffectif(exoneresInput);
    const parts = calculerPartsFiscales(foyerInput);
    const revenuImposableTotal = revenuSalaires.totalNetImposable + gainsActionnariat.totalNetImposable;
    const impot = calculerImpot(
      revenuImposableTotal,
      parts,
      foyerInput.situationFamille,
      revenuExonereTauxEffectif.totalRetenu,
      foyerInput.lieuResidence,
      gainsActionnariat.impotForfaitaire,
    );

    return {
      loading: loadingFoyer || loadingRevenus || loadingGains || loadingExoneres,
      foyerRenseigne: foyer !== null,
      revenusRenseignes: revenus !== null || gains !== null || exoneres !== null,
      revenuSalaires,
      gainsActionnariat,
      revenuExonereTauxEffectif,
      parts,
      impot,
    };
  }, [foyer, revenus, gains, exoneres, loadingFoyer, loadingRevenus, loadingGains, loadingExoneres]);

  return { ...overview, refetch };
}
