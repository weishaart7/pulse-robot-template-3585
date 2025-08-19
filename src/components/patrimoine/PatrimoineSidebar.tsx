import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  TrendingUp, 
  Search, 
  Home, 
  Car, 
  Banknote, 
  PiggyBank, 
  Building2, 
  Briefcase,
  CreditCard,
  Plus
} from 'lucide-react';
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
}

export const PatrimoineSidebar = ({ 
  assets, 
  onAssetEdit, 
  selectedCategory, 
  onCategorySelect 
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
    const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
    return { category, value, percentage, count: categoryAssets.length };
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
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Filtrer les catégories selon la recherche
  const filteredCategories = categoryValues.filter(({ category }) =>
    category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assetsByCategory[category].some(asset => 
      asset.nature.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.denomination?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="h-full bg-background rounded-lg flex flex-col">
      {/* En-tête avec patrimoine net */}
      <div className="p-6">
        <div 
          className={`cursor-pointer p-4 rounded-lg transition-colors hover:bg-muted/50 ${
            selectedCategory === null ? 'bg-primary/5' : 'bg-muted/20'
          }`}
          onClick={() => onCategorySelect(null)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-semibold text-foreground">Patrimoine net</div>
                <div className="text-sm text-muted-foreground">
                  {assets.length} actif{assets.length > 1 ? 's' : ''}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-foreground">
                {formatCurrency(totalValue)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher des comptes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 bg-muted/20 border-0 focus:bg-background"
          />
        </div>
      </div>

      {/* Liste scrollable des catégories */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-1">
          {filteredCategories.map(({ category, value, percentage, count }) => (
            <div key={category} className="space-y-1">
              <div
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all hover:bg-muted/50 group ${
                  selectedCategory === category ? 'bg-primary/5' : ''
                } ${expandedCategories.has(category) ? 'bg-muted/30' : ''}`}
                onClick={() => {
                  toggleCategory(category);
                  onCategorySelect(category);
                }}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className={`p-2 rounded-lg transition-colors ${
                    selectedCategory === category || expandedCategories.has(category) 
                      ? 'bg-primary/10' 
                      : 'bg-muted/20 group-hover:bg-muted/40'
                  }`}>
                    {getCategoryIcon(category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground truncate">
                      {category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {count} actif{count > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-foreground">
                      {formatCurrency(value)}
                    </div>
                  </div>
                  <div className="text-muted-foreground">
                    {expandedCategories.has(category) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </div>
                </div>
              </div>

              {/* Liste des actifs de la catégorie */}
              {expandedCategories.has(category) && (
                <div className="ml-11 space-y-1 pl-4">
                  {assetsByCategory[category]
                    .filter(asset => 
                      searchTerm === '' || 
                      asset.nature.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      asset.denomination?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((asset) => (
                    <div
                      key={asset.id}
                      className="flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => onAssetEdit(asset)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {asset.nature}
                        </div>
                        {asset.denomination && (
                          <div className="text-xs text-muted-foreground truncate">
                            {asset.denomination}
                          </div>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-foreground ml-2">
                        {asset.valeur_estimee ? formatCurrency(asset.valeur_estimee) : '-'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Bouton d'ajout fixe en bas */}
      <div className="p-4">
        <Button 
          className="w-full" 
          onClick={() => {/* TODO: ajouter la fonction d'ajout */}}
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un actif
        </Button>
      </div>
    </div>
  );
};