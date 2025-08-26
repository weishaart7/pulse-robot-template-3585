import React, { useState } from 'react';
import { ChevronDown, ChevronRight, TrendingUp, Search, Home, Car, Banknote, PiggyBank, Building2, Briefcase, CreditCard, Plus } from 'lucide-react';
import { Asset } from '@/services/assetService';
import { getAssetCategory } from '@/constants/assetTypes';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
interface PatrimoineSidebarProps {
  assets: Asset[];
  onAssetEdit: (asset: Asset) => void;
  selectedCategory: string | null;
  onCategorySelect: (category: string | null) => void;
  onAddAsset: () => void;
}
export const PatrimoineSidebar = ({
  assets,
  onAssetEdit,
  selectedCategory,
  onCategorySelect,
  onAddAsset
}: PatrimoineSidebarProps) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  // Fonction pour obtenir l'icône de catégorie
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'immobilier':
        return <Home className="h-4 w-4" />;
      case 'véhicules':
        return <Car className="h-4 w-4" />;
      case 'liquidités':
        return <Banknote className="h-4 w-4" />;
      case 'épargne':
        return <PiggyBank className="h-4 w-4" />;
      case 'immobilier d\'entreprise':
        return <Building2 className="h-4 w-4" />;
      case 'professionnel':
        return <Briefcase className="h-4 w-4" />;
      case 'passifs':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <Building2 className="h-4 w-4" />;
    }
  };

  // Grouper les actifs par catégorie
  const assetsByCategory = assets.reduce((acc, asset) => {
    const category = getAssetCategory(asset.nature);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(asset);
    return acc;
  }, {} as Record<string, Asset[]>);

  // Calculer la valeur totale du patrimoine
  const totalValue = assets.reduce((sum, asset) => sum + (asset.valeur_estimee || 0), 0);

  // Calculer la valeur par catégorie
  const categoryValues = Object.entries(assetsByCategory).map(([category, categoryAssets]) => {
    const value = categoryAssets.reduce((sum, asset) => sum + (asset.valeur_estimee || 0), 0);
    const percentage = totalValue > 0 ? value / totalValue * 100 : 0;
    return {
      category,
      value,
      percentage,
      count: categoryAssets.length
    };
  });
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
      maximumFractionDigits: 0
    }).format(value);
  };

  // Filtrer les catégories selon la recherche
  const filteredCategories = categoryValues.filter(({
    category
  }) => category.toLowerCase().includes(searchTerm.toLowerCase()) || assetsByCategory[category].some(asset => asset.nature.toLowerCase().includes(searchTerm.toLowerCase()) || asset.denomination?.toLowerCase().includes(searchTerm.toLowerCase())));

  return (
    <div className="h-full bg-card border border-border rounded-lg flex flex-col">
      {/* Header avec recherche et total */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Patrimoine</h3>
          <Button size="sm" onClick={onAddAsset} className="flex items-center gap-1">
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </div>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="bg-muted rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Total patrimoine</span>
          </div>
          <p className="text-xl font-bold text-primary">{formatCurrency(totalValue)}</p>
        </div>
      </div>

      {/* Liste des catégories */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {filteredCategories.map(({ category, value, percentage, count }) => (
            <div key={category}>
              <button
                onClick={() => {
                  toggleCategory(category);
                  onCategorySelect(selectedCategory === category ? null : category);
                }}
                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors hover:bg-muted ${
                  selectedCategory === category ? 'bg-primary/10 border-primary' : 'border-border'
                }`}
              >
                <div className="flex items-center gap-3">
                  {getCategoryIcon(category)}
                  <div className="text-left">
                    <p className="font-medium">{category}</p>
                    <p className="text-sm text-muted-foreground">{count} actif{count > 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(value)}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">{percentage.toFixed(1)}%</p>
                    {expandedCategories.has(category) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </div>
                </div>
              </button>
              
              {expandedCategories.has(category) && (
                <div className="ml-6 mt-2 space-y-1">
                  {assetsByCategory[category]
                    .filter(asset => 
                      searchTerm === '' || 
                      asset.nature.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      asset.denomination?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map(asset => (
                      <button
                        key={asset.id}
                        onClick={() => onAssetEdit(asset)}
                        className="w-full text-left p-2 rounded border border-border hover:bg-muted transition-colors"
                      >
                        <p className="font-medium text-sm">{asset.denomination || asset.nature}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(asset.valeur_estimee || 0)}
                        </p>
                      </button>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};