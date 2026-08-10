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

const DEFAULT_COLORS = ['#4790E4', '#7FB4EF', '#2E5FA3', '#2AA173', '#B98634', 'var(--muted-foreground)'];

const SIZE = 156;
const CENTER = SIZE / 2;
const R = 60;
const STROKE = 16;
const C = 2 * Math.PI * R;

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
  className,
}: {
  centerLabel?: string;
  centerCaption?: string;
  sectors: DonutSector[];
  /** Couleurs d'arc appliquées dans l'ordre et cyclées au-delà de la fin (repli si `sector.color` absent). */
  colors?: string[];
  /** Formatte `sector.value` dans la légende et le détail central du secteur actif. */
  formatValue?: (value: number) => string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [hot, setHot] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const active = hot ?? pinned;

  const togglePin = (i: number) => setPinned((p) => (p === i ? null : i));

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
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90 text-foreground">
          {arcs.map((a, i) => (
            <motion.circle
              key={a.label}
              cx={CENTER}
              cy={CENTER}
              r={R}
              fill="none"
              stroke={a.color}
              strokeWidth={STROKE}
              strokeDasharray={`${(a.pct / 100) * C - 2} ${C}`}
              strokeDashoffset={-((a.start / 100) * C)}
              initial={{ opacity: reduced ? 1 : 0 }}
              animate={{ opacity: active === null || active === i ? 1 : 0.22 }}
              transition={reduced ? { duration: 0 } : { duration: 0.35, ease: EASE, delay: 0.08 * i }}
              onMouseEnter={() => setHot(i)}
              onMouseLeave={() => setHot(null)}
              onClick={() => togglePin(i)}
              style={{ cursor: 'pointer' }}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
          {activeSector ? (
            <>
              <span className="w-full truncate text-[12px] font-medium text-foreground/90">{activeSector.label}</span>
              <span className="mt-1 text-[17px] font-semibold tabular-nums text-foreground">
                {activeSector.pct.toFixed(1)}%
              </span>
              {formatValue && activeSector.value != null && (
                <span className="text-[10px] tabular-nums text-foreground/40">{formatValue(activeSector.value)}</span>
              )}
            </>
          ) : (
            <>
              {centerLabel && <span className="text-[18px] font-semibold tracking-wide text-foreground/90">{centerLabel}</span>}
              {centerCaption && <span className="mt-1 text-[10.5px] text-foreground/35">{centerCaption}</span>}
            </>
          )}
        </div>
      </div>

      <div className="flex w-[248px] shrink-0 flex-col">
        {arcs.map((a, i) => (
          <button
            key={a.label}
            type="button"
            onMouseEnter={() => setHot(i)}
            onMouseLeave={() => setHot(null)}
            onFocus={() => setHot(i)}
            onBlur={() => setHot(null)}
            onClick={() => togglePin(i)}
            aria-pressed={pinned === i}
            aria-label={
              formatValue && a.value != null
                ? `${a.label} : ${formatValue(a.value)}, ${a.pct.toFixed(1)}%`
                : `${a.label} : ${a.pct.toFixed(1)}%`
            }
            className={cn(
              '-mx-2 flex items-center gap-2.5 rounded-md px-2 py-2.5 text-left transition-opacity duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              active !== null && active !== i && 'opacity-35'
            )}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: a.color }} />
            <span className="min-w-0 flex-1 truncate text-[12.5px] text-foreground/65">{a.label}</span>
            <span className="shrink-0 text-[11.5px] tabular-nums text-foreground/50">
              {formatValue && a.value != null ? `${formatValue(a.value)} · ${a.pct.toFixed(1)}%` : `${a.pct.toFixed(1)}%`}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export { SectorsDonut as Component };
export default SectorsDonut;
