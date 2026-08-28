import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { THEME_INK } from '@/lib/theme';
import { PatrimoineResume } from '@/components/patrimoine/PatrimoineResume';
import { PatrimoineActifs } from '@/components/patrimoine/PatrimoineActifs';
import { PatrimoinePassifs } from '@/components/patrimoine/PatrimoinePassifs';
import { PatrimoinePlusValues } from '@/components/patrimoine/PatrimoinePlusValues';
import { PatrimoineParTeteDetail } from '@/components/patrimoine/PatrimoineParTeteDetail';
import { IncompleteAssetsBanner } from '@/components/patrimoine/IncompleteAssetsBanner';
import { AssetDetailsDialog } from '@/components/patrimoine/AssetDetailsDialog';
import { useAssets } from '@/hooks/useAssets';
import { Asset } from '@/services/assetService';

const VALID_TABS = ['resume', 'actifs', 'passifs'];

export const PatrimoineSection = () => {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(VALID_TABS.includes(tabParam || '') ? tabParam! : 'resume');

  // Cf. TransmissionSection.tsx : une navigation "?tab=..." vers cette section
  // déjà montée (sans changement de :section) ne rejouerait pas l'initialisation
  // de useState seul — resynchronise l'onglet affiché sur l'URL.
  useEffect(() => {
    if (tabParam && VALID_TABS.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const { assets } = useAssets();

  const [showPlusValuesDetail, setShowPlusValuesDetail] = useState(false);
  const [showParTeteDetail, setShowParTeteDetail] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const TABS = [
    { id: 'resume', label: 'Résumé' },
    { id: 'actifs', label: 'Actifs' },
    { id: 'passifs', label: 'Passifs' }
  ];

  const renderContent = () => {
    if (showPlusValuesDetail) {
      return <PatrimoinePlusValues onBack={() => setShowPlusValuesDetail(false)} />;
    }
    if (showParTeteDetail) {
      return <PatrimoineParTeteDetail onBack={() => setShowParTeteDetail(false)} />;
    }
    switch (activeTab) {
      case 'resume':
        return (
          <PatrimoineResume
            onNavigateToPlusValues={() => setShowPlusValuesDetail(true)}
            onNavigateToParTete={() => setShowParTeteDetail(true)}
          />
        );
      case 'actifs':
        return <PatrimoineActifs />;
      case 'passifs':
        return <PatrimoinePassifs />;
      default:
        return (
          <PatrimoineResume
            onNavigateToPlusValues={() => setShowPlusValuesDetail(true)}
            onNavigateToParTete={() => setShowParTeteDetail(true)}
          />
        );
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
            setShowParTeteDetail(false);
          }}
        />
      </div>

      {!showPlusValuesDetail && !showParTeteDetail && (
        <IncompleteAssetsBanner assets={assets} onAssetClick={setSelectedAsset} />
      )}

      <div className="mt-6">
        {renderContent()}
      </div>

      <AssetDetailsDialog
        asset={selectedAsset}
        open={!!selectedAsset}
        onOpenChange={(open) => { if (!open) setSelectedAsset(null); }}
      />
    </div>
  );
};