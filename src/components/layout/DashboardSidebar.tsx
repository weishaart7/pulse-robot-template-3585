import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, Building2, Building, PiggyBank, Calculator, DollarSign, FileText, TrendingUp, BarChart3, BookOpen, Sparkles, Calendar, MessageSquare, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

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
  const [open, setOpen] = useState(true);

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
      className="flex flex-col h-full overflow-hidden flex-shrink-0 relative bg-sidebar text-sidebar-foreground"
      animate={{
        width: open ? 196 : 64,
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
            className="p-1 rounded-md hover:bg-sidebar-accent transition-colors"
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
            className="p-1 rounded-md hover:bg-sidebar-accent transition-colors"
            aria-label="Ouvrir la barre latérale"
          >
            <PanelLeftOpen className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {/* Vue d'ensemble */}
        {menuItems.slice(0, 1).map(item => {
          const Icon = item.icon;
          const isActive = currentValue === item.value;
          return (
            <button 
              key={item.value} 
              onClick={() => handleNavigation(item.href)} 
              className={cn(
                "relative w-full flex items-center gap-2 px-3 py-2.5 text-xs rounded-md transition-colors text-left",
                isActive
                  ? "text-black font-medium before:content-[''] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[2px] before:bg-primary before:rounded-full"
                  : "font-normal text-[#8B9095] hover:bg-sidebar-accent",
                !open && "justify-center"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
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

        {/* Espacement après Vue d'ensemble */}
        <div className="h-3" />

        {/* Menu principal (Famille à Transmission) */}
        {menuItems.slice(1, 9).map(item => {
          const Icon = item.icon;
          const isActive = currentValue === item.value;
          return (
            <button 
              key={item.value} 
              onClick={() => handleNavigation(item.href)} 
              className={cn(
                "relative w-full flex items-center gap-2 px-3 py-2.5 text-xs rounded-md transition-colors text-left",
                isActive
                  ? "text-black font-medium before:content-[''] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[2px] before:bg-primary before:rounded-full"
                  : "font-normal text-[#8B9095] hover:bg-sidebar-accent",
                !open && "justify-center"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
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

        {/* Espacement avant Stratégies */}
        <div className="h-3" />

        {/* Stratégies et Mon agenda */}
        {menuItems.slice(9).map(item => {
          const Icon = item.icon;
          const isActive = currentValue === item.value;
          return (
            <button 
              key={item.value} 
              onClick={() => handleNavigation(item.href)} 
              className={cn(
                "relative w-full flex items-center gap-2 px-3 py-2.5 text-xs rounded-md transition-colors text-left",
                isActive
                  ? "text-black font-medium before:content-[''] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[2px] before:bg-primary before:rounded-full"
                  : "font-normal text-[#8B9095] hover:bg-sidebar-accent",
                !open && "justify-center"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
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
                "w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-colors text-left hover:bg-sidebar-accent",
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
