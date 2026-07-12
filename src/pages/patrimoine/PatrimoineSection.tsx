import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { THEME_INK } from '@/lib/theme';
import { PatrimoineResume } from '@/components/patrimoine/PatrimoineResume';
import { PatrimoineActifs } from '@/components/patrimoine/PatrimoineActifs';
import { PatrimoinePassifs } from '@/components/patrimoine/PatrimoinePassifs';
import { PatrimoinePlusValues } from '@/components/patrimoine/PatrimoinePlusValues';
import { IncompleteAssetsBanner } from '@/components/patrimoine/IncompleteAssetsBanner';
import { useAssets } from '@/hooks/useAssets';

export const PatrimoineSection = () => {
  const [activeTab, setActiveTab] = useState('resume');
  const { assets } = useAssets();

  const [showPlusValuesDetail, setShowPlusValuesDetail] = useState(false);

  const TABS = [
    { id: 'resume', label: 'Résumé' },
    { id: 'actifs', label: 'Actifs' },
    { id: 'passifs', label: 'Passifs' }
  ];

  const renderContent = () => {
    if (showPlusValuesDetail) {
      return <PatrimoinePlusValues onBack={() => setShowPlusValuesDetail(false)} />;
    }
    switch (activeTab) {
      case 'resume':
        return <PatrimoineResume onNavigateToPlusValues={() => setShowPlusValuesDetail(true)} />;
      case 'actifs':
        return <PatrimoineActifs />;
      case 'passifs':
        return <PatrimoinePassifs />;
      default:
        return <PatrimoineResume onNavigateToPlusValues={() => setShowPlusValuesDetail(true)} />;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div>
          <h1 className="text-[34px] font-bold" style={{ color: THEME_INK, letterSpacing: '-0.02em' }}>Patrimoine</h1>
        </div>
      </div>

      <div className="mb-6 flex justify-start">
        <SegmentedTabs
          tabs={TABS}
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value);
            setShowPlusValuesDetail(false);
          }}
        />
      </div>

      {!showPlusValuesDetail && <IncompleteAssetsBanner assets={assets} />}

      <div className="mt-6">
        {renderContent()}
      </div>
    </div>
  );
};