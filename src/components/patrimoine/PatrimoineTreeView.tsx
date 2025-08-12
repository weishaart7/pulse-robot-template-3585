import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Asset } from '@/services/assetService';
import { getAssetCategory } from '@/constants/assetTypes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface PatrimoineTreeViewProps {
  assets: Asset[];
  onAssetEdit: (asset: Asset) => void;
}

export const PatrimoineTreeView = ({ assets, onAssetEdit }: PatrimoineTreeViewProps) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const totalValue = assets.reduce((sum, asset) => sum + (asset.valeur_estimee || 0), 0);

  // Grouper les actifs par catégorie
  const assetsByCategory = assets.reduce((acc, asset) => {
    const category = getAssetCategory(asset.nature);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(asset);
    return acc;
  }, {} as Record<string, Asset[]>);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Catégorie / Actif</TableHead>
            <TableHead className="text-right">Poids</TableHead>
            <TableHead className="text-right">Valeur</TableHead>
            <TableHead className="text-right">+/- Value</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(assetsByCategory).map(([category, categoryAssets]) => {
            const categoryValue = categoryAssets.reduce((sum, asset) => sum + (asset.valeur_estimee || 0), 0);
            const categoryWeight = calculateWeight(categoryValue);
            const isExpanded = expandedCategories.has(category);

            return (
              <React.Fragment key={category}>
                {/* Ligne de catégorie */}
                <TableRow className="bg-muted/30 hover:bg-muted/50">
                  <TableCell>
                    <Button
                      variant="ghost"
                      className="p-0 h-auto font-normal flex items-center gap-2"
                      onClick={() => toggleCategory(category)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      {category}
                      <Badge variant="secondary" className="ml-2 uppercase">
                        {categoryAssets.length}
                      </Badge>
                    </Button>
                  </TableCell>
                  <TableCell className="text-right font-mono font-normal">
                    {categoryWeight}%
                  </TableCell>
                  <TableCell className="text-right font-mono font-normal">
                    {formatCurrency(categoryValue)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span className="text-muted-foreground">—</span>
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>

                {/* Lignes des actifs de la catégorie */}
                {isExpanded && categoryAssets.map((asset) => {
                  const assetWeight = calculateWeight(asset.valeur_estimee || 0);
                  
                  return (
                    <TableRow key={asset.id} className="hover:bg-muted/30">
                      <TableCell className="pl-8">
                        <div>
                          <div className="font-normal">{asset.nature}</div>
                          {asset.denomination && (
                            <div className="text-sm text-muted-foreground">
                              {asset.denomination}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {assetWeight}%
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
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};