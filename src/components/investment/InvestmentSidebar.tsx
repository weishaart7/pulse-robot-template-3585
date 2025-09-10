import React from 'react';
import { Home, Shield, Clock, Building, TrendingUp, DollarSign, FileText, Briefcase } from 'lucide-react';
import { Tree, TreeItem, TreeItemLabel } from '@/components/ui/tree';
import { hotkeysCoreFeature, syncDataLoaderFeature } from '@headless-tree/core';
import { useTree } from '@headless-tree/react';

interface NavigationItem {
  name: string;
  id: string;
  icon?: React.ElementType;
  children?: string[];
}

const navigationItems: Record<string, NavigationItem> = {
  'root': {
    name: 'Navigation',
    id: 'root',
    children: ['tableau-de-bord', 'assurance', 'retraite', 'immobilier', 'private-equity', 'financier', 'produits-structures', 'investir-societe'],
  },
  'tableau-de-bord': {
    name: 'Tableau de bord',
    id: 'tableau-de-bord',
    icon: Home,
  },
  'assurance': {
    name: 'Assurance',
    id: 'assurance',
    icon: Shield,
    children: ['assurance-vie', 'assurance-vie-lux', 'contrat-capitalisation'],
  },
  'assurance-vie': {
    name: 'Assurance-vie',
    id: 'assurance-vie',
  },
  'assurance-vie-lux': {
    name: 'Assurance-vie luxembourgeoise',
    id: 'assurance-vie-lux',
  },
  'contrat-capitalisation': {
    name: 'Contrat de capitalisation',
    id: 'contrat-capitalisation',
  },
  'retraite': {
    name: 'Retraite',
    id: 'retraite',
    icon: Clock,
    children: ['per'],
  },
  'per': {
    name: 'PER',
    id: 'per',
  },
  'immobilier': {
    name: 'Immobilier',
    id: 'immobilier',
    icon: Building,
    children: ['scpi', 'club-deal'],
  },
  'scpi': {
    name: 'SCPI',
    id: 'scpi',
  },
  'club-deal': {
    name: 'Club deal',
    id: 'club-deal',
  },
  'private-equity': {
    name: 'Private Equity',
    id: 'private-equity',
    icon: TrendingUp,
    children: ['gfi-gfa', 'fonds-private-equity', 'investissements-alternatifs'],
  },
  'gfi-gfa': {
    name: 'GFI / GFA',
    id: 'gfi-gfa',
  },
  'fonds-private-equity': {
    name: 'Fonds de Private Equity',
    id: 'fonds-private-equity',
  },
  'investissements-alternatifs': {
    name: 'Investissements alternatifs',
    id: 'investissements-alternatifs',
  },
  'financier': {
    name: 'Financier',
    id: 'financier',
    icon: DollarSign,
  },
  'produits-structures': {
    name: 'Produits structurés',
    id: 'produits-structures',
    icon: FileText,
  },
  'investir-societe': {
    name: 'Investir en société',
    id: 'investir-societe',
    icon: Briefcase,
    children: ['150-0-b-ter', 'contrat-capitalisation-pm'],
  },
  '150-0-b-ter': {
    name: '150 0-B Ter',
    id: '150-0-b-ter',
  },
  'contrat-capitalisation-pm': {
    name: 'Contrat de capitalisation PM',
    id: 'contrat-capitalisation-pm',
  },
};

interface InvestmentSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export const InvestmentSidebar: React.FC<InvestmentSidebarProps> = ({
  activeSection,
  onSectionChange,
}) => {
  const tree = useTree<NavigationItem>({
    initialState: {
      expandedItems: ['assurance', 'retraite', 'immobilier', 'private-equity', 'investir-societe'],
      selectedItems: [activeSection],
    },
    indent: 16,
    rootItemId: 'root',
    getItemName: (item) => item.getItemData().name,
    isItemFolder: (item) => (item.getItemData()?.children?.length ?? 0) > 0,
    dataLoader: {
      getItem: (itemId) => navigationItems[itemId],
      getChildren: (itemId) => navigationItems[itemId].children ?? [],
    },
    features: [syncDataLoaderFeature, hotkeysCoreFeature],
  });

  const handleItemClick = (item: any) => {
    const itemData = item.getItemData();
    if (!itemData.children) {
      onSectionChange(itemData.id);
    }
  };

  return (
    <div className="w-64 bg-background border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-start">
          <img 
            src="/lovable-uploads/885a3f23-323a-4a39-94ee-bfd6cb4f0eb5.png" 
            alt="iMerisinvest" 
            className="h-12 w-auto object-contain"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3">
        <Tree
          className="relative before:absolute before:inset-0 before:-ms-1 before:bg-[repeating-linear-gradient(to_right,transparent_0,transparent_calc(var(--tree-indent)-1px),var(--border)_calc(var(--tree-indent)-1px),var(--border)_calc(var(--tree-indent)))]"
          indent={16}
          tree={tree}
          toggleIconType="plus-minus"
        >
          {tree.getItems().map((item) => {
            const itemData = item.getItemData();
            const isActive = activeSection === itemData.id;
            
            // Skip root item
            if (itemData.id === 'root') return null;
            
            return (
              <TreeItem 
                key={item.getId()} 
                item={item}
                onClick={() => handleItemClick(item)}
              >
                <TreeItemLabel 
                  className={`${isActive ? 'bg-primary/10 text-primary' : ''} ${itemData.icon ? '' : 'ml-6'}`}
                >
                  <div className="flex items-center gap-2">
                    {itemData.icon && <itemData.icon className="w-4 h-4" />}
                    <span>{itemData.name}</span>
                  </div>
                </TreeItemLabel>
              </TreeItem>
            );
          })}
        </Tree>
      </nav>
    </div>
  );
};