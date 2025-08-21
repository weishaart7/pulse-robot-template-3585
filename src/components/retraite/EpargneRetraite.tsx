import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const EpargneRetraite = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Épargne retraite</CardTitle>
          <CardDescription>
            Gérez votre épargne et vos placements retraite
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Cette section sera bientôt disponible pour gérer votre épargne retraite (PER, assurance vie, etc.).
          </p>
        </CardContent>
      </Card>
    </div>
  );
};