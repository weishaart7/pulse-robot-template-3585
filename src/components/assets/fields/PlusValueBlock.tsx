import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { AssetFormValues } from '@/schemas/assetSchema';
import { NATURES_WITHOUT_ACQUISITION } from '@/constants/assetTypes';
import { calculatePlusValue } from '@/lib/patrimoine/utils';
import { cn } from '@/lib/utils';

const formatEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const formatPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1).replace('.', ',')} %`;

interface PlusValueBlockProps {
  form: UseFormReturn<AssetFormValues>;
}

const Ligne = ({ label, children, total = false }: { label: string; children: React.ReactNode; total?: boolean }) => (
  <div className={cn('flex items-baseline justify-between gap-4 py-1.5 text-[13px]', total && 'border-t border-border pt-2')}>
    <span className="text-muted-foreground">{label}</span>
    <span className={cn('tabular-nums text-foreground', total && 'font-medium')}>{children}</span>
  </div>
);

// Plus / moins-value latente dès que la valeur d'achat et la valeur actuelle sont renseignées, pour
// toute nature hors NATURES_WITHOUT_ACQUISITION. Bandeau à filet lagon, lignes libellé / valeur
// (gabarit des panneaux) : le détail prix + frais explique l'écart, rapporté au coût d'acquisition.
export const PlusValueBlock: React.FC<PlusValueBlockProps> = ({ form }) => {
  const nature = form.watch('nature');
  const valeurAchat = form.watch('valeur_acquisition');
  const valeurActuelle = form.watch('valeur_estimee');
  const frais = form.watch('frais_acquisition') || 0;

  if (NATURES_WITHOUT_ACQUISITION.includes(nature) || !valeurAchat || !valeurActuelle) return null;

  const { plusValue } = calculatePlusValue(valeurActuelle, valeurAchat, frais);
  const cout = valeurAchat + frais;
  const pct = cout > 0 ? (plusValue / cout) * 100 : 0;
  const positif = plusValue >= 0;

  return (
    <div className="border-l-2 border-lagon bg-lagon-soft/40 px-4 py-3 animate-fade-in">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[12px] text-lagon-ink">{positif ? 'Plus-value latente' : 'Moins-value latente'}</p>
        <p className={cn('text-[15px] font-medium tabular-nums', positif ? 'text-positive' : 'text-destructive')}>
          {positif ? '+' : ''}{formatEur(plusValue)}
          <span className="ml-2 text-[12px] font-normal opacity-80">{formatPct(pct)}</span>
        </p>
      </div>
      <div className="mt-2 grid grid-cols-1 gap-x-8 md:grid-cols-2">
        <div>
          <Ligne label="Valeur d'achat">{formatEur(valeurAchat)}</Ligne>
          {frais > 0 && <Ligne label="Frais d'acquisition">{formatEur(frais)}</Ligne>}
          {frais > 0 && <Ligne label="Coût d'acquisition" total>{formatEur(cout)}</Ligne>}
        </div>
        <div>
          <Ligne label="Valeur actuelle">{formatEur(valeurActuelle)}</Ligne>
        </div>
      </div>
    </div>
  );
};
