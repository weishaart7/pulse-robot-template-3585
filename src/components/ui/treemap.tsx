import { useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import { cn } from '@/lib/utils';
import { isDarkColor } from '@/lib/palette';

export interface TreemapItem {
  label: string;
  value: number;
  color: string;
}

interface Rect { x: number; y: number; w: number; h: number }

// Pire rapport d'aspect d'une rangée de surfaces posée le long d'un côté de longueur `side`.
function worst(row: number[], side: number) {
  const sum = row.reduce((a, b) => a + b, 0);
  const max = Math.max(...row);
  const min = Math.min(...row);
  return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min));
}

/**
 * Algorithme « squarified » (Bruls, Huizing, van Wijk) : remplit le rectangle
 * rangée par rangée en gardant des tuiles aussi proches du carré que possible.
 * `areas` doit être trié par ordre décroissant et sommer à w × h.
 */
function squarify(areas: number[], rect: Rect): Rect[] {
  const out: Rect[] = [];
  let { x, y, w, h } = rect;
  let i = 0;
  while (i < areas.length) {
    const side = Math.min(w, h);
    const row = [areas[i]];
    i++;
    while (i < areas.length && worst([...row, areas[i]], side) <= worst(row, side)) {
      row.push(areas[i]);
      i++;
    }
    const sum = row.reduce((a, b) => a + b, 0);
    if (w >= h) {
      // Rangée verticale à gauche.
      const rw = sum / h;
      let cy = y;
      row.forEach((a) => { out.push({ x, y: cy, w: rw, h: a / rw }); cy += a / rw; });
      x += rw; w -= rw;
    } else {
      // Rangée horizontale en haut.
      const rh = sum / w;
      let cx = x;
      row.forEach((a) => { out.push({ x: cx, y, w: a / rh, h: rh }); cx += a / rh; });
      y += rh; h -= rh;
    }
  }
  return out;
}

const GAP = 2;
// Part en deçà de laquelle une tuile serait illisible : ces éléments sont regroupés en
// une tuile « Autres » (dès qu'il y en a au moins deux) ; la légende de l'appelant garde le détail.
const PART_MIN_AUTRES = 0.04;
const COULEUR_AUTRES = '#b8b2aa';

/**
 * Treemap : chaque élément est une tuile dont la surface est proportionnelle
 * à sa valeur. Le détail (libellé, montant, part) s'affiche dans la tuile
 * quand la place le permet, et toujours au survol (title).
 */
export function Treemap({
  items,
  height = 280,
  formatValue,
  showLegend = true,
  active = null,
  onActiveChange,
  className,
}: {
  items: TreemapItem[];
  /** Faux : pas de légende des petites tuiles (l'appelant en affiche une complète). */
  showLegend?: boolean;
  /** Libellé de l'élément mis en avant : les autres tuiles s'estompent. */
  active?: string | null;
  onActiveChange?: (label: string | null) => void;
  height?: number;
  formatValue?: (value: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const positifs = items.filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  const total = positifs.reduce((s, i) => s + i.value, 0);
  const petits = positifs.filter((i) => i.value / total < PART_MIN_AUTRES);
  const regroupes = petits.length >= 2 ? petits : [];
  const sorted: TreemapItem[] = regroupes.length > 0
    ? [
        ...positifs.filter((i) => !regroupes.includes(i)),
        { label: 'Autres', value: regroupes.reduce((s, i) => s + i.value, 0), color: COULEUR_AUTRES },
      ].sort((a, b) => b.value - a.value)
    : positifs;
  // Un élément regroupé mis en avant (survol de la légende) allume la tuile « Autres ».
  const activeTuile = active !== null && regroupes.some((i) => i.label === active) ? 'Autres' : active;
  const rects = width > 0 && total > 0
    ? squarify(sorted.map((i) => (i.value / total) * width * height), { x: 0, y: 0, w: width, h: height })
    : [];

  // Tuiles trop petites pour porter leur libellé : reprises dans une légende sous le graphique.
  const sansLibelle = rects
    .map((r, idx) => ({ r, item: sorted[idx] }))
    .filter(({ r }) => !(r.w - GAP >= 120 && r.h - GAP >= 60))
    .flatMap(({ item }) => (item.label === 'Autres' && regroupes.length > 0 ? regroupes : [item]));

  return (
    <div className={className}>
    <div ref={ref} className="relative w-full" style={{ height }}>
      {rects.map((r, idx) => {
        const item = sorted[idx];
        const pct = (item.value / total) * 100;
        const w = r.w - GAP;
        const h = r.h - GAP;
        const showFull = w >= 120 && h >= 60;
        const showPct = !showFull && w >= 48 && h >= 26;
        const dark = isDarkColor(item.color);
        return (
          <motion.div
            key={item.label}
            title={item.label === 'Autres' && regroupes.length > 0
              ? regroupes.map((i) => `${i.label} · ${((i.value / total) * 100).toFixed(1).replace('.', ',')} %`).join('\n')
              : `${item.label} · ${formatValue ? formatValue(item.value) + ' · ' : ''}${pct.toFixed(1).replace('.', ',')} %`}
            className={cn(
              'absolute overflow-hidden rounded-[1px] p-2.5',
              dark ? 'text-white' : 'text-[#0c0a09]'
            )}
            style={{ left: r.x, top: r.y, width: Math.max(0, w), height: Math.max(0, h), backgroundColor: item.color }}
            onMouseEnter={() => onActiveChange?.(item.label === 'Autres' && regroupes.length > 0 ? null : item.label)}
            onMouseLeave={() => onActiveChange?.(null)}
            initial={{ opacity: reduced ? 1 : 0 }}
            animate={{ opacity: activeTuile === null || activeTuile === item.label ? 1 : 0.25 }}
            transition={reduced ? { duration: 0 } : { duration: 0.35, delay: 0.05 * idx }}
          >
            {showFull && (
              <div className="flex h-full flex-col justify-between gap-1">
                <span className="line-clamp-2 text-[12.5px] font-medium leading-snug">{item.label}</span>
                <span className="flex items-baseline gap-2 tabular-nums">
                  {formatValue && <span className="text-[15px] font-semibold">{formatValue(item.value)}</span>}
                  <span className="text-[11.5px] opacity-70">{pct.toFixed(1).replace('.', ',')} %</span>
                </span>
              </div>
            )}
            {showPct && (
              <span className="whitespace-nowrap text-[11px] font-medium tabular-nums opacity-90">{Math.round(pct)} %</span>
            )}
          </motion.div>
        );
      })}
    </div>
    {showLegend && sansLibelle.length > 0 && (
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        {sansLibelle.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />
            <span>{item.label}</span>
            <span className="tabular-nums text-foreground">
              {formatValue ? formatValue(item.value) : `${((item.value / total) * 100).toFixed(1).replace('.', ',')} %`}
            </span>
          </li>
        ))}
      </ul>
    )}
    </div>
  );
}

export default Treemap;
