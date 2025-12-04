import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, Building2, Building, PiggyBank, Calculator, DollarSign, FileText, TrendingUp, BarChart3, BookOpen, Sparkles, Calendar, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
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
  const [open, setOpen] = useState(false);

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
    <div 
      className="w-16 flex-shrink-0 relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {/* Sidebar animée - position absolue pour overlay */}
      <motion.div
        className="absolute inset-y-0 left-0 bg-white flex flex-col h-full z-20"
        initial={false}
        animate={{
          width: open ? 240 : 64,
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 30,
        }}
        style={{
          boxShadow: open ? '4px 0 12px rgba(0,0,0,0.08)' : 'none'
        }}
      >
        {/* Logo */}
        <div className={cn("px-3 py-4 h-16 flex items-center", open ? "px-6" : "justify-center")}>
          {open ? (
            <motion.img 
              src="/lovable-uploads/3f46b218-16fb-43cf-8206-7af4be7cbfd0.png" 
              alt="Merislabs Logo" 
              className="h-7 w-auto object-contain cursor-pointer" 
              onClick={() => navigate('/')}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
            />
          ) : (
            <img 
              src="/lovable-uploads/3f46b218-16fb-43cf-8206-7af4be7cbfd0.png" 
              alt="Merislabs Logo" 
              className="h-7 w-7 object-cover object-left cursor-pointer" 
              onClick={() => navigate('/')}
            />
          )}
        </div>

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
                  isActive ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-700 hover:bg-gray-50 hover:text-gray-900",
                  !open && "justify-center"
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <motion.span 
                  className="truncate whitespace-nowrap overflow-hidden"
                  initial={false}
                  animate={{ 
                    opacity: open ? 1 : 0,
                    width: open ? "auto" : 0,
                  }}
                  transition={{ duration: 0.15 }}
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
                  isActive ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-700 hover:bg-gray-50 hover:text-gray-900",
                  !open && "justify-center"
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <motion.span 
                  className="truncate whitespace-nowrap overflow-hidden"
                  initial={false}
                  animate={{ 
                    opacity: open ? 1 : 0,
                    width: open ? "auto" : 0,
                  }}
                  transition={{ duration: 0.15 }}
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
                  isActive ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-700 hover:bg-gray-50 hover:text-gray-900",
                  !open && "justify-center"
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <motion.span 
                  className="truncate whitespace-nowrap overflow-hidden"
                  initial={false}
                  animate={{ 
                    opacity: open ? 1 : 0,
                    width: open ? "auto" : 0,
                  }}
                  transition={{ duration: 0.15 }}
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
                  "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors text-left text-gray-700 hover:bg-gray-50 hover:text-gray-900",
                  !open && "justify-center"
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <motion.span 
                  className="truncate whitespace-nowrap overflow-hidden"
                  initial={false}
                  animate={{ 
                    opacity: open ? 1 : 0,
                    width: open ? "auto" : 0,
                  }}
                  transition={{ duration: 0.15 }}
                >
                  {item.label}
                </motion.span>
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
