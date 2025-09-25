import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const DebugInfo: React.FC = () => {
  const { isAuthenticated, user, session, loading } = useAuth();
  
  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="fixed bottom-4 right-4 bg-card p-4 rounded-lg shadow-lg border text-xs max-w-xs z-50">
      <h4 className="font-semibold mb-2 text-primary">Debug Info</h4>
      <div className="space-y-1 text-muted-foreground">
        <div>Loading: {loading ? 'Yes' : 'No'}</div>
        <div>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</div>
        <div>User: {user ? 'Present' : 'None'}</div>
        <div>Session: {session ? 'Present' : 'None'}</div>
        <div>Route: {window.location.pathname}</div>
        <div>Time: {new Date().toLocaleTimeString()}</div>
      </div>
    </div>
  );
};