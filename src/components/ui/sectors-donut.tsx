import { SERIES } from '@/lib/palette';
import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as const;

export interface DonutSector {
  label: string;
  pct: number;
  /** Montant brut du secteur, affiché dans la légende et au centre si `formatValue` est fourni. */
  value?: number;
  /** Couleur de l'arc pour ce secteur ; si absente, on retombe sur `colors` par index. */
  color?: string;
}

const DEFAULT_COLORS: string[] = [...SERIES];

const SIZE = 208;
const CENTER = SIZE / 2;
const R_OUT = 102;
const R_IN = 70;

// Secteur d'anneau plein entre deux angles (en fractions de tour, 0 = midi, sens horaire).
function sectorPath(from: number, to: number) {
  const span = Math.min(to - from, 0.99999);
  const a0 = from * 2 * Math.PI;
  const a1 = (from + span) * 2 * Math.PI;
  const pt = (r: number, a: number) => `${CENTER + r * Math.sin(a)} ${CENTER - r * Math.cos(a)}`;
  const large = span > 0.5 ? 1 : 0;
  return [
    `M ${pt(R_OUT, a0)}`,
    `A ${R_OUT} ${R_OUT} 0 ${large} 1 ${pt(R_OUT, a1)}`,
    `L ${pt(R_IN, a1)}`,
    `A ${R_IN} ${R_IN} 0 ${large} 0 ${pt(R_IN, a0)}`,
    'Z',
  ].join(' ');
}

/**
 * Anneau de répartition : secteurs en arcs autour d'une valeur centrale,
 * légende à côté. Survoler ou cliquer une ligne (ou un arc) mémorise le
 * secteur actif : le reste de l'anneau s'estompe et le centre affiche son
 * détail. Le clic "épingle" la sélection — utile au tactile, où il n'y a
 * pas de hover — jusqu'au prochain clic sur le même secteur ou un autre.
 */
export function SectorsDonut({
  centerLabel,
  centerCaption,
  sectors,
  colors = DEFAULT_COLORS,
  formatValue,
  showLegend = true,
  active: activeProp,
  onActiveChange,
  className,
}: {
  centerLabel?: string;
  centerCaption?: string;
  sectors: DonutSector[];
  /** Couleurs d'arc appliquées dans l'ordre et cyclées au-delà de la fin (repli si `sector.color` absent). */
  colors?: string[];
  /** Formatte `sector.value` dans la légende et le détail central du secteur actif. */
  formatValue?: (value: number) => string;
  /** Faux : l'anneau seul, la légende étant rendue par l'appelant. */
  showLegend?: boolean;
  /** Secteur mis en avant, piloté par l'appelant (survol partagé avec une légende externe). */
  active?: number | null;
  onActiveChange?: (index: number | null) => void;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [hot, setHot] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const controlled = activeProp !== undefined;
  const active = controlled ? activeProp : hot ?? pinned;
  const setHover = (i: number | null) => (controlled ? onActiveChange?.(i) : setHot(i));

  const togglePin = (i: number) => {
    if (controlled) onActiveChange?.(activeProp === i ? null : i);
    else setPinned((p) => (p === i ? null : i));
  };

  let acc = 0;
  const arcs = sectors.map((s, i) => {
    const start = acc;
    acc += s.pct;
    return { ...s, start, color: s.color ?? colors[i % colors.length] };
  });
  const activeSector = active != null ? arcs[active] : null;

  return (
    <div className={cn('mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-x-8 gap-y-5', className)}>
      <div className="relative shrink-0" style={{ height: SIZE, width: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {arcs.map((a, i) => (
            // Liseré couleur du fond : sépare les secteurs par un trait d'épaisseur constante.
            <motion.path
              key={a.label}
              d={sectorPath(a.start / 100, (a.start + a.pct) / 100)}
              fill={a.color}
              stroke="hsl(var(--background))"
              strokeWidth={2}
              strokeLinejoin="miter"
              initial={{ opacity: reduced ? 1 : 0 }}
              animate={{ opacity: active === null || active === i ? 1 : 0.2 }}
              transition={reduced ? { duration: 0 } : { duration: 0.3, ease: EASE, delay: active === null ? 0.05 * i : 0 }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => togglePin(i)}
              style={{ cursor: 'pointer' }}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-12 text-center">
          {activeSector ? (
            <>
              <span className="line-clamp-2 text-[11.5px] leading-tight text-muted-foreground">{activeSector.label}</span>
              <span className="mt-1.5 text-[24px] font-medium leading-none tracking-[-0.03em] tabular-nums text-foreground">
                {activeSector.pct.toFixed(1).replace('.', ',')} %
              </span>
              {formatValue && activeSector.value != null && (
                <span className="mt-1.5 text-[12px] tabular-nums text-muted-foreground">{formatValue(activeSector.value)}</span>
              )}
            </>
          ) : (
            <>
              {centerCaption && <span className="text-[11.5px] text-muted-foreground">{centerCaption}</span>}
              {centerLabel && <span className="mt-1.5 text-[24px] font-medium leading-none tracking-[-0.03em] tabular-nums text-foreground">{centerLabel}</span>}
            </>
          )}
        </div>
      </div>

      {showLegend && <div className="flex w-[300px] max-w-full shrink-0 flex-col gap-0.5">
        {arcs.map((a, i) => (
          <button
            key={a.label}
            type="button"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            onClick={() => togglePin(i)}
            aria-pressed={pinned === i}
            aria-label={
              formatValue && a.value != null
                ? `${a.label} : ${formatValue(a.value)}, ${a.pct.toFixed(1)}%`
                : `${a.label} : ${a.pct.toFixed(1)}%`
            }
            className={cn(
              '-mx-2 flex items-start gap-2.5 rounded-md px-2 py-2 text-left hover:bg-foreground/[0.03] transition-opacity duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              active !== null && active !== i && 'opacity-35'
            )}
          >
            <span className="mt-[3px] h-2.5 w-2.5 shrink-0 self-start rounded-full" style={{ background: a.color }} />
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="flex items-baseline gap-3">
                <span className="min-w-0 flex-1 text-[12.5px] leading-snug text-foreground/75">{a.label}</span>
                {formatValue && a.value != null && (
                  <span className="shrink-0 text-[12.5px] font-medium tabular-nums text-foreground">{formatValue(a.value)}</span>
                )}
                <span className="w-11 shrink-0 text-right text-[11.5px] tabular-nums text-foreground/45">{a.pct.toFixed(1)}%</span>
              </span>
              <span className="h-[3px] w-full overflow-hidden rounded-full bg-foreground/[0.06]">
                <span className="block h-full rounded-full" style={{ width: `${Math.min(100, a.pct)}%`, background: a.color }} />
              </span>
            </span>
          </button>
        ))}
      </div>}
    </div>
  );
}

export { SectorsDonut as Component };
export default SectorsDonut;
