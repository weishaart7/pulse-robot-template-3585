import React, { useState } from 'react';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { THEME_INK } from '@/lib/theme';
import { Synthese } from '@/components/retraite/Synthese';
import { Carriere } from '@/components/retraite/Carriere';
import { EpargneRetraite } from '@/components/retraite/EpargneRetraite';
import { Trimestres } from '@/components/retraite/Trimestres';

export const RetraiteSection = () => {
  const [activeTab, setActiveTab] = useState('synthese');

  const TABS = [
    { id: 'synthese', label: 'Synthèse' },
    { id: 'carriere', label: 'Carrière' },
    { id: 'epargne', label: 'Épargne retraite' },
    { id: 'optimisation', label: 'Optimisation' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'synthese':
        return <Synthese />;
      case 'carriere':
        return <Carriere />;
      case 'epargne':
        return <EpargneRetraite />;
      case 'optimisation':
        return <Trimestres />;
      default:
        return <Synthese />;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div>
          <h1 className="text-[34px] font-bold" style={{ color: THEME_INK, letterSpacing: '-0.02em' }}>Retraite</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Planifiez et optimisez votre retraite
          </p>
        </div>
      </div>

      <div className="mb-8 flex justify-start">
        <SegmentedTabs tabs={TABS} value={activeTab} onValueChange={setActiveTab} />
      </div>

      <div className="mt-6">
        {renderContent()}
      </div>
    </div>
  );
};