import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useRevenus, useCharges } from '@/hooks/useBudget';
import { REVENUS_CATEGORIES, CHARGES_CATEGORIES } from '@/constants/budgetCategories';
export const BudgetResume = () => {
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

  // Calculer les indicateurs
  const soldeMensuel = Math.round(totalRevenus - totalCharges);
  const tauxEndettement = totalRevenus > 0 ? mensualitesCredits / totalRevenus * 100 : 0;
  const capaciteEndettement = Math.round(totalRevenus * 0.35 - mensualitesCredits);
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Grouper les revenus par catégories
  const revenusParCategorie = Object.entries(REVENUS_CATEGORIES).map(([categorie, natures]) => {
    const revenusCategorie = revenus.filter(r => (natures as readonly string[]).includes(r.nature));
    const total = revenusCategorie.reduce((sum, r) => sum + (Number(r.montant) || 0), 0);
    return {
      categorie,
      total,
      count: revenusCategorie.length
    };
  }).filter(cat => cat.count > 0);

  // Grouper les charges par catégories
  const chargesParCategorie = Object.entries(CHARGES_CATEGORIES).map(([categorie, natures]) => {
    const chargesCategorie = charges.filter(c => (natures as readonly string[]).includes(c.nature));
    const total = chargesCategorie.reduce((sum, c) => sum + (Number(c.montant) || 0), 0);
    return {
      categorie,
      total,
      count: chargesCategorie.length
    };
  }).filter(cat => cat.count > 0);
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-muted-foreground">Solde mensuel annualisé</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className={`text-2xl font-bold ${soldeMensuel >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {soldeMensuel >= 0 ? '+' : ''}{soldeMensuel.toLocaleString('fr-FR')} €
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Revenus - Dépenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-muted-foreground">
              Taux d'endettement
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className={`text-2xl font-bold ${tauxEndettement <= 33 ? 'text-primary' : tauxEndettement <= 40 ? 'text-warning' : 'text-destructive'}`}>
              {tauxEndettement.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {mensualitesCredits.toLocaleString('fr-FR')} € / {totalRevenus.toLocaleString('fr-FR')} €
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-muted-foreground">
              Capacité d'endettement
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className={`text-2xl font-bold ${capaciteEndettement >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {capaciteEndettement.toLocaleString('fr-FR')} €
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
        <Card>
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
                  color: 'hsl(var(--foreground))'
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
        <Card>
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
                  color: 'hsl(var(--foreground))'
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

      {/* Saisonnalité */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Saisonnalité</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            Contenu à venir
          </div>
        </CardContent>
      </Card>
    </div>;
};