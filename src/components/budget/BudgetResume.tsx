import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Line, ReferenceLine } from 'recharts';
import { useRevenus, useCharges } from '@/hooks/useBudget';
import { Revenu, Charge } from '@/services/budgetService';
import { REVENUS_CATEGORIES, CHARGES_CATEGORIES } from '@/constants/budgetCategories';
import { SlidingNumber } from '@/components/ui/sliding-number';
import { DisplayMode, PersonFilter, PersonNames } from '@/pages/budget/BudgetSection';

interface BudgetResumeProps {
  displayMode: DisplayMode;
  personFilter: PersonFilter;
  personNames: PersonNames;
}

// Convertir un montant périodique en montant annuel
const toAnnual = (montant: number, periodicite?: string): number => {
  const p = (periodicite || 'mensuel').toLowerCase();
  switch (p) {
    case 'mensuel':
    case 'mensuelle':
      return montant * 12;
    case 'trimestriel':
    case 'trimestrielle':
      return montant * 4;
    case 'semestriel':
    case 'semestrielle':
      return montant * 2;
    case 'annuel':
    case 'annuelle':
    case 'ponctuel':
    default:
      return montant;
  }
};

// Fonction utilitaire pour filtrer et ajuster les montants par personne
const filterByPerson = <T extends { montant?: number | null; beneficiaire?: string | null; debiteur?: string | null }>(
  items: T[],
  personFilter: PersonFilter,
  field: 'beneficiaire' | 'debiteur',
  personNames: PersonNames
): T[] => {
  // Couple = tous les revenus/charges
  if (personFilter === 'couple') return items;
  
  // Déterminer le nom à chercher
  const targetName = personFilter === 'utilisateur' 
    ? personNames.userFullName.toLowerCase() 
    : personNames.partnerFullName.toLowerCase();
  
  // Valeurs qui indiquent un élément commun
  const commonValues = ['le couple', 'couple', 'commun', 'les deux'];
  
  // Filtre individuel : éléments propres + moitié des communs
  return items
    .filter(item => {
      const value = (item as Record<string, unknown>)[field] as string | null | undefined;
      const valueLower = value?.toLowerCase() || '';
      // Inclure si c'est attribué à la personne OU si c'est commun
      return valueLower === targetName || commonValues.some(cv => valueLower.includes(cv));
    })
    .map(item => {
      const value = (item as Record<string, unknown>)[field] as string | null | undefined;
      const valueLower = value?.toLowerCase() || '';
      // Si c'est un élément commun, diviser le montant par 2
      if (commonValues.some(cv => valueLower.includes(cv))) {
        return { ...item, montant: (item.montant || 0) / 2 };
      }
      return item;
    });
};

