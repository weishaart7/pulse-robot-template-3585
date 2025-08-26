import React from 'react';
import { Asset } from '@/services/assetService';
import { getAssetCategory } from '@/constants/assetTypes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
    <div className="max-w-4xl mx-auto rounded-xl border border-border bg-background p-6 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-foreground">
          {selectedCategory ? `Actifs - ${selectedCategory}` : 'Répartition des actifs'}
        </h2>
        <Badge variant="secondary" className="uppercase">
          {filteredAssets.length} actif{filteredAssets.length > 1 ? 's' : ''}
        </Badge>
      </div>

      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Classe d'actifs</TableHead>
            <TableHead className="w-[120px] text-center">Nb. d'actifs</TableHead>
            <TableHead className="w-[120px] text-center">% des actifs</TableHead>
            <TableHead className="text-right">Valeur</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categoryStats.map((stat) => (
            <TableRow key={stat.category} className="hover:bg-muted/40 transition-colors">
              <TableCell className="font-medium">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: stat.color }}
                  />
                  <span>{stat.category.charAt(0).toUpperCase() + stat.category.slice(1).toLowerCase()}</span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                {stat.count}
              </TableCell>
              <TableCell className="text-center">
                <span className="font-normal">{stat.weight}%</span>
              </TableCell>
              <TableCell className="text-right font-normal">
                {formatCurrency(stat.value)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3} className="text-right font-semibold">
              Total du patrimoine
            </TableCell>
            <TableCell className="text-right font-semibold text-foreground">
              {formatCurrency(totalValue)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
      
      <p className="mt-4 text-center text-sm text-muted-foreground">
        synthèse de votre patrimoine par catégories
      </p>
    </div>
  );
};