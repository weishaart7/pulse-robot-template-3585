import React, { useState, useEffect } from 'react';
import AnimatedBackground from '@/components/ui/animated-tabs';
import { BudgetResume } from '@/components/budget/BudgetResume';
import { BudgetRevenus } from '@/components/budget/BudgetRevenus';
import { BudgetCharges } from '@/components/budget/BudgetCharges';
import { Button } from '@/components/ui/button';
import { Calendar, CalendarDays, Users, User, UserRound } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFamilyProfile, useMaritalStatus } from '@/hooks/useFamilyData';

export type DisplayMode = 'annuel' | 'mensuel';
export type PersonFilter = 'couple' | 'utilisateur' | 'conjoint';

export interface PersonNames {
  userFullName: string;
  partnerFullName: string;
}

export const BudgetSection = () => {
  const [activeTab, setActiveTab] = useState('resume');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('mensuel');
  const [personFilter, setPersonFilter] = useState<PersonFilter>('couple');

  const { data: familyProfile } = useFamilyProfile();
  const { data: maritalStatus, loading: maritalLoading } = useMaritalStatus();

  // Déterminer si l'utilisateur est en couple (si un conjoint est renseigné)
  const isInCouple = !!(maritalStatus?.prenom_conjoint || maritalStatus?.nom_conjoint);

  // Noms complets pour le filtrage (format utilisé dans la BDD)
  const userFullName = [familyProfile?.prenom, familyProfile?.nom].filter(Boolean).join(' ').trim();
  const partnerFullName = [maritalStatus?.prenom_conjoint, maritalStatus?.nom_conjoint].filter(Boolean).join(' ').trim();
  
  // Prénoms pour l'affichage
  const userFirstName = familyProfile?.prenom || 'Utilisateur';
  const partnerFirstName = maritalStatus?.prenom_conjoint || 'Conjoint';

  const personNames: PersonNames = {
    userFullName,
    partnerFullName
  };

  // Si célibataire (et données chargées), forcer le filtre sur l'utilisateur
  useEffect(() => {
    // Attendre que les données soient chargées avant de modifier le filtre
    if (maritalLoading) return;
    
    if (!isInCouple && personFilter !== 'utilisateur') {
      setPersonFilter('utilisateur');
    }
  }, [isInCouple, personFilter, maritalLoading]);

  const TABS = [
    { id: 'resume', label: 'Résumé' },
    { id: 'revenus', label: 'Revenus' },
    { id: 'charges', label: 'Charges' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'resume':
        return <BudgetResume displayMode={displayMode} personFilter={personFilter} personNames={personNames} />;
      case 'revenus':
        return <BudgetRevenus displayMode={displayMode} personFilter={personFilter} personNames={personNames} />;
      case 'charges':
        return <BudgetCharges displayMode={displayMode} personFilter={personFilter} personNames={personNames} />;
      default:
        return <BudgetResume displayMode={displayMode} personFilter={personFilter} personNames={personNames} />;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Budget</h2>
          <p className="text-muted-foreground">
            Contrôlez vos revenus, dépenses et objectifs financiers
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            <Button
              variant={displayMode === 'mensuel' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDisplayMode('mensuel')}
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              Mensuel
            </Button>
            <Button
              variant={displayMode === 'annuel' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDisplayMode('annuel')}
              className="gap-2"
            >
              <CalendarDays className="h-4 w-4" />
              Annuel
            </Button>
          </div>
          
          {isInCouple ? (
            <Select value={personFilter} onValueChange={(value: PersonFilter) => setPersonFilter(value)}>
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="couple">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {userFirstName} & {partnerFirstName}
                  </span>
                </SelectItem>
                <SelectItem value="utilisateur">
                  <span className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {userFirstName}
                  </span>
                </SelectItem>
                <SelectItem value="conjoint">
                  <span className="flex items-center gap-2">
                    <UserRound className="h-4 w-4" />
                    {partnerFirstName}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground px-3 py-1.5 bg-muted rounded-md">
              <User className="h-4 w-4" />
              {userFirstName}
            </div>
          )}
        </div>
      </div>

      <div className="mb-6 flex justify-start">
        <div className="rounded-[8px] bg-muted p-[2px]">
          <AnimatedBackground
            defaultValue="resume"
            onValueChange={(value) => setActiveTab(value || 'resume')}
            className="rounded-lg bg-background shadow-sm"
            transition={{
              ease: "easeInOut",
              duration: 0.2,
            }}
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                data-id={tab.id}
                type="button"
                className="inline-flex min-w-24 items-center justify-center px-3 py-2 text-sm font-medium text-foreground transition-transform active:scale-[0.98]"
              >
                {tab.label}
              </button>
            ))}
          </AnimatedBackground>
        </div>
      </div>

      <div className="mt-6">
        {renderContent()}
      </div>
    </div>
  );
};
