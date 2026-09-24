import { ASH, EGGSHELL, EMBER, EMBER_SOFT, GRAPHITE, INK, SERIES, VIOLET } from '@/lib/palette';
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Line, ReferenceLine } from 'recharts';
import { useRevenus, useCharges } from '@/hooks/useBudget';
import { Revenu, Charge } from '@/services/budgetService';
import { REVENUS_CATEGORIES, CHARGES_CATEGORIES } from '@/constants/budgetCategories';
import { SlidingNumber } from '@/components/ui/sliding-number';
import { TrendingUp, TrendingDown, Wallet, Percent, Landmark, PieChart as PieIcon, BarChart3 } from 'lucide-react';
import { DisplayMode } from '@/pages/budget/BudgetSection';
import { toAnnual, isActiveOn, isPonctuel, parseLocalDate } from '@/lib/budget/periodicite';
import { computeEndettement } from '@/lib/budget/endettement';

interface BudgetResumeProps {
  displayMode: DisplayMode;
}

// Palette Famille (teal identité / lime accent / rose pour les charges),
// même triptyque que PatrimoineResume.tsx — cf. docs/budget.md.
const TEAL = INK;
const LIME = VIOLET;
const LIME_ICON = EGGSHELL;
const PINK = EMBER;

const StatCard = ({ label, subtitle, icon: Icon, badgeBg, iconColor, barColor, delay, children }: {
  label: string;
  subtitle: string;
  icon: React.ElementType;
  badgeBg: string;
  iconColor: string;
  barColor: string;
  delay: string;
  children: React.ReactNode;
}) => (
  <div
    className="group relative rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm transition-all duration-500 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 animate-fade-in"
    style={{ animationDelay: delay }}
  >
    <div className="h-[3px] opacity-80 group-hover:opacity-100 transition-opacity duration-300" style={{ backgroundColor: barColor }} />
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] font-medium text-muted-foreground tracking-wide">{label}</p>
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
          style={{ backgroundColor: badgeBg }}
        >
          <Icon className="h-[18px] w-[18px]" style={{ color: iconColor }} strokeWidth={1.5} />
        </div>
      </div>
      <div className="text-[28px] font-bold text-foreground tracking-tight leading-none flex items-center gap-1">
        {children}
      </div>
      <p className="text-[11px] text-muted-foreground/70 mt-2">{subtitle}</p>
    </div>
  </div>
);

