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

const Terme = ({ signe, label, valeur, fort = false }: { signe?: string; label: string; valeur: number; fort?: boolean }) => (
  <div className="min-w-0 py-3 md:px-4 md:first:pl-0">
    <p className="truncate text-[11.5px] text-muted-foreground">{label}</p>
    <p className={cn('mt-0.5 whitespace-nowrap text-[14px] tabular-nums text-foreground', fort && 'font-medium')}>
      {signe && <span className="mr-1.5 text-muted-foreground/70">{signe}</span>}
      {formatEur(valeur)}
    </p>
  </div>
);

// Plus / moins-value latente dès que la valeur d'achat et la valeur actuelle sont renseignées, pour
// toute nature hors NATURES_WITHOUT_ACQUISITION. Bande filetée (gabarit des panneaux) : le calcul se
// lit comme une opération — prix + frais = coût total, face à la valeur actuelle — puis une jauge
// situe la valeur actuelle dans le coût décomposé, avec l'écart en étiquette.
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
  // Jauge : le coût décomposé (prix, puis frais) et un repère à la valeur actuelle ; la plus grande
  // des deux bornes occupe toute la largeur. Au-delà du coût, la plus-value prolonge la jauge en lagon.
  const echelle = Math.max(cout, valeurActuelle);
  const pctDe = (n: number) => (n / echelle) * 100;

  return (
    <section className="border-y border-border py-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-foreground">{positif ? 'Plus-value latente' : 'Moins-value latente'}</p>
        <span className={cn(
          'inline-flex h-6 items-center gap-1.5 rounded-[2px] px-2 text-[12.5px] font-medium tabular-nums',
          positif ? 'bg-positive/10 text-positive' : 'bg-destructive/10 text-destructive'
        )}>
          {positif ? '+' : ''}{formatEur(plusValue)}
          <span className="font-normal opacity-80">{formatPct(pct)}</span>
        </span>
      </div>

      <div className="mt-2 grid grid-cols-2 divide-border md:grid-cols-4 md:divide-x">
        <Terme label="Prix d'achat" valeur={valeurAchat} />
        <Terme signe="+" label="Frais" valeur={frais} />
        <Terme signe="=" label="Coût total" valeur={cout} fort />
        <Terme label="Valeur actuelle" valeur={valeurActuelle} fort />
      </div>

      <div className="mt-1" aria-hidden="true">
        <div className="relative h-2 w-full">
          <div className="absolute inset-y-0 left-0 rounded-l-[1px] bg-foreground/25" style={{ width: `${pctDe(valeurAchat)}%` }} />
          <div className="absolute inset-y-0 bg-foreground/10" style={{ left: `${pctDe(valeurAchat)}%`, width: `${pctDe(frais)}%` }} />
          {positif && <div className="absolute inset-y-0 rounded-r-[1px] bg-lagon" style={{ left: `${pctDe(cout)}%`, width: `${pctDe(plusValue)}%` }} />}
          {!positif && <div className="absolute inset-y-0 rounded-r-[1px] bg-destructive/25" style={{ left: `${pctDe(valeurActuelle)}%`, width: `${pctDe(-plusValue)}%` }} />}
          <div
            className={cn('absolute -inset-y-1 w-[2px]', positif ? 'bg-lagon-ink' : 'bg-destructive')}
            style={{ left: `calc(${pctDe(valeurActuelle)}% - 1px)` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-[1px] bg-foreground/25" />Prix d'achat</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-[1px] bg-foreground/10" />Frais</span>
          <span className="inline-flex items-center gap-1.5"><span className={cn('h-2 w-2 rounded-[1px]', positif ? 'bg-lagon' : 'bg-destructive/25')} />{positif ? 'Plus-value' : 'Moins-value'}</span>
          <span className="inline-flex items-center gap-1.5"><span className={cn('h-2.5 w-[2px]', positif ? 'bg-lagon-ink' : 'bg-destructive')} />Valeur actuelle</span>
        </div>
      </div>
    </section>
  );
};
