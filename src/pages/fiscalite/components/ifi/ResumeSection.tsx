import React from 'react';
import { FileText } from 'lucide-react';

const ResumeSection = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <FileText className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-semibold">Résumé</h2>
      </div>

      <div className="text-center py-12">
        <p className="text-muted-foreground">Cette section sera développée prochainement.</p>
      </div>
    </div>
  );
};

export default ResumeSection;