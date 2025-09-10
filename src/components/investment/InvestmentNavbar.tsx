import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { CircleUserRound, Settings, Gift, CreditCard, LogOut, Sparkles } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocation, useNavigate } from 'react-router-dom';
import { GlowEffect } from '@/components/ui/glow-effect';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const investmentMenuItems = [
  {
    label: 'Tableau de bord',
    value: 'dashboard',
    href: '/investment'
  },
  {
    label: 'Assurance',
    value: 'assurance',
    href: '/investment/assurance'
  },
  {
    label: 'Retraite',
    value: 'retraite',
    href: '/investment/retraite'
  },
  {
    label: 'Immobilier',
    value: 'immobilier',
    href: '/investment/immobilier'
  },
  {
    label: 'Private Equity',
    value: 'private-equity',
    href: '/investment/private-equity'
  },
  {
    label: 'Financier',
    value: 'financier',
    href: '/investment/financier'
  },
  {
    label: 'Produits structurés',
    value: 'produits-structures',
    href: '/investment/produits-structures'
  },
  {
    label: 'Investir en société',
    value: 'investir-societe',
    href: '/investment/investir-societe'
  }
];

export function InvestmentNavbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const getCurrentValue = () => {
    const path = location.pathname;
    if (path === '/investment') return 'dashboard';
    const section = path.split('/investment/')[1];
    return section || 'dashboard';
  };

  const handleTabChange = (value: string) => {
    const menuItem = investmentMenuItems.find(item => item.value === value);
    if (menuItem) {
      navigate(menuItem.href);
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="border-b bg-background">
      {/* Header avec logo et déconnexion */}
      <div className="h-16 flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center">
          <img src="/lovable-uploads/66880016-e746-4cf1-ba6b-00cadbd6cc86.png" alt="Merislabs Logo" className="h-6 w-auto" />
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <GlowEffect
              colors={['#FF5733', '#33FF57', '#3357FF', '#F1C40F']}
              mode="colorShift"
              blur="soft"
              duration={3}
              scale={0.9}
            />
            <button 
              onClick={() => navigate('/dashboard')}
              className="relative inline-flex items-center gap-1 rounded-md bg-amber-500 hover:bg-amber-600 px-2.5 py-1.5 text-sm text-white outline outline-1 outline-[#fff2f21f] transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              Accéder à ImerisLabs
            </button>
          </div>
          
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="outline" aria-label="Menu utilisateur">
              <CircleUserRound size={16} strokeWidth={2} aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-w-64">
            <DropdownMenuLabel className="flex flex-col">
              <span>Connecté en tant que</span>
              <span className="text-xs font-normal text-foreground">{user?.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <CreditCard className="h-4 w-4" />
                Gérer mon abonnement
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Gift className="h-4 w-4" />
                Parrainage
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="h-4 w-4" />
                Paramètres
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>
      
      {/* Navigation */}
      <div className="px-4 border-t mx-0 my-0 md:px-[10px] py-0">
        <Tabs value={getCurrentValue()} onValueChange={handleTabChange}>
          <TabsList variant="line" className="h-10 border-0 w-full justify-start text-[10px] font-light mx-[12px]">
            {investmentMenuItems.map(item => (
              <TabsTrigger 
                key={item.value} 
                value={item.value} 
                className="h-full data-[state=active]:text-black data-[state=active]:border-black"
              >
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}