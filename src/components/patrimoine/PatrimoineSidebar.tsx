import React, { useState } from 'react';
import { ChevronDown, ChevronRight, TrendingUp } from 'lucide-react';
import { Asset } from '@/services/assetService';
import { getAssetCategory } from '@/constants/assetTypes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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

  return (
    <div className="w-1/4 border-r border-border bg-card">
      <div className="p-4">
        {/* Vue d'ensemble du patrimoine net */}
        <Card 
          className={`mb-4 cursor-pointer transition-colors hover:bg-muted/50 ${
            selectedCategory === null ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => onCategorySelect(null)}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Patrimoine net
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(totalValue)}
            </div>
            <p className="text-sm text-muted-foreground">
              {assets.length} actif{assets.length > 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        {/* Liste des catégories */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Catégories d'actifs
          </h3>
          
          {categoryValues.map(({ category, value, percentage, count }) => (
            <div key={category} className="space-y-1">
              <Button
                variant="ghost"
                className={`w-full justify-between h-auto p-3 hover:bg-muted/50 ${
                  selectedCategory === category ? 'bg-muted' : ''
                }`}
                onClick={() => {
                  toggleCategory(category);
                  onCategorySelect(category);
                }}
              >
                <div className="flex items-center gap-2 flex-1">
                  {expandedCategories.has(category) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <div className="text-left">
                    <div className="font-normal text-sm">{category}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(value)} ({percentage.toFixed(1)}%)
                    </div>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs uppercase">
                  {count}
                </Badge>
              </Button>

              {/* Liste des actifs de la catégorie */}
              {expandedCategories.has(category) && (
                <div className="ml-6 space-y-1">
                  {assetsByCategory[category].map((asset) => (
                    <Button
                      key={asset.id}
                      variant="ghost"
                      className="w-full justify-start h-auto p-2 text-left hover:bg-muted/30"
                      onClick={() => onAssetEdit(asset)}
                    >
                      <div className="flex-1">
                        <div className="text-sm font-normal">{asset.nature}</div>
                        {asset.denomination && (
                          <div className="text-xs text-muted-foreground truncate">
                            {asset.denomination}
                          </div>
                        )}
                        <div className="text-xs font-normal text-primary">
                          {asset.valeur_estimee ? formatCurrency(asset.valeur_estimee) : 'Non évalué'}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};