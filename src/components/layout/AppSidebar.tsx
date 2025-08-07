import React, { useState } from 'react';
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
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

import {
  Sidebar,
  SidebarBody,
  SidebarLink,
} from '@/components/ui/sidebar-animated';

const menuItems = [
  { 
    label: 'Vue d\'ensemble', 
    href: '/dashboard', 
    icon: <Home className="text-foreground h-5 w-5 flex-shrink-0" />
  },
  { 
    label: 'Famille', 
    href: '/dashboard/famille', 
    icon: <Users className="text-foreground h-5 w-5 flex-shrink-0" />
  },
  { 
    label: 'Patrimoine', 
    href: '/dashboard/patrimoine', 
    icon: <Building2 className="text-foreground h-5 w-5 flex-shrink-0" />
  },
  { 
    label: 'Sociétés', 
    href: '/dashboard/societes', 
    icon: <Briefcase className="text-foreground h-5 w-5 flex-shrink-0" />
  },
  { 
    label: 'Retraite', 
    href: '/dashboard/retraite', 
    icon: <Clock className="text-foreground h-5 w-5 flex-shrink-0" />
  },
  { 
    label: 'Budget', 
    href: '/dashboard/budget', 
    icon: <Wallet className="text-foreground h-5 w-5 flex-shrink-0" />
  },
  { 
    label: 'Fiscalité', 
    href: '/dashboard/fiscalite', 
    icon: <Receipt className="text-foreground h-5 w-5 flex-shrink-0" />
  },
  { 
    label: 'Transmission', 
    href: '/dashboard/transmission', 
    icon: <ArrowRightLeft className="text-foreground h-5 w-5 flex-shrink-0" />
  },
  { 
    label: 'Stratégies', 
    href: '/dashboard/strategies', 
    icon: <Target className="text-foreground h-5 w-5 flex-shrink-0" />
  },
];

export const Logo = () => {
  return (
    <div className="font-normal flex space-x-2 items-center text-sm py-1 relative z-20">
      <div className="h-5 w-6 bg-primary rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium text-foreground whitespace-pre"
      >
        Patrimoine
      </motion.span>
    </div>
  );
};

export const LogoIcon = () => {
  return (
    <div className="font-normal flex space-x-2 items-center text-sm py-1 relative z-20">
      <div className="h-5 w-6 bg-primary rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
    </div>
  );
};

export function AppSidebar() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  return (
    <Sidebar open={open} setOpen={setOpen}>
      <SidebarBody className="justify-between gap-10">
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          {open ? <Logo /> : <LogoIcon />}
          <div className="mt-8 flex flex-col gap-2">
            {menuItems.map((link, idx) => (
              <SidebarLink key={idx} link={link} />
            ))}
          </div>
        </div>
        <div>
          <SidebarLink
            link={{
              label: user?.email || 'Utilisateur',
              href: '#',
              icon: (
                <div className="h-7 w-7 flex-shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
              ),
            }}
          />
        </div>
      </SidebarBody>
    </Sidebar>
  );
}