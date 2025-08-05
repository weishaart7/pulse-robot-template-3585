import React from 'react';
import { useLocation, NavLink } from 'react-router-dom';
import {
  Users,
  Building2,
  Briefcase,
  Clock,
  Wallet,
  Receipt,
  ArrowRightLeft,
  Target,
  Home,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

const menuItems = [
  { title: 'Vue d\'ensemble', url: '/dashboard', icon: Home },
  { title: 'Famille', url: '/dashboard/famille', icon: Users },
  { title: 'Patrimoine', url: '/dashboard/patrimoine', icon: Building2 },
  { title: 'Sociétés', url: '/dashboard/societes', icon: Briefcase },
  { title: 'Retraite', url: '/dashboard/retraite', icon: Clock },
  { title: 'Budget', url: '/dashboard/budget', icon: Wallet },
  { title: 'Fiscalité', url: '/dashboard/fiscalite', icon: Receipt },
  { title: 'Transmission', url: '/dashboard/transmission', icon: ArrowRightLeft },
  { title: 'Stratégies', url: '/dashboard/strategies', icon: Target },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar className={isCollapsed ? 'w-14' : 'w-64'} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? 'sr-only' : ''}>
            Gestion Patrimoniale
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                          isActive 
                            ? 'bg-primary text-primary-foreground' 
                            : 'hover:bg-accent hover:text-accent-foreground'
                        }`
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}