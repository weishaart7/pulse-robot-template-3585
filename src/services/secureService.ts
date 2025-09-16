import { supabase } from '@/integrations/supabase/client';
import { logSecurityEvent } from '@/lib/security';

export const secureService = {
  /**
   * Logs data access for audit purposes
   */
  async logDataAccess(userId: string, resource: string, details?: string) {
    logSecurityEvent({
      action: 'data_access',
      userId,
      resource,
      success: true,
      details: details || `Data accessed for ${resource}`
    });
  },

  /**
   * Logs data modification for audit purposes
   */
  async logDataModification(userId: string, resource: string, details?: string) {
    logSecurityEvent({
      action: 'data_modification',
      userId,
      resource,
      success: true,
      details: details || `Data modified for ${resource}`
    });
  },

  /**
   * Logs sensitive financial data access
   */
  async logFinancialDataAccess(userId: string, dataType: string, recordCount?: number) {
    logSecurityEvent({
      action: 'financial_data_access',
      userId,
      resource: dataType,
      success: true,
      details: `Financial data accessed: ${dataType}${recordCount ? ` (${recordCount} records)` : ''}`
    });
  },

  /**
   * Logs authentication events
   */
  async logAuthEvent(userId: string | undefined, action: string, success: boolean, details?: string) {
    logSecurityEvent({
      action: `auth_${action}`,
      userId,
      resource: 'authentication',
      success,
      details: details || `Authentication ${action} ${success ? 'successful' : 'failed'}`
    });
  },

  /**
   * Gets current authenticated user with security logging
   */
  async getCurrentUserSecure(): Promise<{ user: any; success: boolean }> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        this.logAuthEvent(undefined, 'user_check', false, `Failed to get current user: ${error.message}`);
        return { user: null, success: false };
      }

      if (user) {
        this.logAuthEvent(user.id, 'user_check', true, 'Current user retrieved successfully');
      }

      return { user, success: true };
    } catch (error) {
      this.logAuthEvent(undefined, 'user_check', false, `Exception during user check: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { user: null, success: false };
    }
  }
};