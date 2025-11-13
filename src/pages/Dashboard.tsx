import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import BudgetStatisticsCard from '@/components/ui/budget-statistics-card';
import { useRevenus, useCharges } from '@/hooks/useBudget';
import { useFamilyProfile } from '@/hooks/useFamilyData';
import { useAssets } from '@/hooks/useAssets';
import { usePassifs, useEmprunts } from '@/hooks/usePassifs';
import { PatrimoineChart } from '@/components/patrimoine/PatrimoineChart';

const Dashboard = () => {
  const { revenus } = useRevenus();
  const { charges } = useCharges();
  const { data: familyProfile } = useFamilyProfile();
  const { assets } = useAssets();
  const { passifs } = usePassifs();
  const { emprunts } = useEmprunts();

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
            <PatrimoineChart 
              assets={assets}
              passifs={passifs}
              emprunts={emprunts}
              selectedCategory={null}
            />
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
            <BudgetStatisticsCard 
              totalRevenus={totalRevenus}
              totalCharges={totalCharges}
              revenusCount={revenus.length}
              chargesCount={charges.length}
            />
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
            <div className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Imposition totale</div>
                <div className="text-3xl font-bold text-foreground">9 365 €</div>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <div className="text-xs text-muted-foreground">IR et PS</div>
                  <div className="text-sm font-semibold">9 365 €</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">IFI</div>
                  <div className="text-sm font-semibold">0 €</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Autres</div>
                  <div className="text-sm font-semibold">0 €</div>
                </div>
              </div>
            </div>
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