import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
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
  /** Point marqué d'un repère sur la courbe (ex. date de valorisation saisie). */
  marked?: boolean;
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
const PAD = { l: 0, r: 56, t: 12, b: 26 };
const DATE_TICKS = 5;

// Pas « rond » (1, 2, 2,5 ou 5 × 10^n) donnant environ `count` graduations sur [lo, hi].
function niceStep(span: number, count: number) {
  const raw = span / Math.max(1, count);
  const mag = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const norm = raw / mag;
  return (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
}

const formatAxis = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', notation: 'compact', maximumFractionDigits: 1 }).format(n);


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
  title,
  className = '',
}: {
  points: RangeNavigatorPoint[];
  /** Titre posé à gauche de la ligne d'en-tête, le sélecteur de plage à droite. */
  title?: ReactNode;
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
    const rawLo = Math.min(...values);
    const rawHi = Math.max(...values);
    // Écart minimal affiché : 2 % de la valeur (au moins 1). Sans ce plancher,
    // une variation de quelques centimes occupait toute la hauteur et la courbe
    // semblait chuter alors que les montants arrondis étaient identiques.
    const ecartMin = Math.max(1, Math.max(Math.abs(rawLo), Math.abs(rawHi)) * 0.02);
    const milieu = (rawLo + rawHi) / 2;
    const lo = rawHi - rawLo < ecartMin ? milieu - ecartMin / 2 : rawLo;
    const hi = rawHi - rawLo < ecartMin ? milieu + ecartMin / 2 : rawHi;
    // Bornes calées sur des graduations rondes ; pas de graduation sous zéro
    // quand toutes les valeurs sont positives (montants ≥ 0).
    const step = niceStep((hi - lo) || Math.max(1, Math.abs(hi) * 0.1), 4);
    let min = Math.floor(lo / step) * step;
    if (lo >= 0) min = Math.max(0, min);
    const max = Math.max(Math.ceil(hi / step) * step, min + step);
    const ticks: number[] = [];
    for (let v = min; v <= max + step / 2; v += step) ticks.push(v);
    // espacement proportionnel au temps écoulé entre les dates, pas à leur index
    const x = (i: number) => PAD.l + (n === 1 ? 0.5 : (times[i] - t0) / tSpan) * plotW;
    const y = (v: number) => PAD.t + (1 - (v - min) / (max - min || 1)) * (MAIN_H - PAD.t - PAD.b);
    // Courbe lissée monotone (Fritsch–Carlson) : passe par chaque point sans
    // dépasser les valeurs voisines — pas de faux creux ni de faux pic.
    const xs = values.map((_, i) => x(i));
    const ys = values.map((v) => y(v));
    const pentes = xs.slice(1).map((xi, i) => (ys[i + 1] - ys[i]) / (xi - xs[i] || 1));
    const tangentes = xs.map((_, i) => {
      if (i === 0) return pentes[0] ?? 0;
      if (i === n - 1) return pentes[n - 2] ?? 0;
      const a = pentes[i - 1];
      const b = pentes[i];
      return a * b <= 0 ? 0 : (2 * a * b) / (a + b);
    });
    const line = xs
      .map((xi, i) => {
        if (i === 0) return `M${xi.toFixed(1)},${ys[0].toFixed(1)}`;
        const dx = (xi - xs[i - 1]) / 3;
        return `C${(xs[i - 1] + dx).toFixed(1)},${(ys[i - 1] + tangentes[i - 1] * dx).toFixed(1)} ${(xi - dx).toFixed(1)},${(ys[i] - tangentes[i] * dx).toFixed(1)} ${xi.toFixed(1)},${ys[i].toFixed(1)}`;
      })
      .join(' ');
    const area = `${line} L${x(n - 1).toFixed(1)},${MAIN_H - PAD.b} L${x(0).toFixed(1)},${MAIN_H - PAD.b} Z`;
    // Dates intermédiaires régulièrement espacées dans le temps.
    const dateTicks = Array.from({ length: DATE_TICKS }, (_, k) => {
      const t = t0 + (k / (DATE_TICKS - 1)) * tSpan;
      return { t, x: PAD.l + (k / (DATE_TICKS - 1)) * plotW };
    });
    return { line, area, min, max, ticks, values, n, x, y, dateTicks };
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
    <div role="tablist" aria-label="Période" className="flex gap-1">
      {RANGES.map((r) => (
        <button
          key={r.key}
          type="button"
          role="tab"
          aria-selected={range === r.key}
          onClick={() => setRange(r.key)}
          className="rounded-[2px] px-2.5 py-1 text-[11px] font-medium transition-colors duration-150"
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
        <div className="mb-2 flex items-center justify-between gap-3">{title}{rangeSelector}</div>
        <div className="flex h-40 items-center justify-center text-sm" style={{ color: TEXT_MUTED }}>
          Pas assez de données pour afficher l'évolution.
        </div>
      </div>
    );
  }

  const crossesYear =
    new Date(windowPoints[0].date).getUTCFullYear() !== new Date(windowPoints[windowPoints.length - 1].date).getUTCFullYear();

  const first = detail.values[0];
  const last = detail.values[detail.n - 1];
  // Arrondi à l'euro : quelques centimes d'écart ne s'affichent pas en « −0 € » rouge.
  const delta = Math.round(last - first);
  const deltaPct = first > 0 ? (delta / first) * 100 : null;
  const shown = hv ?? { i: detail.n - 1, v: last };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between gap-3">
        {title ?? <span />}
        {rangeSelector}
      </div>
      {/* Valeur au point survolé (dernier point sinon) et variation sur la plage affichée. */}
      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[22px] font-medium leading-none tracking-[-0.03em] tabular-nums" style={{ color: TEXT }}>
          {formatValue(shown.v)}
        </span>
        {hv ? (
          <span className="text-[12px] tabular-nums" style={{ color: TEXT_MUTED }}>au {fmtAt(hv.i, true)}</span>
        ) : (
          <span className="text-[12px] tabular-nums" style={{ color: TEXT_MUTED }}>
            <span className={delta === 0 ? 'text-[#ffa451]' : delta > 0 ? 'text-positive' : 'text-destructive'}>
              {delta > 0 ? '+' : delta < 0 ? '−' : ''}{formatValue(Math.abs(delta))}
              {deltaPct !== null && ` (${delta > 0 ? '+' : delta < 0 ? '−' : ''}${Math.abs(deltaPct).toFixed(1).replace('.', ',')} %)`}
            </span>{' '}
            depuis le {fmtAt(0, true)}
          </span>
        )}
      </div>

      <svg
        ref={mainRef}
        viewBox={`0 0 ${W} ${MAIN_H}`}
        className="mt-4 block h-[260px] w-full"
        onPointerMove={onMainMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="rn-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="60%" stopColor={color} stopOpacity="0.04" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {detail.ticks.map((v) => {
          const ty = detail.y(v);
          return (
            <g key={v}>
              <line
                x1={PAD.l}
                y1={ty}
                x2={W - PAD.r}
                y2={ty}
                stroke={BORDER}
                strokeOpacity={v === detail.min ? 1 : 0.55}
              />
              <text x={W - PAD.r + 10} y={ty + 3.5} fontSize={11} fill={TEXT_MUTED} className="tabular-nums">
                {formatAxis(v)}
              </text>
            </g>
          );
        })}
        <motion.path
          key={`${range}-${windowPoints.length}`}
          d={detail.area}
          fill="url(#rn-g)"
          initial={{ opacity: reduced ? 1 : 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduced ? 0 : 0.6, delay: reduced ? 0 : 0.35 }}
        />
        <motion.path
          key={`line-${range}-${windowPoints.length}`}
          d={detail.line}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: reduced ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reduced ? 0 : 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
        {/* Point final « aujourd'hui » : halo qui respire doucement. */}
        {!hv && (
          <g pointerEvents="none">
            {!reduced && (
              <motion.circle
                cx={detail.x(detail.n - 1)}
                cy={detail.y(detail.values[detail.n - 1])}
                r={4}
                fill={color}
                initial={{ opacity: 0.35, scale: 1 }}
                animate={{ opacity: 0, scale: 3 }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut', delay: 0.9 }}
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              />
            )}
            <circle cx={detail.x(detail.n - 1)} cy={detail.y(detail.values[detail.n - 1])} r={4} fill={color} stroke={CARD} strokeWidth={2} />
          </g>
        )}
        {/* dates régulièrement espacées sous l'axe */}
        {detail.dateTicks.map((d, k) => (
          // Une date déjà écrite à gauche n'est pas répétée (période de quelques jours).
          k > 0 && formatDate(new Date(d.t), crossesYear) === formatDate(new Date(detail.dateTicks[k - 1].t), crossesYear) ? null : <text
            key={k}
            x={d.x}
            y={MAIN_H - 6}
            fontSize={11}
            fill={TEXT_MUTED}
            textAnchor={k === 0 ? 'start' : k === DATE_TICKS - 1 ? 'end' : 'middle'}
            className="tabular-nums"
          >
            {formatDate(new Date(d.t), crossesYear)}
          </text>
        ))}
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
            <circle cx={hv.x} cy={hv.y} r={4.5} fill={color} stroke={CARD} strokeWidth={2} />
          </g>
        )}
      </svg>
    </div>
  );
}
