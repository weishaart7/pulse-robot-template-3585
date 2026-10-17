import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Download } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { panelButtonClass } from '@/components/layout/workspace-panel';
import { SectionHeader } from '@/components/family/SectionHeader';
import { LAGON_INK } from '@/components/budget/budgetColors';
import { ASH, STONE } from '@/lib/palette';
import { formatCurrency } from '@/lib/patrimoine/utils';
import { construireTableau, contratDepuisEmprunt, type LigneAmortissement } from '@/lib/credit/contrat';
import type { Emprunt } from '@/services/passifService';

interface AmortissementSectionProps {
  emprunt: Emprunt;
  onEdit: () => void;
}

interface LigneAnnuelle {
  annee: number;
  echeances: number;
  echeance: number;
  interet: number;
  capital: number;
  assurance: number;
  capitalRestantDu: number;
}

const kFormat = (v: number) => `${Math.round(v / 1000)}k€`;
const eur = (v: number) => formatCurrency(Math.round(v * 100) / 100);
const csvNum = (v: number) => (Math.round(v * 100) / 100).toFixed(2).replace('.', ',');

function parAnnee(lignes: LigneAmortissement[]): LigneAnnuelle[] {
  const map = new Map<number, LigneAnnuelle>();
  for (const l of lignes) {
    const annee = l.date.getFullYear();
    const a = map.get(annee) ?? { annee, echeances: 0, echeance: 0, interet: 0, capital: 0, assurance: 0, capitalRestantDu: 0 };
    a.echeances += 1;
    a.echeance += l.echeance;
    a.interet += l.interet;
    a.capital += l.capital;
    a.assurance += l.assurance;
    a.capitalRestantDu = l.capitalRestantDu;
    map.set(annee, a);
  }
  return [...map.values()];
}

