import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Asset } from '@/services/assetService';
import { getAssetCategory } from '@/constants/assetTypes';

interface PatrimoineChartProps {
  assets: Asset[];
  selectedCategory: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  'actifs immobiliers': '#05E8A4',
  'actifs mobiliers corporels': '#2609D6',
  'actifs professionnels': '#D5B7FF',
  'épargne retraite et prévoyance': '#7B0700',
  'épargne et assurance-vie': '#FF0095',
  'épargne salariale': '#FF8B55',
  'épargne bancaire / liquidités': '#314A46',
  'valeurs mobilières et placements financiers': '#89FC00',
  'autres': '#FF8B55'
};


export const PatrimoineChart = ({ assets, selectedCategory }: PatrimoineChartProps) => {
  const chartData = useMemo(() => {
    // Vue par catégorie
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
        color: CATEGORY_COLORS[item.category] || '#FF8B55',
        assets: item.assets
      }))
      .sort((a, b) => b.value - a.value);
  }, [assets]);

  const totalValue = chartData.reduce((sum, item) => sum + item.value, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="relative h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie 
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={85}
            paddingAngle={2}
            dataKey="value"
            stroke="hsl(var(--background))"
            strokeWidth={2}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color}
              />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => formatCurrency(value)} />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            wrapperStyle={{
              fontSize: '12px',
              color: 'black'
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Valeur totale au centre */}
      <div 
        className="absolute inset-0 flex items-center justify-center pointer-events-none" 
        style={{ paddingBottom: '36px' }}
      >
        <div className="text-center">
          <div className="text-xl font-bold text-foreground">
            {formatCurrency(totalValue)}
          </div>
          <div className="text-xs text-muted-foreground">
            Patrimoine total
          </div>
        </div>
      </div>
    </div>
  );
};