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
  'immobiliers': '#3B82F6', // Bleu moderne
  'financiers liquides': '#10B981', // Vert émeraude
  'financiers investis': '#8B5CF6', // Violet
  'retraite et prévoyance': '#F59E0B', // Orange
  'mobiliers corporels': '#EF4444', // Rouge
  'professionnels': '#06B6D4', // Cyan
  'autres': '#6B7280' // Gris neutre
};

const CATEGORY_GRADIENTS = {
  'immobiliers': 'url(#gradient-immobiliers)',
  'financiers liquides': 'url(#gradient-financiers-liquides)', 
  'financiers investis': 'url(#gradient-financiers-investis)',
  'retraite et prévoyance': 'url(#gradient-retraite)',
  'mobiliers corporels': 'url(#gradient-mobiliers)',
  'professionnels': 'url(#gradient-professionnels)',
  'autres': 'url(#gradient-autres)'
};

export const PatrimoineChart = ({ assets, selectedCategory }: PatrimoineChartProps) => {
  const [viewMode, setViewMode] = useState<'category' | 'weight'>('category');
  const [hoveredCategory, setHoveredCategory] = useState<{ name: string; value: number; percentage: string } | null>(null);

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

      return Object.values(categoryData)
        .map(item => ({
          name: item.category.charAt(0).toUpperCase() + item.category.slice(1),
          value: item.value,
          color: CATEGORY_COLORS[item.category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.autres,
          assets: item.assets
        }))
        .sort((a, b) => b.value - a.value); // Trier par valeur décroissante
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
      const category = data.name.toLowerCase().replace(/\s+/g, ' ');
      const colorKey = Object.keys(CATEGORY_COLORS).find(key => 
        category.includes(key.replace(/[\s-]/g, ' '))
      );
      const accentColor = colorKey ? CATEGORY_COLORS[colorKey as keyof typeof CATEGORY_COLORS] : '#6B7280';
      
      return (
        <div className="bg-card/95 backdrop-blur-sm border border-border rounded-xl p-4 shadow-2xl">
          <div className="flex items-center gap-2 mb-2">
            <div 
              className="w-4 h-4 rounded-full shadow-sm"
              style={{ backgroundColor: accentColor }}
            />
            <p className="font-semibold text-lg text-foreground">{data.name}</p>
          </div>
          <p className="font-bold text-2xl mb-1" style={{ color: accentColor }}>
            {formatCurrency(data.value)}
          </p>
          <p className="text-muted-foreground font-medium">
            {percentage}% du patrimoine total
          </p>
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
        {/* Graphique donut moderne avec gradients */}
        <div className="relative w-64 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                <linearGradient id="gradient-immobiliers" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#60A5FA" />
                  <stop offset="100%" stopColor="#1E40AF" />
                </linearGradient>
                <linearGradient id="gradient-financiers-liquides" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#34D399" />
                  <stop offset="100%" stopColor="#047857" />
                </linearGradient>
                <linearGradient id="gradient-financiers-investis" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#A78BFA" />
                  <stop offset="100%" stopColor="#6D28D9" />
                </linearGradient>
                <linearGradient id="gradient-retraite" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FBBF24" />
                  <stop offset="100%" stopColor="#D97706" />
                </linearGradient>
                <linearGradient id="gradient-mobiliers" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F87171" />
                  <stop offset="100%" stopColor="#DC2626" />
                </linearGradient>
                <linearGradient id="gradient-professionnels" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22D3EE" />
                  <stop offset="100%" stopColor="#0891B2" />
                </linearGradient>
                <linearGradient id="gradient-autres" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#9CA3AF" />
                  <stop offset="100%" stopColor="#4B5563" />
                </linearGradient>
              </defs>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius={115}
                innerRadius={87}
                paddingAngle={2}
                dataKey="value"
                startAngle={90}
                endAngle={450}
                stroke="hsl(var(--background))"
                strokeWidth={2}
              >
                {chartData.map((entry, index) => {
                  const category = entry.name.toLowerCase().replace(/\s+/g, ' ');
                  const gradientKey = Object.keys(CATEGORY_GRADIENTS).find(key => 
                    category.includes(key.replace(/[\s-]/g, ' '))
                  );
                  const isHovered = hoveredCategory?.name === entry.name;
                  const isOtherHovered = hoveredCategory && hoveredCategory.name !== entry.name;
                  
                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={gradientKey ? CATEGORY_GRADIENTS[gradientKey as keyof typeof CATEGORY_GRADIENTS] : entry.color}
                      style={{
                        filter: isHovered 
                          ? 'brightness(1.15) drop-shadow(0 8px 16px rgba(0,0,0,0.25))' 
                          : isOtherHovered 
                          ? 'brightness(0.7) opacity(0.6)' 
                          : 'none',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'pointer',
                        transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                        transformOrigin: 'center'
                      }}
                      onMouseEnter={() => {
                        const percentage = totalValue > 0 ? ((entry.value / totalValue) * 100).toFixed(1) : '0';
                        setHoveredCategory({
                          name: entry.name,
                          value: entry.value,
                          percentage
                        });
                      }}
                      onMouseLeave={() => setHoveredCategory(null)}
                    />
                  );
                })}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Contenu dynamique au centre du donut */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {hoveredCategory ? (
              <>
                <div className="text-lg font-semibold text-foreground text-center">
                  {hoveredCategory.name}
                </div>
                <div className="text-xl font-bold text-primary">
                  {formatCurrency(hoveredCategory.value)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {hoveredCategory.percentage}% du patrimoine
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(totalValue)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Patrimoine total
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};