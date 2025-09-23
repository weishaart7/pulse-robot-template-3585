import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const AssuranceVie = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Assurance-vie</CardTitle>
          <CardDescription>
            Gestion et optimisation des contrats d'assurance-vie
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🚧</div>
            <h3 className="text-lg font-semibold mb-2">Section à venir</h3>
            <p className="text-muted-foreground">
              Cette section permettra de gérer vos contrats d'assurance-vie 
              et d'optimiser leur transmission fiscale.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};