import React, { useState } from 'react';
import { useModuleSubNav } from '@/hooks/useModuleSubNav';
import { BudgetResume } from '@/components/budget/BudgetResume';
import { BudgetRevenus } from '@/components/budget/BudgetRevenus';
import { BudgetCharges } from '@/components/budget/BudgetCharges';
import { Wallet } from 'lucide-react';
import { WorkspaceHeader } from '@/components/layout/workspace-panel';

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

  const tabLabel = TABS.find(t => t.id === activeTab)?.label ?? 'Résumé';

  // Bascule Mensuel / Annuel portée par la barre d'en-tête, à angles 2 px comme les boutons des panneaux.
  const periodToggle = (
    <div className="inline-flex h-8 items-center rounded-[2px] border border-border p-0.5">
      {([
        { mode: 'mensuel', label: 'Mensuel' },
        { mode: 'annuel', label: 'Annuel' },
      ] as const).map(({ mode, label }) => (
        <button
          key={mode}
          type="button"
          aria-pressed={displayMode === mode}
          onClick={() => setDisplayMode(mode)}
          className={`h-full rounded-[1px] px-3 text-[12.5px] font-medium transition-colors ${
            displayMode === mode ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  // Cadre « panneau de travail », sur le modèle de Patrimoine et Famille : barre d'en-tête
  // (fil d'Ariane + bascule de période), titre 24 px et rappel, puis le contenu bord à bord sous un filet.
  return (
    <div className="workspace-panel -mx-4 -mt-3 md:-m-6">
      <WorkspaceHeader icon={<Wallet strokeWidth={1.75} />} trail={['Budget', tabLabel]} actions={periodToggle} />

      <div className="px-8 pt-6 pb-4">
        <h1 className="text-[24px] font-medium leading-tight tracking-[-0.02em]">{tabLabel}</h1>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          Montants {displayMode === 'mensuel' ? 'mensuels' : 'annuels'}, lignes actives à date
        </p>
      </div>

      <div className="border-t border-border">{renderContent()}</div>
    </div>
  );
};
