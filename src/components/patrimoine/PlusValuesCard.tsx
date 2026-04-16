import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';
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
      <Card className="border-border/60 shadow-none hover:shadow-sm transition-shadow duration-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-[15px] font-semibold tracking-tight">Plus-values</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground/70 text-center py-6 text-sm">
            Renseignez la valeur d'acquisition de vos actifs pour calculer les plus-values
          </p>
        </CardContent>
      </Card>
    );
  }

  const topPlusValues = assetsWithPlusValue.filter(a => a.plusValue > 0).slice(0, 3);
  const topMoinsValues = [...assetsWithPlusValue].filter(a => a.plusValue < 0).sort((a, b) => a.plusValue - b.plusValue).slice(0, 3);

  return (
    <Card className="group border-border/60 shadow-none hover:shadow-md hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-0.5 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[15px] font-semibold tracking-tight">Plus-values</CardTitle>
          <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all duration-300" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Net result — hero number */}
        <div className={`relative p-4 rounded-xl overflow-hidden ${
          isPositive 
            ? 'bg-emerald-50/80 dark:bg-emerald-950/20' 
            : 'bg-rose-50/80 dark:bg-rose-950/20'
        }`}>
          <div className={`absolute top-0 left-0 w-full h-[2px] ${
            isPositive ? 'bg-gradient-to-r from-emerald-400 to-emerald-300' : 'bg-gradient-to-r from-rose-400 to-rose-300'
          }`} />
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Résultat net</p>
          <p className={`text-2xl font-bold tracking-tight ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {isPositive ? '+' : ''}{formatCurrency(netPlusValue)}
          </p>
        </div>

        {/* Plus / Moins split */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex items-center gap-2 p-2.5 rounded-lg border border-border/40 bg-card">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" strokeWidth={1.5} />
            <div>
              <p className="text-[10px] text-muted-foreground/60">Plus-values</p>
              <p className="text-[13px] font-semibold text-emerald-600 dark:text-emerald-400">+{formatCurrency(totalPlusValues)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-lg border border-border/40 bg-card">
            <TrendingDown className="h-3.5 w-3.5 text-rose-500" strokeWidth={1.5} />
            <div>
              <p className="text-[10px] text-muted-foreground/60">Moins-values</p>
              <p className="text-[13px] font-semibold text-rose-600 dark:text-rose-400">-{formatCurrency(totalMoinsValues)}</p>
            </div>
          </div>
        </div>

        {/* Top assets */}
        {topPlusValues.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">Top plus-values</p>
            {topPlusValues.map(asset => (
              <div key={asset.id} className="flex justify-between items-center text-[12px] py-1.5 group/item">
                <span className="text-foreground/80 truncate max-w-[60%] group-hover/item:text-foreground transition-colors">{asset.denomination}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium tabular-nums">+{formatCurrency(asset.plusValue)}</span>
              </div>
            ))}
          </div>
        )}

        {topMoinsValues.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">Top moins-values</p>
            {topMoinsValues.map(asset => (
              <div key={asset.id} className="flex justify-between items-center text-[12px] py-1.5">
                <span className="text-foreground/80 truncate max-w-[60%]">{asset.denomination}</span>
                <span className="text-rose-600 dark:text-rose-400 font-medium tabular-nums">{formatCurrency(asset.plusValue)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Category summary */}
        <div className="space-y-1 pt-3 border-t border-border/30">
          <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest mb-2">Par catégorie</p>
          {Object.entries(byCategory)
            .filter(([_, data]) => data.count > 0)
            .sort((a, b) => Math.abs(b[1].plusValue) - Math.abs(a[1].plusValue))
            .slice(0, 4)
            .map(([category, data]) => (
              <div key={category} className="flex justify-between items-center text-[12px] py-1">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-[6px] h-[6px] rounded-full" 
                    style={{ backgroundColor: getCategoryColor(category) }} 
                  />
                  <span className="text-muted-foreground/70 truncate max-w-[140px]">
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </span>
                </div>
                <span className={`font-medium tabular-nums ${data.plusValue >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {data.plusValue >= 0 ? '+' : ''}{formatCurrency(data.plusValue)}
                </span>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
};
