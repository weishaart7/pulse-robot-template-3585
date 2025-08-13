// Security utilities for input sanitization and validation

/**
 * Sanitizes text input to prevent XSS attacks
 */
export function sanitizeTextInput(input: string | null | undefined): string {
  if (!input) return '';
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
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
 * Audit logging for sensitive operations
 */
export function logSecurityEvent(event: {
  action: string;
  userId?: string;
  resource?: string;
  success: boolean;
  details?: string;
}): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    ...event,
  };
  
  // In production, this should send to a secure logging service
  console.info('[SECURITY_AUDIT]', logEntry);
  
  // For critical security events, you might want to send to an external service
  if (!event.success && ['login', 'data_access', 'data_modification'].includes(event.action)) {
    // Could integrate with services like Sentry, LogRocket, etc.
  }
}