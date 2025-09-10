import React, { useState } from 'react';
import { InvestmentSidebar } from '@/components/investment/InvestmentSidebar';
import { InvestmentHeader } from '@/components/investment/InvestmentHeader';
import { InvestmentDashboard } from '@/components/investment/InvestmentDashboard';

const InvestmentPlatform = () => {
  const [activeSection, setActiveSection] = useState('tableau-de-bord');

  const renderContent = () => {
    switch (activeSection) {
      case 'tableau-de-bord':
        return <InvestmentDashboard />;
      default:
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-foreground mb-4">
              {activeSection.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </h1>
            <p className="text-muted-foreground">Contenu à venir...</p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <InvestmentSidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
      />
      <div className="flex-1 flex flex-col">
        <InvestmentHeader />
        <main className="flex-1 overflow-y-auto bg-muted/30">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default InvestmentPlatform;