import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';
import { formatCurrency, getCategoryColor } from '@/lib/patrimoine/utils';

interface PlusValuesSummary {
  totalPlusValues: number;
  totalMoinsValues: number;
  netPlusValue: number;
  byCategory: Record<string, { plusValue: number; count: number }>;
  assetsWithPlusValue: Array<{
    id: string;
    denomination: string;
    nature: string;
    plusValue: number;
    valeurEstimee: number;
    valeurAcquisition: number;
  }>;
}

interface PlusValuesCardProps {
  plusValuesSummary: PlusValuesSummary;
}

export const PlusValuesCard: React.FC<PlusValuesCardProps> = ({ plusValuesSummary }) => {
  const { totalPlusValues, totalMoinsValues, netPlusValue, byCategory, assetsWithPlusValue } = plusValuesSummary;
  
  const hasData = assetsWithPlusValue.length > 0;
  const isPositive = netPlusValue >= 0;

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plus-values</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4 text-sm">
            Renseignez la valeur d'acquisition de vos actifs pour calculer les plus-values
          </p>
        </CardContent>
      </Card>
    );
  }

  // Top 3 plus-values and moins-values
  const topPlusValues = assetsWithPlusValue.filter(a => a.plusValue > 0).slice(0, 3);
  const topMoinsValues = [...assetsWithPlusValue].filter(a => a.plusValue < 0).sort((a, b) => a.plusValue - b.plusValue).slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Plus-values</CardTitle>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Net result */}
        <div className={`flex items-center gap-3 p-3 rounded-lg border ${isPositive ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950' : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'}`}>
          <div className={`p-2 rounded-lg ${isPositive ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
            {isPositive ? (
              <TrendingUp className={`h-4 w-4 ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Résultat net</p>
            <p className={`text-lg font-bold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {isPositive ? '+' : ''}{formatCurrency(netPlusValue)}
            </p>
          </div>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 p-2 rounded border bg-card">
            <TrendingUp className="h-3 w-3 text-green-500" />
            <div>
              <p className="text-xs text-muted-foreground">Plus-values</p>
              <p className="text-sm font-semibold text-green-600 dark:text-green-400">+{formatCurrency(totalPlusValues)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded border bg-card">
            <TrendingDown className="h-3 w-3 text-red-500" />
            <div>
              <p className="text-xs text-muted-foreground">Moins-values</p>
              <p className="text-sm font-semibold text-red-600 dark:text-red-400">-{formatCurrency(totalMoinsValues)}</p>
            </div>
          </div>
        </div>

        {/* Top assets */}
        {topPlusValues.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Top plus-values</p>
            {topPlusValues.map(asset => (
              <div key={asset.id} className="flex justify-between items-center text-xs py-1">
                <span className="text-foreground truncate max-w-[60%]">{asset.denomination}</span>
                <span className="text-green-600 dark:text-green-400 font-medium">+{formatCurrency(asset.plusValue)}</span>
              </div>
            ))}
          </div>
        )}

        {topMoinsValues.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Top moins-values</p>
            {topMoinsValues.map(asset => (
              <div key={asset.id} className="flex justify-between items-center text-xs py-1">
                <span className="text-foreground truncate max-w-[60%]">{asset.denomination}</span>
                <span className="text-red-600 dark:text-red-400 font-medium">{formatCurrency(asset.plusValue)}</span>
              </div>
            ))}
          </div>
        )}

        {/* By category summary */}
        <div className="space-y-1 pt-2 border-t">
          <p className="text-xs font-medium text-muted-foreground">Par catégorie</p>
          {Object.entries(byCategory)
            .filter(([_, data]) => data.count > 0)
            .sort((a, b) => Math.abs(b[1].plusValue) - Math.abs(a[1].plusValue))
            .slice(0, 4)
            .map(([category, data]) => (
              <div key={category} className="flex justify-between items-center text-xs py-1">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: getCategoryColor(category) }} 
                  />
                  <span className="text-muted-foreground truncate max-w-[120px]">
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </span>
                </div>
                <span className={`font-medium ${data.plusValue >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {data.plusValue >= 0 ? '+' : ''}{formatCurrency(data.plusValue)}
                </span>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
};
