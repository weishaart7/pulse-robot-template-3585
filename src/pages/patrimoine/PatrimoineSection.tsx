import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AnimatedBackground from '@/components/ui/animated-tabs';
import { PatrimoineResume } from '@/components/patrimoine/PatrimoineResume';
import { PatrimoineActifs } from '@/components/patrimoine/PatrimoineActifs';
import { PatrimoinePassifs } from '@/components/patrimoine/PatrimoinePassifs';
import { useAssets } from '@/hooks/useAssets';

export const PatrimoineSection = () => {
  const [activeTab, setActiveTab] = useState('resume');
  const { assets } = useAssets();

  const TABS = [
    { id: 'resume', label: 'Résumé' },
    { id: 'actifs', label: 'Actifs' },
    { id: 'passifs', label: 'Passifs' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'resume':
        return <PatrimoineResume />;
      case 'actifs':
        return <PatrimoineActifs />;
      case 'passifs':
        return <PatrimoinePassifs />;
      default:
        return <PatrimoineResume />;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Patrimoine</h2>
          <p className="text-muted-foreground">
            Gérez vos actifs et passifs patrimoniaux
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