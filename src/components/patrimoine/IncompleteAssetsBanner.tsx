import React, { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Asset } from '@/services/assetService';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { NATURES_WITHOUT_ACQUISITION } from '@/constants/assetTypes';

interface Props {
  assets: Asset[];
  onAssetClick?: (asset: Asset) => void;
}

interface MissingInfo {
  asset: Asset;
  missing: string[];
}

const checkMissing = (a: Asset): string[] => {
  const m: string[] = [];
  if (!a.valeur_estimee || a.valeur_estimee <= 0) m.push('valeur actuelle');
  if (!a.detenteur) m.push('détenteur');
  // Mode de détention et date d'estimation non exigés pour les natures sans
  // acquisition (livrets, comptes courants...), pour lesquelles ces
  // informations n'ont pas le même sens que pour un bien démembrable/estimé.
  if (!NATURES_WITHOUT_ACQUISITION.includes(a.nature)) {
    if (!a.mode_detention) m.push('mode de détention');
    if (!a.date_estimation) m.push("date d'estimation");
  }
  return m;
};

export const IncompleteAssetsBanner: React.FC<Props> = ({ assets, onAssetClick }) => {
  const { user } = useAuth();
  const storageKey = user?.id ? `incomplete-assets-banner-dismissed-${user.id}` : null;
  const [dismissed, setDismissed] = useState(() => storageKey ? localStorage.getItem(storageKey) === 'true' : false);
  const [expanded, setExpanded] = useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    if (storageKey) localStorage.setItem(storageKey, 'true');
  };

  const incomplete = useMemo<MissingInfo[]>(() => {
    return assets
      .map((a) => ({ asset: a, missing: checkMissing(a) }))
      .filter((x) => x.missing.length > 0);
  }, [assets]);

  if (dismissed || incomplete.length === 0) return null;

  return (
    <div className="rounded-lg border border-spark/30/60 bg-spark/10/60 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-spark mt-0.5 shrink-0" strokeWidth={1.75} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <div className="min-w-[12rem] flex-1">
              <p className="text-sm font-semibold text-foreground ">
                {incomplete.length} actif{incomplete.length > 1 ? 's ont' : ' a'} des informations manquantes
              </p>
              <p className="text-xs text-foreground/80 ">
                Complétez ces informations pour des analyses fiscales et patrimoniales fiables.
              </p>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setExpanded((e) => !e)}
                className="text-foreground hover:bg-spark/10 "
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {expanded ? 'Masquer' : 'Détails'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleDismiss}
                className="text-foreground hover:bg-spark/10 "
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {expanded && (
            <ul className="mt-3 space-y-1.5 max-h-60 overflow-y-auto">
              {incomplete.map(({ asset, missing }) => (
                <li
                  key={asset.id}
                  className="flex items-start justify-between gap-3 text-xs bg-background/60 rounded px-2.5 py-1.5 hover:bg-background cursor-pointer transition-colors"
                  onClick={() => onAssetClick?.(asset)}
                >
                  <div className="min-w-0">
                    <span className="font-medium">{asset.denomination || asset.nature}</span>
                    <span className="text-muted-foreground"> — {asset.nature}</span>
                  </div>
                  <span className="text-foreground shrink-0">
                    Manque : {missing.join(', ')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
