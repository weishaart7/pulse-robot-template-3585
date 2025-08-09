import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const DeuxiemeDeces = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>2ème Décès</CardTitle>
          <CardDescription>
            Simulation et planification du second décès
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🚧</div>
            <h3 className="text-lg font-semibold mb-2">Section à venir</h3>
            <p className="text-muted-foreground">
              Cette section permettra de simuler les conséquences du second décès 
              et d'optimiser la transmission finale du patrimoine aux héritiers.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};