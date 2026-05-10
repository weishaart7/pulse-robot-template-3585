import React, { useState } from 'react';
import AnimatedBackground from '@/components/ui/animated-tabs';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { DerniersAjouts } from './components/DerniersAjouts';
import { Roadmap } from './components/Roadmap';

const NouveautesSection = () => {
  const [activeTab, setActiveTab] = useState('derniers-ajouts');

  const TABS = [
    { id: 'derniers-ajouts', label: 'Derniers ajouts' },
    { id: 'roadmap', label: 'Roadmap' }
  ];

  const renderContent = () => {
    if (activeTab === 'derniers-ajouts') {
      return <DerniersAjouts />;
    }
    
    if (activeTab === 'roadmap') {
      return <Roadmap />;
    }
    
    return null;
  };

  return (
    <div className="flex bg-background w-full h-screen overflow-hidden">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col">
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 rounded-tl-xl" style={{ backgroundColor: '#f6f5f6' }}>
          <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Nouveautés</h2>
        <p className="text-muted-foreground">
          Découvrez les dernières fonctionnalités et notre feuille de route
        </p>
      </div>

      <div className="mb-6 flex justify-start">
        <div className="rounded-[8px] bg-muted p-[2px]">
          <AnimatedBackground
            defaultValue="derniers-ajouts"
            onValueChange={(value) => setActiveTab(value || 'derniers-ajouts')}
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
        </main>
      </div>
    </div>
  );
};

export default NouveautesSection;
