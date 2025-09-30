import React, { useState, useEffect } from 'react';
import AnimatedBackground from '@/components/ui/animated-tabs';
import { BudgetResume } from '@/components/budget/BudgetResume';
import { BudgetRevenus } from '@/components/budget/BudgetRevenus';
import { BudgetCharges } from '@/components/budget/BudgetCharges';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRevenus, useCharges } from '@/hooks/useBudget';
import { REVENUS_CATEGORIES, CHARGES_CATEGORIES } from '@/constants/budgetCategories';
export const BudgetSection = () => {
  const [activeTab, setActiveTab] = useState('resume');
  const { revenus, fetchRevenus } = useRevenus();
  const { charges, fetchCharges } = useCharges();

  useEffect(() => {
    fetchRevenus();
    fetchCharges();
  }, []);

  const TABS = [
    { id: 'resume', label: 'Résumé' },
    { id: 'revenus', label: 'Revenus' },
    { id: 'charges', label: 'Charges' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'resume':
        return <BudgetResume />;
      case 'revenus':
        return <BudgetRevenus />;
      case 'charges':
        return <BudgetCharges />;
      default:
        return <BudgetResume />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
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

  const totalRevenus = revenusParCategorie.reduce((sum, cat) => sum + cat.total, 0);
  const totalCharges = chargesParCategorie.reduce((sum, cat) => sum + cat.total, 0);

  return (
    <div className="p-6">
      <div className="mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Budget</h2>
          <p className="text-muted-foreground">
            Contrôlez vos revenus, dépenses et objectifs financiers
          </p>
        </div>
      </div>

      <div className="mb-6 flex justify-start">
        <div className="rounded-[8px] bg-muted p-[2px]">
          <AnimatedBackground
            defaultValue="resume"
            onValueChange={(value) => setActiveTab(value || 'resume')}
            className="rounded-lg bg-background shadow-sm"
            transition={{
              ease: "easeInOut",
              duration: 0.2,
            }}
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                data-id={tab.id}
                type="button"
                className="inline-flex min-w-24 items-center justify-center px-3 py-2 text-sm font-medium text-foreground transition-transform active:scale-[0.98]"
              >
                {tab.label}
              </button>
            ))}
          </AnimatedBackground>
        </div>
      </div>

      <div className="mt-6">
        {renderContent()}
      </div>

      {/* Nouvelles cartes */}
      <div className="grid gap-6 md:grid-cols-2 mt-6">
        {/* Répartition des revenus par catégories */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition des revenus par catégories</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Catégorie</TableHead>
                  <TableHead className="text-right">Nombre</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenusParCategorie.map((cat, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{cat.categorie}</TableCell>
                    <TableCell className="text-right">{cat.count}</TableCell>
                    <TableCell className="text-right">{formatCurrency(cat.total)}</TableCell>
                    <TableCell className="text-right">
                      {totalRevenus > 0 ? ((cat.total / totalRevenus) * 100).toFixed(1) : 0}%
                    </TableCell>
                  </TableRow>
                ))}
                {revenusParCategorie.length > 0 && (
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">
                      {revenusParCategorie.reduce((sum, cat) => sum + cat.count, 0)}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(totalRevenus)}</TableCell>
                    <TableCell className="text-right">100%</TableCell>
                  </TableRow>
                )}
                {revenusParCategorie.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Aucun revenu pour le moment
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Répartition des charges par catégories */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition des charges par catégories</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Catégorie</TableHead>
                  <TableHead className="text-right">Nombre</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chargesParCategorie.map((cat, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{cat.categorie}</TableCell>
                    <TableCell className="text-right">{cat.count}</TableCell>
                    <TableCell className="text-right">{formatCurrency(cat.total)}</TableCell>
                    <TableCell className="text-right">
                      {totalCharges > 0 ? ((cat.total / totalCharges) * 100).toFixed(1) : 0}%
                    </TableCell>
                  </TableRow>
                ))}
                {chargesParCategorie.length > 0 && (
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">
                      {chargesParCategorie.reduce((sum, cat) => sum + cat.count, 0)}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(totalCharges)}</TableCell>
                    <TableCell className="text-right">100%</TableCell>
                  </TableRow>
                )}
                {chargesParCategorie.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Aucune charge pour le moment
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Saisonnalité - vide pour l'instant */}
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
    </div>
  );
};