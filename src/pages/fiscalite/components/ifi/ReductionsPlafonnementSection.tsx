import React from 'react';
import { Calculator } from 'lucide-react';

const ReductionsPlafonnementSection = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Calculator className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-semibold">Réduction & Plafonnement de l'IFI</h2>
      </div>

      <div className="text-center py-12">
        <p className="text-muted-foreground">Cette section sera développée prochainement.</p>
      </div>
    </div>
  );
};

export default ReductionsPlafonnementSection;