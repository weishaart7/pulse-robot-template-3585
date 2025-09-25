import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  console.log('🔒 ProtectedRoute check:', { isAuthenticated });

  if (!isAuthenticated) {
    console.log('🔒 Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  console.log('🔒 Authenticated, rendering children');
  return <>{children}</>;
};

export default ProtectedRoute;