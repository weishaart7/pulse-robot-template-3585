import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Asset } from '@/services/assetService';
import { getAssetCategory } from '@/constants/assetTypes';

interface PatrimoineDashboardProps {
  assets: Asset[];
}

const COLORS = {
  'immobiliers': 'hsl(var(--chart-1))',
  'mobiliers corporels': 'hsl(var(--chart-2))',
  'professionnels': 'hsl(var(--chart-3))',
  'retraite et prévoyance': 'hsl(var(--chart-4))',
  'financiers liquides': 'hsl(var(--chart-5))',
  'financiers investis': 'hsl(var(--chart-6))',
  'autres': 'hsl(var(--muted))'
};

export const PatrimoineDashboard = ({ assets }: PatrimoineDashboardProps) => {
  // Grouper les actifs par catégorie et calculer les totaux
  const categoryData = React.useMemo(() => {
    const categories: Record<string, number> = {};
    let total = 0;

    assets.forEach(asset => {
      if (asset.valeur_estimee) {
        const category = getAssetCategory(asset.nature);
        categories[category] = (categories[category] || 0) + asset.valeur_estimee;
        total += asset.valeur_estimee;
      }
    });

    // Convertir en format pour le graphique
    const chartData = Object.entries(categories).map(([category, value]) => ({
      name: category,
      value,
      percentage: total > 0 ? (value / total * 100).toFixed(1) : 0
    }));

    return { chartData, total };
  }, [assets]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Graphique circulaire */}
      <Card>
        <CardHeader>
          <CardTitle>Répartition du patrimoine</CardTitle>
          <CardDescription>
            Vue d'ensemble de vos actifs par catégorie
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData.chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {categoryData.chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[entry.name] || COLORS['autres']} 
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            
            {/* Valeur totale au centre */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(categoryData.total)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Patrimoine total
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Détails par catégorie */}
      <Card>
        <CardHeader>
          <CardTitle>Détail par catégorie</CardTitle>
          <CardDescription>
            Valeurs détaillées de chaque catégorie d'actifs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categoryData.chartData.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Aucun actif avec valeur estimée
              </p>
            ) : (
              categoryData.chartData
                .sort((a, b) => b.value - a.value)
                .map((category) => (
                  <div key={category.name} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: COLORS[category.name] || COLORS['autres'] }}
                      />
                      <div>
                        <Badge variant="secondary" className="capitalize">
                          {category.name}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          {category.percentage}% du patrimoine
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatCurrency(category.value)}
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};