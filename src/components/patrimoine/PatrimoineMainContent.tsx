import React, { useState } from 'react';
import { Asset } from '@/services/assetService';
import { PatrimoineChart } from './PatrimoineChart';
import { PatrimoineTable } from './PatrimoineTable';
import { PatrimoineTreeView } from './PatrimoineTreeView';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus } from 'lucide-react';

interface PatrimoineMainContentProps {
  assets: Asset[];
  selectedCategory: string | null;
  onAssetEdit: (asset: Asset) => void;
  onAddAsset: () => void;
}

export const PatrimoineMainContent = ({ 
  assets, 
  selectedCategory, 
  onAssetEdit, 
  onAddAsset 
}: PatrimoineMainContentProps) => {
  const [activeTab, setActiveTab] = useState<'actifs' | 'passifs'>('actifs');
  
  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Section Actifs/Passifs */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'actifs' | 'passifs')}>
              <TabsList>
                <TabsTrigger value="actifs">Actifs</TabsTrigger>
                <TabsTrigger value="passifs">Passifs</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={onAddAsset} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Ajouter un actif
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab}>
            <TabsContent value="actifs" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Graphique circulaire */}
                <div>
                  <PatrimoineChart 
                    assets={assets} 
                    selectedCategory={selectedCategory}
                  />
                </div>
                
                {/* Tableau interactif */}
                <div>
                  <PatrimoineTable 
                    assets={assets} 
                    selectedCategory={selectedCategory}
                    onAssetEdit={onAssetEdit}
                  />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="passifs" className="mt-0">
              <div className="text-center py-8 text-muted-foreground">
                Les passifs seront affichés ici (crédits, dettes, etc.)
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Vue en arbre détaillée */}
      <Card>
        <CardHeader>
          <CardTitle>Vue détaillée par catégories</CardTitle>
        </CardHeader>
        <CardContent>
          <PatrimoineTreeView 
            assets={assets}
            onAssetEdit={onAssetEdit}
          />
        </CardContent>
      </Card>
    </div>
  );
};