import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { PanelTitle } from '@/components/layout/workspace-panel';
import { SectorsDonut } from '@/components/ui/sectors-donut';
import { Treemap } from '@/components/ui/treemap';
import { cn } from '@/lib/utils';
import { isDarkColor } from '@/lib/palette';

export interface CategorieActif {
  name: string;
  value: number;
  pct: number;
  color: string;
}

type Vue = 'anneau' | 'barre' | 'treemap';
const VUES: { id: Vue; label: string }[] = [
  { id: 'anneau', label: 'Anneau' },
  { id: 'barre', label: 'Barre' },
  { id: 'treemap', label: 'Treemap' },
];
const VUE_STORAGE_KEY = 'patrimoine.resume.vueRepartition';
const CHART_HEIGHT = 232;

const formatCompact = (value: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', notation: 'compact', maximumFractionDigits: 1 }).format(value);
const formatPct = (pct: number) => `${pct.toFixed(1).replace('.', ',')} %`;

/**
 * Répartition des actifs par catégorie : un graphique au choix (anneau,
 * barre, treemap) à gauche, une légende commune à droite. Le survol est
 * partagé — survoler une ligne de légende ou une forme du graphique met la
 * même catégorie en avant des deux côtés.
 */
export function RepartitionActifs({
  categories,
  formatCurrency,
}: {
  categories: CategorieActif[];
  formatCurrency: (value: number) => string;
}) {
  // Vue choisie mémorisée par navigateur (simple confort, repli sur l'anneau).
  const [vue, setVue] = useState<Vue>(() => {
    try {
      const v = localStorage.getItem(VUE_STORAGE_KEY);
      return VUES.some(x => x.id === v) ? (v as Vue) : 'anneau';
    } catch {
      return 'anneau';
    }
  });
  const changerVue = (v: Vue) => {
    setVue(v);
    try { localStorage.setItem(VUE_STORAGE_KEY, v); } catch { /* stockage indisponible */ }
  };

  const [active, setActive] = useState<string | null>(null);
  const activeIndex = active === null ? null : categories.findIndex(c => c.name === active);
  const total = categories.reduce((s, c) => s + c.value, 0);

  return (
    <div className="border-b border-border px-8 py-6">
      <PanelTitle action={categories.length > 0 ? <VueSwitch value={vue} onChange={changerVue} /> : undefined}>
        Répartition des actifs
      </PanelTitle>

      {categories.length === 0 ? (
        <p className="mt-3 text-[13px] text-muted-foreground">Aucun actif valorisé.</p>
      ) : (
        <div className="mt-5 grid grid-cols-1 items-center gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
          <div className="flex items-center justify-center" style={{ minHeight: CHART_HEIGHT }}>
            {vue === 'anneau' && (
              <SectorsDonut
                sectors={categories.map(c => ({ label: c.name, pct: c.pct, value: c.value, color: c.color }))}
                formatValue={formatCompact}
                centerLabel={formatCompact(total)}
                centerCaption="Actifs bruts"
                showLegend={false}
                active={activeIndex}
                onActiveChange={i => setActive(i === null ? null : categories[i]?.name ?? null)}
              />
            )}
            {vue === 'barre' && <BarreEmpilee categories={categories} active={active} onActiveChange={setActive} />}
            {vue === 'treemap' && (
              <Treemap
                className="w-full"
                height={CHART_HEIGHT}
                items={categories.map(c => ({ label: c.name, value: c.value, color: c.color }))}
                formatValue={formatCompact}
                showLegend={false}
                active={active}
                onActiveChange={setActive}
              />
            )}
          </div>

          <div>
            <ul>
              {categories.map(c => (
                <li key={c.name}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(c.name)}
                    onMouseLeave={() => setActive(null)}
                    onFocus={() => setActive(c.name)}
                    onBlur={() => setActive(null)}
                    className={cn(
                      '-mx-2 flex w-[calc(100%+1rem)] items-baseline gap-3 rounded-[2px] px-2 py-[7px] text-left transition-opacity duration-200',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active !== null && active !== c.name && 'opacity-35'
                    )}
                  >
                    <span className="h-2.5 w-2.5 shrink-0 translate-y-[1px] rounded-[2px]" style={{ backgroundColor: c.color }} />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-foreground" title={c.name}>{c.name}</span>
                    <span className="shrink-0 text-[13px] font-medium tabular-nums text-foreground">{formatCurrency(c.value)}</span>
                    <span className="w-12 shrink-0 text-right text-[12px] tabular-nums text-muted-foreground">{formatPct(c.pct)}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-1 flex items-baseline gap-3 border-t border-border pt-2.5">
              <span className="flex-1 text-[12px] text-muted-foreground">Total des actifs</span>
              <span className="text-[13px] font-semibold tabular-nums text-foreground">{formatCurrency(total)}</span>
              <span className="w-12 text-right text-[12px] tabular-nums text-muted-foreground">100 %</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Une barre empilée épaisse, parts annotées quand la place le permet, graduée en dessous.
const BarreEmpilee = ({ categories, active, onActiveChange }: {
  categories: CategorieActif[];
  active: string | null;
  onActiveChange: (name: string | null) => void;
}) => {
  const reduced = useReducedMotion();
  return (
    <div className="w-full">
      <div className="flex h-14 w-full gap-[2px]">
        {categories.map((c, i) => {
          const dark = isDarkColor(c.color);
          return (
            <motion.div
              key={c.name}
              title={`${c.name} · ${formatPct(c.pct)}`}
              onMouseEnter={() => onActiveChange(c.name)}
              onMouseLeave={() => onActiveChange(null)}
              className={cn(
                'flex h-full min-w-[3px] items-end overflow-hidden rounded-[1px] px-2 pb-1.5',
                dark ? 'text-white' : 'text-[#0c0a09]'
              )}
              style={{ width: `${c.pct}%`, backgroundColor: c.color, transformOrigin: 'left' }}
              initial={{ scaleX: reduced ? 1 : 0 }}
              animate={{ scaleX: 1, opacity: active === null || active === c.name ? 1 : 0.25 }}
              transition={reduced ? { duration: 0 } : { duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.04 * i }}
            >
              {c.pct >= 8 && <span className="whitespace-nowrap text-[11px] font-medium tabular-nums opacity-90">{Math.round(c.pct)} %</span>}
            </motion.div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10.5px] tabular-nums text-muted-foreground">
        {[0, 25, 50, 75, 100].map(t => <span key={t}>{t} %</span>)}
      </div>
    </div>
  );
};

// Sélecteur de vue : mêmes pastilles que les périodes du graphique d'évolution.
const VueSwitch = ({ value, onChange }: { value: Vue; onChange: (v: Vue) => void }) => (
  <div role="tablist" aria-label="Type de graphique" className="flex gap-1">
    {VUES.map(v => (
      <button
        key={v.id}
        type="button"
        role="tab"
        aria-selected={value === v.id}
        onClick={() => onChange(v.id)}
        className={cn(
          'rounded-[2px] px-2.5 py-1 text-[11px] font-medium transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          value === v.id ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
        )}
      >
        {v.label}
      </button>
    ))}
  </div>
);
