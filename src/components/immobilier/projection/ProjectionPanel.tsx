import { useState } from 'react';
import { addMonths, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertTriangle } from 'lucide-react';
import { Bar, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PanelTitle } from '@/components/layout/workspace-panel';
import { LAGON_INK } from '@/components/budget/budgetColors';
import { ASH, INK, NEGATIVE, STONE } from '@/lib/palette';
import { formatCurrency } from '@/lib/patrimoine/utils';
import type { HypothesesProjection, PeriodeProjection } from '@/lib/immobilier/projection';

interface ProjectionPanelProps {
  periodes: PeriodeProjection[];
  hypotheses: HypothesesProjection;
  onHypothesesChange: (h: HypothesesProjection) => void;
  /** Avertissements affichés au-dessus (crédit incomplet, bien non valorisable…). */
  avertissements?: string[];
}

const HYPOTHESES: { key: keyof HypothesesProjection; label: string }[] = [
  { key: 'loyers', label: 'Loyers' },
  { key: 'charges', label: 'Charges' },
  { key: 'valeur', label: 'Valeur du bien' },
];

const finPeriode = (p: PeriodeProjection) => addMonths(p.debut, 11);
/** Année de fin de période, en abscisse. */
const anneeFin = (p: PeriodeProjection) => format(finPeriode(p), 'yyyy');
const libellePeriode = (p: PeriodeProjection) =>
  `${format(p.debut, 'MMM yyyy', { locale: fr })} – ${format(finPeriode(p), 'MMM yyyy', { locale: fr })}`;

const kFormat = (value: number) => `${Math.round(value / 1000)}k€`;
const signed = (v: number) => `${v >= 0 ? '+' : ''}${formatCurrency(v)}`;

// Projection pluriannuelle en « panneau de travail » : hypothèses de revalorisation, graphique à une
// seule échelle (cashflow annuel OU valeur nette, au choix), puis le tableau complet, qui sert aussi
// de vue accessible du graphique. Montants à la part du foyer, avant impôt.
export const ProjectionPanel = ({ periodes, hypotheses, onHypothesesChange, avertissements = [] }: ProjectionPanelProps) => {
  const [vue, setVue] = useState<'cashflow' | 'valeur'>('cashflow');
  const avecValeur = periodes.some((p) => p.valeurNette !== null);
  const data = periodes.map((p) => ({ ...p, annee: anneeFin(p), libelle: libellePeriode(p) }));
  const axisTick = { fill: 'hsl(var(--muted-foreground))', fontSize: 11 };
  const vueEffective = vue === 'valeur' && !avecValeur ? 'cashflow' : vue;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <PanelTitle>Projection</PanelTitle>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {periodes.length} ans, par période de 12 mois à partir du mois prochain · part du foyer · avant impôt
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {HYPOTHESES.map(({ key, label }) => (
            <div key={key} className="w-28 space-y-1">
              <Label className="text-[12px] text-muted-foreground">{label} / an</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.1"
                  value={hypotheses[key]}
                  onChange={(e) => onHypothesesChange({ ...hypotheses, [key]: parseFloat(e.target.value) || 0 })}
                  className="h-8 bg-background border-border pr-7 shadow-none tabular-nums"
                />
                <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[12px] text-muted-foreground">%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {avertissements.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {avertissements.map((a) => (
            <li key={a} className="flex items-start gap-2 rounded-[2px] border border-border bg-secondary/40 px-3 py-2 text-[12.5px] text-foreground">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {a}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          {vueEffective === 'cashflow' ? (
            <><span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: LAGON_INK }} />Cashflow annuel (déficit en rouge)</>
          ) : (
            <><span className="inline-block h-[2px] w-3 rounded-full" style={{ backgroundColor: INK }} />Valeur nette en fin de période</>
          )}
        </span>
        <div className="inline-flex h-7 items-center rounded-[2px] border border-border p-0.5">
          {([['cashflow', 'Cashflow'], ['valeur', 'Valeur nette']] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={vueEffective === id}
              disabled={id === 'valeur' && !avecValeur}
              onClick={() => setVue(id)}
              className={`h-full rounded-[1px] px-2.5 text-[12px] font-medium transition-colors disabled:opacity-40 ${
                vueEffective === id ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid stroke={STONE} vertical={false} />
            <XAxis dataKey="annee" tick={axisTick} axisLine={false} tickLine={false} dy={6} interval="preserveStartEnd" />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={kFormat} width={48} />
            <Tooltip
              cursor={{ fill: 'hsl(var(--secondary))' }}
              labelFormatter={(_: string, payload) => (payload?.[0]?.payload as { libelle?: string } | undefined)?.libelle ?? ''}
              formatter={(value: number, name: string) => [
                name === 'cashflow' ? signed(value) : formatCurrency(value),
                name === 'cashflow' ? 'Cashflow' : 'Valeur nette',
              ]}
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '4px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                padding: '8px 10px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 500, marginBottom: '4px', fontSize: '12px' }}
              itemStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: '12px', padding: '1px 0' }}
            />
            <ReferenceLine y={0} stroke={ASH} />
            {vueEffective === 'cashflow' ? (
              <Bar dataKey="cashflow" name="cashflow" radius={[1, 1, 0, 0]} maxBarSize={28}>
                {data.map((p) => <Cell key={p.index} fill={p.cashflow < 0 ? NEGATIVE : LAGON_INK} />)}
              </Bar>
            ) : (
              <Line
                type="monotone"
                dataKey="valeurNette"
                name="valeurNette"
                stroke={INK}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: INK, stroke: 'hsl(var(--background))', strokeWidth: 2 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[640px] text-[12.5px] tabular-nums">
          <thead>
            <tr className="border-b border-border text-left text-[12px] text-muted-foreground">
              <th className="py-2 pr-3 font-normal">Période</th>
              <th className="py-2 pr-3 text-right font-normal">Loyers</th>
              <th className="py-2 pr-3 text-right font-normal">Charges</th>
              <th className="py-2 pr-3 text-right font-normal">Crédit</th>
              <th className="py-2 pr-3 text-right font-normal">Cashflow</th>
              <th className="py-2 pr-3 text-right font-normal">Capital restant dû</th>
              <th className="py-2 text-right font-normal">Valeur nette</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {periodes.map((p) => (
              <tr key={p.index}>
                <td className="py-1.5 pr-3 text-muted-foreground">{libellePeriode(p)}</td>
                <td className="py-1.5 pr-3 text-right">{formatCurrency(p.loyers)}</td>
                <td className="py-1.5 pr-3 text-right">{formatCurrency(p.charges)}</td>
                <td className="py-1.5 pr-3 text-right">{formatCurrency(p.remboursements + p.assurance)}</td>
                <td className={`py-1.5 pr-3 text-right font-medium ${p.cashflow < 0 ? 'text-destructive' : 'text-foreground'}`}>{signed(p.cashflow)}</td>
                <td className="py-1.5 pr-3 text-right">{formatCurrency(p.capitalRestantDuFin)}</td>
                <td className="py-1.5 text-right">{p.valeurNette === null ? '—' : formatCurrency(p.valeurNette)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
