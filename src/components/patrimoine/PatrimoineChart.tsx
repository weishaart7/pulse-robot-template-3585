import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Asset } from '@/services/assetService';
import { getAssetCategory } from '@/constants/assetTypes';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface PatrimoineChartProps {
  assets: Asset[];
  selectedCategory: string | null;
}

const CATEGORY_COLORS = {
  'immobiliers': '#0B5563',
  'financiers liquides': '#544343', 
  'financiers investis': '#D8D8F6',
  'retraite et prévoyance': '#838E3E',
  'mobiliers corporels': '#f59e0b',
  'professionnels': '#8b5cf6',
  'autres': '#6b7280'
};

export const PatrimoineChart = ({ assets, selectedCategory }: PatrimoineChartProps) => {
  const [viewMode, setViewMode] = useState<'category' | 'weight'>('category');

  const chartData = useMemo(() => {
    if (viewMode === 'category') {
      // Vue par catégorie avec sous-compartiments
      const categoryData = assets.reduce((acc, asset) => {
        const category = getAssetCategory(asset.nature);
        const value = asset.valeur_estimee || 0;
        
        if (!acc[category]) {
          acc[category] = { category, value: 0, assets: [] };
        }
        acc[category].value += value;
        acc[category].assets.push(asset);
        return acc;
      }, {} as Record<string, { category: string; value: number; assets: Asset[] }>);

      return Object.values(categoryData).map(item => ({
        name: item.category.charAt(0).toUpperCase() + item.category.slice(1),
        value: item.value,
        color: CATEGORY_COLORS[item.category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.autres,
        assets: item.assets
      }));
    } else {
      // Vue par poids individuel
      return assets
        .filter(asset => asset.valeur_estimee && asset.valeur_estimee > 0)
        .map(asset => ({
          name: asset.denomination || asset.nature,
          value: asset.valeur_estimee!,
          color: CATEGORY_COLORS[getAssetCategory(asset.nature) as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.autres,
          category: getAssetCategory(asset.nature).charAt(0).toUpperCase() + getAssetCategory(asset.nature).slice(1)
        }))
        .sort((a, b) => b.value - a.value);
    }
  }, [assets, viewMode]);

  const totalValue = chartData.reduce((sum, item) => sum + item.value, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = totalValue > 0 ? (data.value / totalValue * 100).toFixed(1) : '0';
      
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-primary font-semibold">{formatCurrency(data.value)}</p>
          <p className="text-sm text-muted-foreground">{percentage}% du patrimoine</p>
          {viewMode === 'category' && data.assets && (
            <div className="mt-2 space-y-1">
              {data.assets.map((asset: Asset, index: number) => (
                <div key={index} className="text-xs text-muted-foreground">
                  • {asset.denomination || asset.nature}: {formatCurrency(asset.valeur_estimee || 0)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Bouton de switch */}
      <div className="flex justify-center">
        <ToggleGroup 
          type="single" 
          value={viewMode} 
          onValueChange={(value) => value && setViewMode(value as 'category' | 'weight')}
          className="grid w-fit grid-cols-2"
        >
          <ToggleGroupItem value="category" aria-label="Vue par catégorie">
            Par catégorie
          </ToggleGroupItem>
          <ToggleGroupItem value="weight" aria-label="Vue par poids">
            Par poids
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Container du graphique avec centrage */}
      <div className="flex flex-col items-center space-y-4">
        {/* Graphique donut moderne */}
        <div className="relative w-64 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius={115}
                innerRadius={87}
                paddingAngle={0}
                dataKey="value"
                stroke="hsl(var(--background))"
                strokeWidth={3}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Valeur totale au centre du donut */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(totalValue)}
            </div>
            <div className="text-sm text-muted-foreground">
              Patrimoine total
            </div>
          </div>
        </div>

        {/* Légende personnalisée */}
        <div className="flex flex-wrap justify-center gap-4 max-w-sm">
          {chartData.map((entry, index) => {
            const percentage = totalValue > 0 ? (entry.value / totalValue * 100).toFixed(1) : '0';
            return (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-foreground font-medium">
                  {entry.name}
                </span>
                <span className="text-sm text-muted-foreground">
                  {percentage}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};