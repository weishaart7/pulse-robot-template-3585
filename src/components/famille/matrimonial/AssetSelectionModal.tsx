import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useAssets } from '@/hooks/useAssets';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AssetSelectionModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedAssets: string[]) => void;
  preSelectedAssets?: string[];
}

export const AssetSelectionModal: React.FC<AssetSelectionModalProps> = ({
  title,
  isOpen,
  onClose,
  onConfirm,
  preSelectedAssets = []
}) => {
  const { assets } = useAssets();
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sélectionnez les biens à inclure dans cette clause :
          </p>
          
          {assets && assets.length > 0 ? (
            <>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {assets.map(asset => (
                    <div 
                      key={asset.id} 
                      className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                        selectedAssets.includes(asset.id) 
                          ? 'bg-primary/5 border-primary/30' 
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox 
                        id={asset.id} 
                        checked={selectedAssets.includes(asset.id)} 
                        onCheckedChange={() => handleAssetToggle(asset.id)} 
                      />
                      <Label htmlFor={asset.id} className="flex-1 cursor-pointer">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{asset.denomination || 'Sans nom'}</p>
                            <p className="text-xs text-muted-foreground">{asset.nature}</p>
                          </div>
                          <span className="font-semibold text-primary">
                            {formatCurrency(asset.valeur_estimee)}
                          </span>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              {selectedAssets.length > 0 && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {selectedAssets.length} bien{selectedAssets.length > 1 ? 's' : ''} sélectionné{selectedAssets.length > 1 ? 's' : ''}
                    </span>
                    <span className="font-semibold">
                      Total : {formatCurrency(totalSelected)}
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-6 text-center border border-dashed rounded-lg">
              <p className="text-muted-foreground">
                Aucun bien trouvé. Veuillez d'abord ajouter des biens dans la section Patrimoine.
              </p>
            </div>
          )}
          
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={handleConfirm}>
              Confirmer la sélection
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
