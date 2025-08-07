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
  ChevronDown,
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
    icon: <Users className="text-foreground h-5 w-5 flex-shrink-0" />,
    subItems: [
      { label: 'Fiche client', href: '/dashboard/famille#fiche-client' },
      { label: 'Situation matrimoniale', href: '/dashboard/famille#situation-matrimoniale' },
      { label: 'Liens familiaux', href: '/dashboard/famille#liens-familiaux' }
    ]
  },
  { 
    label: 'Patrimoine', 
    href: '/dashboard/patrimoine', 
    icon: <Building2 className="text-foreground h-5 w-5 flex-shrink-0" />,
    subItems: [
      { label: 'Synthèse', href: '/dashboard/patrimoine#synthese' },
      { label: 'Immobilier', href: '/dashboard/patrimoine#immobilier' },
      { label: 'Financier', href: '/dashboard/patrimoine#financier' },
      { label: 'Professionnel', href: '/dashboard/patrimoine#professionnel' }
    ]
  },
  { 
    label: 'Sociétés', 
    href: '/dashboard/societes', 
    icon: <Briefcase className="text-foreground h-5 w-5 flex-shrink-0" />,
    subItems: [
      { label: 'Synthèse', href: '/dashboard/societes#synthese' },
      { label: 'Participations', href: '/dashboard/societes#participations' },
      { label: 'Dirigeant', href: '/dashboard/societes#dirigeant' }
    ]
  },
  { 
    label: 'Retraite', 
    href: '/dashboard/retraite', 
    icon: <Clock className="text-foreground h-5 w-5 flex-shrink-0" />,
    subItems: [
      { label: 'Synthèse', href: '/dashboard/retraite#synthese' },
      { label: 'Régimes obligatoires', href: '/dashboard/retraite#regimes-obligatoires' },
      { label: 'Régimes complémentaires', href: '/dashboard/retraite#regimes-complementaires' }
    ]
  },
  { 
    label: 'Budget', 
    href: '/dashboard/budget', 
    icon: <Wallet className="text-foreground h-5 w-5 flex-shrink-0" />,
    subItems: [
      { label: 'Synthèse', href: '/dashboard/budget#synthese' },
      { label: 'Revenus', href: '/dashboard/budget#revenus' },
      { label: 'Charges', href: '/dashboard/budget#charges' }
    ]
  },
  { 
    label: 'Fiscalité', 
    href: '/dashboard/fiscalite', 
    icon: <Receipt className="text-foreground h-5 w-5 flex-shrink-0" />,
    subItems: [
      { label: 'Synthèse', href: '/dashboard/fiscalite#synthese' },
      { label: 'Impôt sur le revenu', href: '/dashboard/fiscalite#impot-revenu' },
      { label: 'IFI', href: '/dashboard/fiscalite#ifi' }
    ]
  },
  { 
    label: 'Transmission', 
    href: '/dashboard/transmission', 
    icon: <ArrowRightLeft className="text-foreground h-5 w-5 flex-shrink-0" />,
    subItems: [
      { label: 'Synthèse', href: '/dashboard/transmission#synthese' },
      { label: 'Libéralités', href: '/dashboard/transmission#liberalites' },
      { label: '1er décès', href: '/dashboard/transmission#premier-deces' },
      { label: '2nd décès', href: '/dashboard/transmission#second-deces' }
    ]
  },
  { 
    label: 'Stratégies', 
    href: '/dashboard/strategies', 
    icon: <Target className="text-foreground h-5 w-5 flex-shrink-0" />,
    subItems: [
      { label: 'Synthèse', href: '/dashboard/strategies#synthese' },
      { label: 'Optimisation fiscale', href: '/dashboard/strategies#optimisation-fiscale' },
      { label: 'Protection sociale', href: '/dashboard/strategies#protection-sociale' }
    ]
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

const SidebarMenuItem = ({ item, isOpen }: { item: any; isOpen: boolean }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasSubItems = item.subItems && item.subItems.length > 0;

  return (
    <div className="flex flex-col">
      <div 
        className="flex items-center cursor-pointer"
        onClick={() => hasSubItems && setIsExpanded(!isExpanded)}
      >
        <SidebarLink link={item} />
        {hasSubItems && isOpen && (
          <ChevronDown 
            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        )}
      </div>
      
      {hasSubItems && isExpanded && isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="ml-6 mt-1 flex flex-col gap-1"
        >
          {item.subItems.map((subItem: any, idx: number) => (
            <a
              key={idx}
              href={subItem.href}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded-md hover:bg-accent"
            >
              {subItem.label}
            </a>
          ))}
        </motion.div>
      )}
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
            {menuItems.map((item, idx) => (
              <SidebarMenuItem key={idx} item={item} isOpen={open} />
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