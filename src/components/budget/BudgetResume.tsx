import { ASH, INK, NEGATIVE, STONE } from '@/lib/palette';
import React, { useMemo } from 'react';
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Line, ReferenceLine, ResponsiveContainer, Tooltip } from 'recharts';
import { useRevenus, useCharges } from '@/hooks/useBudget';
import { Revenu, Charge } from '@/services/budgetService';
import { REVENUS_CATEGORIES, CHARGES_CATEGORIES } from '@/constants/budgetCategories';
import { DisplayMode } from '@/pages/budget/BudgetSection';
import { PanelTitle, SummaryRow } from '@/components/layout/workspace-panel';
import { toAnnual, isActiveOn, isPonctuel, parseLocalDate } from '@/lib/budget/periodicite';
import { computeEndettement, TAUX_EFFORT_MAX } from '@/lib/budget/endettement';
import { CITRON_MID, DISPONIBLE, LAGON, LAGON_INK, categorieCharge, categorieRevenu, colorForCharge, colorForRevenu } from '@/components/budget/budgetColors';

interface BudgetResumeProps {
  displayMode: DisplayMode;
}

// Résumé en « panneau de travail », sur le modèle du Résumé Patrimoine : bandeaux bord à bord
// découpés en colonnes filetées, lignes libellé / valeur, pas de cartes. Encre pour les revenus,
// braise pour les charges et l'endettement, violet pour un solde excédentaire
// (cf. docs/budget.md, docs/design-system.md).


const Swatch = ({ color }: { color: string }) => (
  <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-[2px] ring-1 ring-inset ring-black/10" style={{ backgroundColor: color }} />
);

const fmtPct = (n: number) => `${n.toFixed(1).replace('.', ',')} %`;

interface CategoryRow {
  categorie: string;
  total: number;
  count: number;
}

// Libellés des lignes rattachées à chaque catégorie (même rattachement que les totaux).
const libellesParCategorie = (lines: (Revenu | Charge)[], categorieOf: (nature: string) => string): Record<string, string[]> => {
  const out: Record<string, string[]> = {};
  lines.forEach(line => { (out[categorieOf(line.nature)] ??= []).push(line.libelle || line.nature); });
  return out;
};