// Fichier CSV (séparateur « ; », virgule décimale : ouverture directe dans Excel en français).
function exporterCsv(nom: string, lignes: LigneAmortissement[]) {
  const entete = ['N°', 'Date', 'Échéance hors assurance', 'Intérêts', 'Capital', 'Assurance', 'Total versé', 'Capital restant dû'];
  const corps = lignes.map((l) => [
    l.numero,
    format(l.date, 'MM/yyyy'),
    csvNum(l.echeance),
    csvNum(l.interet),
    csvNum(l.capital),
    csvNum(l.assurance),
    csvNum(l.echeance + l.assurance),
    csvNum(l.capitalRestantDu),
  ].join(';'));
  const blob = new Blob([`\uFEFF${[entete.join(';'), ...corps].join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tableau-amortissement-${nom.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'emprunt'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Tableau d'amortissement d'un emprunt dont le contrat est complet (src/lib/credit/contrat.ts) :
// totaux, courbe du capital restant dû, tableau annuel ou mensuel, export CSV.
export const AmortissementSection = ({ emprunt, onEdit }: AmortissementSectionProps) => {
  const [vue, setVue] = useState<'annuel' | 'mensuel'>('annuel');
  const contrat = contratDepuisEmprunt(emprunt);
  const tableau = contrat ? construireTableau(contrat) : null;

  if (!contrat || !tableau) {
    return (
      <section className="py-5">
        <SectionHeader title="Tableau d'amortissement" />
        <p className="max-w-2xl text-[13px] text-muted-foreground">
          Renseignez l'offre de prêt — capital emprunté, date de première échéance et durée totale — pour obtenir le
          tableau d'amortissement et un capital restant dû mis à jour chaque mois.
        </p>
        <button type="button" onClick={onEdit} className={`mt-3 ${panelButtonClass}`}>Compléter l'offre de prêt</button>
      </section>
    );
  }

  const annees = parAnnee(tableau.lignes);
  const anneeCourante = new Date().getFullYear();
  const moisCourant = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const data = [{ annee: String(contrat.datePremiereEcheance.getFullYear() - 1), crd: contrat.capitalInitial }, ...annees.map((a) => ({ annee: String(a.annee), crd: a.capitalRestantDu }))];
  const axisTick = { fill: 'hsl(var(--muted-foreground))', fontSize: 11 };
  const variableNote = emprunt.type_taux && emprunt.type_taux !== 'Fixe';

  return (
    <section className="py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionHeader title="Tableau d'amortissement" />
        <button type="button" onClick={() => exporterCsv(emprunt.libelle || emprunt.nature, tableau.lignes)} className={`inline-flex items-center gap-1.5 ${panelButtonClass}`}>
          <Download className="h-3.5 w-3.5" />
          Exporter (CSV)
        </button>
      </div>

      <dl className="grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-4">
        {[
          ['Capital emprunté', eur(contrat.capitalInitial)],
          ['Intérêts', eur(tableau.totalInterets)],
          ['Assurance', eur(tableau.totalAssurance)],
          ['Coût total', eur(tableau.coutTotal)],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-[12px] text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-[15px] font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[12px] text-muted-foreground">
        {contrat.dureeTotaleMois} échéances de {format(contrat.datePremiereEcheance, 'MMMM yyyy', { locale: fr })} à {format(tableau.dateFin, 'MMMM yyyy', { locale: fr })}
        {contrat.differeMois > 0 && ` · différé ${contrat.differeType} de ${contrat.differeMois} mois`}
        {tableau.frais > 0 && ` · coût total frais compris (${eur(tableau.frais)})`}
        {variableNote && ' · taux variable projeté au taux actuel'}
      </p>

      <div className="mt-4 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={STONE} vertical={false} />
            <XAxis dataKey="annee" tick={axisTick} axisLine={false} tickLine={false} dy={6} interval="preserveStartEnd" />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={kFormat} width={48} />
            <Tooltip
              formatter={(value: number) => [eur(value), 'Capital restant dû (fin d\'année)']}
              contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '4px', padding: '8px 10px' }}
              labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 500, fontSize: '12px' }}
              itemStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: '12px' }}
            />
            <ReferenceLine x={String(anneeCourante)} stroke={ASH} strokeDasharray="3 3" />
            <Area type="monotone" dataKey="crd" stroke={LAGON_INK} strokeWidth={2} fill={LAGON_INK} fillOpacity={0.08} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-[12px] text-muted-foreground">Montants hors assurance sauf colonne Assurance.</p>
        <div className="inline-flex h-7 items-center rounded-[2px] border border-border p-0.5">
          {([['annuel', 'Par année'], ['mensuel', 'Par mois']] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={vue === id}
              onClick={() => setVue(id)}
              className={`h-full rounded-[1px] px-2.5 text-[12px] font-medium transition-colors ${vue === id ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 max-h-[420px] overflow-auto border-y border-border">
        <table className="w-full min-w-[640px] text-[12.5px] tabular-nums">
          <thead className="sticky top-0 bg-background">
            <tr className="border-b border-border text-left text-[12px] text-muted-foreground">
              <th className="py-2 pr-3 font-normal">{vue === 'annuel' ? 'Année' : 'Échéance'}</th>
              <th className="py-2 pr-3 text-right font-normal">{vue === 'annuel' ? 'Échéances' : 'Montant'}</th>
              <th className="py-2 pr-3 text-right font-normal">Intérêts</th>
              <th className="py-2 pr-3 text-right font-normal">Capital</th>
              <th className="py-2 pr-3 text-right font-normal">Assurance</th>
              <th className="py-2 text-right font-normal">Capital restant dû</th>
            </tr>
          </thead>
          <tbody>
            {vue === 'annuel'
              ? annees.map((a) => (
                <tr key={a.annee} className={`border-b border-border last:border-0 ${a.annee === anneeCourante ? 'bg-lagon-soft/50' : ''}`}>
                  <td className="py-1.5 pr-3">{a.annee} <span className="text-muted-foreground">· {a.echeances} éch.</span></td>
                  <td className="py-1.5 pr-3 text-right">{eur(a.echeance)}</td>
                  <td className="py-1.5 pr-3 text-right">{eur(a.interet)}</td>
                  <td className="py-1.5 pr-3 text-right">{eur(a.capital)}</td>
                  <td className="py-1.5 pr-3 text-right">{eur(a.assurance)}</td>
                  <td className="py-1.5 text-right font-medium">{eur(a.capitalRestantDu)}</td>
                </tr>
              ))
              : tableau.lignes.map((l) => (
                <tr key={l.numero} className={`border-b border-border last:border-0 ${l.date.getTime() === moisCourant ? 'bg-lagon-soft/50' : ''} ${l.date.getTime() < moisCourant ? 'text-muted-foreground' : ''}`}>
                  <td className="py-1.5 pr-3">{l.numero} · {format(l.date, 'MM/yyyy')}{l.differe && <span className="ml-1.5 text-[11.5px] text-lagon-ink">différé</span>}</td>
                  <td className="py-1.5 pr-3 text-right">{eur(l.echeance)}</td>
                  <td className="py-1.5 pr-3 text-right">{eur(l.interet)}</td>
                  <td className="py-1.5 pr-3 text-right">{eur(l.capital)}</td>
                  <td className="py-1.5 pr-3 text-right">{eur(l.assurance)}</td>
                  <td className="py-1.5 text-right font-medium">{eur(l.capitalRestantDu)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
