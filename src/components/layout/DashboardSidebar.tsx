import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Users, 
  Building2, 
  PiggyBank, 
  Calculator, 
  DollarSign, 
  FileText, 
  TrendingUp,
  ChevronDown,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  {
    label: 'Vue d\'ensemble',
    value: 'dashboard',
    href: '/dashboard',
    icon: Home
  },
  {
    label: 'Famille',
    value: 'famille',
    href: '/dashboard/famille',
    icon: Users
  },
  {
    label: 'Patrimoine',
    value: 'patrimoine',
    href: '/dashboard/patrimoine',
    icon: Building2
  },
  {
    label: 'Sociétés',
    value: 'societes',
    href: '/dashboard/societes',
    icon: PiggyBank
  },
  {
    label: 'Retraite',
    value: 'retraite',
    href: '/dashboard/retraite',
    icon: Calculator
  },
  {
    label: 'Budget',
    value: 'budget',
    href: '/dashboard/budget',
    icon: DollarSign
  },
  {
    label: 'Fiscalité',
    value: 'fiscalite',
    href: '/dashboard/fiscalite',
    icon: FileText
  },
  {
    label: 'Transmission',
    value: 'transmission',
    href: '/dashboard/transmission',
    icon: TrendingUp
  },
  {
    label: 'Stratégies',
    value: 'strategies',
    href: '/dashboard/strategies',
    icon: BarChart3
  }
];

export function DashboardSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

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

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  return (
    <div className="w-64 bg-white flex flex-col">
      {/* Logo */}
      <div className="px-3 py-4">
        <img 
          src="/lovable-uploads/3f46b218-16fb-43cf-8206-7af4be7cbfd0.png" 
          alt="Merislabs Logo" 
          className="h-11 w-auto object-contain" 
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentValue === item.value;
          
          return (
            <button
              key={item.value}
              onClick={() => handleNavigation(item.href)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors text-left",
                isActive 
                  ? "bg-gray-100 text-gray-900 font-medium" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}