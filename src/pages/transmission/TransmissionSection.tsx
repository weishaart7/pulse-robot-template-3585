import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Synthese } from '@/components/transmission/Synthese';
import { Liberalites } from '@/components/transmission/Liberalites';
import { FiscalDiagnosticButton } from '@/components/transmission/FiscalDiagnosticButton';
import { PremierDeces } from '@/components/transmission/PremierDeces';
import { DeuxiemeDeces } from '@/components/transmission/DeuxiemeDeces';

export const TransmissionSection = () => {
  const [activeTab, setActiveTab] = useState('synthese');

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Transmission</h2>
            <p className="text-muted-foreground">
              Planifiez et optimisez la transmission de votre patrimoine
            </p>
          </div>
          <FiscalDiagnosticButton />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList variant="line" className="w-full">
          <TabsTrigger value="synthese">Synthèse</TabsTrigger>
          <TabsTrigger value="liberalites">Libéralités</TabsTrigger>
          <TabsTrigger value="premier-deces">1er Décès</TabsTrigger>
          <TabsTrigger value="deuxieme-deces">2ème Décès</TabsTrigger>
        </TabsList>

        <TabsContent value="synthese" className="mt-6">
          <Synthese />
        </TabsContent>

        <TabsContent value="liberalites" className="mt-6">
          <Liberalites />
        </TabsContent>

        <TabsContent value="premier-deces" className="mt-6">
          <PremierDeces />
        </TabsContent>

        <TabsContent value="deuxieme-deces" className="mt-6">
          <DeuxiemeDeces />
        </TabsContent>
      </Tabs>
    </div>
  );
};