export const BudgetResume = ({ displayMode, personFilter, personNames }: BudgetResumeProps) => {
  const { revenus: allRevenus, loading: revenusLoading } = useRevenus();
  const { charges: allCharges, loading: chargesLoading } = useCharges();

  // Filtrer par personne
  const revenus = useMemo(() => 
    filterByPerson(allRevenus, personFilter, 'beneficiaire', personNames), 
    [allRevenus, personFilter, personNames]
  );
  const charges = useMemo(() => 
    filterByPerson(allCharges, personFilter, 'debiteur', personNames), 
    [allCharges, personFilter, personNames]
  );

  // Calculer les totaux annuels
  const totalRevenusAnnuel = useMemo(() => 
    revenus.reduce((sum, r) => sum + toAnnual(r.montant || 0, r.periodicite), 0),
    [revenus]
  );
  const totalChargesAnnuel = useMemo(() => 
    charges.reduce((sum, c) => sum + toAnnual(c.montant || 0, c.periodicite), 0),
    [charges]
  );

  const divisor = displayMode === 'mensuel' ? 12 : 1;
  const periodLabel = displayMode === 'mensuel' ? 'mensuel' : 'annuel';

  // Appliquer le diviseur pour l'affichage
  const displayRevenus = Math.round(totalRevenusAnnuel / divisor);
  const displayCharges = Math.round(totalChargesAnnuel / divisor);

  if (revenusLoading || chargesLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Résumé du Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Chargement des données...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculer les mensualités de crédits (charges liées aux crédits)
  const mensualitesCreditsAnnuel = charges
    .filter(c => c.nature?.toLowerCase().includes('crédit') || c.nature?.toLowerCase().includes('emprunt'))
    .reduce((sum, c) => sum + toAnnual(c.montant || 0, c.periodicite), 0);
  const displayMensualitesCredits = Math.round(mensualitesCreditsAnnuel / divisor);

  // Calculer les indicateurs
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
    const total = revenusCategorie.reduce((sum, r) => sum + toAnnual(r.montant || 0, r.periodicite), 0);
    return {
      categorie,
      total: total / divisor,
      count: revenusCategorie.length
    };
  }).filter(cat => cat.count > 0);

  // Ajouter les revenus non catégorisés
  const revenusNonCategorises = revenus.filter(r => !allRevenusNatures.includes(r.nature));
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
    const chargesCategorie = charges.filter(c => (natures as readonly string[]).includes(c.nature));
    const total = chargesCategorie.reduce((sum, c) => sum + toAnnual(c.montant || 0, c.periodicite), 0);
    return {
      categorie,
      total: total / divisor,
      count: chargesCategorie.length
    };
  }).filter(cat => cat.count > 0);

  // Ajouter les charges non catégorisées
  const chargesNonCategorisees = charges.filter(c => !allChargesNatures.includes(c.nature));
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

  const getColorForRevenu = (categorie: string) => REVENUS_COLORS[categorie] || '#76ff61';
  const getColorForCharge = (categorie: string) => CHARGES_COLORS[categorie] || '#2d00f7';

  return (
    <div className="space-y-6">
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
            <p className="text-xs text-muted-foreground mt-1">Revenus - Dépenses</p>
          </CardContent>
        </Card>

        <Card className="border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-muted-foreground">Taux d'endettement</CardTitle>
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
            <CardTitle className="text-base font-medium text-muted-foreground">Capacité d'endettement</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold flex items-center gap-1 text-black">
              <SlidingNumber value={capaciteEndettement} />
              <span className="ml-1">€</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Maximum à 35% des revenus</p>
          </CardContent>
        </Card>
      </div>

      {/* Répartition par catégories */}
      <div className="grid gap-6 md:grid-cols-2 mt-6">
        {/* Répartition des revenus par catégories */}
        <Card className="border-0">
          <CardHeader>
            <CardTitle>Répartition des revenus par catégories</CardTitle>
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
        <Card className="border-0">
          <CardHeader>
            <CardTitle>Répartition des charges par catégories</CardTitle>
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
      <Card className="mt-6 border-0">
        <CardHeader>
          <CardTitle>Évolution mensuelle</CardTitle>
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

  // Calculer les mois où un item s'applique selon ses dates de début/fin
  // Pour les montants distribués mensuellement, on retourne tous les mois applicables
  const getApplicableMonths = (
    periodicite?: string,
    dateDebut?: string,
    dateFin?: string
  ): number[] => {
    const p = (periodicite || 'mensuel').toLowerCase();
    let months = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    
    // Filtrer par date de début
    if (dateDebut) {
      const startDate = new Date(dateDebut);
      const startYear = startDate.getFullYear();
      if (startYear === currentYear) {
        months = months.filter(m => m >= startDate.getMonth());
      } else if (startYear > currentYear) {
        return []; // Pas encore commencé
      }
      // Si startYear < currentYear, on garde tous les mois (en cours)
    }
    
    // Filtrer par date de fin
    if (dateFin) {
      const endDate = new Date(dateFin);
      const endYear = endDate.getFullYear();
      if (endYear === currentYear) {
        months = months.filter(m => m <= endDate.getMonth());
      } else if (endYear < currentYear) {
        return []; // Déjà terminé
      }
      // Si endYear > currentYear, on garde tous les mois filtrés
    }
    
    // Pour ponctuel uniquement, restreindre au mois de date_debut
    if (p === 'ponctuel') {
      if (dateDebut) {
        const month = new Date(dateDebut).getMonth();
        return months.includes(month) ? [month] : [];
      }
      return months.length > 0 ? [months[0]] : [];
    }
    
    // Pour toutes les autres périodicités (mensuel, trimestriel, semestriel, annuel)
    // on retourne tous les mois applicables car le montant sera distribué mensuellement
    return months;
  };

  // Convertir un montant périodique en montant mensuel
  const toMonthlyAmount = (montant: number, periodicite?: string): number => {
    const p = (periodicite || 'mensuel').toLowerCase();
    switch (p) {
      case 'annuel':
      case 'annuelle':
        return montant / 12;
      case 'semestriel':
      case 'semestrielle':
        return montant / 6;
      case 'trimestriel':
      case 'trimestrielle':
        return montant / 3;
      case 'ponctuel':
        return montant; // Montant unique affiché tel quel le mois concerné
      default: // mensuel, mensuelle
        return montant;
    }
  };

  // Calculer les montants par mois (distribués mensuellement pour toutes les périodicités sauf ponctuel)
  const monthlyData = useMemo(() => {
    return MONTHS.map((month, monthIndex) => {
      // Revenus pour ce mois
      let monthRevenus = 0;
      revenus.forEach(revenu => {
        const montant = Number(revenu.montant) || 0;
        if (!isFinite(montant) || montant === 0) return;
        
        const applicableMonths = getApplicableMonths(revenu.periodicite, revenu.date_debut, revenu.date_fin);
        if (applicableMonths.includes(monthIndex)) {
          // Pour ponctuel, on garde le montant complet; sinon on convertit en mensuel
          const p = (revenu.periodicite || 'mensuel').toLowerCase();
          if (p === 'ponctuel') {
            monthRevenus += montant;
          } else {
            monthRevenus += toMonthlyAmount(montant, revenu.periodicite);
          }
        }
      });
      
      // Charges pour ce mois
      let monthCharges = 0;
      charges.forEach(charge => {
        const montant = Number(charge.montant) || 0;
        if (!isFinite(montant) || montant === 0) return;
        
        const applicableMonths = getApplicableMonths(charge.periodicite, charge.date_debut, charge.date_fin);
        if (applicableMonths.includes(monthIndex)) {
          const p = (charge.periodicite || 'mensuel').toLowerCase();
          if (p === 'ponctuel') {
            monthCharges += montant;
          } else {
            monthCharges += toMonthlyAmount(montant, charge.periodicite);
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
            stroke="#f59e0b"
            strokeWidth={2.5}
            dot={{ fill: '#f59e0b', strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6, fill: '#f59e0b', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
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
