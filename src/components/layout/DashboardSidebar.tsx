import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, Building2, Building, PiggyBank, Calculator, DollarSign, FileText, TrendingUp, BarChart3, BookOpen, Sparkles, Calendar, MessageSquare, PanelLeftClose, PanelLeftOpen, Search, CircleUserRound, Settings, Gift, CreditCard, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SidebarSearchDialog } from './SidebarSearchDialog';

const menuItems = [{
  label: 'Vue d\'ensemble',
  value: 'dashboard',
  href: '/dashboard',
  icon: Home
}, {
  label: 'Famille',
  value: 'famille',
  href: '/dashboard/famille',
  icon: Users
}, {
  label: 'Patrimoine',
  value: 'patrimoine',
  href: '/dashboard/patrimoine',
  icon: Building2
}, {
  label: 'Immobilier',
  value: 'immobilier',
  href: '/dashboard/immobilier',
  icon: Building
}, {
  label: 'Sociétés',
  value: 'societes',
  href: '/dashboard/societes',
  icon: PiggyBank
}, {
  label: 'Budget',
  value: 'budget',
  href: '/dashboard/budget',
  icon: DollarSign
}, {
  label: 'Retraite',
  value: 'retraite',
  href: '/dashboard/retraite',
  icon: Calculator
}, {
  label: 'Fiscalité',
  value: 'fiscalite',
  href: '/dashboard/fiscalite',
  icon: FileText
}, {
  label: 'Transmission',
  value: 'transmission',
  href: '/dashboard/transmission',
  icon: TrendingUp
}, {
  label: 'Stratégies',
  value: 'strategies',
  href: '/dashboard/strategies',
  icon: BarChart3
}, {
  label: 'Agenda',
  value: 'agenda',
  href: '/dashboard/agenda',
  icon: Calendar
}];

const bottomItems = [
  { label: 'Blog', href: '/dashboard/blog', icon: BookOpen },
  { label: 'Nouveautés', href: '/nouveautes', icon: Sparkles },
  { label: 'Faire une suggestion', href: '/suggestion', icon: MessageSquare },
];

export function DashboardSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  const getCurrentValue = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'dashboard';
    const section = path.split('/dashboard/')[1];
    return section || 'dashboard';
  };

  const currentValue = getCurrentValue();

  const handleNavigation = (href: string) => {
    navigate(href);
  };

  return (
    <motion.div
      className="flex flex-col h-full overflow-hidden flex-shrink-0 relative rounded-tr-xl"
      style={{ backgroundColor: '#ebf1f1', color: '#62706d' }}
      animate={{
        width: open ? 220 : 64,
      }}
      transition={{ 
        duration: 0.25, 
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      {/* Logo + toggle */}
      <div className={cn("px-3 py-4 flex items-center", open ? "mx-[19px] justify-between" : "mx-auto justify-center")}>
        <motion.img 
          src="/lovable-uploads/3f46b218-16fb-43cf-8206-7af4be7cbfd0.png" 
          alt="Merislabs Logo" 
          className="h-7 cursor-pointer" 
          onClick={() => navigate('/')}
          animate={{
            width: open ? 'auto' : 28,
            objectFit: open ? 'contain' : 'cover',
            objectPosition: 'left',
          }}
          transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        />
        {open && (
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded-md hover:bg-white/50 transition-colors"
            aria-label="Réduire la barre latérale"
          >
            <PanelLeftClose className="h-4 w-4" strokeWidth={1.5} />
          </button>
        )}
      </div>
      {!open && (
        <div className="px-2 pb-2 flex justify-center">
          <button
            onClick={() => setOpen(true)}
            className="p-1 rounded-md hover:bg-white/50 transition-colors"
            aria-label="Ouvrir la barre latérale"
          >
            <PanelLeftOpen className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      )}

      {/* Profile + Search */}
      <div className={cn("px-3 pb-3 flex items-center gap-1", open ? "mx-[19px]" : "flex-col mx-auto")}>
        <button
          onClick={() => setSearchOpen(true)}
          className="p-2 rounded-md hover:bg-white/50 transition-colors"
          aria-label="Rechercher"
        >
          <Search className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-2 rounded-md hover:bg-white/50 transition-colors"
              aria-label="Menu utilisateur"
            >
              <CircleUserRound className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-w-64" align="start">
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
            <DropdownMenuItem onClick={() => logout()}>
              <LogOut className="h-4 w-4" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SidebarSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto overflow-x-hidden">
        {/* Vue d'ensemble */}
        {menuItems.slice(0, 1).map(item => {
          const Icon = item.icon;
          const isActive = currentValue === item.value;
          return (
            <button 
              key={item.value} 
              onClick={() => handleNavigation(item.href)} 
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors text-left",
                isActive ? "bg-white text-black font-medium" : "hover:bg-white/50",
                !open && "justify-center"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <motion.span 
                className="truncate whitespace-nowrap"
                animate={{ 
                  opacity: open ? 1 : 0,
                  width: open ? 'auto' : 0,
                }}
                transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
              >
                {item.label}
              </motion.span>
            </button>
          );
        })}
        
        {/* Séparateur après Vue d'ensemble */}
        <div className={cn("py-2", open ? "px-4" : "px-2")}>
          <Separator className="bg-gray-200 h-px" />
        </div>

        {/* Menu principal (Famille à Transmission) */}
        {menuItems.slice(1, 9).map(item => {
          const Icon = item.icon;
          const isActive = currentValue === item.value;
          return (
            <button 
              key={item.value} 
              onClick={() => handleNavigation(item.href)} 
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors text-left",
                isActive ? "bg-white text-black font-medium" : "hover:bg-white/50",
                !open && "justify-center"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <motion.span 
                className="truncate whitespace-nowrap"
                animate={{ 
                  opacity: open ? 1 : 0,
                  width: open ? 'auto' : 0,
                }}
                transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
              >
                {item.label}
              </motion.span>
            </button>
          );
        })}

        {/* Séparateur avant Stratégies */}
        <div className={cn("py-2", open ? "px-4" : "px-2")}>
          <Separator className="bg-gray-200 h-px" />
        </div>

        {/* Stratégies et Mon agenda */}
        {menuItems.slice(9).map(item => {
          const Icon = item.icon;
          const isActive = currentValue === item.value;
          return (
            <button 
              key={item.value} 
              onClick={() => handleNavigation(item.href)} 
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors text-left",
                isActive ? "bg-white text-black font-medium" : "hover:bg-white/50",
                !open && "justify-center"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <motion.span 
                className="truncate whitespace-nowrap"
                animate={{ 
                  opacity: open ? 1 : 0,
                  width: open ? 'auto' : 0,
                }}
                transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
              >
                {item.label}
              </motion.span>
            </button>
          );
        })}
      </nav>

      {/* Sections du bas */}
      <div className="p-2 space-y-1">
        {bottomItems.map(item => {
          const Icon = item.icon;
          return (
            <button 
              key={item.href}
              onClick={() => handleNavigation(item.href)} 
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors text-left hover:bg-white/50",
                !open && "justify-center"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <motion.span 
                className="truncate whitespace-nowrap"
                animate={{ 
                  opacity: open ? 1 : 0,
                  width: open ? 'auto' : 0,
                }}
                transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
              >
                {item.label}
              </motion.span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
