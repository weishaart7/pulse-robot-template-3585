// Security utilities for input sanitization and validation

/**
 * Enhanced text sanitization to prevent XSS attacks
 */
export function sanitizeTextInput(input: string | null | undefined): string {
  if (!input) return '';
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/data:/gi, '') // Remove data: URLs
    .trim();
}

/**
 * Validate and sanitize financial amounts
 */
export function sanitizeFinancialAmount(input: number | string | null | undefined): number | null {
  if (input === null || input === undefined || input === '') return null;
  
  const num = typeof input === 'string' ? parseFloat(input.replace(',', '.')) : input;
  
  if (isNaN(num) || !isFinite(num)) return null;
  
  // Reasonable financial limits
  if (num < 0 || num > 999999999999) return null;
  
  // Round to 2 decimal places for financial precision
  return Math.round(num * 100) / 100;
}

/**
 * Sanitizes numeric input
 */
export function sanitizeNumericInput(input: number | string | null | undefined): number | null {
  if (input === null || input === undefined || input === '') return null;
  
  const num = typeof input === 'string' ? parseFloat(input) : input;
  
  if (isNaN(num) || !isFinite(num)) return null;
  
  return num;
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates date format (YYYY-MM-DD)
 */
export function isValidDate(date: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;
  
  const parsedDate = new Date(date);
  return parsedDate instanceof Date && !isNaN(parsedDate.getTime());
}

/**
 * Sanitizes object properties recursively
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj };
  
  for (const key in sanitized) {
    const value = sanitized[key];
    
    if (typeof value === 'string') {
      sanitized[key] = sanitizeTextInput(value) as T[typeof key];
    } else if (typeof value === 'number') {
      sanitized[key] = sanitizeNumericInput(value) as T[typeof key];
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value) as T[typeof key];
    }
  }
  
  return sanitized;
}

/**
 * Rate limiting store (in-memory for client-side basic protection)
 */
class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();
  
  isAllowed(key: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now();
    const entry = this.attempts.get(key);
    
    if (!entry || now > entry.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    if (entry.count >= maxAttempts) {
      return false;
    }
    
    entry.count++;
    return true;
  }
  
  reset(key: string): void {
    this.attempts.delete(key);
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Enhanced audit logging for sensitive operations
 */
export interface SecurityEvent {
  action: string;
  userId?: string;
  resource?: string;
  success: boolean;
  details?: string;
  ip?: string;
  userAgent?: string;
  sessionId?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export function logSecurityEvent(event: SecurityEvent): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    severity: event.severity || 'medium',
    ip: event.ip || getClientIP(),
    userAgent: event.userAgent?.substring(0, 200) || 'unknown', // Limit user agent length
    sessionId: event.sessionId || generateSessionId(),
    ...event,
  };
  
  // SECURITY: Only log to console in development mode
  if (process.env.NODE_ENV === 'development') {
    const logLevel = event.success ? 'info' : 'warn';
    const logMessage = `[SECURITY_AUDIT][${event.severity?.toUpperCase()}] ${event.action}`;
    console[logLevel](logMessage, {
      action: event.action,
      success: event.success,
      severity: event.severity,
      timestamp: logEntry.timestamp
    }); // Only log non-sensitive information
  }
  
  // SECURITY: Only store non-sensitive events client-side
  const isSensitiveEvent = ['login', 'logout', 'financial_operation', 'data_modification'].includes(event.action);
  
  if (!isSensitiveEvent) {
    // Store critical events for potential external logging
    if (event.severity === 'critical' || (!event.success && ['data_access'].includes(event.action))) {
      storeSecurityEvent(logEntry);
    }
  }
  
  // TODO: Implement server-side logging for ALL events via Supabase function
  // This would store events in the security_audit_log table securely
}

/**
 * Log financial operations with enhanced details
 */
export function logFinancialOperation(operation: {
  type: string;
  amount?: number;
  currency?: string;
  userId?: string;
  accountType?: string;
  success: boolean;
  errorCode?: string;
}): void {
  logSecurityEvent({
    action: 'financial_operation',
    userId: operation.userId,
    resource: operation.accountType || 'financial_data',
    success: operation.success,
    severity: 'high',
    details: JSON.stringify({
      type: operation.type,
      amount: operation.amount,
      currency: operation.currency,
      errorCode: operation.errorCode,
    }),
  });
}

// Helper functions
function getClientIP(): string {
  // In a real application, you would get this from headers or request context
  return 'client-ip-unknown';
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function storeSecurityEvent(event: any): void {
  // SECURITY: Store only non-sensitive events in localStorage
  // Sensitive events should be logged server-side via Supabase functions
  try {
    const stored = JSON.parse(localStorage.getItem('security_events') || '[]');
    
    // Sanitize event data before storing
    const sanitizedEvent = {
      timestamp: event.timestamp,
      action: event.action,
      success: event.success,
      severity: event.severity,
      resource: event.resource,
      // Don't store: userId, details, ip, userAgent, sessionId
    };
    
    stored.push(sanitizedEvent);
    // Keep only last 50 events to prevent storage bloat
    if (stored.length > 50) stored.splice(0, stored.length - 50);
    localStorage.setItem('security_events', JSON.stringify(stored));
  } catch (error) {
    console.error('Failed to store security event:', error);
  }
}