// Colonne « par catégorie » : une ligne par catégorie, libellés des lignes en rappel, montant et part.
const CategoryColumn = ({ title, rows, total, colorFor, libelles, formatCurrency, emptyLabel }: {
  title: string;
  rows: CategoryRow[];
  total: number;
  colorFor: (categorie: string) => string;
  libelles: Record<string, string[]>;
  formatCurrency: (amount: number) => string;
  emptyLabel: string;
}) => {
  const sorted = [...rows].sort((a, b) => b.total - a.total);
  return (
    <div className="px-8 py-6">
      <PanelTitle action={<span className="text-[13px] font-medium tabular-nums text-foreground">{formatCurrency(total)}</span>}>
        {title}
      </PanelTitle>
      {sorted.length === 0 ? (
        <p className="mt-3 text-[13px] text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {sorted.map(row => {
            const noms = libelles[row.categorie] ?? [];
            return (
              <li key={row.categorie} className="flex items-start justify-between gap-4 py-2.5">
                <div className="flex min-w-0 items-start gap-2">
                  <span className="mt-[5px]"><Swatch color={colorFor(row.categorie)} /></span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] text-foreground">{row.categorie}</p>
                    <p className="truncate text-[12px] text-muted-foreground">
                      {noms.slice(0, 3).join(', ')}{noms.length > 3 ? ` +${noms.length - 3}` : ''}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right tabular-nums">
                  <p className="text-[13px] font-medium text-foreground">{formatCurrency(row.total)}</p>
                  <p className="text-[12px] text-muted-foreground">{fmtPct(total > 0 ? (row.total / total) * 100 : 0)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export const BudgetResume = ({ displayMode }: BudgetResumeProps) => {
  const { revenus, loading: revenusLoading } = useRevenus();
  const { charges, loading: chargesLoading } = useCharges();

  // Lignes actives uniquement pour les totaux/KPI/répartitions — une ligne terminée (date_fin passée)
  // ou pas encore démarrée (date_debut future) ne doit pas gonfler le Solde ni les indicateurs
  // d'endettement (cf. docs/budget.md §3).
  const activeRevenus = useMemo(
    () => revenus.filter(r => isActiveOn(r)),
    [revenus]
  );
  const activeCharges = useMemo(
    () => charges.filter(c => isActiveOn(c)),
    [charges]
  );

  // Calculer les totaux annuels
  const totalRevenusAnnuel = useMemo(() =>
    activeRevenus.reduce((sum, r) => sum + toAnnual(r.montant || 0, r.periodicite), 0),
    [activeRevenus]
  );
  const totalChargesAnnuel = useMemo(() =>
    activeCharges.reduce((sum, c) => sum + toAnnual(c.montant || 0, c.periodicite), 0),
    [activeCharges]
  );

  const divisor = displayMode === 'mensuel' ? 12 : 1;
  const periodLabel = displayMode === 'mensuel' ? 'mensuel' : 'annuel';

  // Appliquer le diviseur pour l'affichage
  const displayRevenus = Math.round(totalRevenusAnnuel / divisor);
  const displayCharges = Math.round(totalChargesAnnuel / divisor);

  if (revenusLoading || chargesLoading) {
    return (
      <div className="px-8 py-6">
        <p className="text-sm text-muted-foreground">Chargement des données…</p>
      </div>
    );
  }


  // Taux d'effort et capacité d'endettement au sens HCSF, sur revenus pondérés (src/lib/budget/endettement.ts).
  // Le Solde, lui, reste calculé sur 100 % des revenus.
  const endettement = computeEndettement(revenus, charges);
  const displayMensualitesCredits = Math.round(endettement.mensualitesCreditsAnnuel / divisor);
  const displayRevenusPonderes = Math.round(endettement.revenusPonderesAnnuel / divisor);

  // Calculer les indicateurs
  const soldePeriode = displayRevenus - displayCharges;
  const tauxEndettement = endettement.tauxEffort;
  const capaciteEndettement = Math.round(endettement.capaciteAnnuel / divisor);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Collecter toutes les natures définies dans les catégories
  const allRevenusNatures = Object.values(REVENUS_CATEGORIES).flat() as string[];
  const allChargesNatures = Object.values(CHARGES_CATEGORIES).flat() as string[];

  // Grouper les revenus par catégories
  const revenusParCategorie = Object.entries(REVENUS_CATEGORIES).map(([categorie, natures]) => {
    const revenusCategorie = activeRevenus.filter(r => (natures as readonly string[]).includes(r.nature));
    const total = revenusCategorie.reduce((sum, r) => sum + toAnnual(r.montant || 0, r.periodicite), 0);
    return {
      categorie,
      total: total / divisor,
      count: revenusCategorie.length
    };
  }).filter(cat => cat.count > 0);

  // Ajouter les revenus non catégorisés
  const revenusNonCategorises = activeRevenus.filter(r => !allRevenusNatures.includes(r.nature));
  if (revenusNonCategorises.length > 0) {
    const totalNonCategorises = revenusNonCategorises.reduce((sum, r) => sum + toAnnual(r.montant || 0, r.periodicite), 0);
    const existingIndex = revenusParCategorie.findIndex(c => c.categorie === 'Revenus du patrimoine');
    if (existingIndex !== -1) {
      revenusParCategorie[existingIndex].total += totalNonCategorises / divisor;
      revenusParCategorie[existingIndex].count += revenusNonCategorises.length;
    } else {
      revenusParCategorie.push({
        categorie: 'Revenus du patrimoine',
        total: totalNonCategorises / divisor,
        count: revenusNonCategorises.length
      });
    }
  }

  // Grouper les charges par catégories
  const chargesParCategorie = Object.entries(CHARGES_CATEGORIES).map(([categorie, natures]) => {
    const chargesCategorie = activeCharges.filter(c => (natures as readonly string[]).includes(c.nature));
    const total = chargesCategorie.reduce((sum, c) => sum + toAnnual(c.montant || 0, c.periodicite), 0);
    return {
      categorie,
      total: total / divisor,
      count: chargesCategorie.length
    };
  }).filter(cat => cat.count > 0);

  // Ajouter les charges non catégorisées
  const chargesNonCategorisees = activeCharges.filter(c => !allChargesNatures.includes(c.nature));
  if (chargesNonCategorisees.length > 0) {
    const totalNonCategorisees = chargesNonCategorisees.reduce((sum, c) => sum + toAnnual(c.montant || 0, c.periodicite), 0);
    const existingIndex = chargesParCategorie.findIndex(c => c.categorie === 'Logement & Habitation');
    if (existingIndex !== -1) {
      chargesParCategorie[existingIndex].total += totalNonCategorisees / divisor;
      chargesParCategorie[existingIndex].count += chargesNonCategorisees.length;
    } else {
      chargesParCategorie.push({
        categorie: 'Logement & Habitation',
        total: totalNonCategorisees / divisor,
        count: chargesNonCategorisees.length
      });
    }
  }

  const totalRevenusCat = revenusParCategorie.reduce((sum, cat) => sum + cat.total, 0);
  const totalChargesCat = chargesParCategorie.reduce((sum, cat) => sum + cat.total, 0);
  
  const getColorForRevenu = colorForRevenu;
  const getColorForCharge = colorForCharge;

  const tauxPlafond = TAUX_EFFORT_MAX * 100;
  const tauxDepasse = tauxEndettement > tauxPlafond;
  // Jauge du taux d'effort sur une échelle 0–50 %, repère au plafond HCSF.
  const JAUGE_MAX = 50;
  const nbPonctuels = [...activeRevenus, ...activeCharges].filter(l => isPonctuel(l.periodicite)).length;
  const partDisponible = displayRevenus > 0 ? (soldePeriode / displayRevenus) * 100 : 0;

  // Barre « où vont les revenus » : charges par catégorie puis part disponible, sur la base du plus
  // grand des deux totaux (un déficit remplit la barre de charges, sans part disponible).
  const allocationBase = Math.max(totalRevenusCat, totalChargesCat);
  const allocation = [
    ...[...chargesParCategorie].sort((a, b) => b.total - a.total)
      .map(c => ({ name: c.categorie, value: c.total, color: getColorForCharge(c.categorie) })),
    ...(totalRevenusCat > totalChargesCat
      ? [{ name: 'Disponible', value: totalRevenusCat - totalChargesCat, color: DISPONIBLE }]
      : []),
  ].map(s => ({ ...s, pct: allocationBase > 0 ? (s.value / allocationBase) * 100 : 0 }));

  const libellesCharges = libellesParCategorie(activeCharges, categorieCharge);
  const libellesRevenus = libellesParCategorie(activeRevenus, categorieRevenu);

  return (
    <div>
      {/* En-tête : solde et ses composantes, puis destination des revenus. */}
      <div className="grid grid-cols-1 divide-y divide-border border-b border-border lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:divide-x lg:divide-y-0">
        <div className="px-8 py-6">
          <p className="text-[12px] text-muted-foreground">Solde {periodLabel}</p>
          <p
            className="mt-2 text-[34px] font-medium leading-none tracking-[-0.03em] tabular-nums"
            style={{ color: soldePeriode >= 0 ? LAGON_INK : NEGATIVE }}
          >
            {soldePeriode >= 0 ? '+' : '−'}{formatCurrency(Math.abs(soldePeriode))}
          </p>
          {displayRevenus > 0 && (
            <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]">
              <span className={`inline-flex h-6 items-center rounded-[2px] px-2 font-medium tabular-nums ${soldePeriode >= 0 ? 'bg-lagon-soft text-lagon-ink' : 'bg-destructive/10 text-destructive'}`}>
                {fmtPct(partDisponible)}
              </span>
              <span className="text-muted-foreground">des revenus {soldePeriode >= 0 ? 'restent disponibles' : 'en déficit'}</span>
            </p>
          )}
          <dl className="mt-5">
            <SummaryRow label="Revenus"><span className="tabular-nums">{formatCurrency(displayRevenus)}</span></SummaryRow>
            <SummaryRow label="Charges"><span className="tabular-nums">{formatCurrency(displayCharges)}</span></SummaryRow>
            <SummaryRow label="Solde annuel">
              <span className="tabular-nums">{formatCurrency(Math.round(totalRevenusAnnuel - totalChargesAnnuel))}</span>
            </SummaryRow>
          </dl>
        </div>

        <div className="px-8 py-6">
          <PanelTitle>Où vont les revenus</PanelTitle>
          {allocationBase === 0 ? (
            <p className="mt-3 text-[13px] text-muted-foreground">Aucun revenu ni charge actif.</p>
          ) : (
            <>
              <div className="mt-4 flex h-2.5 w-full gap-[2px] overflow-hidden rounded-[1px]">
                {allocation.map(s => (
                  <div key={s.name} title={`${s.name} · ${fmtPct(s.pct)}`} className="h-full" style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
                ))}
              </div>
              <ul className="mt-5 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                {allocation.map(s => (
                  <li key={s.name} className="flex items-baseline justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2 text-[13px] text-foreground">
                      <Swatch color={s.color} />
                      <span className="truncate">{s.name}</span>
                    </span>
                    <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                      <span className="text-[13px] font-medium text-foreground">{formatCurrency(s.value)}</span>
                      <span className="w-11 text-right text-[12px] text-muted-foreground">{fmtPct(s.pct)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* Détail : charges et revenus par catégorie, endettement au sens HCSF. */}
      <div className="grid grid-cols-1 divide-y divide-border border-b border-border lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        <CategoryColumn
          title="Charges par catégorie"
          rows={chargesParCategorie}
          total={totalChargesCat}
          colorFor={getColorForCharge}
          libelles={libellesCharges}
          formatCurrency={formatCurrency}
          emptyLabel="Aucune charge pour le moment."
        />
        <CategoryColumn
          title="Revenus par catégorie"
          rows={revenusParCategorie}
          total={totalRevenusCat}
          colorFor={getColorForRevenu}
          libelles={libellesRevenus}
          formatCurrency={formatCurrency}
          emptyLabel="Aucun revenu pour le moment."
        />
        <div className="px-8 py-6">
          <PanelTitle>Endettement (HCSF)</PanelTitle>
          <div className="mt-4 flex items-baseline justify-between gap-3">
            <p className="text-[24px] font-medium leading-none tracking-[-0.02em] tabular-nums" style={{ color: tauxDepasse ? NEGATIVE : undefined }}>
              {fmtPct(tauxEndettement)}
            </p>
            <p className="text-[12px] text-muted-foreground">taux d'effort · max {tauxPlafond} %</p>
          </div>
          <div className="relative mt-3 h-1.5 bg-secondary">
            <div className="h-full" style={{ width: `${Math.min(tauxEndettement / JAUGE_MAX, 1) * 100}%`, backgroundColor: tauxDepasse ? NEGATIVE : LAGON }} />
            <div className="absolute -top-1 h-3.5 w-px bg-foreground/50" style={{ left: `${tauxPlafond / JAUGE_MAX * 100}%` }} />
          </div>
          <dl className="mt-5">
            <SummaryRow label="Crédits"><span className="tabular-nums">{formatCurrency(displayMensualitesCredits)}</span></SummaryRow>
            <SummaryRow label="Rev. pondérés"><span className="tabular-nums">{formatCurrency(displayRevenusPonderes)}</span></SummaryRow>
            <SummaryRow label="Capacité">
              <span className="tabular-nums">{formatCurrency(capaciteEndettement)}</span>
              <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">de mensualités</span>
            </SummaryRow>
            <SummaryRow label="Ponctuels"><span className="tabular-nums">{nbPonctuels}</span></SummaryRow>
          </dl>
          <p className="mt-3 text-[12px] leading-5 text-muted-foreground">
            Loyers retenus à 70 %, revenus non pérennes exclus.
          </p>
        </div>
      </div>

      <SeasonalityChart revenus={revenus} charges={charges} formatCurrency={formatCurrency} />
    </div>
  );
};

// Composant graphique saisonnalité
interface SeasonalityChartProps {
  revenus: Revenu[];
  charges: Charge[];
  formatCurrency: (amount: number) => string;
}

const SeasonalityChart = ({ revenus, charges, formatCurrency }: SeasonalityChartProps) => {
  const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const currentYear = new Date().getFullYear();

  // Montant de la ligne sur chaque mois de l'année civile courante : un ponctuel tombe en entier sur le mois
  // de sa date_debut (janvier sans date) ; une ligne récurrente est lissée (annuel / 12) sur les mois
  // où elle est active, date_debut/date_fin comprises.
  const monthlyAmounts = (line: Revenu | Charge): number[] => {
    const amounts = new Array(12).fill(0);
    const montant = Number(line.montant) || 0;
    if (!isFinite(montant) || montant === 0) return amounts;
    if (isPonctuel(line.periodicite)) {
      const d = line.date_debut ? parseLocalDate(line.date_debut) : new Date(currentYear, 0, 1);
      if (d.getFullYear() === currentYear) amounts[d.getMonth()] = montant;
      return amounts;
    }
    const monthly = toAnnual(montant, line.periodicite) / 12;
    const start = line.date_debut ? parseLocalDate(line.date_debut) : null;
    const end = line.date_fin ? parseLocalDate(line.date_fin) : null;
    for (let m = 0; m < 12; m++) {
      const monthStart = new Date(currentYear, m, 1);
      const monthEnd = new Date(currentYear, m + 1, 0);
      if (start && start > monthEnd) continue;
      if (end && end < monthStart) continue;
      amounts[m] = monthly;
    }
    return amounts;
  };

  const monthlyData = useMemo(() => {
    const sumByMonth = (lines: (Revenu | Charge)[]) => lines.reduce((acc, l) => {
      monthlyAmounts(l).forEach((v, i) => { acc[i] += v; });
      return acc;
    }, new Array(12).fill(0));
    const rev = sumByMonth(revenus);
    const ch = sumByMonth(charges);
    return MONTHS.map((month, i) => ({
      month,
      revenus: Math.round(rev[i]),
      charges: Math.round(ch[i]),
      solde: Math.round(rev[i] - ch[i]),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revenus, charges, currentYear]);


  // Sans ponctuel ni ligne qui démarre ou s'arrête dans l'année, les 12 mois sont identiques :
  // le graphique n'apprend rien, le bandeau est omis.
  const isFlat = monthlyData.every(m => m.revenus === monthlyData[0].revenus && m.charges === monthlyData[0].charges);
  if ((revenus.length === 0 && charges.length === 0) || isFlat) return null;

  return (
    <div className="px-8 py-6">
      <PanelTitle
        action={
          <div className="flex items-center gap-4 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><Swatch color={LAGON_INK} />Revenus</span>
            <span className="flex items-center gap-1.5"><Swatch color={CITRON_MID} />Charges</span>
            <span className="flex items-center gap-1.5"><Swatch color={INK} />Solde</span>
          </div>
        }
      >
        Évolution mensuelle {currentYear}
      </PanelTitle>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={monthlyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={3} barCategoryGap="28%">
            <CartesianGrid stroke={STONE} vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              dy={6}
            />
            <YAxis
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
              width={40}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--secondary))' }}
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === 'revenus' ? 'Revenus' : name === 'charges' ? 'Charges' : 'Solde'
              ]}
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '2px',
                padding: '8px 10px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 500, marginBottom: '4px', fontSize: '12px' }}
              itemStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: '12px', padding: '1px 0' }}
            />
            <ReferenceLine y={0} stroke={ASH} />
            <Bar dataKey="revenus" fill={LAGON_INK} radius={[1, 1, 0, 0]} name="revenus" />
            <Bar dataKey="charges" fill={CITRON_MID} radius={[1, 1, 0, 0]} name="charges" />
            <Line
              type="monotone"
              dataKey="solde"
              stroke={INK}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: INK, stroke: 'hsl(var(--background))', strokeWidth: 2 }}
              name="solde"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
