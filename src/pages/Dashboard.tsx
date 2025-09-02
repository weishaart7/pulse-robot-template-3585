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
      
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Patrimoine total */}
        <Card className="h-32 relative overflow-hidden" style={{ backgroundColor: '#FFF1E4' }}>
          <CardContent className="p-4 h-full flex flex-col justify-between">
            <h3 className="text-sm font-medium" style={{ color: '#895C32' }}>Patrimoine total</h3>
            <div className="flex items-end">
              <span className="text-2xl font-bold" style={{ color: '#895C32' }}>0 €</span>
            </div>
          </CardContent>
        </Card>

        {/* Budget */}
        <Card className="h-32 relative overflow-hidden" style={{ backgroundColor: '#E3F4FF' }}>
          <CardContent className="p-4 h-full flex flex-col justify-between">
            <h3 className="text-sm font-medium" style={{ color: '#1B3EB3' }}>Budget</h3>
            <div className="flex items-end">
              <span className="text-2xl font-bold" style={{ color: '#1B3EB3' }}>
                {(totalRevenus - totalCharges).toLocaleString('fr-FR')} €
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Fiscalité */}
        <Card className="h-32 relative overflow-hidden" style={{ backgroundColor: '#61328A' }}>
          <CardContent className="p-4 h-full flex flex-col justify-between">
            <h3 className="text-sm font-medium" style={{ color: '#FFE3FE' }}>Fiscalité</h3>
            <div className="flex items-end">
              <span className="text-2xl font-bold" style={{ color: '#FFE3FE' }}>0 €</span>
            </div>
          </CardContent>
        </Card>

        {/* Frais de succession */}
        <Card className="h-32 relative overflow-hidden" style={{ backgroundColor: '#C8FFAC' }}>
          <CardContent className="p-4 h-full flex flex-col justify-between">
            <h3 className="text-sm font-medium" style={{ color: '#0F5D24' }}>Frais de succession</h3>
            <div className="flex items-end">
              <span className="text-2xl font-bold" style={{ color: '#0F5D24' }}>0 €</span>
            </div>
          </CardContent>
        </Card>

        {/* Retraite */}
        <Card className="h-32 relative overflow-hidden" style={{ backgroundColor: '#FDFFE3' }}>
          <CardContent className="p-4 h-full flex flex-col justify-between">
            <h3 className="text-sm font-medium" style={{ color: '#514A14' }}>Retraite</h3>
            <div className="flex items-end">
              <span className="text-2xl font-bold" style={{ color: '#514A14' }}>25 000 €/an</span>
            </div>
          </CardContent>
        </Card>

        {/* Endettement */}
        <Card className="h-32 relative overflow-hidden" style={{ backgroundColor: '#C4A9BA' }}>
          <CardContent className="p-4 h-full flex flex-col justify-between">
            <h3 className="text-sm font-medium" style={{ color: '#270A16' }}>Endettement</h3>
            <div className="flex items-end">
              <span className="text-2xl font-bold" style={{ color: '#270A16' }}>10%</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;