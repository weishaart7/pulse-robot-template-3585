import { useMemo } from 'react';
import { useFoyerFiscal } from './useFoyerFiscal';
import { useRevenusSalaires } from './useRevenusSalaires';
import {
  calculerImpot,
  calculerPartsFiscales,
  calculerRevenuSalaires,
  FoyerFiscalInput,
  ImpotResult,
  PartsFiscalesResult,
  RevenuSalairesResult,
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
  parts: PartsFiscalesResult;
  impot: ImpotResult;
}

/**
 * Agrège foyer fiscal + revenus salaires et calcule le résultat IR (V1 :
 * salaires uniquement — voir docs/fiscalite.md). Un seul point de calcul
 * partagé entre FiscalOverviewCard et TaxRateCard pour éviter deux appels
 * Supabase et deux implémentations divergentes du même résultat.
 */
export function useFiscalOverview(): FiscalOverview {
  const { data: foyer, loading: loadingFoyer } = useFoyerFiscal();
  const { data: revenus, loading: loadingRevenus } = useRevenusSalaires();

  return useMemo(() => {
    const foyerInput = foyer ?? FOYER_PAR_DEFAUT;
    const revenusInput = revenus ?? REVENUS_SALAIRES_PAR_DEFAUT;

    const revenuSalaires = calculerRevenuSalaires(revenusInput);
    const parts = calculerPartsFiscales(foyerInput);
    const impot = calculerImpot(revenuSalaires.totalNetImposable, parts, foyerInput.situationFamille);

    return {
      loading: loadingFoyer || loadingRevenus,
      foyerRenseigne: foyer !== null,
      revenusRenseignes: revenus !== null,
      revenuSalaires,
      parts,
      impot,
    };
  }, [foyer, revenus, loadingFoyer, loadingRevenus]);
}
