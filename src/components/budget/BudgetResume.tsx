import React, { useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useRevenus, useCharges } from '@/hooks/useBudget';
import { Revenu, Charge } from '@/services/budgetService';
import { REVENUS_CATEGORIES, CHARGES_CATEGORIES } from '@/constants/budgetCategories';
import { SlidingNumber } from '@/components/ui/sliding-number';
import { DisplayMode } from '@/pages/budget/BudgetSection';

interface BudgetResumeProps {
  displayMode: DisplayMode;
}

export const BudgetResume = ({ displayMode }: BudgetResumeProps) => {
  const {
    revenus,
    loading: revenusLoading,
    fetchRevenus
  } = useRevenus();
  const {
    charges,
    loading: chargesLoading,
    fetchCharges
  } = useCharges();
  useEffect(() => {
    fetchRevenus();
    fetchCharges();
  }, []);
  const totalRevenus = Math.round(revenus.reduce((sum, revenu) => sum + (revenu.montant || 0), 0));
  const totalCharges = Math.round(charges.reduce((sum, charge) => sum + (charge.montant || 0), 0));

  const divisor = displayMode === 'mensuel' ? 12 : 1;
  const periodLabel = displayMode === 'mensuel' ? 'mensuel' : 'annuel';

  // Appliquer le diviseur pour l'affichage
  const displayRevenus = Math.round(totalRevenus / divisor);
  const displayCharges = Math.round(totalCharges / divisor);

  if (revenusLoading || chargesLoading) {
    return <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Résumé du Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Chargement des données...</p>
          </CardContent>
        </Card>
      </div>;
  }

  // Calculer les mensualités de crédits (charges liées aux crédits)
  const mensualitesCredits = Math.round(charges.filter(charge => charge.nature?.toLowerCase().includes('crédit') || charge.nature?.toLowerCase().includes('emprunt')).reduce((sum, charge) => sum + (charge.montant || 0), 0));
  const displayMensualitesCredits = Math.round(mensualitesCredits / divisor);

  // Calculer les indicateurs (basés sur les montants affichés)
  const soldePeriode = displayRevenus - displayCharges;
  const tauxEndettement = displayRevenus > 0 ? displayMensualitesCredits / displayRevenus * 100 : 0;
  const capaciteEndettement = Math.round(displayRevenus * 0.35 - displayMensualitesCredits);
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
    const revenusCategorie = revenus.filter(r => (natures as readonly string[]).includes(r.nature));
    const total = revenusCategorie.reduce((sum, r) => sum + (Number(r.montant) || 0), 0);
    return {
      categorie,
      total: total / divisor,
      count: revenusCategorie.length
    };
  }).filter(cat => cat.count > 0);

  // Ajouter les revenus non catégorisés (ex: revenus immobiliers)
  const revenusNonCategorises = revenus.filter(r => !allRevenusNatures.includes(r.nature));
  if (revenusNonCategorises.length > 0) {
    const totalNonCategorises = revenusNonCategorises.reduce((sum, r) => sum + (Number(r.montant) || 0), 0);
    revenusParCategorie.push({
      categorie: 'Revenus du patrimoine',
      total: totalNonCategorises / divisor + (revenusParCategorie.find(c => c.categorie === 'Revenus du patrimoine')?.total || 0),
      count: revenusNonCategorises.length + (revenusParCategorie.find(c => c.categorie === 'Revenus du patrimoine')?.count || 0)
    });
    // Retirer l'ancienne entrée "Revenus du patrimoine" si elle existe déjà
    const existingIndex = revenusParCategorie.findIndex(c => c.categorie === 'Revenus du patrimoine');
    if (existingIndex !== -1 && existingIndex !== revenusParCategorie.length - 1) {
      revenusParCategorie.splice(existingIndex, 1);
    }
  }

  // Grouper les charges par catégories
  const chargesParCategorie = Object.entries(CHARGES_CATEGORIES).map(([categorie, natures]) => {
    const chargesCategorie = charges.filter(c => (natures as readonly string[]).includes(c.nature));
    const total = chargesCategorie.reduce((sum, c) => sum + (Number(c.montant) || 0), 0);
    return {
      categorie,
      total: total / divisor,
      count: chargesCategorie.length
    };
  }).filter(cat => cat.count > 0);

  // Ajouter les charges non catégorisées (ex: charges immobilières)
  const chargesNonCategorisees = charges.filter(c => !allChargesNatures.includes(c.nature));
  if (chargesNonCategorisees.length > 0) {
    const totalNonCategorisees = chargesNonCategorisees.reduce((sum, c) => sum + (Number(c.montant) || 0), 0);
    chargesParCategorie.push({
      categorie: 'Logement & Habitation',
      total: totalNonCategorisees / divisor + (chargesParCategorie.find(c => c.categorie === 'Logement & Habitation')?.total || 0),
      count: chargesNonCategorisees.length + (chargesParCategorie.find(c => c.categorie === 'Logement & Habitation')?.count || 0)
    });
    // Retirer l'ancienne entrée si elle existe déjà
    const existingIndex = chargesParCategorie.findIndex(c => c.categorie === 'Logement & Habitation');
    if (existingIndex !== -1 && existingIndex !== chargesParCategorie.length - 1) {
      chargesParCategorie.splice(existingIndex, 1);
    }
  }
  const totalRevenusCat = revenusParCategorie.reduce((sum, cat) => sum + cat.total, 0);
  const totalChargesCat = chargesParCategorie.reduce((sum, cat) => sum + cat.total, 0);
  
  const REVENUS_COLORS: Record<string, string> = {
    'Revenus du travail': '#c0ff35',
    'Revenus du patrimoine': '#0b3319',
    'Retraites, pensions & rentes': '#f9fba5',
    'Aides sociales & allocations': '#79e230',
    'Indemnités & remboursements': '#39a325',
    'Autres revenus': '#15751e'
  };

  const CHARGES_COLORS: Record<string, string> = {
    'Emprunts & Crédits': '#2d00f7',
    'Logement & Habitation': '#6a00f4',
    'Transports & Mobilité': '#8900f2',
    'Alimentation & Vie courante': '#bc00dd',
    'Santé & Bien-être': '#e500a4',
    'Famille, Enfants & Éducation': '#f20089',
    'Impôts, Cotisations & Assurances': '#f20089',
    'Épargne & Investissements': '#f20089',
    'Loisirs, Culture & Numérique': '#f20089',
    'Solidarité, Pensions & Divers': '#ffb600'
  };

  const getColorForRevenu = (categorie: string) => {
    return REVENUS_COLORS[categorie] || '#76ff61';
  };

  const getColorForCharge = (categorie: string) => {
    return CHARGES_COLORS[categorie] || '#2d00f7';
  };
  return <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-muted-foreground">Solde {periodLabel}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold flex items-center gap-1 text-black">
              {soldePeriode >= 0 ? '+' : ''}
              <SlidingNumber value={soldePeriode} />
              <span className="ml-1">€</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Revenus - Dépenses
            </p>
          </CardContent>
        </Card>

        <Card className="border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-muted-foreground">
              Taux d'endettement
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold flex items-center gap-1 text-black">
              <SlidingNumber value={parseFloat(tauxEndettement.toFixed(1))} />
              <span>%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {displayMensualitesCredits.toLocaleString('fr-FR')} € / {displayRevenus.toLocaleString('fr-FR')} €
            </p>
          </CardContent>
        </Card>

        <Card className="border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-muted-foreground">
              Capacité d'endettement
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold flex items-center gap-1 text-black">
              <SlidingNumber value={capaciteEndettement} />
              <span className="ml-1">€</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Maximum à 35% des revenus
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Répartition par catégories */}
      <div className="grid gap-6 md:grid-cols-2 mt-6">
        {/* Répartition des revenus par catégories */}
        <Card className="border-0">
          <CardHeader>
            <CardTitle>Répartition des revenus par catégories</CardTitle>
            <CardDescription>
              Distribution des revenus selon leur nature
            </CardDescription>
          </CardHeader>
          <CardContent>
            {revenusParCategorie.length > 0 ? <div className="relative h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={revenusParCategorie.map(cat => ({
                  name: cat.categorie,
                  value: cat.total
                }))} cx="50%" cy="50%" innerRadius={70} outerRadius={85} paddingAngle={2} dataKey="value" stroke="hsl(var(--background))" strokeWidth={2}>
                      {revenusParCategorie.map((entry, index) => <Cell key={`cell-${index}`} fill={getColorForRevenu(entry.categorie)} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{
                  fontSize: '12px',
                  color: 'black'
                }} />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Valeur totale au centre */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{
              paddingBottom: '36px'
            }}>
                  <div className="text-center">
                    <div className="text-xl font-bold text-foreground">
                      {formatCurrency(totalRevenusCat)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Total revenus
                    </div>
                  </div>
                </div>
              </div> : <div className="text-center text-muted-foreground py-8">
                Aucun revenu pour le moment
              </div>}
          </CardContent>
        </Card>

        {/* Répartition des charges par catégories */}
        <Card className="border-0">
          <CardHeader>
            <CardTitle>Répartition des charges par catégories</CardTitle>
            <CardDescription>
              Distribution des charges selon leur nature
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chargesParCategorie.length > 0 ? <div className="relative h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chargesParCategorie.map(cat => ({
                  name: cat.categorie,
                  value: cat.total
                }))} cx="50%" cy="50%" innerRadius={70} outerRadius={85} paddingAngle={2} dataKey="value" stroke="hsl(var(--background))" strokeWidth={2}>
                      {chargesParCategorie.map((entry, index) => <Cell key={`cell-${index}`} fill={getColorForCharge(entry.categorie)} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{
                  fontSize: '12px',
                  color: 'black'
                }} />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Valeur totale au centre */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{
              paddingBottom: '36px'
            }}>
                  <div className="text-center">
                    <div className="text-xl font-bold text-foreground">
                      {formatCurrency(totalChargesCat)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Total charges
                    </div>
                  </div>
                </div>
              </div> : <div className="text-center text-muted-foreground py-8">
                Aucune charge pour le moment
              </div>}
          </CardContent>
        </Card>
      </div>

      {/* Saisonnalité - Évolution mensuelle */}
      <Card className="mt-6 border-0">
        <CardHeader>
          <CardTitle>Évolution mensuelle</CardTitle>
          <CardDescription>
            Comparaison revenus et charges sur 12 mois
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SeasonalityChart 
            revenus={revenus} 
            charges={charges} 
            formatCurrency={formatCurrency}
          />
        </CardContent>
      </Card>
    </div>;
};

