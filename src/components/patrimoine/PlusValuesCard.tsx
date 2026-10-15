import React from 'react';
import { PanelDivider, PanelTitle, SummaryRow, panelLinkClass } from '@/components/layout/workspace-panel';
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
  /** Ouvre la vue détaillée des plus-values. */
  onOpen?: () => void;
}

const signed = (n: number) => `${n > 0 ? '+' : ''}${formatCurrency(n)}`;
const tone = (n: number) => (n >= 0 ? 'text-positive' : 'text-destructive');

// Bloc « Plus-values » du Résumé, au gabarit des panneaux : titre de section + lien
// vers le détail, résultat net, ventilation plus / moins-values, principaux actifs et
// catégories en lignes libellé / valeur.
export const PlusValuesCard: React.FC<PlusValuesCardProps> = ({ plusValuesSummary, onOpen }) => {
  const { totalPlusValues, totalMoinsValues, netPlusValue, byCategory, assetsWithPlusValue } = plusValuesSummary;
  const hasData = assetsWithPlusValue.length > 0;

  const topPlusValues = assetsWithPlusValue.filter(a => a.plusValue > 0).slice(0, 3);
  const topMoinsValues = [...assetsWithPlusValue].filter(a => a.plusValue < 0).sort((a, b) => a.plusValue - b.plusValue).slice(0, 3);
  const categories = Object.entries(byCategory)
    .filter(([, data]) => data.count > 0)
    .sort((a, b) => Math.abs(b[1].plusValue) - Math.abs(a[1].plusValue))
    .slice(0, 4);

  return (
    <div>
      <PanelTitle action={hasData && onOpen ? <button type="button" onClick={onOpen} className={panelLinkClass}>Voir le détail</button> : undefined}>
        Plus-values
      </PanelTitle>

      {!hasData ? (
        <p className="mt-3 text-[13px] text-muted-foreground">
          Renseignez la valeur d'acquisition de vos actifs pour calculer les plus-values.
        </p>
      ) : (
        <>
          <p className={`mt-3 text-[20px] font-medium leading-none tracking-[-0.02em] tabular-nums ${tone(netPlusValue)}`}>
            {signed(netPlusValue)}
          </p>
          <p className="mt-1.5 text-[12px] text-muted-foreground">Résultat net latent</p>

          <dl className="mt-4">
            <SummaryRow label="Plus-values"><span className="tabular-nums text-positive">+{formatCurrency(totalPlusValues)}</span></SummaryRow>
            <SummaryRow label="Moins-values"><span className="tabular-nums text-destructive">-{formatCurrency(totalMoinsValues)}</span></SummaryRow>
          </dl>

          {(topPlusValues.length > 0 || topMoinsValues.length > 0) && (
            <>
              <PanelDivider />
              <p className="mb-1 text-[12px] text-muted-foreground">Principaux actifs</p>
              <ul>
                {[...topPlusValues, ...topMoinsValues].map(asset => (
                  <li key={asset.id} className="flex items-center justify-between gap-3 py-1.5 text-[13px]">
                    <span className="truncate text-foreground">{asset.denomination}</span>
                    <span className={`shrink-0 tabular-nums ${tone(asset.plusValue)}`}>{signed(asset.plusValue)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {categories.length > 0 && (
            <>
              <PanelDivider />
              <p className="mb-1 text-[12px] text-muted-foreground">Par catégorie</p>
              <ul>
                {categories.map(([category, data]) => (
                  <li key={category} className="flex items-center justify-between gap-3 py-1.5 text-[13px]">
                    <span className="flex min-w-0 items-center gap-2">
                      <span aria-hidden className="h-3 w-[3px] shrink-0 rounded-full" style={{ backgroundColor: getCategoryColor(category) }} />
                      <span className="truncate text-foreground">{category.charAt(0).toUpperCase() + category.slice(1)}</span>
                    </span>
                    <span className={`shrink-0 tabular-nums ${tone(data.plusValue)}`}>{signed(data.plusValue)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
};
