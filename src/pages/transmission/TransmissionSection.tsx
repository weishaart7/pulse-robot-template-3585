import React, { useState } from 'react';
import AnimatedBackground from '@/components/ui/animated-tabs';
import { Synthese } from '@/components/transmission/Synthese';
import { Liberalites } from '@/components/transmission/Liberalites';
import { PremierDeces } from '@/components/transmission/PremierDeces';
import { DeuxiemeDeces } from '@/components/transmission/DeuxiemeDeces';

export const TransmissionSection = () => {
  const [activeTab, setActiveTab] = useState('synthese');

  const TABS = [
    { id: 'synthese', label: 'Synthèse' },
    { id: 'liberalites', label: 'Libéralités' },
    { id: 'premier-deces', label: '1er Décès' },
    { id: 'deuxieme-deces', label: '2ème Décès' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'synthese':
        return <Synthese />;
      case 'liberalites':
        return <Liberalites />;
      case 'premier-deces':
        return <PremierDeces />;
      case 'deuxieme-deces':
        return <DeuxiemeDeces />;
      default:
        return <Synthese />;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Transmission</h2>
          <p className="text-muted-foreground">
            Planifiez et optimisez la transmission de votre patrimoine
          </p>
        </div>
      </div>

      <div className="mb-6 flex justify-start">
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