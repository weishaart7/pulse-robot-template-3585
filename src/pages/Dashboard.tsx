import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedCard, CardBody, CardDescription as AnimatedDescription, CardTitle as AnimatedTitle, CardVisual, Visual2 } from '@/components/ui/animated-card-diagram';
import BudgetStatisticsCard from '@/components/ui/budget-statistics-card';
import { useRevenus, useCharges } from '@/hooks/useBudget';
import { useFamilyProfile } from '@/hooks/useFamilyData';

const Dashboard = () => {
  const { revenus } = useRevenus();
  const { charges } = useCharges();
  const { data: familyProfile } = useFamilyProfile();

  const totalRevenus = revenus.reduce((sum, revenu) => sum + (revenu.montant || 0), 0);
  const totalCharges = charges.reduce((sum, charge) => sum + (charge.montant || 0), 0);
  const solde = totalRevenus - totalCharges;
  
  // Calcul du pourcentage pour la visualisation (épargne par rapport aux revenus)
  const budgetPercentage = totalRevenus > 0 
    ? Math.max(0, Math.min(100, ((solde / totalRevenus) * 100))) 
    : 0;

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
      
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Patrimoine total */}
        <Card className="h-40 relative overflow-hidden rounded-2xl border-0 shadow-sm" style={{ backgroundColor: '#FFF1E4' }}>
          <CardContent className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#895C32' }}>
                <svg className="w-4 h-4" style={{ color: '#FFF1E4' }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7v10c0 5.55 3.84 9.64 9 11 5.16-1.36 9-5.45 9-11V7l-10-5z"/>
                </svg>
              </div>
              <button className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#895C32' }}>
                <span className="text-xs font-bold" style={{ color: '#FFF1E4' }}>+</span>
              </button>
            </div>
            <div className="flex-1 flex flex-col justify-end">
              <h3 className="text-xs font-medium mb-1" style={{ color: '#895C32', opacity: 0.8 }}>Patrimoine total</h3>
              <span className="text-3xl font-bold" style={{ color: '#895C32' }}>0 €</span>
            </div>
          </CardContent>
        </Card>

        {/* Budget */}
        <div className="h-40" style={{ backgroundColor: '#E3F4FF' }}>
          <AnimatedCard style={{ backgroundColor: '#E3F4FF' }}>
            <CardVisual>
              <Visual2 
                mainColor="#1B3EB3" 
                secondaryColor="#E3F4FF" 
                percentage={Math.round(budgetPercentage)}
                amount={solde.toLocaleString('fr-FR') + ' €'}
              />
            </CardVisual>
            <CardBody>
              <AnimatedTitle style={{ color: '#1B3EB3', opacity: 0.8 }}>Budget</AnimatedTitle>
              <AnimatedDescription style={{ color: '#1B3EB3' }}>
                {solde.toLocaleString('fr-FR')} €
              </AnimatedDescription>
            </CardBody>
          </AnimatedCard>
        </div>

        {/* Fiscalité */}
        <Card className="h-40 relative overflow-hidden rounded-2xl border-0 shadow-sm" style={{ backgroundColor: '#61328A' }}>
          <CardContent className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFE3FE' }}>
                <svg className="w-4 h-4" style={{ color: '#61328A' }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                </svg>
              </div>
              <button className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFE3FE' }}>
                <span className="text-xs font-bold" style={{ color: '#61328A' }}>+</span>
              </button>
            </div>
            <div className="flex-1 flex flex-col justify-end">
              <h3 className="text-xs font-medium mb-1" style={{ color: '#FFE3FE', opacity: 0.8 }}>Fiscalité</h3>
              <span className="text-3xl font-bold" style={{ color: '#FFE3FE' }}>0 €</span>
            </div>
          </CardContent>
        </Card>

        {/* Frais de succession */}
        <Card className="h-40 relative overflow-hidden rounded-2xl border-0 shadow-sm" style={{ backgroundColor: '#C8FFAC' }}>
          <CardContent className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#0F5D24' }}>
                <svg className="w-4 h-4" style={{ color: '#C8FFAC' }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17,12H22L18,8V11H4A2,2 0 0,0 2,13V20A2,2 0 0,0 4,22H17A2,2 0 0,0 19,20V12M4,20V13H17V20H4Z"/>
                </svg>
              </div>
              <button className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#0F5D24' }}>
                <span className="text-xs font-bold" style={{ color: '#C8FFAC' }}>+</span>
              </button>
            </div>
            <div className="flex-1 flex flex-col justify-end">
              <h3 className="text-xs font-medium mb-1" style={{ color: '#0F5D24', opacity: 0.8 }}>Frais de succession</h3>
              <span className="text-3xl font-bold" style={{ color: '#0F5D24' }}>0 €</span>
            </div>
          </CardContent>
        </Card>

        {/* Retraite */}
        <Card className="h-40 relative overflow-hidden rounded-2xl border-0 shadow-sm" style={{ backgroundColor: '#FDFFE3' }}>
          <CardContent className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#514A14' }}>
                <svg className="w-4 h-4" style={{ color: '#FDFFE3' }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z"/>
                </svg>
              </div>
              <button className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#514A14' }}>
                <span className="text-xs font-bold" style={{ color: '#FDFFE3' }}>+</span>
              </button>
            </div>
            <div className="flex-1 flex flex-col justify-end">
              <h3 className="text-xs font-medium mb-1" style={{ color: '#514A14', opacity: 0.8 }}>Retraite</h3>
              <span className="text-3xl font-bold" style={{ color: '#514A14' }}>25 000 €/an</span>
            </div>
          </CardContent>
        </Card>

        {/* Endettement */}
        <Card className="h-40 relative overflow-hidden rounded-2xl border-0 shadow-sm" style={{ backgroundColor: '#C4A9BA' }}>
          <CardContent className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#270A16' }}>
                <svg className="w-4 h-4" style={{ color: '#C4A9BA' }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13,9H18.5L13,3.5V9M6,2H14L20,8V20A2,2 0 0,1 18,22H6C4.89,22 4,21.1 4,20V4C4,2.89 4.89,2 6,2M15,18V16H6V18H15M18,14V12H6V14H18Z"/>
                </svg>
              </div>
              <button className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#270A16' }}>
                <span className="text-xs font-bold" style={{ color: '#C4A9BA' }}>+</span>
              </button>
            </div>
            <div className="flex-1 flex flex-col justify-end">
              <h3 className="text-xs font-medium mb-1" style={{ color: '#270A16', opacity: 0.8 }}>Endettement</h3>
              <span className="text-3xl font-bold" style={{ color: '#270A16' }}>10%</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;