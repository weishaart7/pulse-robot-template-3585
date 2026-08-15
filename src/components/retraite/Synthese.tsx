import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const Synthese = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="p-5">
          <CardTitle className="text-[15px] font-semibold tracking-tight">Synthèse retraite</CardTitle>
          <CardDescription className="text-xs">
            Vue d'ensemble de votre situation retraite
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <p className="text-xs text-muted-foreground">
            Cette section sera bientôt disponible avec un récapitulatif de votre situation retraite.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};