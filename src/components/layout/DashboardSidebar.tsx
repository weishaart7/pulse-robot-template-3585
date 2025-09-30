import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, Building2, Building, PiggyBank, Calculator, DollarSign, FileText, TrendingUp, ChevronDown, BarChart3, BookOpen, Sparkles, Calendar, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
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
    setExpandedGroups(prev => prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]);
  };
  return <div className="w-64 flex flex-col" style={{ backgroundColor: '#fbfdef' }}>
      {/* Logo */}
      <div className="px-3 py-4 mx-[19px]">
        <img src="/lovable-uploads/3f46b218-16fb-43cf-8206-7af4be7cbfd0.png" alt="Merislabs Logo" className="h-7 w-auto object-contain" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {/* Vue d'ensemble */}
        {menuItems.slice(0, 1).map(item => {
          const Icon = item.icon;
          const isActive = currentValue === item.value;
          return <button key={item.value} onClick={() => handleNavigation(item.href)} onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = '#e5faa3';
              }} onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
              }} className={cn("w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors text-left", isActive && "font-medium")} style={{
                backgroundColor: isActive ? '#c2f94f' : 'transparent',
                color: '#1e3a4a'
              }}>
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>;
        })}
        
        {/* Séparateur après Vue d'ensemble */}
        <div className="py-2 px-4">
          <Separator className="bg-gray-200 h-px" />
        </div>

        {/* Menu principal (Famille à Transmission) */}
        {menuItems.slice(1, 9).map(item => {
          const Icon = item.icon;
          const isActive = currentValue === item.value;
          return <button key={item.value} onClick={() => handleNavigation(item.href)} onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = '#e5faa3';
              }} onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
              }} className={cn("w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors text-left", isActive && "font-medium")} style={{
                backgroundColor: isActive ? '#c2f94f' : 'transparent',
                color: '#1e3a4a'
              }}>
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>;
        })}

        {/* Séparateur avant Stratégies */}
        <div className="py-2 px-4">
          <Separator className="bg-gray-200 h-px" />
        </div>

        {/* Stratégies et Mon agenda */}
        {menuItems.slice(9).map(item => {
          const Icon = item.icon;
          const isActive = currentValue === item.value;
          return <button key={item.value} onClick={() => handleNavigation(item.href)} onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = '#e5faa3';
              }} onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
              }} className={cn("w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors text-left", isActive && "font-medium")} style={{
                backgroundColor: isActive ? '#c2f94f' : 'transparent',
                color: '#1e3a4a'
              }}>
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>;
        })}
      </nav>

      {/* Sections du bas */}
      <div className="p-4 space-y-1">
        <button onClick={() => handleNavigation('/dashboard/blog')} className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors text-left hover:bg-[#e5faa3]" style={{ color: '#1e3a4a' }}>
          <BookOpen className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">Blog</span>
        </button>
        <button onClick={() => handleNavigation('/nouveautes')} className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors text-left hover:bg-[#e5faa3]" style={{ color: '#1e3a4a' }}>
          <Sparkles className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">Nouveautés</span>
        </button>
        <button onClick={() => handleNavigation('/suggestion')} className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors text-left hover:bg-[#e5faa3]" style={{ color: '#1e3a4a' }}>
          <MessageSquare className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">Faire une suggestion</span>
        </button>
      </div>
    </div>;
}