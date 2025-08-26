import React, { useState } from 'react';
import { ChevronDown, ChevronRight, TrendingUp, Search, Home, Car, Banknote, PiggyBank, Building2, Briefcase, CreditCard, Plus } from 'lucide-react';
import { Asset } from '@/services/assetService';
import { getAssetCategory } from '@/constants/assetTypes';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
interface PatrimoineSidebarProps {
  assets: Asset[];
  onAssetEdit: (asset: Asset) => void;
  selectedCategory: string | null;
  onCategorySelect: (category: string | null) => void;
  onAddAsset: () => void;
}
export const PatrimoineSidebar = ({
  assets,
  onAssetEdit,
  selectedCategory,
  onCategorySelect,
  onAddAsset
}: PatrimoineSidebarProps) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  // Fonction pour obtenir l'icône de catégorie
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'immobilier':
        return <Home className="h-4 w-4" />;
      case 'véhicules':
        return <Car className="h-4 w-4" />;
      case 'liquidités':
        return <Banknote className="h-4 w-4" />;
      case 'épargne':
        return <PiggyBank className="h-4 w-4" />;
      case 'immobilier d\'entreprise':
        return <Building2 className="h-4 w-4" />;
      case 'professionnel':
        return <Briefcase className="h-4 w-4" />;
      case 'passifs':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <Building2 className="h-4 w-4" />;
    }
  };

  // Grouper les actifs par catégorie
  const assetsByCategory = assets.reduce((acc, asset) => {
    const category = getAssetCategory(asset.nature);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(asset);
    return acc;
  }, {} as Record<string, Asset[]>);

  // Calculer la valeur totale du patrimoine
  const totalValue = assets.reduce((sum, asset) => sum + (asset.valeur_estimee || 0), 0);

  // Calculer la valeur par catégorie
  const categoryValues = Object.entries(assetsByCategory).map(([category, categoryAssets]) => {
    const value = categoryAssets.reduce((sum, asset) => sum + (asset.valeur_estimee || 0), 0);
    const percentage = totalValue > 0 ? value / totalValue * 100 : 0;
    return {
      category,
      value,
      percentage,
      count: categoryAssets.length
    };
  });
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Filtrer les catégories selon la recherche
  const filteredCategories = categoryValues.filter(({
    category
  }) => category.toLowerCase().includes(searchTerm.toLowerCase()) || assetsByCategory[category].some(asset => asset.nature.toLowerCase().includes(searchTerm.toLowerCase()) || asset.denomination?.toLowerCase().includes(searchTerm.toLowerCase())));
  return;
};