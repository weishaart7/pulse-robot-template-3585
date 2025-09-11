import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
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
    children: ['tableau-de-bord', 'spacer-1', 'assurance', 'retraite', 'immobilier', 'private-equity', 'financier', 'produits-structures', 'spacer-2', 'investir-societe'],
  },
  'tableau-de-bord': {
    name: 'Tableau de bord',
    id: 'tableau-de-bord',
  },
  'spacer-1': {
    name: '',
    id: 'spacer-1',
  },
  'spacer-2': {
    name: '',
    id: 'spacer-2',
  },
  'assurance': {
    name: 'Assurance',
    id: 'assurance',
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
    children: ['per'],
  },
  'per': {
    name: 'PER',
    id: 'per',
  },
  'immobilier': {
    name: 'Immobilier',
    id: 'immobilier',
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
  },
  'produits-structures': {
    name: 'Produits structurés',
    id: 'produits-structures',
  },
  'investir-societe': {
    name: 'Investir en société',
    id: 'investir-societe',
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
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const tree = useTree<NavigationItem>({
    initialState: {
      expandedItems: expandedItems,
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
    } else {
      // Comportement accordion : fermer les autres sections ouvertes
      const isExpanded = expandedItems.includes(itemData.id);
      if (isExpanded) {
        // Fermer cette section
        setExpandedItems(expandedItems.filter(id => id !== itemData.id));
      } else {
        // Ouvrir seulement cette section (fermer les autres)
        setExpandedItems([itemData.id]);
      }
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
            className="h-16 w-auto object-contain"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3">
        <div className="space-y-1">
          {navigationItems.root.children?.map((childId) => {
            const itemData = navigationItems[childId];
            
            // Render spacers
            if (childId === 'spacer-1' || childId === 'spacer-2') {
              return <div key={childId} className="h-4" />;
            }
            
            const isActive = activeSection === itemData.id;
            const hasChildren = itemData.children && itemData.children.length > 0;
            const isExpanded = expandedItems.includes(itemData.id);
            
            return (
              <div key={childId} className="mb-1">
                <button
                  onClick={() => {
                    if (hasChildren) {
                      handleItemClick({ getItemData: () => itemData });
                    } else {
                      onSectionChange(itemData.id);
                    }
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-md text-sm transition-colors text-left ${
                    isActive 
                      ? 'bg-foreground text-background font-bold' 
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <span>{itemData.name}</span>
                  {hasChildren && (
                    <ChevronDown 
                      className={`w-4 h-4 transition-transform ${
                        isExpanded ? 'rotate-0' : '-rotate-90'
                      }`} 
                    />
                  )}
                </button>
                
                {/* Sous-sections */}
                {hasChildren && isExpanded && (
                  <div className="ml-4 mt-1 space-y-1">
                    {itemData.children?.map((subChildId) => {
                      const subItemData = navigationItems[subChildId];
                      const isSubActive = activeSection === subItemData.id;
                      
                      return (
                        <button
                          key={subChildId}
                          onClick={() => onSectionChange(subItemData.id)}
                          className={`w-full text-left p-2 rounded-md text-sm transition-colors ${
                            isSubActive 
                              ? 'bg-primary/10 text-primary' 
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                        >
                          {subItemData.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>
    </div>
  );
};