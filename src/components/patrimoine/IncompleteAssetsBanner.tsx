import React, { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Asset } from '@/services/assetService';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

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
  if (!a.mode_detention) m.push('mode de détention');
  if (!a.date_estimation) m.push("date d'estimation");
  // Acquisition manquante seulement si pas un type sans acquisition (livret, etc.)
  // simplifié : si valeur_acquisition est null ET pas un livret évident
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
    <div className="rounded-lg border border-amber-300/60 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-800/40 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" strokeWidth={1.75} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                {incomplete.length} actif{incomplete.length > 1 ? 's ont' : ' a'} des informations manquantes
              </p>
              <p className="text-xs text-amber-800/80 dark:text-amber-200/70">
                Complétez ces informations pour des analyses fiscales et patrimoniales fiables.
              </p>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setExpanded((e) => !e)}
                className="text-amber-900 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/30"
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {expanded ? 'Masquer' : 'Détails'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleDismiss}
                className="text-amber-900 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/30"
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
                  <span className="text-amber-700 dark:text-amber-300 shrink-0">
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
