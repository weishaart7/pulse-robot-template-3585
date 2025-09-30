import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import BudgetStatisticsCard from '@/components/ui/budget-statistics-card';
import { useRevenus, useCharges } from '@/hooks/useBudget';
import { useFamilyProfile } from '@/hooks/useFamilyData';

const Dashboard = () => {
  const { revenus } = useRevenus();
  const { charges } = useCharges();
  const { data: familyProfile } = useFamilyProfile();

  const totalRevenus = revenus.reduce((sum, revenu) => sum + (revenu.montant || 0), 0);
  const totalCharges = charges.reduce((sum, charge) => sum + (charge.montant || 0), 0);

  return (
    <div className="p-6">
      <div className="mb-6 bg-card rounded-lg p-6">
        <div className="flex justify-between items-start">
          <h2 className="text-base text-foreground/70 font-medium">Bonjour {familyProfile?.prenom || '(Prénom)'}.</h2>
          
          <div className="bg-muted rounded-lg p-6 max-w-md">
            <h3 className="text-base font-semibold text-foreground mb-3">Parlez avec un expert</h3>
            <p className="text-muted-foreground text-xs mb-4 leading-relaxed">
              Notre équipe interne de conseillers financiers, de conseillers patrimoniaux et partenaires est à vos côtés pour vous accompagner sereinement, qu'il s'agisse de questions simples ou de décisions stratégiques.
            </p>
            <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-xs font-medium hover:bg-primary/90 transition-colors">
              Planifier un rendez-vous
            </button>
          </div>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-0">
          <CardHeader>
            <CardTitle className="text-xl">Patrimoine</CardTitle>
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
        
        <Card className="border-0">
          <CardHeader>
            <CardTitle className="text-xl">Budget</CardTitle>
            <CardDescription>
              Contrôlez vos finances au quotidien
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Contenu à venir...
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-0">
          <CardHeader>
            <CardTitle className="text-xl">Fiscalité</CardTitle>
            <CardDescription>
              Optimisez votre situation fiscale
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Contenu à venir...
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-0">
          <CardHeader>
            <CardTitle className="text-xl">Transmission</CardTitle>
            <CardDescription>
              Préparez la transmission de votre patrimoine
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Contenu à venir...
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-0">
          <CardHeader>
            <CardTitle className="text-xl">Retraite</CardTitle>
            <CardDescription>
              Anticipez votre retraite sereinement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Contenu à venir...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;