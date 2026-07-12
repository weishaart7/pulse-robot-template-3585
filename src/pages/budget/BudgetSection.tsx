import React, { useState } from 'react';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { THEME_INK } from '@/lib/theme';
import { BudgetResume } from '@/components/budget/BudgetResume';
import { BudgetRevenus } from '@/components/budget/BudgetRevenus';
import { BudgetCharges } from '@/components/budget/BudgetCharges';
import { Button } from '@/components/ui/button';
import { Calendar, CalendarDays } from 'lucide-react';

export type DisplayMode = 'annuel' | 'mensuel';

export const BudgetSection = () => {
  const [activeTab, setActiveTab] = useState('resume');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('mensuel');

  const TABS = [
    { id: 'resume', label: 'Résumé' },
    { id: 'revenus', label: 'Revenus' },
    { id: 'charges', label: 'Charges' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'resume':
        return <BudgetResume displayMode={displayMode} />;
      case 'revenus':
        return <BudgetRevenus displayMode={displayMode} />;
      case 'charges':
        return <BudgetCharges displayMode={displayMode} />;
      default:
        return <BudgetResume displayMode={displayMode} />;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div>
          <h1 className="text-[34px] font-bold" style={{ color: THEME_INK, letterSpacing: '-0.02em' }}>Budget</h1>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <SegmentedTabs tabs={TABS} value={activeTab} onValueChange={setActiveTab} />
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
      </div>

      {renderContent()}
    </div>
  );
};