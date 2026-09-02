import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getAssetCategory } from '@/constants/assetTypes';
import { AVContractRawRow } from '@/utils/transmissionHelpers';
import { Asset } from '@/services/assetService';

/**
 * Récupère les lignes brutes (opérations + clause bénéficiaire) des contrats
 * d'assurance-vie présents dans `assets`, prêtes pour
 * utils/transmissionHelpers.ts::buildAVContracts. Ne fait aucun calcul fiscal
 * lui-même (cf. buildAVContracts, pur).
 */
export function useAVContracts(assets: Asset[]) {
  const { user } = useAuth();
  const [avContractsRaw, setAvContractsRaw] = useState<AVContractRawRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const avAssetIds = assets
    .filter(a => getAssetCategory(a.nature || '') === 'épargne et assurance-vie')
    .map(a => a.id)
    .filter((id): id is string => !!id)
    .sort()
    .join(',');

  useEffect(() => {
    const ids = avAssetIds ? avAssetIds.split(',') : [];

    if (!user || ids.length === 0) {
      setAvContractsRaw([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const [detailsRes, opsRes] = await Promise.all([
        supabase.from('av_contract_details').select('asset_id, clause_beneficiaire_structuree, origine_fonds').in('asset_id', ids),
        supabase.from('av_operations').select('asset_id, type_operation, montant, date_operation').in('asset_id', ids)
      ]);
      if (cancelled) return;

      if (detailsRes.error || opsRes.error) {
        console.error('Erreur chargement contrats assurance-vie:', detailsRes.error || opsRes.error);
        setAvContractsRaw([]);
        setError("Les données d'assurance-vie n'ont pas pu être chargées.");
        setLoading(false);
        return;
      }

      const clauseByAsset = new Map<string, any>(
        (detailsRes.data || []).map((d: any) => [d.asset_id, d.clause_beneficiaire_structuree || null])
      );
      const origineFondsByAsset = new Map<string, string | null>(
        (detailsRes.data || []).map((d: any) => [d.asset_id, d.origine_fonds || null])
      );
      const opsByAsset = new Map<string, { type_operation: string; montant: number | null; date_operation: string }[]>();
      (opsRes.data || []).forEach((op: any) => {
        const list = opsByAsset.get(op.asset_id) || [];
        list.push({ type_operation: op.type_operation, montant: op.montant, date_operation: op.date_operation });
        opsByAsset.set(op.asset_id, list);
      });

      const avAssets = assets.filter(a => a.id && ids.includes(a.id));
      const rows: AVContractRawRow[] = avAssets.map(a => ({
        assetId: a.id!,
        label: a.denomination,
        valeurEstimee: a.valeur_estimee,
        detenteur: a.detenteur,
        origineFonds: origineFondsByAsset.get(a.id!) || null,
        operations: opsByAsset.get(a.id!) || [],
        clauseBeneficiaireStructuree: clauseByAsset.get(a.id!) || null,
        nature: a.nature
      }));

      setAvContractsRaw(rows);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, avAssetIds]);

  return { avContractsRaw, loading, error };
}
