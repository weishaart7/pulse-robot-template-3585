import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const BudgetResume = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Résumé du Budget</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Cette section sera développée prochainement pour afficher un résumé complet de votre budget.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};