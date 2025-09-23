import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const ProcessusCalcul = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Processus de calcul</CardTitle>
          <CardDescription>
            Méthodologie et calculs de transmission
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🚧</div>
            <h3 className="text-lg font-semibold mb-2">Section à venir</h3>
            <p className="text-muted-foreground">
              Cette section détaillera les processus de calcul 
              pour l'optimisation de la transmission patrimoniale.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};