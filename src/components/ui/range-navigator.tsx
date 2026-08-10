import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/** Range Navigator — graphique d'évolution avec sélecteur de plage (1M / 3M / 1A / Tout)
 *  en haut à droite. Le survol du graphique affiche un réticule en pointillés avec une
 *  bulle indiquant la valeur et sa date. Les graduations de droite sont dérivées de la
 *  plage sélectionnée. Le viewBox est recalé sur la largeur réelle du conteneur (mesurée
 *  via ResizeObserver) pour que le SVG ne soit jamais étiré à l'échelle — sans ça, le
 *  texte se déforme horizontalement (trop gros, tassé) dès que la carte est plus large
 *  que le viewBox par défaut. Thème clair/sombre via les tokens shadcn du projet
 *  (triplets HSL) ; respecte "reduced motion". */

export interface RangeNavigatorPoint {
  /** date ISO (ex: "2024-06-01") */
  date: string;
  value: number;
}

type RangeKey = '1M' | '3M' | '1A' | 'ALL';

const RANGES: { key: RangeKey; label: string; months: number | null }[] = [
  { key: '1M', label: '1M', months: 1 },
  { key: '3M', label: '3M', months: 3 },
  { key: '1A', label: '1A', months: 12 },
  { key: 'ALL', label: 'Tout', months: null },
];

const BLUE = 'hsl(var(--chart-1))';
const CARD = 'hsl(var(--card))';
const BORDER = 'hsl(var(--border))';
const TEXT = 'hsl(var(--foreground))';
const TEXT_MUTED = 'hsl(var(--muted-foreground))';

const DEFAULT_W = 560;
const MAIN_H = 260;
const PAD = { l: 8, r: 64, t: 18, b: 22 };
const AXIS_TICKS = [0, 0.25, 0.5, 0.75, 1]; // fraction depuis le haut du plot

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const defaultFormatValue = (n: number, precision = 0) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(n);

const defaultFormatDate = (d: Date, withYear = false) =>
  d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: withYear ? '2-digit' : undefined,
    timeZone: 'UTC',
  });

const monthsAgo = (d: Date, months: number) => {
  const c = new Date(d);
  c.setUTCMonth(c.getUTCMonth() - months);
  return c;
};

