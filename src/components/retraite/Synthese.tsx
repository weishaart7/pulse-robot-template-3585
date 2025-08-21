import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const Synthese = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Synthèse retraite</CardTitle>
          <CardDescription>
            Vue d'ensemble de votre situation retraite
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Cette section sera bientôt disponible avec un récapitulatif de votre situation retraite.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};