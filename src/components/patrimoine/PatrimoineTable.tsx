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

  // Couleurs pour les catégories (alignées avec le graphique)
  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'IMMOBILIERS': '#0B5563',
      'FINANCIERS INVESTIS': '#D8D8F6', 
      'FINANCIERS LIQUIDES': '#544343',
      'RETRAITE ET PRÉVOYANCE': '#838E3E',
      'Immobilier': '#0B5563',
      'Actifs financiers': '#D8D8F6', 
      'Disponibilités': '#544343',
      'Véhicules': '#838E3E',
      'Autres': '#838E3E'
    };
    return colors[category] || '#6B7280';
  };

  // Grouper les actifs par catégorie pour l'affichage
  const assetsByCategory = filteredAssets.reduce((acc, asset) => {
    const category = getAssetCategory(asset.nature);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(asset);
    return acc;
  }, {} as { [key: string]: Asset[] });

  // Calculer les statistiques par catégorie
  const categoryStats = Object.entries(assetsByCategory).map(([category, categoryAssets]) => {
    const categoryValue = categoryAssets.reduce((sum, asset) => sum + (asset.valeur_estimee || 0), 0);
    const categoryWeight = totalValue > 0 ? ((categoryValue / totalValue) * 100).toFixed(2) : '0.00';
    return {
      category,
      assets: categoryAssets,
      count: categoryAssets.length,
      value: categoryValue,
      weight: categoryWeight,
      color: getCategoryColor(category)
    };
  }).sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-normal">
          {selectedCategory ? `Actifs - ${selectedCategory}` : 'Répartition des actifs'}
        </h3>
        <Badge variant="secondary" className="uppercase">
          {filteredAssets.length} actif{filteredAssets.length > 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="bg-card rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b">
              <TableHead className="font-normal text-foreground">Classe d'actifs</TableHead>
              <TableHead className="text-center font-normal text-foreground">Nb. d'actifs</TableHead>
              <TableHead className="text-center font-normal text-foreground">% des actifs</TableHead>
              <TableHead className="text-right font-normal text-foreground">Valeur</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categoryStats.map((stat, index) => (
              <TableRow key={stat.category} className="hover:bg-muted/30 border-b last:border-b-0">
                <TableCell className="py-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: stat.color }}
                    />
                    <span className="font-normal text-foreground">{stat.category.charAt(0).toUpperCase() + stat.category.slice(1).toLowerCase()}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center py-4">
                  <span className="text-muted-foreground">{stat.count}</span>
                </TableCell>
                <TableCell className="text-center py-4">
                  <span className="text-muted-foreground font-mono">{stat.weight}%</span>
                </TableCell>
                <TableCell className="text-right py-4">
                  <span className="font-normal text-foreground font-mono">
                    {formatCurrency(stat.value)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};