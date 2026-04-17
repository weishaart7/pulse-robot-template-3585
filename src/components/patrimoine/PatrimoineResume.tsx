import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PatrimoineChart } from './PatrimoineChart';
import { PlusValuesCard } from './PlusValuesCard';
import { useAssets } from '@/hooks/useAssets';
import { usePassifs, useEmprunts } from '@/hooks/usePassifs';
import { useFamilyProfile, useMaritalStatus } from '@/hooks/useFamilyData';
import { usePatrimoineCalculations } from '@/hooks/usePatrimoineCalculations';
import { TrendingUp, TrendingDown, Wallet, User, Users, Target } from 'lucide-react';

interface PatrimoineResumeProps {
  onNavigateToPlusValues?: () => void;
  onNavigateToParTete?: () => void;
}

const StatCard = ({ 
  label, 
  subtitle, 
  value, 
  icon: Icon, 
  accentColor, 
  delay 
}: { 
  label: string; 
  subtitle: string; 
  value: string; 
  icon: React.ElementType; 
  accentColor: string; 
  delay: string;
}) => (
  <div 
    className="group relative rounded-2xl border border-border/60 bg-card overflow-hidden transition-all duration-500 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 animate-fade-in"
    style={{ animationDelay: delay }}
  >
    {/* Subtle gradient accent line */}
    <div className={`h-[3px] ${accentColor} opacity-80 group-hover:opacity-100 transition-opacity duration-300`} />
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[13px] font-medium text-muted-foreground tracking-wide">{label}</p>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">{subtitle}</p>
        </div>
        <div className={`h-10 w-10 rounded-xl ${accentColor.replace('bg-gradient-to-r', 'bg-gradient-to-br')} flex items-center justify-center opacity-90 group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="h-[18px] w-[18px] text-white" strokeWidth={1.5} />
        </div>
      </div>
      <p className="text-[28px] font-bold text-foreground tracking-tight leading-none">
        {value}
      </p>
    </div>
  </div>
);

export const PatrimoineResume = ({ onNavigateToPlusValues, onNavigateToParTete }: PatrimoineResumeProps) => {
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
      {/* Top summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard
          label="Actifs"
          subtitle="Total de vos actifs"
          value={formatCurrency(financialSummary.totalActifs)}
          icon={TrendingUp}
          accentColor="bg-gradient-to-r from-emerald-400 to-emerald-500"
          delay="0ms"
        />
        <StatCard
          label="Passifs"
          subtitle="Total de vos dettes"
          value={formatCurrency(financialSummary.totalPassifs)}
          icon={TrendingDown}
          accentColor="bg-gradient-to-r from-rose-400 to-rose-500"
          delay="60ms"
        />
        <StatCard
          label="Patrimoine net"
          subtitle="Actifs − Passifs"
          value={formatCurrency(financialSummary.patrimoineNet)}
          icon={Wallet}
          accentColor="bg-gradient-to-r from-primary to-primary/80"
          delay="120ms"
        />
      </div>

      {/* Chart section */}
      <Card className="border-border/60 shadow-none hover:shadow-sm transition-shadow duration-500 animate-fade-in" style={{ animationDelay: '180ms' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-[15px] font-semibold tracking-tight">Répartition du patrimoine</CardTitle>
        </CardHeader>
        <CardContent>
          <PatrimoineChart assets={assets} passifs={passifs} emprunts={emprunts} selectedCategory={null} />
        </CardContent>
      </Card>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patrimoine par tête */}
        <Card
          onClick={onNavigateToParTete}
          className={`border-border/60 shadow-none hover:shadow-sm transition-shadow duration-500 animate-fade-in ${onNavigateToParTete ? 'cursor-pointer hover:border-border' : ''}`}
          style={{ animationDelay: '240ms' }}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px] font-semibold tracking-tight">Patrimoine par tête</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <PersonCard
              icon={User}
              name={patrimoineParPersonne.userFirstName}
              value={formatCurrency(patrimoineParPersonne.userValue)}
              showDetails={patrimoineParPersonne.showSpouse}
              details={
                patrimoineParPersonne.showSpouse ? (
                  <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground/80">
                    <div>Actifs : {formatCurrency(patrimoineParPersonne.userActifs)}</div>
                    {patrimoineParPersonne.userOwnValue > 0 && <div className="ml-3 opacity-70">• Biens propres : {formatCurrency(patrimoineParPersonne.userOwnValue)}</div>}
                    {patrimoineParPersonne.userSharedValue > 0 && <div className="ml-3 opacity-70">• Part biens communs : {formatCurrency(patrimoineParPersonne.userSharedValue)}</div>}
                    {patrimoineParPersonne.userPassifs > 0 && <div className="text-destructive/80">Passifs : {formatCurrency(patrimoineParPersonne.userPassifs)}</div>}
                  </div>
                ) : null
              }
            />

            {patrimoineParPersonne.showSpouse && (
              <PersonCard
                icon={Users}
                name={patrimoineParPersonne.spouseFirstName}
                value={formatCurrency(patrimoineParPersonne.spouseValue)}
                showDetails
                details={
                  <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground/80">
                    <div>Actifs : {formatCurrency(patrimoineParPersonne.spouseActifs)}</div>
                    {patrimoineParPersonne.spouseOwnValue > 0 && <div className="ml-3 opacity-70">• Biens propres : {formatCurrency(patrimoineParPersonne.spouseOwnValue)}</div>}
                    {patrimoineParPersonne.spouseSharedValue > 0 && <div className="ml-3 opacity-70">• Part biens communs : {formatCurrency(patrimoineParPersonne.spouseSharedValue)}</div>}
                    {patrimoineParPersonne.spousePassifs > 0 && <div className="text-destructive/80">Passifs : {formatCurrency(patrimoineParPersonne.spousePassifs)}</div>}
                  </div>
                }
              />
            )}

            {/* Progress bars */}
            <div className="space-y-3 pt-3">
              <ProgressBar
                label={patrimoineParPersonne.userFirstName}
                value={patrimoineParPersonne.totalValue > 0 ? patrimoineParPersonne.userValue / patrimoineParPersonne.totalValue * 100 : 0}
              />
              {patrimoineParPersonne.showSpouse && (
                <ProgressBar
                  label={patrimoineParPersonne.spouseFirstName}
                  value={patrimoineParPersonne.totalValue > 0 ? patrimoineParPersonne.spouseValue / patrimoineParPersonne.totalValue * 100 : 0}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Plus-values card */}
        <div 
          onClick={onNavigateToPlusValues} 
          className={`${onNavigateToPlusValues ? 'cursor-pointer' : ''} animate-fade-in`}
          style={{ animationDelay: '300ms' }}
        >
          <PlusValuesCard plusValuesSummary={plusValuesSummary} />
        </div>

        {/* Objectifs */}
        <Card className="border-border/60 shadow-none hover:shadow-sm transition-shadow duration-500 animate-fade-in" style={{ animationDelay: '360ms' }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px] font-semibold tracking-tight">Objectifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="p-4 rounded-2xl bg-muted/50 mb-4 group-hover:bg-muted transition-colors">
                <Target className="h-6 w-6 text-muted-foreground/60" strokeWidth={1.5} />
              </div>
              <p className="text-muted-foreground/80 text-sm font-medium">
                Définissez vos objectifs patrimoniaux
              </p>
              <p className="text-[11px] text-muted-foreground/50 mt-1.5">
                Fonctionnalité à venir
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

/* Sub-components */

const PersonCard = ({ 
  icon: Icon, 
  name, 
  value, 
  showDetails, 
  details 
}: { 
  icon: React.ElementType; 
  name: string; 
  value: string; 
  showDetails?: boolean; 
  details?: React.ReactNode;
}) => (
  <div className="group flex items-start gap-3.5 p-4 rounded-xl border border-border/50 bg-card hover:border-border transition-all duration-300">
    <div className="p-2 rounded-xl bg-primary/5 group-hover:bg-primary/10 transition-colors duration-300">
      <Icon className="h-[18px] w-[18px] text-primary/70" strokeWidth={1.5} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
        {name}
      </p>
      <p className="text-xl font-bold text-foreground tracking-tight">
        {value}
      </p>
      {details}
    </div>
  </div>
);

const ProgressBar = ({ label, value }: { label: string; value: number }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between text-[11px]">
      <span className="text-muted-foreground/70">{label}</span>
      <span className="font-semibold text-foreground/80">{Math.round(value)}%</span>
    </div>
    <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
      <div 
        className="h-1.5 bg-primary/70 rounded-full transition-all duration-700 ease-out" 
        style={{ width: `${value}%` }} 
      />
    </div>
  </div>
);
