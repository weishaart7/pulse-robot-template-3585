import React, { useState } from 'react';
import AnimatedBackground from '@/components/ui/animated-tabs';
import { SocietesSynthese } from '@/components/societes/SocietesSynthese';
import { SocietesStrategies } from '@/components/societes/SocietesStrategies';

export const SocietesSection = () => {
  const [activeTab, setActiveTab] = useState('synthese');

  const TABS = [
    { id: 'synthese', label: 'Synthèse' },
    { id: 'strategies', label: 'Stratégies' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'synthese':
        return <SocietesSynthese />;
      case 'strategies':
        return <SocietesStrategies />;
      default:
        return <SocietesSynthese />;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sociétés</h2>
          <p className="text-muted-foreground">
            Administrez vos participations et structures sociétaires
          </p>
        </div>
      </div>

      <div className="mb-6 flex justify-center">
        <div className="rounded-[8px] bg-muted p-[2px]">
          <AnimatedBackground
            defaultValue="synthese"
            onValueChange={(value) => setActiveTab(value || 'synthese')}
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