import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Asset } from '@/services/assetService';
import { assetDemembrementService, type AssetDemembrement } from '@/services/assetDemembrementService';
import { getFractionDemembrement } from '@/lib/patrimoine/demembrementFraction';
import { useFamilyLinks, useFamilyProfile, useMaritalStatus } from '@/hooks/useFamilyData';

/**
 * Fraction de démembrement d'un actif (barème 669 CGI), avec le même contexte familial que le Résumé
 * Patrimoine et la Vue d'ensemble Immobilier : 1 en pleine propriété, null si l'âge de l'usufruitier
 * n'est pas calculable.
 */
export function useFractionDemembrement() {
  const [demembrements, setDemembrements] = useState<AssetDemembrement[]>([]);
  const { data: familyProfile } = useFamilyProfile();
  const { data: maritalStatus } = useMaritalStatus();
  const { data: familyLinks } = useFamilyLinks();

  useEffect(() => {
    assetDemembrementService.getAllForUser().then(setDemembrements).catch(() => setDemembrements([]));
  }, []);

  const ctx = useMemo(() => ({ familyProfile, maritalStatus, familyLinks }), [familyProfile, maritalStatus, familyLinks]);

  return useCallback(
    (asset: Asset): number | null =>
      getFractionDemembrement(asset, demembrements.filter((d) => d.asset_id === asset.id), ctx),
    [demembrements, ctx],
  );
}
