import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocation, useNavigate } from 'react-router-dom';
const menuItems = [{
  label: 'Vue d\'ensemble',
  value: 'dashboard',
  href: '/dashboard'
}, {
  label: 'Famille',
  value: 'famille',
  href: '/dashboard/famille'
}, {
  label: 'Patrimoine',
  value: 'patrimoine',
  href: '/dashboard/patrimoine'
}, {
  label: 'Sociétés',
  value: 'societes',
  href: '/dashboard/societes'
}, {
  label: 'Retraite',
  value: 'retraite',
  href: '/dashboard/retraite'
}, {
  label: 'Budget',
  value: 'budget',
  href: '/dashboard/budget'
}, {
  label: 'Fiscalité',
  value: 'fiscalite',
  href: '/dashboard/fiscalite'
}, {
  label: 'Transmission',
  value: 'transmission',
  href: '/dashboard/transmission'
}, {
  label: 'Stratégies',
  value: 'strategies',
  href: '/dashboard/strategies'
}];
export function Navbar() {
  const {
    user,
    logout
  } = useAuth();
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
  return <div className="border-b bg-background">
      {/* Header avec logo et déconnexion */}
      <div className="h-16 flex items-center justify-between px-4 md:px-6">
        <div className="font-normal flex space-x-2 items-center text-sm">
          <div className="h-5 w-6 bg-primary rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
          <span className="font-medium text-foreground">Patrimoine</span>
        </div>
        
        <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
          <LogOut className="h-4 w-4" />
          Déconnexion
        </Button>
      </div>
      
      {/* Navigation */}
      <div className="px-4 border-t mx-0 my-0 md:px-[10px] py-0">
        <Tabs value={getCurrentValue()} onValueChange={handleTabChange}>
          <TabsList variant="line" className="h-10 border-0 w-full justify-start text-[10px] font-light">
            {menuItems.map(item => <TabsTrigger key={item.value} value={item.value} className="h-full data-[state=active]:text-black data-[state=active]:border-black">
                {item.label}
              </TabsTrigger>)}
          </TabsList>
        </Tabs>
      </div>
    </div>;
}