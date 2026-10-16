import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useAssets } from '@/hooks/useAssets';
import { ScrollArea } from '@/components/ui/scroll-area';
import { panelButtonClass, panelPrimaryButtonClass } from '@/components/layout/workspace-panel';
import { cn } from '@/lib/utils';

interface AssetSelectionModalProps {
  title: string;
  /** Phrase d'explication sous le titre. */
  description?: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedAssets: string[]) => void;
  preSelectedAssets?: string[];
  /** Si fourni, restreint les biens sélectionnables à cette liste d'IDs (ex. sous-clauses limitées aux biens déjà désignés dans la société d'acquêts). */
  assetIdsFilter?: string[];
}

export const AssetSelectionModal: React.FC<AssetSelectionModalProps> = ({
  title,
  description,
  isOpen,
  onClose,
  onConfirm,
  preSelectedAssets = [],
  assetIdsFilter
}) => {
  const { assets: allAssets } = useAssets();
  const assets = assetIdsFilter ? allAssets?.filter(a => assetIdsFilter.includes(a.id)) : allAssets;
  const [selectedAssets, setSelectedAssets] = useState<string[]>(preSelectedAssets);

  // Reset selection when modal opens with new preSelectedAssets
  React.useEffect(() => {
    if (isOpen) {
      setSelectedAssets(preSelectedAssets);
    }
  }, [isOpen, preSelectedAssets]);

  const handleAssetToggle = (assetId: string) => {
    setSelectedAssets(prev => 
      prev.includes(assetId) 
        ? prev.filter(id => id !== assetId) 
        : [...prev, assetId]
    );
  };

  const handleConfirm = () => {
    onConfirm(selectedAssets);
    onClose();
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return '0 €';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  };

  const totalSelected = assets
    ?.filter(a => selectedAssets.includes(a.id))
    .reduce((sum, a) => sum + (a.valeur_estimee || 0), 0) || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="workspace-panel max-w-2xl gap-0 overflow-hidden rounded-[4px] p-0 sm:rounded-[4px]">
        <DialogHeader className="border-b border-border px-6 pb-4 pt-5">
          <DialogTitle className="text-[16px] font-medium leading-tight tracking-[-0.01em]">{title}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {description ?? 'Cochez les biens à inclure.'}
          </p>
        </DialogHeader>

        {assets && assets.length > 0 ? (
          <ScrollArea className="h-[320px]">
            <ul className="divide-y divide-border">
              {assets.map(asset => {
                const checked = selectedAssets.includes(asset.id);
                return (
                  <li key={asset.id}>
                    <label
                      htmlFor={`asset-select-${asset.id}`}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 px-6 py-2.5 transition-colors hover:bg-secondary/60',
                        checked && 'bg-secondary/50'
                      )}
                    >
                      <Checkbox
                        id={`asset-select-${asset.id}`}
                        checked={checked}
                        onCheckedChange={() => handleAssetToggle(asset.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-foreground">
                          {asset.denomination || 'Sans nom'}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">{asset.nature}</span>
                      </span>
                      <span className="text-[13px] font-medium tabular-nums text-foreground">
                        {formatCurrency(asset.valeur_estimee)}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        ) : (
          <div className="px-6 py-8">
            <p className="rounded-[2px] bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">
              {assetIdsFilter
                ? "Aucun bien n'est encore désigné dans la société d'acquêts."
                : 'Aucun bien saisi. Ajoutez d\'abord des biens dans la section Patrimoine.'}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-3">
          <span className="text-xs text-muted-foreground tabular-nums">
            {selectedAssets.length > 0
              ? `${selectedAssets.length} bien${selectedAssets.length > 1 ? 's' : ''} · ${formatCurrency(totalSelected)}`
              : 'Aucun bien sélectionné'}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className={panelButtonClass} onClick={onClose}>
              Annuler
            </Button>
            <Button type="button" className={panelPrimaryButtonClass} onClick={handleConfirm}>
              Valider
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
