import { useCallback } from 'react';
import { useToast } from './use-toast';

export const useErrorHandler = () => {
  const { toast } = useToast();

  const handleError = useCallback((error: unknown, customMessage?: string) => {
    console.error('Error occurred:', error);
    
    let errorMessage = customMessage || 'Une erreur inattendue s\'est produite';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    toast({
      title: "Erreur",
      description: errorMessage,
      variant: "destructive",
    });
  }, [toast]);

  const handleAsyncError = useCallback(
    <T>(asyncFn: () => Promise<T>, customMessage?: string) => {
      return async (): Promise<T | undefined> => {
        try {
          return await asyncFn();
        } catch (error) {
          handleError(error, customMessage);
          return undefined;
        }
      };
    },
    [handleError]
  );

  return { handleError, handleAsyncError };
};