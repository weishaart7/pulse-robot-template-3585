import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, Building2, Building, PiggyBank, Calculator, DollarSign, FileText, TrendingUp, BarChart3, BookOpen, Sparkles, Calendar, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const menuItems = [
  { label: 'Vue d\'ensemble', value: 'dashboard', href: '/dashboard', icon: Home },
  { label: 'Famille', value: 'famille', href: '/dashboard/famille', icon: Users },
  { label: 'Patrimoine', value: 'patrimoine', href: '/dashboard/patrimoine', icon: Building2 },
  { label: 'Immobilier', value: 'immobilier', href: '/dashboard/immobilier', icon: Building },
  { label: 'Sociétés', value: 'societes', href: '/dashboard/societes', icon: PiggyBank },
  { label: 'Budget', value: 'budget', href: '/dashboard/budget', icon: DollarSign },
  { label: 'Retraite', value: 'retraite', href: '/dashboard/retraite', icon: Calculator },
  { label: 'Fiscalité', value: 'fiscalite', href: '/dashboard/fiscalite', icon: FileText },
  { label: 'Transmission', value: 'transmission', href: '/dashboard/transmission', icon: TrendingUp },
  { label: 'Stratégies', value: 'strategies', href: '/dashboard/strategies', icon: BarChart3 },
  { label: 'Agenda', value: 'agenda', href: '/dashboard/agenda', icon: Calendar },
];

const bottomItems = [
  { label: 'Blog', href: '/dashboard/blog', icon: BookOpen },
  { label: 'Nouveautés', href: '/nouveautes', icon: Sparkles },
  { label: 'Suggestion', href: '/suggestion', icon: MessageSquare },
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

  const renderItem = (item: typeof menuItems[0], isActive: boolean) => {
    const Icon = item.icon;
    return (
      <button
        key={item.value || item.href}
        onClick={() => navigate(item.href)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 text-[13px] rounded-md transition-colors text-left relative",
          isActive
            ? "text-foreground font-medium"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {isActive && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-full bg-secondary"
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          />
        )}
        <Icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
        <motion.span
          className="truncate whitespace-nowrap"
          animate={{ opacity: open ? 1 : 0, width: open ? 'auto' : 0 }}
          transition={{ duration: 0.15 }}
        >
          {item.label}
        </motion.span>
      </button>
    );
  };

  return (
    <motion.div
      className="bg-background flex flex-col h-full overflow-hidden flex-shrink-0 border-r border-border/40"
      animate={{ width: open ? 220 : 56 }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Logo */}
      <div className={cn("px-3 py-5", open ? "pl-5" : "mx-auto")}>
        <motion.img
          src="/lovable-uploads/3f46b218-16fb-43cf-8206-7af4be7cbfd0.png"
          alt="Logo"
          className="h-6 cursor-pointer"
          onClick={() => navigate('/')}
          animate={{
            width: open ? 'auto' : 24,
            objectFit: open ? 'contain' : 'cover',
            objectPosition: 'left',
          }}
          transition={{ duration: 0.2 }}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {menuItems.slice(0, 1).map(item => renderItem(item, currentValue === item.value))}
        
        <div className="my-2 mx-3 h-px bg-border/40" />

        {menuItems.slice(1, 9).map(item => renderItem(item, currentValue === item.value))}

        <div className="my-2 mx-3 h-px bg-border/40" />

        {menuItems.slice(9).map(item => renderItem(item, currentValue === item.value))}
      </nav>

      {/* Bottom */}
      <div className="px-2 py-3 space-y-0.5">
        {bottomItems.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.href}
              onClick={() => navigate(item.href)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-[13px] rounded-md transition-colors text-left text-muted-foreground hover:text-foreground",
                !open && "justify-center"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
              <motion.span
                className="truncate whitespace-nowrap"
                animate={{ opacity: open ? 1 : 0, width: open ? 'auto' : 0 }}
                transition={{ duration: 0.15 }}
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
