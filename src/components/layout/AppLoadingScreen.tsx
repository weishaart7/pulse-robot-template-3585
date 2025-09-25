import React from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export const AppLoadingScreen: React.FC = () => {
  console.log('⏳ AppLoadingScreen rendering');
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" text="Initialisation de l'application..." />
      </div>
    </div>
  );
};