import { useEffect, useState, type ReactNode } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Grille au format du Cerfa 2044 : une ligne par numéro de ligne du formulaire, une colonne par
// immeuble (ou société). Les lignes saisies s'enregistrent à la sortie du champ ; les lignes de
// total sont calculées par le moteur et affichées en lecture seule.

export const formatEuros = (v: number) =>
  `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v)} €`;

/**
 * Champ montant : NULL = non saisi, la valeur préremplie (Immobilier / Passifs) s'affiche en clair et
 * compte dans le calcul. Une saisie la remplace (en gras) ; le bouton de retour efface la saisie (NULL).
 * Hors focus, les montants sont formatés avec séparateur de milliers.
 */
export function MontantCellule({ value, prerempli, onCommit, step, suffixe, ariaLabel, min = 0, discret }: {
  value: number | null;
  /** Valeur reprise affichée en retrait (valeur par défaut rarement modifiée, ex. 100 %). */
  discret?: boolean;
  prerempli?: number;
  /** Valeur minimale acceptée (1 pour le nombre de locaux, -Infinity pour la ligne 230). */
  min?: number;
  onCommit: (v: number | null) => void;
  step?: number;
  suffixe?: string;
  ariaLabel: string;
}) {
  const [brouillon, setBrouillon] = useState(value === null ? '' : String(value));
  const [focus, setFocus] = useState(false);
  useEffect(() => { setBrouillon(value === null ? '' : String(value)); }, [value]);
  const formater = (v: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(v);

  const valider = () => {
    setFocus(false);
    const prochaine = brouillon.trim() === '' ? null : Math.max(min, Number(brouillon.replace(/[\s\u00a0\u202f]/g, '').replace(',', '.')));
    if (prochaine !== null && Number.isNaN(prochaine)) { setBrouillon(value === null ? '' : String(value)); return; }
    if (prochaine !== value) onCommit(prochaine);
  };

  const surcharge = value !== null && prerempli !== undefined && Math.round(prerempli) !== value;

  return (
    <div className="relative">
      {surcharge && (
        <button
          type="button"
          title={`Revenir à la valeur préremplie (${formatEuros(prerempli)})`}
          aria-label={`Revenir à la valeur préremplie — ${ariaLabel}`}
          onClick={() => onCommit(null)}
          className="absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-[2px] p-0.5 text-lagon-ink hover:bg-lagon-soft"
        >
          <RotateCcw className="h-3 w-3" />
        </button>
      )}
      <input
        type="text"
        inputMode={step === 1 ? 'numeric' : 'decimal'}
        aria-label={ariaLabel}
        value={focus || value === null ? brouillon : formater(value)}
        placeholder={prerempli !== undefined ? formater(Math.round(prerempli)) : '0'}
        onFocus={() => setFocus(true)}
        onChange={(e) => setBrouillon(e.target.value)}
        onBlur={valider}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        className={cn(
          'h-7 w-full rounded-[2px] border border-transparent bg-transparent px-2 text-right text-[13px] tabular-nums',
          'placeholder:text-muted-foreground/50 hover:border-border focus:border-lagon focus:bg-background focus:outline-none',
          '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
          suffixe && 'pr-6',
          surcharge && 'pl-6',
          prerempli !== undefined && (discret ? 'placeholder:text-muted-foreground' : 'placeholder:text-foreground/80'),
          value !== null && 'font-medium text-foreground',
        )}
      />
      {suffixe && <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground">{suffixe}</span>}
    </div>
  );
}

export interface ColonneGrille {
  id: string;
  denomination: string;
  /** Colonne reliée à un actif (préremplie). */
  relie?: boolean;
}

export function Grille2044({ colonnes, onRenommer, onSupprimer, children, colonneTotal = true }: {
  colonnes: ColonneGrille[];
  onRenommer: (id: string, denomination: string) => void;
  onSupprimer: (id: string) => void;
  children: ReactNode;
  colonneTotal?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-border">
            <th className="w-12 py-2 text-left text-[11.5px] font-medium text-muted-foreground">Ligne</th>
            <th className="min-w-[260px] py-2 text-left text-[11.5px] font-medium text-muted-foreground">Libellé</th>
            {colonnes.map((c) => (
              <th key={c.id} className="w-36 px-1 py-1.5">
                <div className="group flex items-center gap-1" title={c.relie ? 'Relié à un bien d’Immobilier : montants préremplis' : undefined}>
                  {c.relie && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-lagon" />}
                  <input
                    aria-label="Dénomination"
                    defaultValue={c.denomination}
                    onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== c.denomination) onRenommer(c.id, v); }}
                    className="h-7 min-w-0 flex-1 rounded-[2px] border border-transparent bg-transparent px-2 text-right text-[12.5px] font-medium hover:border-border focus:border-lagon focus:outline-none"
                  />
                  <button
                    type="button"
                    aria-label={`Supprimer ${c.denomination}`}
                    onClick={() => onSupprimer(c.id)}
                    className="shrink-0 rounded-[2px] p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus:opacity-100 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </th>
            ))}
            {colonneTotal && <th className="w-32 py-2 pr-2 text-right text-[11.5px] font-medium text-muted-foreground">Total</th>}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** Ligne de saisie : un champ par colonne et, à droite, le total des colonnes. */
export function LigneSaisie({ code, libelle, cellules, total }: {
  code: string;
  libelle: ReactNode;
  cellules: ReactNode[];
  total?: number;
}) {
  return (
    <tr className="border-b border-border/60">
      <td className="py-1 align-middle text-[12px] tabular-nums text-muted-foreground">{code}</td>
      <td className="py-1 pr-4 align-middle text-foreground">{libelle}</td>
      {cellules.map((c, i) => <td key={i} className="px-1 py-0.5">{c}</td>)}
      {total !== undefined && <td className="py-1 pr-2 text-right tabular-nums text-muted-foreground">{formatEuros(total)}</td>}
    </tr>
  );
}

/** Ligne calculée (total, résultat) : en lecture seule, fond taupe, valeur par colonne. */
export function LigneCalculee({ code, libelle, valeurs, total, fort }: {
  code: string;
  libelle: ReactNode;
  valeurs: number[];
  total?: number;
  fort?: boolean;
}) {
  const cls = (v: number) => cn('px-3 py-1.5 text-right tabular-nums', v < 0 && 'text-destructive');
  return (
    <tr className={cn('border-b border-border/60 bg-secondary/50', fort && 'font-medium')}>
      <td className="py-1.5 pl-0 text-[12px] tabular-nums text-muted-foreground">{code}</td>
      <td className="py-1.5 pr-4">{libelle}</td>
      {valeurs.map((v, i) => <td key={i} className={cls(v)}>{formatEuros(v)}</td>)}
      {total !== undefined && <td className={cn(cls(total), 'pr-2')}>{formatEuros(total)}</td>}
    </tr>
  );
}

/** Intertitre de groupe de lignes (Recettes, Frais et charges…). */
export function LigneGroupe({ children, colSpan }: { children: ReactNode; colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="pb-1 pt-4 text-[11.5px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
        {children}
      </td>
    </tr>
  );
}
