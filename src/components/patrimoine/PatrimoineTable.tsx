import React from 'react';
import { Asset } from '@/services/assetService';
import { getAssetCategory } from '@/constants/assetTypes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PatrimoineTableProps {
  assets: Asset[];
  selectedCategory: string | null;
  onAssetEdit: (asset: Asset) => void;
}

export const PatrimoineTable = ({ assets, selectedCategory, onAssetEdit }: PatrimoineTableProps) => {
  const totalValue = assets.reduce((sum, asset) => sum + (asset.valeur_estimee || 0), 0);

  const filteredAssets = selectedCategory 
    ? assets.filter(asset => getAssetCategory(asset.nature) === selectedCategory)
    : assets;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const calculateWeight = (assetValue: number) => {
    return totalValue > 0 ? ((assetValue / totalValue) * 100).toFixed(2) : '0.00';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          {selectedCategory ? `Actifs - ${selectedCategory}` : 'Tous les actifs'}
        </h3>
        <Badge variant="secondary">
          {filteredAssets.length} actif{filteredAssets.length > 1 ? 's' : ''}
        </Badge>
      </div>

      <ScrollArea className="h-80">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Actif</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead className="text-right">Poids</TableHead>
              <TableHead className="text-right">Valeur</TableHead>
              <TableHead className="text-right">+/- Value</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAssets.map((asset) => {
              const weight = calculateWeight(asset.valeur_estimee || 0);
              const category = getAssetCategory(asset.nature);
              
              return (
                <TableRow key={asset.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div>
                      <div className="font-medium">{asset.nature}</div>
                      {asset.denomination && (
                        <div className="text-sm text-muted-foreground truncate max-w-32">
                          {asset.denomination}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {weight}%
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {asset.valeur_estimee ? formatCurrency(asset.valeur_estimee) : 'Non évalué'}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span className="text-muted-foreground">—</span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAssetEdit(asset)}
                      className="h-8 px-2"
                    >
                      Modifier
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
};