// Fonction pour calculer le montant mensuel selon la périodicité
// Note: Les montants sont stockés en base annualisés, donc on divise par 12 pour mensuel
const getMonthlyAmount = (montant: number, periodicite?: string): number => {
  const p = (periodicite || 'mensuel').toLowerCase();
  switch (p) {
    case 'mensuel':
      return montant / 12; // Montant stocké annuellement, divisé par 12
    case 'trimestriel':
      return montant / 4; // 4 trimestres par an
    case 'semestriel':
      return montant / 2; // 2 semestres par an
    case 'annuel':
      return montant; // Montant annuel payé en une fois
    case 'ponctuel':
      return montant; // Montant ponctuel payé une fois
    default:
      return montant / 12;
  }
};

// Fonction pour déterminer les mois où un revenu/charge s'applique
const getApplicableMonths = (
  periodicite?: string,
  dateDebut?: string,
  dateFin?: string,
  jourFixe?: number
): number[] => {
  const p = (periodicite || 'mensuel').toLowerCase();
  const currentYear = new Date().getFullYear();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  // Vérifier si date_debut est "significative" (pas la valeur par défaut d'aujourd'hui)
  const isDateDebutMeaningful = dateDebut && dateDebut !== todayStr;
  
  // Si ponctuel avec une date significative, appliquer uniquement au mois de la date
  if (p === 'ponctuel' && isDateDebutMeaningful) {
    const month = new Date(dateDebut).getMonth();
    return [month];
  }
  
  // Pour mensuel, retourner tous les mois (filtrés par dates si présentes)
  let months = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  
  // Ne filtrer par date_debut que si c'est une date significative (pas le défaut)
  if (isDateDebutMeaningful) {
    const startDate = new Date(dateDebut);
    if (startDate.getFullYear() === currentYear) {
      months = months.filter(m => m >= startDate.getMonth());
    }
  }
  
  if (dateFin) {
    const endDate = new Date(dateFin);
    if (endDate.getFullYear() === currentYear) {
      months = months.filter(m => m <= endDate.getMonth());
    }
  }
  
  // Pour les périodicités non-mensuelles, retourner les mois spécifiques
  if (p === 'trimestriel') {
    // Jan (0), Avr (3), Juil (6), Oct (9)
    return months.filter(m => [0, 3, 6, 9].includes(m));
  }
  if (p === 'semestriel') {
    // Jan (0), Juil (6)
    return months.filter(m => [0, 6].includes(m));
  }
  if (p === 'annuel') {
    // Appliquer en janvier ou au mois de date_debut si significatif
    if (isDateDebutMeaningful) {
      const month = new Date(dateDebut).getMonth();
      return months.includes(month) ? [month] : [];
    }
    return months.includes(0) ? [0] : [];
  }
  
  // Pour mensuel (défaut), retourner tous les mois filtrés
  return months;
};

