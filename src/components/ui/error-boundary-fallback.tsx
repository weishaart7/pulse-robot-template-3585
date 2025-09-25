import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';

interface ErrorBoundaryFallbackProps {
  error?: Error;
  resetError?: () => void;
}

export const ErrorBoundaryFallback: React.FC<ErrorBoundaryFallbackProps> = ({ 
  error, 
  resetError 
}) => {
  console.error('💥 ErrorBoundaryFallback rendering with error:', error?.message);
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-destructive">Erreur d'application</CardTitle>
          <CardDescription>
            Une erreur inattendue s'est produite. Cette information a été enregistrée pour analyse.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md font-mono">
              {error.message}
            </div>
          )}
          <div className="flex gap-2">
            {resetError && (
              <Button onClick={resetError} className="flex-1" variant="default">
                <RefreshCw className="h-4 w-4 mr-2" />
                Réessayer
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="flex-1"
            >
              Actualiser
            </Button>
          </div>
          <div className="text-center">
            <Button 
              variant="link" 
              onClick={() => window.location.href = '/'}
              className="text-sm"
            >
              Retour à l'accueil
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};