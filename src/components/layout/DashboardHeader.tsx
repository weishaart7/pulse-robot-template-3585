import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Search, Bell } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function DashboardHeader() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-6">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-semibold text-sm">W</span>
          </div>
          <span className="font-semibold text-lg">Wealth Manager</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher..." 
            className="pl-10 w-64 h-9 bg-muted/50 border-0"
          />
        </div>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
        </Button>
        <div className="h-6 w-px bg-border"></div>
        <span className="text-sm text-muted-foreground">
          {user?.email}
        </span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleLogout}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </Button>
      </div>
    </header>
  );
}