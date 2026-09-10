import React from 'react';
import { Info, TrendingUp, TrendingDown } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { AssetFormValues } from '@/schemas/assetSchema';
import { NATURES_WITHOUT_ACQUISITION } from '@/constants/assetTypes';
import { calculatePlusValue } from '@/lib/patrimoine/utils';

const formatEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

interface PlusValueBlockProps {
  form: UseFormReturn<AssetFormValues>;
}

// Affiche la plus/moins-value latente dès que la valeur d'achat et la valeur
// actuelle sont renseignées, pour toute nature hors NATURES_WITHOUT_ACQUISITION.
export const PlusValueBlock: React.FC<PlusValueBlockProps> = ({ form }) => {
  const watchedNature = form.watch('nature');
  const watchedValeurAcquisition = form.watch('valeur_acquisition');
  const watchedValeurEstimee = form.watch('valeur_estimee');
  const watchedFraisAcquisition = form.watch('frais_acquisition');

  const hideAcquisition = NATURES_WITHOUT_ACQUISITION.includes(watchedNature);
  const showPlusValue = !hideAcquisition && watchedValeurAcquisition && watchedValeurEstimee;

  if (!showPlusValue) return null;

  const { plusValue: plusValueLive } = calculatePlusValue(watchedValeurEstimee, watchedValeurAcquisition, watchedFraisAcquisition);
  const plusValuePct = watchedValeurAcquisition && watchedValeurAcquisition > 0
    ? (plusValueLive / watchedValeurAcquisition) * 100
    : 0;

  return (
    <div className="rounded-md border border-border/60 bg-card p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <Info className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-widest">Plus / moins-value latente</p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-[11px] text-muted-foreground/60">Valeur d'achat</p>
          <p className="text-[15px] font-semibold text-foreground tabular-nums mt-0.5">{formatEur(watchedValeurAcquisition || 0)}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground/60">Valeur actuelle</p>
          <p className="text-[15px] font-semibold text-foreground tabular-nums mt-0.5">{formatEur(watchedValeurEstimee || 0)}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground/60">Différence</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {plusValueLive >= 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" strokeWidth={2} />
            ) : (
              <TrendingDown className="h-4 w-4 text-rose-500" strokeWidth={2} />
            )}
            <p className={`text-[15px] font-bold tabular-nums ${plusValueLive >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {plusValueLive >= 0 ? '+' : ''}{formatEur(plusValueLive)}
              <span className="text-[11px] font-medium ml-1.5 opacity-70">({plusValuePct >= 0 ? '+' : ''}{plusValuePct.toFixed(1)}%)</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