export default function RangeNavigator({
  points,
  defaultRange = 'ALL',
  color = BLUE,
  formatValue = defaultFormatValue,
  formatDate = defaultFormatDate,
  className = '',
}: {
  points: RangeNavigatorPoint[];
  defaultRange?: RangeKey;
  color?: string;
  formatValue?: (n: number, precision?: number) => string;
  formatDate?: (d: Date, withYear?: boolean) => string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [range, setRange] = useState<RangeKey>(defaultRange);
  const [hover, setHover] = useState<number | null>(null);
  const mainRef = useRef<SVGSVGElement>(null);
  const [W, setW] = useState(DEFAULT_W);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setW(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const plotW = W - PAD.l - PAD.r;

  // plage effective : la plage choisie, avec repli sur l'historique complet
  // si elle contient moins de 2 points (historique de valorisation trop récent)
  const windowPoints = useMemo(() => {
    if (points.length < 2) return points;
    const rangeDef = RANGES.find((r) => r.key === range);
    if (!rangeDef?.months) return points;
    const lastDate = new Date(points[points.length - 1].date);
    const cutoff = monthsAgo(lastDate, rangeDef.months);
    const filtered = points.filter((p) => new Date(p.date) >= cutoff);
    return filtered.length >= 2 ? filtered : points;
  }, [points, range]);

  const fmtAt = (i: number, withYear = false) => formatDate(new Date(windowPoints[i]?.date), withYear);

  const detail = useMemo(() => {
    const n = windowPoints.length;
    if (n === 0) return null;
    const values = windowPoints.map((p) => p.value);
    const times = windowPoints.map((p) => new Date(p.date).getTime());
    const t0 = times[0];
    const tSpan = times[n - 1] - t0 || 1;
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const pad = (hi - lo) * 0.1 || Math.max(1, Math.abs(lo) * 0.05);
    const min = lo - pad;
    const max = hi + pad;
    // espacement proportionnel au temps écoulé entre les dates, pas à leur index
    const x = (i: number) => PAD.l + (n === 1 ? 0.5 : (times[i] - t0) / tSpan) * plotW;
    const y = (v: number) => PAD.t + (1 - (v - min) / (max - min || 1)) * (MAIN_H - PAD.t - PAD.b);
    const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const area = `${line} L${x(n - 1).toFixed(1)},${MAIN_H - PAD.b} L${x(0).toFixed(1)},${MAIN_H - PAD.b} Z`;
    const axisPrecision = max - min >= 6 ? 0 : 2;
    return { line, area, min, max, values, n, x, y, axisPrecision };
  }, [windowPoints, plotW]);

  const onMainMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!detail) return;
    const r = mainRef.current?.getBoundingClientRect();
    if (!r) return;
    const px = e.clientX - r.left;
    // les points ne sont plus équidistants (espacement proportionnel au temps) :
    // on cherche le point dont la position x réelle est la plus proche du curseur.
    let nearest = 0;
    let bestDist = Infinity;
    for (let i = 0; i < detail.n; i++) {
      const dist = Math.abs(detail.x(i) - px);
      if (dist < bestDist) {
        bestDist = dist;
        nearest = i;
      }
    }
    setHover(nearest);
  };
  const hv =
    detail && hover != null && hover < detail.n
      ? { i: hover, v: detail.values[hover], x: detail.x(hover), y: detail.y(detail.values[hover]) }
      : null;

  const rangeSelector = (
    <div className="flex gap-1">
      {RANGES.map((r) => (
        <button
          key={r.key}
          type="button"
          onClick={() => setRange(r.key)}
          className="rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors duration-150"
          style={
            range === r.key
              ? { backgroundColor: TEXT, color: CARD }
              : { color: TEXT_MUTED, backgroundColor: 'transparent' }
          }
        >
          {r.label}
        </button>
      ))}
    </div>
  );

  if (points.length < 2 || !detail) {
    return (
      <div className={`w-full ${className}`}>
        <div className="mb-2 flex justify-end">{rangeSelector}</div>
        <div className="flex h-40 items-center justify-center text-sm" style={{ color: TEXT_MUTED }}>
          Pas assez de données pour afficher l'évolution.
        </div>
      </div>
    );
  }

  const crossesYear =
    new Date(windowPoints[0].date).getUTCFullYear() !== new Date(windowPoints[windowPoints.length - 1].date).getUTCFullYear();

  return (
    <div className={`w-full ${className}`}>
      <div className="mb-2 flex justify-end">{rangeSelector}</div>

      <svg
        ref={mainRef}
        viewBox={`0 0 ${W} ${MAIN_H}`}
        className="block w-full h-[260px]"
        onPointerMove={onMainMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="rn-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.16" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {AXIS_TICKS.map((f) => {
          const ty = PAD.t + f * (MAIN_H - PAD.t - PAD.b);
          return (
            <g key={f}>
              {f > 0 && f < 1 && (
                <line
                  x1={PAD.l}
                  y1={ty}
                  x2={W - PAD.r}
                  y2={ty}
                  stroke={`color-mix(in srgb, ${TEXT} 4%, transparent)`}
                  strokeDasharray="2 5"
                />
              )}
              <text
                x={W - PAD.r + 10}
                y={ty + (f === 0 ? 4 : f === 1 ? 0 : 3)}
                fontSize={11}
                fill={TEXT_MUTED}
                className="tabular-nums"
              >
                {formatValue(detail.max - f * (detail.max - detail.min), detail.axisPrecision)}
              </text>
            </g>
          );
        })}
        <motion.path
          key={`${range}-${windowPoints.length}`}
          d={detail.area}
          fill="url(#rn-g)"
          initial={{ opacity: reduced ? 1 : 0.4 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduced ? 0 : 0.2 }}
        />
        <path d={detail.line} fill="none" stroke={color} strokeWidth={1.8} vectorEffect="non-scaling-stroke" />
        {/* libellés de dates aux extrémités */}
        <text x={PAD.l} y={MAIN_H - 5} fontSize={11} fill={TEXT_MUTED} className="tabular-nums">
          {fmtAt(0, crossesYear)}
        </text>
        <text x={W - PAD.r} y={MAIN_H - 5} fontSize={11} fill={TEXT_MUTED} textAnchor="end" className="tabular-nums">
          {fmtAt(detail.n - 1, crossesYear)}
        </text>
        {hv && (
          <g pointerEvents="none">
            <line
              x1={hv.x}
              y1={PAD.t}
              x2={hv.x}
              y2={MAIN_H - PAD.b}
              stroke={`color-mix(in srgb, ${TEXT} 22%, transparent)`}
              strokeDasharray="3 3"
            />
            <circle cx={hv.x} cy={hv.y} r={3.5} fill={color} stroke={CARD} strokeWidth={1.5} />
            {(() => {
              const label = `${formatValue(hv.v)} · ${fmtAt(hv.i, crossesYear)}`;
              const bw = label.length * 6 + 16;
              const bx = clamp(hv.x - bw / 2, PAD.l, W - PAD.r - bw);
              return (
                <g>
                  <rect x={bx} y={PAD.t - 12} width={bw} height={19} rx={4} fill={CARD} stroke={BORDER} />
                  <text
                    x={bx + bw / 2}
                    y={PAD.t + 1}
                    textAnchor="middle"
                    fontSize={10.5}
                    fill={TEXT}
                    className="tabular-nums"
                  >
                    {label}
                  </text>
                </g>
              );
            })()}
          </g>
        )}
      </svg>
    </div>
  );
}
