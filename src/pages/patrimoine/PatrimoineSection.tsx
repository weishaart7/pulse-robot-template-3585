import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useModuleSubNav } from '@/hooks/useModuleSubNav';
import { PatrimoineResume } from '@/components/patrimoine/PatrimoineResume';
import { PatrimoineActifs } from '@/components/patrimoine/PatrimoineActifs';
import { PatrimoinePassifs } from '@/components/patrimoine/PatrimoinePassifs';
import { PatrimoinePlusValues } from '@/components/patrimoine/PatrimoinePlusValues';
import { PatrimoineParTeteDetail } from '@/components/patrimoine/PatrimoineParTeteDetail';

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

  const [showPlusValuesDetail, setShowPlusValuesDetail] = useState(false);
  const [showParTeteDetail, setShowParTeteDetail] = useState(false);

  const TABS = [
    { id: 'resume', label: 'Résumé' },
    { id: 'actifs', label: 'Actifs' },
    { id: 'passifs', label: 'Passifs' }
  ];

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setShowPlusValuesDetail(false);
    setShowParTeteDetail(false);
  };

  useModuleSubNav(TABS, activeTab, handleTabChange);

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

  // Chaque vue (onglets, détails plus-values / par tête) porte son propre cadre
  // (PatrimoinePanel, bandeau des actifs incomplets compris).
  return renderContent();
};
