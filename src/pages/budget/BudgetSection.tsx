import React, { useState } from 'react';
import AnimatedBackground from '@/components/ui/animated-tabs';
import { BudgetResume } from '@/components/budget/BudgetResume';
import { BudgetRevenus } from '@/components/budget/BudgetRevenus';
import { BudgetCharges } from '@/components/budget/BudgetCharges';

export const BudgetSection = () => {
  const [activeTab, setActiveTab] = useState('resume');

  const TABS = [
    { id: 'resume', label: 'Résumé' },
    { id: 'revenus', label: 'Revenus' },
    { id: 'charges', label: 'Charges' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'resume':
        return <BudgetResume />;
      case 'revenus':
        return <BudgetRevenus />;
      case 'charges':
        return <BudgetCharges />;
      default:
        return <BudgetResume />;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Budget</h2>
          <p className="text-muted-foreground">
            Contrôlez vos revenus, dépenses et objectifs financiers
          </p>
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