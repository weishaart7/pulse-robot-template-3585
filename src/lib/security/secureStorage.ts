/**
 * Secure storage utilities to replace localStorage for sensitive data
 * This provides a more secure alternative to client-side storage
 */

interface SecureStorageItem {
  value: any;
  timestamp: number;
  encrypted?: boolean;
}

class SecureStorage {
  private readonly namespace: string = 'app_secure_';
  private readonly maxAge: number = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Store data securely (avoid storing sensitive data client-side)
   * This is primarily for non-sensitive app state, not security events
   */
  setItem(key: string, value: any, encrypt: boolean = false): void {
    try {
      const item: SecureStorageItem = {
        value: encrypt ? this.simpleObfuscate(JSON.stringify(value)) : value,
        timestamp: Date.now(),
        encrypted: encrypt
      };
      
      localStorage.setItem(
        `${this.namespace}${key}`, 
        JSON.stringify(item)
      );
    } catch (error) {
      console.warn('Failed to store item securely:', error);
    }
  }

  /**
   * Retrieve data from secure storage
   */
  getItem<T>(key: string): T | null {
    try {
      const storedItem = localStorage.getItem(`${this.namespace}${key}`);
      if (!storedItem) return null;

      const item: SecureStorageItem = JSON.parse(storedItem);
      
      // Check if item has expired
      if (Date.now() - item.timestamp > this.maxAge) {
        this.removeItem(key);
        return null;
      }

      if (item.encrypted) {
        return JSON.parse(this.simpleDeobfuscate(item.value));
      }
      
      return item.value;
    } catch (error) {
      console.warn('Failed to retrieve item securely:', error);
      return null;
    }
  }

  /**
   * Remove item from secure storage
   */
  removeItem(key: string): void {
    localStorage.removeItem(`${this.namespace}${key}`);
  }

  /**
   * Clear all secure storage items
   */
  clear(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.namespace)) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Simple obfuscation (NOT encryption - don't store sensitive data)
   */
  private simpleObfuscate(text: string): string {
    return btoa(text);
  }

  /**
   * Simple deobfuscation
   */
  private simpleDeobfuscate(text: string): string {
    return atob(text);
  }
}

export const secureStorage = new SecureStorage();

/**
 * SECURITY WARNING: Do not use this for storing:
 * - Authentication tokens (handled by Supabase)
 * - Security events (should be server-side only)
 * - Personal data (PII)
 * - Financial information
 * 
 * Use only for non-sensitive application state.
 */