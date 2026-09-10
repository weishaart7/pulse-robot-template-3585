import { Home, Users, Building2, Building, PiggyBank, Calculator, DollarSign, FileText, TrendingUp, BookOpen, Sparkles, MessageSquare, LucideIcon } from 'lucide-react';

export interface NavItem {
  label: string;
  value: string;
  href: string;
  icon: LucideIcon;
}

export const menuItems: NavItem[] = [
  { label: 'Vue d\'ensemble', value: 'dashboard', href: '/dashboard', icon: Home },
  { label: 'Famille', value: 'famille', href: '/dashboard/famille', icon: Users },
  { label: 'Patrimoine', value: 'patrimoine', href: '/dashboard/patrimoine', icon: Building2 },
  { label: 'Immobilier', value: 'immobilier', href: '/dashboard/immobilier', icon: Building },
  { label: 'Sociétés', value: 'societes', href: '/dashboard/societes', icon: PiggyBank },
  { label: 'Budget', value: 'budget', href: '/dashboard/budget', icon: DollarSign },
  { label: 'Retraite', value: 'retraite', href: '/dashboard/retraite', icon: Calculator },
  { label: 'Fiscalité', value: 'fiscalite', href: '/dashboard/fiscalite', icon: FileText },
  { label: 'Transmission', value: 'transmission', href: '/dashboard/transmission', icon: TrendingUp },
];

export const bottomItems = [
  { label: 'Blog', href: '/dashboard/blog', icon: BookOpen },
  { label: 'Nouveautés', href: '/nouveautes', icon: Sparkles },
  { label: 'Faire une suggestion', href: '/suggestion', icon: MessageSquare },
];

export function getCurrentNavValue(pathname: string): string {
  if (pathname === '/dashboard') return 'dashboard';
  const section = pathname.split('/dashboard/')[1];
  return section?.split('/')[0] || 'dashboard';
}
