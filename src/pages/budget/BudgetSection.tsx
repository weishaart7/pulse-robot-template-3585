import React, { useState } from 'react';
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

export type DisplayMode = 'annuel' | 'mensuel';
export type PersonFilter = 'couple' | 'utilisateur' | 'conjoint';

export const BudgetSection = () => {
  const [activeTab, setActiveTab] = useState('resume');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('annuel');
  const [personFilter, setPersonFilter] = useState<PersonFilter>('couple');

  const TABS = [
    { id: 'resume', label: 'Résumé' },
    { id: 'revenus', label: 'Revenus' },
    { id: 'charges', label: 'Charges' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'resume':
        return <BudgetResume displayMode={displayMode} personFilter={personFilter} />;
      case 'revenus':
        return <BudgetRevenus displayMode={displayMode} personFilter={personFilter} />;
      case 'charges':
        return <BudgetCharges displayMode={displayMode} personFilter={personFilter} />;
      default:
        return <BudgetResume displayMode={displayMode} personFilter={personFilter} />;
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
        <div className="flex items-center gap-3">
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
          <Select value={personFilter} onValueChange={(value: PersonFilter) => setPersonFilter(value)}>
            <SelectTrigger className="w-[160px] bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="couple">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Couple
                </span>
              </SelectItem>
              <SelectItem value="utilisateur">
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Utilisateur
                </span>
              </SelectItem>
              <SelectItem value="conjoint">
                <span className="flex items-center gap-2">
                  <UserRound className="h-4 w-4" />
                  Conjoint
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
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