import React from 'react';
import { Briefcase } from 'lucide-react';

const BiensProfessionnelsExoneresSection = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Briefcase className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-semibold">Biens professionnels exonérés</h2>
      </div>

      <div className="text-center py-12">
        <p className="text-muted-foreground">Cette section sera développée prochainement.</p>
      </div>
    </div>
  );
};

export default BiensProfessionnelsExoneresSection;