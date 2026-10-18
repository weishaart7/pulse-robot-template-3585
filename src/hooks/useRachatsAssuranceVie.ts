import { useMemo } from 'react';
import { Asset } from '@/services/assetService';
import { getAssetCategory } from '@/constants/assetTypes';
import { useAVContracts } from '@/hooks/useAVContracts';
import { useMaritalStatus } from '@/hooks/useFamilyData';
import { isDetenteurSpouse } from '@/lib/patrimoine/utils';
import { computeRachatsAssuranceVie } from '@/lib/patrimoine/regimeFiscalAssuranceVie';
import type { FiscalRegimeResult } from '@/lib/patrimoine/regimeFiscalPlusValue';

const STATUTS_IMPOSITION_COMMUNE = ['Marié(e)', 'Pacsé(e)'];

/**
 * Régime fiscal d'un rachat total de chaque contrat d'assurance-vie / capitalisation du foyer
 * (calcul commun à tous les contrats, cf. computeRachatsAssuranceVie). `plusValues` : gain
 * latent par actif, tel qu'affiché par l'appelant.
 */
export function useRachatsAssuranceVie(assets: Asset[], plusValues: Record<string, number>) {
  const contratsAV = useMemo(
    // Contrat article 82 hors sortie en rente : rachat au régime de l'assurance-vie.
    () => assets.filter((a) => a.id && (getAssetCategory(a.nature) === 'épargne et assurance-vie'
      || (a.nature === 'Contrat article 82' && a.mode_sortie !== 'Rente') || a.nature === 'Vie entière')),
    [assets]
  );
  const { avContractsRaw } = useAVContracts(contratsAV);
  const { data: maritalStatus } = useMaritalStatus();
  const impositionCommune = STATUTS_IMPOSITION_COMMUNE.includes(maritalStatus?.statut_couple || '');

  return useMemo<Record<string, FiscalRegimeResult>>(() => {
    const rows = new Map(avContractsRaw.map((r) => [r.assetId, r]));
    return computeRachatsAssuranceVie(
      contratsAV
        .filter((a) => plusValues[a.id!] !== undefined)
        .map((a) => ({
          id: a.id!,
          souscripteur: isDetenteurSpouse(a.detenteur) ? 'spouse' : 'user',
          plusValue: plusValues[a.id!],
          dateSouscription: a.date_acquisition,
          operations: rows.get(a.id!)?.operations || [],
          valeurAcquisition: a.valeur_acquisition ?? undefined,
          partUniteCompte: rows.get(a.id!)?.partUniteCompte,
        })),
      impositionCommune
    );
  }, [avContractsRaw, contratsAV, plusValues, impositionCommune]);
}
