import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Synthese } from '@/components/transmission/Synthese';
import { Liberalites } from '@/components/transmission/Liberalites';
import { PremierDeces } from '@/components/transmission/PremierDeces';
import { DeuxiemeDeces } from '@/components/transmission/DeuxiemeDeces';

export const TransmissionSection = () => {
  const [activeTab, setActiveTab] = useState('synthese');

  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transmission</h1>
          <p className="text-muted-foreground">
            Planifiez et optimisez la transmission de votre patrimoine
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="synthese">Synthèse</TabsTrigger>
            <TabsTrigger value="liberalites">Libéralités</TabsTrigger>
            <TabsTrigger value="premier-deces">1er Décès</TabsTrigger>
            <TabsTrigger value="deuxieme-deces">2ème Décès</TabsTrigger>
          </TabsList>

          <TabsContent value="synthese" className="space-y-6">
            <Synthese />
          </TabsContent>

          <TabsContent value="liberalites" className="space-y-6">
            <Liberalites />
          </TabsContent>

          <TabsContent value="premier-deces" className="space-y-6">
            <PremierDeces />
          </TabsContent>

          <TabsContent value="deuxieme-deces" className="space-y-6">
            <DeuxiemeDeces />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};