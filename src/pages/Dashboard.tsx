import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import BudgetStatisticsCard from '@/components/ui/budget-statistics-card';
import { useRevenus, useCharges } from '@/hooks/useBudget';
import { useAssets } from '@/hooks/useAssets';
import { usePassifs, useEmprunts } from '@/hooks/usePassifs';
import { PatrimoineChart } from '@/components/patrimoine/PatrimoineChart';
import { THEME_INK } from '@/lib/theme';
const Dashboard = () => {
  const {
    revenus
  } = useRevenus();
  const {
    charges
  } = useCharges();
  const {
    assets
  } = useAssets();
  const {
    passifs
  } = usePassifs();
  const {
    emprunts
  } = useEmprunts();
  // Convertir un montant en annuel selon sa périodicité (logique reprise de BudgetList.tsx)
  const toAnnual = (amount: number | undefined, periodicite: string | undefined): number => {
    if (!amount) return 0;
    const p = (periodicite || 'mensuel').toLowerCase();
    switch (p) {
      case 'mensuel':
      case 'mensuelle':
        return amount * 12;
      case 'trimestriel':
      case 'trimestrielle':
        return amount * 4;
      case 'semestriel':
      case 'semestrielle':
        return amount * 2;
      case 'annuel':
      case 'annuelle':
      case 'ponctuel':
        return amount;
      default:
        return amount * 12; // Par défaut mensuel
    }
  };

  const totalRevenus = revenus.reduce((sum, revenu) => sum + toAnnual(revenu.montant, revenu.periodicite), 0) / 12;
  const totalCharges = charges.reduce((sum, charge) => sum + toAnnual(charge.montant, charge.periodicite), 0) / 12;
  return <div className="p-6">
      <div className="mb-6">
        <h1 className="text-[34px] font-bold" style={{ color: THEME_INK, letterSpacing: '-0.02em' }}>Vue d'ensemble</h1>
      </div>

      <div className="mb-6 bg-card rounded-[4px] p-6 shadow-[0_1px_3px_rgba(30,29,25,0.06),0_14px_34px_-24px_rgba(30,29,25,0.4)]">
        <div className="flex justify-end items-start">
          <div className="rounded-[4px] p-6 max-w-md" style={{ backgroundColor: '#ebf1f1' }}>
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
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Patrimoine</CardTitle>
            <CardDescription>
              Suivez l'évolution de votre patrimoine
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PatrimoineChart assets={assets} passifs={passifs} emprunts={emprunts} selectedCategory={null} />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Budget</CardTitle>
            <CardDescription>
              Contrôlez vos finances au quotidien
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BudgetStatisticsCard totalRevenus={totalRevenus} totalCharges={totalCharges} revenusCount={revenus.length} chargesCount={charges.length} />
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Fiscalité</CardTitle>
            <CardDescription>
              Optimisez votre situation fiscale
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Montant principal avec fond coloré */}
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-md p-3 border border-primary/20">
              <div className="text-xs font-medium text-muted-foreground mb-1">Imposition totale</div>
              <div className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                9 365 €
              </div>
            </div>

            {/* Répartition détaillée */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-[#05aaa4]/10 flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#05aaa4]" />
                  </div>
                  <div>
                    <div className="text-xs font-medium">IR et Prélèvements sociaux</div>
                    <div className="text-[10px] text-muted-foreground">Impôt sur le revenu</div>
                  </div>
                </div>
                <div className="text-sm font-bold">9 365 €</div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-[#0b5563]/10 flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#0b5563]" />
                  </div>
                  <div>
                    <div className="text-xs font-medium">IFI</div>
                    <div className="text-[10px] text-muted-foreground">Impôt sur la fortune immobilière</div>
                  </div>
                </div>
                <div className="text-sm font-bold text-muted-foreground">0 €</div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                  </div>
                  <div>
                    <div className="text-xs font-medium">Autres impôts</div>
                    <div className="text-[10px] text-muted-foreground">Taxes diverses</div>
                  </div>
                </div>
                <div className="text-sm font-bold text-muted-foreground">0 €</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
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
        
        <Card>
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
    </div>;
};
export default Dashboard;