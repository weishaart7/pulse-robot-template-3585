import React, { useState } from 'react';
import { THEME_INK } from '@/lib/theme';
import { useModuleSubNav } from '@/hooks/useModuleSubNav';
import { BudgetResume } from '@/components/budget/BudgetResume';
import { BudgetRevenus } from '@/components/budget/BudgetRevenus';
import { BudgetCharges } from '@/components/budget/BudgetCharges';
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

  useModuleSubNav(TABS, activeTab, setActiveTab);

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
      <div className="mb-6 flex items-center justify-end">
        <div className="flex items-center gap-1 rounded-full border border-border/60 bg-card p-1 shadow-sm">
          {([
            { mode: 'mensuel', label: 'Mensuel', Icon: Calendar },
            { mode: 'annuel', label: 'Annuel', Icon: CalendarDays },
          ] as const).map(({ mode, label, Icon }) => (
            <button
              key={mode}
              onClick={() => setDisplayMode(mode)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                displayMode === mode
                  ? 'bg-foreground text-background shadow-whisper'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {renderContent()}
    </div>
  );
};