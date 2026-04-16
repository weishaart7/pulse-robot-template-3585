import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PatrimoineChart } from './PatrimoineChart';
import { PlusValuesCard } from './PlusValuesCard';
import { useAssets } from '@/hooks/useAssets';
import { usePassifs, useEmprunts } from '@/hooks/usePassifs';
import { useFamilyProfile, useMaritalStatus } from '@/hooks/useFamilyData';
import { usePatrimoineCalculations } from '@/hooks/usePatrimoineCalculations';
import { TrendingUp, TrendingDown, Wallet, User, Users, Target, ArrowUpRight } from 'lucide-react';

interface PatrimoineResumeProps {
  onNavigateToPlusValues?: () => void;
}

export const PatrimoineResume = ({ onNavigateToPlusValues }: PatrimoineResumeProps) => {
  const { assets } = useAssets();
  const { passifs } = usePassifs();
  const { emprunts } = useEmprunts();
  const { data: familyProfile } = useFamilyProfile();
  const { data: maritalStatus } = useMaritalStatus();

  const {
    financialSummary,
    patrimoineParPersonne,
    plusValuesSummary,
    formatCurrency
  } = usePatrimoineCalculations({
    assets,
    passifs,
    emprunts,
    userFirstName: familyProfile?.prenom || 'Vous',
    spouseFirstName: maritalStatus?.prenom_conjoint || 'Conjoint',
    statutCouple: maritalStatus?.statut_couple
  });

  return (
    <div className="space-y-8">
      {/* Top summary cards with colored top borders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <div className="h-1 bg-green-500" />
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Actifs</p>
                <p className="text-xs text-muted-foreground/70">Total de vos actifs</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {formatCurrency(financialSummary.totalActifs)}
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <div className="h-1 bg-red-500" />
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Passifs</p>
                <p className="text-xs text-muted-foreground/70">Total de vos dettes</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {formatCurrency(financialSummary.totalPassifs)}
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <div className="h-1 bg-primary" />
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Patrimoine net</p>
                <p className="text-xs text-muted-foreground/70">Actifs - Passifs</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Wallet className="h-4 w-4 text-primary" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {formatCurrency(financialSummary.patrimoineNet)}
            </p>
          </div>
        </div>
      </div>

      {/* Chart section */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Répartition du patrimoine</CardTitle>
        </CardHeader>
        <CardContent>
          <PatrimoineChart assets={assets} passifs={passifs} emprunts={emprunts} selectedCategory={null} />
        </CardContent>
      </Card>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patrimoine par tête */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Patrimoine par tête</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-lg border bg-card">
              <div className="p-2 rounded-lg bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
                  {patrimoineParPersonne.userFirstName}
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(patrimoineParPersonne.userValue)}
                </p>
                {patrimoineParPersonne.showSpouse && (
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <div>Actifs : {formatCurrency(patrimoineParPersonne.userActifs)}</div>
                    {patrimoineParPersonne.userOwnValue > 0 && <div className="ml-4">• Biens propres : {formatCurrency(patrimoineParPersonne.userOwnValue)}</div>}
                    {patrimoineParPersonne.userSharedValue > 0 && <div className="ml-4">• Part biens communs : {formatCurrency(patrimoineParPersonne.userSharedValue)}</div>}
                    {patrimoineParPersonne.userPassifs > 0 && <div className="text-destructive">Passifs : {formatCurrency(patrimoineParPersonne.userPassifs)}</div>}
                  </div>
                )}
              </div>
            </div>

            {patrimoineParPersonne.showSpouse && (
              <div className="flex items-center gap-4 p-4 rounded-lg border bg-card">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
                    {patrimoineParPersonne.spouseFirstName}
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(patrimoineParPersonne.spouseValue)}
                  </p>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <div>Actifs : {formatCurrency(patrimoineParPersonne.spouseActifs)}</div>
                    {patrimoineParPersonne.spouseOwnValue > 0 && <div className="ml-4">• Biens propres : {formatCurrency(patrimoineParPersonne.spouseOwnValue)}</div>}
                    {patrimoineParPersonne.spouseSharedValue > 0 && <div className="ml-4">• Part biens communs : {formatCurrency(patrimoineParPersonne.spouseSharedValue)}</div>}
                    {patrimoineParPersonne.spousePassifs > 0 && <div className="text-destructive">Passifs : {formatCurrency(patrimoineParPersonne.spousePassifs)}</div>}
                  </div>
                </div>
              </div>
            )}

            {/* Progress bars */}
            <div className="space-y-2 pt-2">
              <div className="space-y-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{patrimoineParPersonne.userFirstName}</span>
                  <span className="font-medium">
                    {patrimoineParPersonne.totalValue > 0 ? Math.round(patrimoineParPersonne.userValue / patrimoineParPersonne.totalValue * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-2 bg-primary transition-all duration-500 ease-out rounded-full" 
                    style={{
                      width: `${patrimoineParPersonne.totalValue > 0 ? patrimoineParPersonne.userValue / patrimoineParPersonne.totalValue * 100 : 0}%`
                    }} 
                  />
                </div>
              </div>

              {patrimoineParPersonne.showSpouse && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{patrimoineParPersonne.spouseFirstName}</span>
                    <span className="font-medium">
                      {patrimoineParPersonne.totalValue > 0 ? Math.round(patrimoineParPersonne.spouseValue / patrimoineParPersonne.totalValue * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-2 bg-primary transition-all duration-500 ease-out rounded-full" 
                      style={{
                        width: `${patrimoineParPersonne.totalValue > 0 ? patrimoineParPersonne.spouseValue / patrimoineParPersonne.totalValue * 100 : 0}%`
                      }} 
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Plus-values card */}
        <div 
          onClick={onNavigateToPlusValues} 
          className={onNavigateToPlusValues ? 'cursor-pointer transition-transform hover:scale-[1.01]' : ''}
        >
          <PlusValuesCard plusValuesSummary={plusValuesSummary} />
        </div>

        {/* Objectifs */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Objectifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="p-3 rounded-full bg-muted mb-3">
                <Target className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">
                Définissez vos objectifs patrimoniaux
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Fonctionnalité à venir
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
