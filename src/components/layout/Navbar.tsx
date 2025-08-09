import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocation, useNavigate } from 'react-router-dom';

const menuItems = [
  { label: 'Vue d\'ensemble', value: 'dashboard', href: '/dashboard' },
  { label: 'Famille', value: 'famille', href: '/dashboard/famille' },
  { label: 'Patrimoine', value: 'patrimoine', href: '/dashboard/patrimoine' },
  { label: 'Sociétés', value: 'societes', href: '/dashboard/societes' },
  { label: 'Retraite', value: 'retraite', href: '/dashboard/retraite' },
  { label: 'Budget', value: 'budget', href: '/dashboard/budget' },
  { label: 'Fiscalité', value: 'fiscalite', href: '/dashboard/fiscalite' },
  { label: 'Transmission', value: 'transmission', href: '/dashboard/transmission' },
  { label: 'Stratégies', value: 'strategies', href: '/dashboard/strategies' },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const getCurrentValue = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'dashboard';
    const section = path.split('/dashboard/')[1];
    return section || 'dashboard';
  };

  const handleTabChange = (value: string) => {
    const menuItem = menuItems.find(item => item.value === value);
    if (menuItem) {
      navigate(menuItem.href);
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-6">
        <div className="font-normal flex space-x-2 items-center text-sm">
          <div className="h-5 w-6 bg-primary rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
          <span className="font-medium text-foreground">Patrimoine</span>
        </div>
        
        <Tabs value={getCurrentValue()} onValueChange={handleTabChange}>
          <TabsList variant="line" className="h-full border-0">
            {menuItems.map((item) => (
              <TabsTrigger key={item.value} value={item.value} className="h-full">
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          Bienvenue, {user?.email}
        </span>
        <Button 
          variant="outline" 
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