const CardTitleWithIcon = ({ icon: Icon, color, children }: { icon: React.ElementType; color: string; children: React.ReactNode }) => (
  <CardTitle className="flex items-center gap-2.5">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${color}1a` }}>
      <Icon className="h-4 w-4" style={{ color }} />
    </span>
    {children}
  </CardTitle>
);

const CARD_CLASS = 'border border-border shadow-sm rounded-2xl';

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
      <div className="space-y-6">
        <Card className={CARD_CLASS}>
          <CardHeader>
            <CardTitleWithIcon icon={Wallet} color={TEAL}>Résumé du Budget</CardTitleWithIcon>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Chargement des données...</p>
          </CardContent>
        </Card>
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
  
  // Revenus : famille encre / violet ; charges : série complète (lib/palette.ts).
  const REVENUS_COLORS: Record<string, string> = {
    'Revenus du travail': SERIES[0],
    'Revenus du patrimoine': SERIES[1],
    'Retraites, pensions & rentes': SERIES[3],
    'Aides sociales & allocations': SERIES[4],
    'Indemnités & remboursements': SERIES[7],
    'Autres revenus': SERIES[8]
  };

  const CHARGES_COLORS: Record<string, string> = {
    'Emprunts & Crédits': SERIES[2],
    'Logement & Habitation': SERIES[0],
    'Transports & Mobilité': SERIES[1],
    'Alimentation & Vie courante': SERIES[3],
    'Santé & Bien-être': SERIES[5],
    'Famille, Enfants & Éducation': SERIES[4],
    'Impôts, Cotisations & Assurances': SERIES[6],
    'Épargne & Investissements': SERIES[8],
    'Loisirs, Culture & Numérique': SERIES[9],
    'Solidarité, Pensions & Divers': SERIES[7]
  };

  const getColorForRevenu = (categorie: string) => REVENUS_COLORS[categorie] || ASH;
  const getColorForCharge = (categorie: string) => CHARGES_COLORS[categorie] || EMBER;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label={`Solde ${periodLabel}`}
          subtitle="Revenus - Dépenses"
          icon={soldePeriode >= 0 ? TrendingUp : TrendingDown}
          badgeBg={soldePeriode >= 0 ? LIME : `${PINK}1a`}
          iconColor={soldePeriode >= 0 ? LIME_ICON : PINK}
          barColor={soldePeriode >= 0 ? LIME : PINK}
          delay="0ms"
        >
          {soldePeriode >= 0 ? '+' : ''}
          <SlidingNumber value={soldePeriode} />
          <span className="ml-1">€</span>
        </StatCard>

        <StatCard
          label="Taux d'effort (HCSF)"
          subtitle={`${displayMensualitesCredits.toLocaleString('fr-FR')} € / ${displayRevenusPonderes.toLocaleString('fr-FR')} € pondérés · loyers à 70 %, revenus non pérennes exclus`}
          icon={Percent}
          badgeBg={`${PINK}1a`}
          iconColor={PINK}
          barColor={PINK}
          delay="60ms"
        >
          <SlidingNumber value={parseFloat(tauxEndettement.toFixed(1))} />
          <span>%</span>
        </StatCard>

        <StatCard
          label="Capacité d'endettement"
          subtitle="35 % des revenus pondérés, moins les crédits en cours"
          icon={Landmark}
          badgeBg={`${TEAL}1a`}
          iconColor={TEAL}
          barColor={TEAL}
          delay="120ms"
        >
          <SlidingNumber value={capaciteEndettement} />
          <span className="ml-1">€</span>
        </StatCard>
      </div>

      {/* Répartition par catégories */}
      <div className="grid gap-6 md:grid-cols-2 mt-6">
        {/* Répartition des revenus par catégories */}
        <Card className={CARD_CLASS}>
          <CardHeader>
            <CardTitleWithIcon icon={PieIcon} color={TEAL}>Répartition des revenus par catégories</CardTitleWithIcon>
            <CardDescription>Distribution des revenus selon leur nature</CardDescription>
          </CardHeader>
          <CardContent>
            {revenusParCategorie.length > 0 ? (
              <div className="relative h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenusParCategorie.map(cat => ({ name: cat.categorie, value: cat.total }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    >
                      {revenusParCategorie.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getColorForRevenu(entry.categorie)} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', color: 'black' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingBottom: '36px' }}>
                  <div className="text-center">
                    <div className="text-xl font-bold text-foreground">{formatCurrency(totalRevenusCat)}</div>
                    <div className="text-xs text-muted-foreground">Total revenus</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">Aucun revenu pour le moment</div>
            )}
          </CardContent>
        </Card>

        {/* Répartition des charges par catégories */}
        <Card className={CARD_CLASS}>
          <CardHeader>
            <CardTitleWithIcon icon={PieIcon} color={PINK}>Répartition des charges par catégories</CardTitleWithIcon>
            <CardDescription>Distribution des charges selon leur nature</CardDescription>
          </CardHeader>
          <CardContent>
            {chargesParCategorie.length > 0 ? (
              <div className="relative h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chargesParCategorie.map(cat => ({ name: cat.categorie, value: cat.total }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    >
                      {chargesParCategorie.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getColorForCharge(entry.categorie)} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', color: 'black' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingBottom: '36px' }}>
                  <div className="text-center">
                    <div className="text-xl font-bold text-foreground">{formatCurrency(totalChargesCat)}</div>
                    <div className="text-xs text-muted-foreground">Total charges</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">Aucune charge pour le moment</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Saisonnalité - Évolution mensuelle */}
      <Card className={`mt-6 ${CARD_CLASS}`}>
        <CardHeader>
          <CardTitleWithIcon icon={BarChart3} color={TEAL}>Évolution mensuelle</CardTitleWithIcon>
          <CardDescription>Comparaison revenus et charges sur 12 mois</CardDescription>
        </CardHeader>
        <CardContent>
          <SeasonalityChart revenus={revenus} charges={charges} formatCurrency={formatCurrency} />
        </CardContent>
      </Card>
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

  const hasData = revenus.length > 0 || charges.length > 0;

  if (!hasData) {
    return <div className="text-center text-muted-foreground py-8">Aucune donnée à afficher</div>;
  }

  return (
    <div className="h-80 relative">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={monthlyData} margin={{ top: 20, right: 16, left: 0, bottom: 0 }} barGap={4} barCategoryGap="20%">
          <defs>
            <linearGradient id="revenusGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={INK} stopOpacity={1} />
              <stop offset="100%" stopColor={GRAPHITE} stopOpacity={0.85} />
            </linearGradient>
            <linearGradient id="chargesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={EMBER} stopOpacity={1} />
              <stop offset="100%" stopColor={EMBER_SOFT} stopOpacity={0.85} />
            </linearGradient>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1"/>
            </filter>
          </defs>
          <CartesianGrid strokeDasharray="0" stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
          <XAxis 
            dataKey="month" 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            dy={8}
          />
          <YAxis 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
            width={45}
          />
          <Tooltip 
            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3, radius: 4 }}
            formatter={(value: number, name: string) => [
              formatCurrency(value),
              name === 'revenus' ? 'Revenus' : name === 'charges' ? 'Charges' : 'Solde'
            ]}
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)',
              padding: '12px 16px',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600, marginBottom: '8px', fontSize: '13px' }}
            itemStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: '12px', padding: '2px 0' }}
          />
          <Legend 
            formatter={(value) => (
              <span className="text-xs font-medium text-muted-foreground">
                {value === 'revenus' ? 'Revenus' : value === 'charges' ? 'Charges' : 'Solde'}
              </span>
            )}
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
            iconSize={8}
          />
          <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <Bar 
            dataKey="revenus" 
            fill="url(#revenusGradient)"
            radius={[6, 6, 0, 0]}
            name="revenus"
            filter="url(#shadow)"
            animationBegin={0}
            animationDuration={800}
            animationEasing="ease-out"
          />
          <Bar 
            dataKey="charges" 
            fill="url(#chargesGradient)"
            radius={[6, 6, 0, 0]}
            name="charges"
            filter="url(#shadow)"
            animationBegin={200}
            animationDuration={800}
            animationEasing="ease-out"
          />
          <Line
            type="monotone"
            dataKey="solde"
            stroke={VIOLET}
            strokeWidth={2.5}
            dot={{ fill: VIOLET, strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6, fill: VIOLET, stroke: 'hsl(var(--background))', strokeWidth: 2 }}
            name="solde"
            animationBegin={400}
            animationDuration={1000}
            animationEasing="ease-out"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
