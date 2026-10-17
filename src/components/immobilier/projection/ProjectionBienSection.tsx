import { useEffect, useMemo, useState } from 'react';
import { assetService, type Asset, type AssetCharge, type AssetRevenu } from '@/services/assetService';
import type { Emprunt } from '@/services/passifService';
import { useFractionDemembrement } from '@/hooks/useFractionDemembrement';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { HYPOTHESES_PAR_DEFAUT, horizonProjection, type HypothesesProjection } from '@/lib/immobilier/projection';
import { preparerProjectionBien, projeterPreparation } from '@/lib/immobilier/projectionBien';
import { ProjectionPanel } from './ProjectionPanel';

interface ProjectionBienSectionProps {
  asset: Asset;
  emprunts: Emprunt[];
}

// Projection d'un bien dans sa fiche : revenus et charges enregistrés, crédit (emprunt Patrimoine relié
// ou champs Financement enregistrés), hypothèses saisies ici sans persistance (0 % par défaut).
export const ProjectionBienSection = ({ asset, emprunts }: ProjectionBienSectionProps) => {
  const [revenus, setRevenus] = useState<AssetRevenu[]>([]);
  const [charges, setCharges] = useState<AssetCharge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hypotheses, setHypotheses] = useState<HypothesesProjection>(HYPOTHESES_PAR_DEFAUT);
  const fractionDe = useFractionDemembrement();

  useEffect(() => {
    if (!asset.id) return;
    let cancelled = false;
    setIsLoading(true);
    Promise.all([assetService.getAssetRevenus(asset.id), assetService.getAssetCharges(asset.id)])
      .then(([r, c]) => {
        if (cancelled) return;
        setRevenus(r);
        setCharges(c);
      })
      .catch(() => {
        if (!cancelled) {
          setRevenus([]);
          setCharges([]);
        }
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [asset.id]);

  const preparation = useMemo(
    () => preparerProjectionBien({ asset, revenus, charges, emprunts, fraction: fractionDe(asset) }),
    [asset, revenus, charges, emprunts, fractionDe],
  );
  const periodes = useMemo(
    () => projeterPreparation(preparation, hypotheses, horizonProjection(preparation.credits)),
    [preparation, hypotheses],
  );

  if (isLoading) return <LoadingSpinner text="Chargement de la projection..." />;

  return (
    <ProjectionPanel
      periodes={periodes}
      hypotheses={hypotheses}
      onHypothesesChange={setHypotheses}
      avertissements={preparation.avertissements}
    />
  );
};
