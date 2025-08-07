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
import { useLocation, useNavigate } from 'react-router-dom';
import { Tree, TreeItem, TreeItemLabel } from '@/components/ui/tree';
import { hotkeysCoreFeature, syncDataLoaderFeature } from '@headless-tree/core';
import { useTree } from '@headless-tree/react';

import {
  Sidebar,
  SidebarBody,
} from '@/components/ui/sidebar-animated';

interface MenuItem {
  id: string;
  label: string;
  href?: string;
  icon?: React.ReactNode;
  children?: string[];
}

const menuItems: Record<string, MenuItem> = {
  dashboard: {
    id: 'dashboard',
    label: 'Vue d\'ensemble',
    href: '/dashboard',
    icon: <Home className="text-foreground h-4 w-4 flex-shrink-0" />
  },
  famille: {
    id: 'famille',
    label: 'Famille',
    icon: <Users className="text-foreground h-4 w-4 flex-shrink-0" />,
    children: ['famille-synthese', 'famille-profil', 'famille-liens']
  },
  'famille-synthese': {
    id: 'famille-synthese',
    label: 'Synthèse',
    href: '/dashboard/famille'
  },
  'famille-profil': {
    id: 'famille-profil',
    label: 'Profil familial',
    href: '/dashboard/famille/profil'
  },
  'famille-liens': {
    id: 'famille-liens',
    label: 'Liens familiaux',
    href: '/dashboard/famille/liens'
  },
  patrimoine: {
    id: 'patrimoine',
    label: 'Patrimoine',
    icon: <Building2 className="text-foreground h-4 w-4 flex-shrink-0" />,
    children: ['patrimoine-synthese', 'patrimoine-immobilier', 'patrimoine-financier', 'patrimoine-professionnel']
  },
  'patrimoine-synthese': {
    id: 'patrimoine-synthese',
    label: 'Synthèse',
    href: '/dashboard/patrimoine'
  },
  'patrimoine-immobilier': {
    id: 'patrimoine-immobilier',
    label: 'Immobilier',
    href: '/dashboard/patrimoine/immobilier'
  },
  'patrimoine-financier': {
    id: 'patrimoine-financier',
    label: 'Financier',
    href: '/dashboard/patrimoine/financier'
  },
  'patrimoine-professionnel': {
    id: 'patrimoine-professionnel',
    label: 'Professionnel',
    href: '/dashboard/patrimoine/professionnel'
  },
  societes: {
    id: 'societes',
    label: 'Sociétés',
    icon: <Briefcase className="text-foreground h-4 w-4 flex-shrink-0" />,
    children: ['societes-synthese', 'societes-holdings', 'societes-operationnelles']
  },
  'societes-synthese': {
    id: 'societes-synthese',
    label: 'Synthèse',
    href: '/dashboard/societes'
  },
  'societes-holdings': {
    id: 'societes-holdings',
    label: 'Holdings',
    href: '/dashboard/societes/holdings'
  },
  'societes-operationnelles': {
    id: 'societes-operationnelles',
    label: 'Opérationnelles',
    href: '/dashboard/societes/operationnelles'
  },
  retraite: {
    id: 'retraite',
    label: 'Retraite',
    icon: <Clock className="text-foreground h-4 w-4 flex-shrink-0" />,
    children: ['retraite-synthese', 'retraite-simulation', 'retraite-optimisation']
  },
  'retraite-synthese': {
    id: 'retraite-synthese',
    label: 'Synthèse',
    href: '/dashboard/retraite'
  },
  'retraite-simulation': {
    id: 'retraite-simulation',
    label: 'Simulation',
    href: '/dashboard/retraite/simulation'
  },
  'retraite-optimisation': {
    id: 'retraite-optimisation',
    label: 'Optimisation',
    href: '/dashboard/retraite/optimisation'
  },
  budget: {
    id: 'budget',
    label: 'Budget',
    icon: <Wallet className="text-foreground h-4 w-4 flex-shrink-0" />,
    children: ['budget-synthese', 'budget-revenus', 'budget-charges']
  },
  'budget-synthese': {
    id: 'budget-synthese',
    label: 'Synthèse',
    href: '/dashboard/budget'
  },
  'budget-revenus': {
    id: 'budget-revenus',
    label: 'Revenus',
    href: '/dashboard/budget/revenus'
  },
  'budget-charges': {
    id: 'budget-charges',
    label: 'Charges',
    href: '/dashboard/budget/charges'
  },
  fiscalite: {
    id: 'fiscalite',
    label: 'Fiscalité',
    icon: <Receipt className="text-foreground h-4 w-4 flex-shrink-0" />,
    children: ['fiscalite-synthese', 'fiscalite-ir', 'fiscalite-ifi', 'fiscalite-optimisation']
  },
  'fiscalite-synthese': {
    id: 'fiscalite-synthese',
    label: 'Synthèse',
    href: '/dashboard/fiscalite'
  },
  'fiscalite-ir': {
    id: 'fiscalite-ir',
    label: 'Impôt sur le revenu',
    href: '/dashboard/fiscalite/ir'
  },
  'fiscalite-ifi': {
    id: 'fiscalite-ifi',
    label: 'IFI',
    href: '/dashboard/fiscalite/ifi'
  },
  'fiscalite-optimisation': {
    id: 'fiscalite-optimisation',
    label: 'Optimisation',
    href: '/dashboard/fiscalite/optimisation'
  },
  transmission: {
    id: 'transmission',
    label: 'Transmission',
    icon: <ArrowRightLeft className="text-foreground h-4 w-4 flex-shrink-0" />,
    children: ['transmission-synthese', 'transmission-liberalites', 'transmission-premier-deces', 'transmission-second-deces']
  },
  'transmission-synthese': {
    id: 'transmission-synthese',
    label: 'Synthèse',
    href: '/dashboard/transmission'
  },
  'transmission-liberalites': {
    id: 'transmission-liberalites',
    label: 'Libéralités',
    href: '/dashboard/transmission/liberalites'
  },
  'transmission-premier-deces': {
    id: 'transmission-premier-deces',
    label: '1er décès',
    href: '/dashboard/transmission/premier-deces'
  },
  'transmission-second-deces': {
    id: 'transmission-second-deces',
    label: '2nd décès',
    href: '/dashboard/transmission/second-deces'
  },
  strategies: {
    id: 'strategies',
    label: 'Stratégies',
    icon: <Target className="text-foreground h-4 w-4 flex-shrink-0" />,
    children: ['strategies-synthese', 'strategies-patrimoniales', 'strategies-successorales']
  },
  'strategies-synthese': {
    id: 'strategies-synthese',
    label: 'Synthèse',
    href: '/dashboard/strategies'
  },
  'strategies-patrimoniales': {
    id: 'strategies-patrimoniales',
    label: 'Patrimoniales',
    href: '/dashboard/strategies/patrimoniales'
  },
  'strategies-successorales': {
    id: 'strategies-successorales',
    label: 'Successorales',
    href: '/dashboard/strategies/successorales'
  },
  root: {
    id: 'root',
    label: 'Menu',
    children: ['dashboard', 'famille', 'patrimoine', 'societes', 'retraite', 'budget', 'fiscalite', 'transmission', 'strategies']
  }
};

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
  const location = useLocation();
  const navigate = useNavigate();

  // Determine expanded items based on current route
  const getExpandedItems = () => {
    const path = location.pathname;
    const expanded = [];
    
    if (path.startsWith('/dashboard/famille')) expanded.push('famille');
    if (path.startsWith('/dashboard/patrimoine')) expanded.push('patrimoine');
    if (path.startsWith('/dashboard/societes')) expanded.push('societes');
    if (path.startsWith('/dashboard/retraite')) expanded.push('retraite');
    if (path.startsWith('/dashboard/budget')) expanded.push('budget');
    if (path.startsWith('/dashboard/fiscalite')) expanded.push('fiscalite');
    if (path.startsWith('/dashboard/transmission')) expanded.push('transmission');
    if (path.startsWith('/dashboard/strategies')) expanded.push('strategies');
    
    return expanded;
  };

  const tree = useTree<MenuItem>({
    initialState: {
      expandedItems: getExpandedItems(),
    },
    indent: 16,
    rootItemId: 'root',
    getItemName: (item) => item.getItemData().label,
    isItemFolder: (item) => (item.getItemData()?.children?.length ?? 0) > 0,
    dataLoader: {
      getItem: (itemId) => menuItems[itemId],
      getChildren: (itemId) => menuItems[itemId].children ?? [],
    },
    features: [syncDataLoaderFeature, hotkeysCoreFeature],
  });

  const handleItemClick = (item: any) => {
    const itemData = item.getItemData();
    if (itemData.href) {
      navigate(itemData.href);
    }
  };

  return (
    <Sidebar open={open} setOpen={setOpen}>
      <SidebarBody className="justify-between gap-10">
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          {open ? <Logo /> : <LogoIcon />}
          <div className="mt-8 flex flex-col gap-1">
            <Tree
              className="relative"
              indent={16}
              tree={tree}
              toggleIconType="chevron"
            >
              {tree.getItems().map((item) => {
                const itemData = item.getItemData();
                const isActive = itemData.href && location.pathname === itemData.href;
                
                return (
                  <TreeItem 
                    key={item.getId()} 
                    item={item}
                    onClick={() => handleItemClick(item)}
                    className="w-full"
                  >
                    <TreeItemLabel 
                      className={`
                        flex items-center gap-2 w-full cursor-pointer transition-colors
                        ${isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent/50'}
                        ${!item.isFolder() ? 'text-sm text-muted-foreground' : ''}
                      `}
                    >
                      {itemData.icon && <span className="flex-shrink-0">{itemData.icon}</span>}
                      {(open || !itemData.icon) && <span className="truncate">{itemData.label}</span>}
                    </TreeItemLabel>
                  </TreeItem>
                );
              })}
            </Tree>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 cursor-pointer">
            <div className="h-7 w-7 flex-shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            {open && (
              <span className="text-sm text-foreground truncate">
                {user?.email || 'Utilisateur'}
              </span>
            )}
          </div>
        </div>
      </SidebarBody>
    </Sidebar>
  );
}