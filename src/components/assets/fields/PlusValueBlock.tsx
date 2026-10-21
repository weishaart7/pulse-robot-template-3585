import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { AssetFormValues } from '@/schemas/assetSchema';
import { NATURES_WITHOUT_ACQUISITION, isPEA, isCTO, isNonCote, isDefiscalisation, isActionnariatSalarie } from '@/constants/assetTypes';
import { calculatePlusValue } from '@/lib/patrimoine/utils';
import { cn } from '@/lib/utils';

const formatEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const formatPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1).replace('.', ',')} %`;

interface PlusValueBlockProps {
  form: UseFormReturn<AssetFormValues>;
}

// Plus / moins-value latente dès que la valeur d'achat et la valeur actuelle sont renseignées, pour
// toute nature hors NATURES_WITHOUT_ACQUISITION. La jauge porte la lecture : le coût total décomposé
// (prix d'achat, frais) sur toute la largeur, la valeur actuelle en repère annoté au-dessus, l'écart
// teinté entre les deux (hachures rouges en moins-value, lagon foncé au-delà du coût en plus-value).
// Palette des graphiques : prix d'achat lagon, frais orange (#ffa451).
export const PlusValueBlock: React.FC<PlusValueBlockProps> = ({ form }) => {
  const nature = form.watch('nature');
  const valeurAchat = form.watch('valeur_acquisition');
  const valeurActuelle = form.watch('valeur_estimee');
  const frais = form.watch('frais_acquisition') || 0;

  if (NATURES_WITHOUT_ACQUISITION.includes(nature) || isActionnariatSalarie(nature) || !valeurAchat || !valeurActuelle) return null;

  const { plusValue } = calculatePlusValue(valeurActuelle, valeurAchat, frais);
  const cout = valeurAchat + frais;
  const pct = cout > 0 ? (plusValue / cout) * 100 : 0;
  const positif = plusValue >= 0;

  // La plus grande des deux bornes (coût, valeur) occupe toute la largeur.
  const echelle = Math.max(cout, valeurActuelle);
  const pos = (n: number) => (n / echelle) * 100;
  const posValeur = pos(valeurActuelle);
  // Étiquette du repère : au-dessus de la jauge, à gauche du trait, quand il est dans la moitié droite ;
  // sinon sous la jauge, à droite du trait (au-dessus, elle chevaucherait le montant).
  const etiquetteADroite = posValeur > 55;

  const etiquetteValeur = (
    <div
      className={cn('absolute flex flex-col whitespace-nowrap', etiquetteADroite ? 'bottom-0 items-end pb-1.5' : 'top-0 items-start pt-2')}
      style={etiquetteADroite ? { right: `${100 - posValeur}%` } : { left: `${posValeur}%` }}
    >
      <span className="text-[11px] text-muted-foreground">Valeur actuelle</span>
      <span className="text-[13px] font-medium tabular-nums text-foreground">{formatEur(valeurActuelle)}</span>
    </div>
  );

  return (
    <section className="border-y border-border py-4 animate-fade-in">
      {/* Titre de section des formulaires (SectionHeader), sans sa marge basse : l'espacement vers le
          montant est porté par la bande centrée ci-dessous. */}
      <h3 className="flex items-center gap-2 text-[14.5px] font-medium tracking-[-0.01em] text-foreground">
        <span aria-hidden className="h-3 w-[3px] rounded-full bg-lagon" />
        {positif ? 'Plus-value latente' : 'Moins-value latente'}
      </h3>

      <div>
        {/* Montant centré verticalement entre le libellé et la jauge ; le repère annoté de la valeur
            actuelle partage cette bande, posé sur la jauge. */}
        <div className="relative flex h-14 items-center">
          <p className="flex items-baseline gap-2 tabular-nums">
            <span className={cn('text-[22px] font-medium leading-none tracking-[-0.02em]', positif ? 'text-positive' : 'text-destructive')}>
              {positif ? '+' : '−'}{formatEur(Math.abs(plusValue))}
            </span>
            <span className="text-[12.5px] text-muted-foreground">{formatPct(pct).replace('-', '−')} du coût total</span>
          </p>
          {etiquetteADroite && etiquetteValeur}
        </div>

        <div className="relative h-3" aria-hidden="true">
          <div className="absolute inset-0 flex gap-[2px]">
            <div className="h-full rounded-l-[2px] bg-lagon" style={{ width: `${pos(valeurAchat)}%` }} />
            {frais > 0 && <div className="h-full bg-[#ffa451]" style={{ width: `${pos(frais)}%` }} />}
            {positif && plusValue > 0 && <div className="h-full rounded-r-[2px] bg-lagon-ink" style={{ width: `${pos(plusValue)}%` }} />}
          </div>
          {!positif && (
            <div
              className="absolute inset-y-0 rounded-r-[2px] bg-[repeating-linear-gradient(135deg,hsl(var(--destructive)/0.55)_0_2px,hsl(var(--background)/0.6)_2px_5px)]"
              style={{ left: `${posValeur}%`, width: `${pos(-plusValue)}%` }}
            />
          )}
          <div
            className={cn('absolute -top-2 -bottom-1 w-[2px] rounded-full', positif ? 'bg-lagon-ink' : 'bg-destructive')}
            style={{ left: `calc(${posValeur}% - 1px)` }}
          />
        </div>

        {!etiquetteADroite && <div className="relative h-11">{etiquetteValeur}</div>}

        {/* Décomposition du coût sous la jauge */}
        <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-[12px] tabular-nums">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-[1px] bg-lagon" />
            {isPEA(nature) ? 'Montant versé' : isCTO(nature) ? 'Montant investi' : isNonCote(nature) ? 'Montant appelé' : isDefiscalisation(nature) ? 'Montant souscrit' : "Prix d'achat"} <span className="text-foreground">{formatEur(valeurAchat)}</span>
          </span>
          <span className="inline-flex flex-wrap items-center gap-x-1.5 text-muted-foreground">
            {frais > 0 && (
              <>
                <span className="h-2 w-2 rounded-[1px] bg-[#ffa451]" />
                Frais <span className="text-foreground">{formatEur(frais)}</span>
                <span className="mx-1 text-muted-foreground/50">·</span>
              </>
            )}
            Coût total <span className="font-medium text-foreground">{formatEur(cout)}</span>
          </span>
        </div>
      </div>
    </section>
  );
};
