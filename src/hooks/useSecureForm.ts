import { useCallback } from 'react';
import { useErrorHandler } from './useErrorHandler';
import { sanitizeObject, logSecurityEvent, rateLimiter } from '@/lib/security';

export interface SecureFormOptions {
  formName: string;
  enableRateLimit?: boolean;
  maxAttempts?: number;
  windowMs?: number;
}

export const useSecureForm = ({ 
  formName, 
  enableRateLimit = true, 
  maxAttempts = 5, 
  windowMs = 60000 
}: SecureFormOptions) => {
  const { handleError } = useErrorHandler();

  const submitSecureForm = useCallback(
    async <T extends Record<string, any>>(
      formData: T,
      submitFunction: (sanitizedData: T) => Promise<void>,
      userId?: string
    ): Promise<boolean> => {
      try {
        // Rate limiting check
        if (enableRateLimit) {
          const rateLimitKey = `form_${formName}_${userId || 'anonymous'}`;
          if (!rateLimiter.isAllowed(rateLimitKey, maxAttempts, windowMs)) {
            handleError('Trop de tentatives. Veuillez patienter avant de réessayer.');
            logSecurityEvent({
              action: 'form_rate_limit_exceeded',
              userId,
              resource: formName,
              success: false,
              details: 'Rate limit exceeded for form submission'
            });
            return false;
          }
        }

        // Sanitize input data
        const sanitizedData = sanitizeObject(formData);

        // Log security event for sensitive form submission
        logSecurityEvent({
          action: 'form_submission',
          userId,
          resource: formName,
          success: true,
          details: `Form ${formName} submitted successfully`
        });

        // Submit sanitized data
        await submitFunction(sanitizedData);
        return true;

      } catch (error) {
        // Log failed submission
        logSecurityEvent({
          action: 'form_submission',
          userId,
          resource: formName,
          success: false,
          details: `Form ${formName} submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });

        handleError(error, `Erreur lors de la soumission du formulaire ${formName}`);
        return false;
      }
    },
    [formName, enableRateLimit, maxAttempts, windowMs, handleError]
  );

  const logDataAccess = useCallback(
    (userId?: string, details?: string) => {
      logSecurityEvent({
        action: 'data_access',
        userId,
        resource: formName,
        success: true,
        details: details || `Data accessed for ${formName}`
      });
    },
    [formName]
  );

  const logDataModification = useCallback(
    (userId?: string, details?: string) => {
      logSecurityEvent({
        action: 'data_modification',
        userId,
        resource: formName,
        success: true,
        details: details || `Data modified for ${formName}`
      });
    },
    [formName]
  );

  return {
    submitSecureForm,
    logDataAccess,
    logDataModification
  };
};