// Composant graphique saisonnalité
interface SeasonalityChartProps {
  revenus: Revenu[];
  charges: Charge[];
  formatCurrency: (amount: number) => string;
}

const SeasonalityChart = ({ revenus, charges, formatCurrency }: SeasonalityChartProps) => {
  const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  
  // Calculer les montants par mois en utilisant les périodicités
  const monthlyData = useMemo(() => {
    return MONTHS.map((month, monthIndex) => {
      // Calculer les revenus pour ce mois
      let monthRevenus = 0;
      revenus.forEach(revenu => {
        const montant = revenu.montant || 0;
        const periodicite = revenu.periodicite;
        const applicableMonths = getApplicableMonths(periodicite, revenu.date_debut, revenu.date_fin, revenu.jour_fixe);
        
        if (applicableMonths.includes(monthIndex)) {
          if (periodicite === 'ponctuel') {
            monthRevenus += montant;
          } else {
            monthRevenus += getMonthlyAmount(montant, periodicite);
          }
        }
      });
      
      // Calculer les charges pour ce mois
      let monthCharges = 0;
      charges.forEach(charge => {
        const montant = charge.montant || 0;
        const periodicite = charge.periodicite;
        const applicableMonths = getApplicableMonths(periodicite, charge.date_debut, charge.date_fin, charge.jour_fixe);
        
        if (applicableMonths.includes(monthIndex)) {
          if (periodicite === 'ponctuel') {
            monthCharges += montant;
          } else {
            monthCharges += getMonthlyAmount(montant, periodicite);
          }
        }
      });
      
      return {
        month,
        revenus: Math.round(monthRevenus),
        charges: Math.round(monthCharges),
        solde: Math.round(monthRevenus - monthCharges)
      };
    });
  }, [revenus, charges]);

  const hasData = revenus.length > 0 || charges.length > 0;

  if (!hasData) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Aucune donnée à afficher
      </div>
    );
  }

  return (
    <div className="h-80 relative">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={monthlyData} 
          margin={{ top: 20, right: 16, left: 0, bottom: 0 }}
          barGap={4}
          barCategoryGap="20%"
        >
          <defs>
            <linearGradient id="revenusGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2a9d8f" stopOpacity={1} />
              <stop offset="100%" stopColor="#21867a" stopOpacity={0.85} />
            </linearGradient>
            <linearGradient id="chargesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b0413e" stopOpacity={1} />
              <stop offset="100%" stopColor="#8f3432" stopOpacity={0.85} />
            </linearGradient>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1"/>
            </filter>
          </defs>
          <CartesianGrid 
            strokeDasharray="0" 
            stroke="hsl(var(--border))" 
            strokeOpacity={0.4}
            vertical={false}
          />
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
              name === 'revenus' ? 'Revenus' : 'Charges'
            ]}
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)',
              padding: '12px 16px',
            }}
            labelStyle={{ 
              color: 'hsl(var(--foreground))', 
              fontWeight: 600,
              marginBottom: '8px',
              fontSize: '13px'
            }}
            itemStyle={{
              color: 'hsl(var(--muted-foreground))',
              fontSize: '12px',
              padding: '2px 0'
            }}
          />
          <Legend 
            formatter={(value) => (
              <span className="text-xs font-medium text-muted-foreground">
                {value === 'revenus' ? 'Revenus' : 'Charges'}
              </span>
            )}
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
            iconSize={8}
          />
          <Bar 
            dataKey="revenus" 
            fill="url(#revenusGradient)"
            radius={[6, 6, 0, 0]}
            name="revenus"
            filter="url(#shadow)"
          />
          <Bar 
            dataKey="charges" 
            fill="url(#chargesGradient)"
            radius={[6, 6, 0, 0]}
            name="charges"
            filter="url(#shadow)"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};