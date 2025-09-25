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
  console.log('🔐 AuthProvider rendering');
  
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔐 Setting up auth listener');
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔐 Auth state change:', event, session ? 'session exists' : 'no session');
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Gestion spécifique des événements de déconnexion
        if (event === 'SIGNED_OUT') {
          console.log('🔐 User signed out');
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('🔐 Token refreshed');
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('🔐 Error getting session:', error);
      } else {
        console.log('🔐 Initial session check:', session ? 'session exists' : 'no session');
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      console.log('🔐 Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []);

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

  console.log('🔐 AuthProvider value:', { user: !!user, session: !!session, loading });

  if (loading) {
    console.log('🔐 Still loading, showing loading screen');
    return <AppLoadingScreen />;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};