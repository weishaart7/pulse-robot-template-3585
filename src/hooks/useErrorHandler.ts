import { useCallback } from 'react';
import { useToast } from './use-toast';
import { logSecurityEvent, logFinancialOperation } from '@/lib/security';

export const useErrorHandler = () => {
  const { toast } = useToast();

  const handleError = useCallback((error: unknown, customMessage?: string, userId?: string) => {
    console.error('Error occurred:', error);
    
    let errorMessage = customMessage || 'Une erreur inattendue s\'est produite';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    // Log security event for errors
    logSecurityEvent({
      action: 'error_occurred',
      userId,
      success: false,
      severity: 'medium',
      details: `Error: ${errorMessage}`,
    });

    toast({
      title: "Erreur",
      description: errorMessage,
      variant: "destructive",
    });
  }, [toast]);

  const handleAsyncError = useCallback(
    <T>(asyncFn: () => Promise<T>, customMessage?: string, userId?: string) => {
      return async (): Promise<T | undefined> => {
        try {
          return await asyncFn();
        } catch (error) {
          handleError(error, customMessage, userId);
          return undefined;
        }
      };
    },
    [handleError]
  );

  const handleFinancialError = useCallback(
    (error: unknown, operation: string, amount?: number, userId?: string) => {
      // Log financial operation failure
      logFinancialOperation({
        type: operation,
        amount,
        userId,
        success: false,
        errorCode: error instanceof Error ? error.message : 'unknown_error',
      });

      handleError(error, `Erreur lors de l'opération financière: ${operation}`, userId);
    },
    [handleError]
  );

  return { handleError, handleAsyncError, handleFinancialError };
};