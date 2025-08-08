import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import BudgetStatisticsCard from '@/components/ui/budget-statistics-card';
import { useRevenus, useCharges } from '@/hooks/useBudget';

const Dashboard = () => {
  const { revenus } = useRevenus();
  const { charges } = useCharges();

  const totalRevenus = revenus.reduce((sum, revenu) => sum + (revenu.montant || 0), 0);
  const totalCharges = charges.reduce((sum, charge) => sum + (charge.montant || 0), 0);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Vue d'ensemble</h2>
        <p className="text-muted-foreground">
          Bienvenue dans votre espace de gestion patrimoniale
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Famille</CardTitle>
            <CardDescription>
              Gérez les informations de votre famille
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Contenu à venir...
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Patrimoine</CardTitle>
            <CardDescription>
              Suivez l'évolution de votre patrimoine
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Contenu à venir...
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Budget</CardTitle>
            <CardDescription>
              Contrôlez vos finances au quotidien
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BudgetStatisticsCard 
              totalRevenus={totalRevenus}
              totalCharges={totalCharges}
              revenusCount={revenus.length}
              chargesCount={charges.length}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;