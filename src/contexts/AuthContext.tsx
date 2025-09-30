import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AppLoadingScreen } from '@/components/layout/AppLoadingScreen';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Only log in development mode for security
  const isDev = process.env.NODE_ENV === 'development';
  
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDev) console.log('🔐 Setting up auth listener');
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (isDev) console.log('🔐 Auth state change:', event, session ? 'session exists' : 'no session');
        
        // Handle token expiration and refresh
        if (event === 'TOKEN_REFRESHED' && session) {
          if (isDev) console.log('🔐 Token successfully refreshed');
          setSession(session);
          setUser(session.user);
        } else if (event === 'SIGNED_OUT') {
          if (isDev) console.log('🔐 User signed out');
          setSession(null);
          setUser(null);
        } else if (session) {
          // Validate session token
          const now = Math.floor(Date.now() / 1000);
          const expiresAt = session.expires_at || 0;
          
          if (expiresAt < now) {
            if (isDev) console.log('🔐 Session expired, attempting refresh...');
            // Token is expired, try to refresh
            const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();
            if (error) {
              console.error('🔐 Failed to refresh session:', error.message);
              setSession(null);
              setUser(null);
            } else if (refreshedSession) {
              if (isDev) console.log('🔐 Session refreshed successfully');
              setSession(refreshedSession);
              setUser(refreshedSession.user);
            }
          } else {
            setSession(session);
            setUser(session.user);
          }
        } else {
          setSession(null);
          setUser(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session with validation
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.error('🔐 Error getting session:', error.message);
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }
      
      if (session) {
        // Validate token expiration
        const now = Math.floor(Date.now() / 1000);
        const expiresAt = session.expires_at || 0;
        
        if (expiresAt < now) {
          if (isDev) console.log('🔐 Initial session expired, refreshing...');
          const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            console.error('🔐 Failed to refresh initial session:', refreshError.message);
            setSession(null);
            setUser(null);
          } else if (refreshedSession) {
            if (isDev) console.log('🔐 Initial session refreshed successfully');
            setSession(refreshedSession);
            setUser(refreshedSession.user);
          }
        } else {
          if (isDev) console.log('🔐 Initial session valid');
          setSession(session);
          setUser(session.user);
        }
      }
      
      setLoading(false);
    });

    return () => {
      if (isDev) console.log('🔐 Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, [isDev]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Une erreur inattendue s\'est produite' };
    }
  };

  const signup = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const redirectUrl = `${window.location.origin}/dashboard`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Une erreur inattendue s\'est produite' };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
    loading
  };

  if (isDev) {
    console.log('🔐 AuthProvider value:', { user: !!user, session: !!session, loading });
  }

  if (loading) {
    if (isDev) console.log('🔐 Still loading, showing loading screen');
    return <AppLoadingScreen />;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};