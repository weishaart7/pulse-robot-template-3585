import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const Trimestres = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Trimestres</CardTitle>
          <CardDescription>
            Contenu à venir
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Cette section sera développée prochainement
          </p>
        </CardContent>
      </Card>
    </div>
  );
};