import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import BudgetStatisticsCard from '@/components/ui/budget-statistics-card';
import { useRevenus, useCharges } from '@/hooks/useBudget';
import { useFamilyProfile } from '@/hooks/useFamilyData';
import { useAssets } from '@/hooks/useAssets';
import { usePassifs, useEmprunts } from '@/hooks/usePassifs';
import { PatrimoineChart } from '@/components/patrimoine/PatrimoineChart';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { revenus } = useRevenus();
  const { charges } = useCharges();
  const { data: familyProfile } = useFamilyProfile();
  const { assets } = useAssets();
  const { passifs } = usePassifs();
  const { emprunts } = useEmprunts();
  const navigate = useNavigate();

  const totalRevenus = revenus.reduce((sum, revenu) => sum + (revenu.montant || 0), 0);
  const totalCharges = charges.reduce((sum, charge) => sum + (charge.montant || 0), 0);

  return (
    <div className="max-w-6xl">
      {/* Greeting */}
      <div className="mb-10 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Bonjour{familyProfile?.prenom ? `, ${familyProfile.prenom}` : ''}.
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Voici un aperçu de votre situation.
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard/agenda')}
          className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Parler avec un expert →
        </button>
      </div>

      {/* Cards */}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border border-border/40 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium tracking-wide uppercase text-muted-foreground">Patrimoine</CardTitle>
          </CardHeader>
          <CardContent>
            <PatrimoineChart assets={assets} passifs={passifs} emprunts={emprunts} selectedCategory={null} />
          </CardContent>
        </Card>

        <Card className="border border-border/40 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium tracking-wide uppercase text-muted-foreground">Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <BudgetStatisticsCard totalRevenus={totalRevenus} totalCharges={totalCharges} revenusCount={revenus.length} chargesCount={charges.length} />
          </CardContent>
        </Card>

        <Card className="border border-border/40 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium tracking-wide uppercase text-muted-foreground">Fiscalité</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-[11px] text-muted-foreground mb-0.5">Imposition totale</div>
              <div className="text-2xl font-semibold text-foreground">9 365 €</div>
            </div>
            <div className="space-y-1.5">
              {[
                { label: 'IR et Prélèvements sociaux', value: '9 365 €' },
                { label: 'IFI', value: '0 €' },
                { label: 'Autres impôts', value: '0 €' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-1.5 text-[13px]">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-medium text-foreground">{row.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/40 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium tracking-wide uppercase text-muted-foreground">Transmission</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Contenu à venir...</p>
          </CardContent>
        </Card>

        <Card className="border border-border/40 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium tracking-wide uppercase text-muted-foreground">Retraite</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Contenu à venir...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
