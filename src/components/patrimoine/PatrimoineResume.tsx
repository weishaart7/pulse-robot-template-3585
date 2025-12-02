import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PatrimoineChart } from './PatrimoineChart';
import { PlusValuesCard } from './PlusValuesCard';
import { useAssets } from '@/hooks/useAssets';
import { usePassifs, useEmprunts } from '@/hooks/usePassifs';
import { useFamilyProfile, useMaritalStatus } from '@/hooks/useFamilyData';
import { usePatrimoineCalculations } from '@/hooks/usePatrimoineCalculations';
import { TrendingUp, TrendingDown, Wallet, User, Users, Target } from 'lucide-react';

export const PatrimoineResume = () => {
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
    <div className="space-y-6">
      {/* Carte Répartition avec graphique et synthèse */}
      <Card>
        <CardHeader>
          <CardTitle>Répartition du patrimoine</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Graphique à gauche */}
            <div>
              <PatrimoineChart assets={assets} passifs={passifs} emprunts={emprunts} selectedCategory={null} />
            </div>

            {/* Synthèse à droite */}
            <div className="flex flex-col justify-center space-y-4">
              <div className="flex items-center gap-4 p-5 rounded-lg border bg-card hover:border-muted-foreground/20 transition-colors duration-200">
                <div className="p-2.5 rounded-lg bg-muted">
                  <TrendingUp className="h-5 w-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Actifs</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(financialSummary.totalActifs)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-5 rounded-lg border bg-card hover:border-muted-foreground/20 transition-colors duration-200">
                <div className="p-2.5 rounded-lg bg-muted">
                  <TrendingDown className="h-5 w-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Passifs</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(financialSummary.totalPassifs)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-5 rounded-lg border-2 border-primary/10 bg-card hover:border-primary/30 transition-colors duration-200">
                <div className="p-2.5 rounded-lg bg-primary/10">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Patrimoine net</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(financialSummary.patrimoineNet)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ligne avec trois cartes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Carte Patrimoine par tête */}
        <Card>
          <CardHeader>
            <CardTitle>Patrimoine par tête</CardTitle>
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

            {/* Graphique à barres */}
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

        {/* Carte Plus-values */}
        <PlusValuesCard plusValuesSummary={plusValuesSummary} />

        {/* Carte Objectifs */}
        <Card>
          <CardHeader>
            <CardTitle>Objectifs</CardTitle>
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
