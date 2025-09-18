import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PatrimoineChart } from './PatrimoineChart';
import { useAssets } from '@/hooks/useAssets';

export const PatrimoineResume = () => {
  const { assets } = useAssets();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Répartition du patrimoine</CardTitle>
        </CardHeader>
        <CardContent>
          <PatrimoineChart 
            assets={assets} 
            selectedCategory={null}
          />
        </CardContent>
      </Card>
    </div>
  );
};