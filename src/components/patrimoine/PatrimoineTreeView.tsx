import React, { useState } from 'react';
import { ChevronDown, ChevronRight, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Asset } from '@/services/assetService';
import { getAssetCategory } from '@/constants/assetTypes';
import { Button } from '@/components/ui/button';
import { FullTable } from '@/components/ui/full-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useFamilyProfile, useMaritalStatus } from '@/hooks/useFamilyData';

interface PatrimoineTreeViewProps {
  assets: Asset[];
  onAssetEdit: (asset: Asset) => void;
  onAssetDelete?: (asset: Asset) => void;
}

export const PatrimoineTreeView = ({ assets, onAssetEdit, onAssetDelete }: PatrimoineTreeViewProps) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const { data: familyProfile } = useFamilyProfile();
  const { data: maritalStatus } = useMaritalStatus();

  const totalValue = assets.reduce((sum, asset) => sum + (asset.valeur_estimee || 0), 0);

  // Grouper les actifs par catégorie
  const assetsByCategory = assets.reduce((acc, asset) => {
    const category = getAssetCategory(asset.nature);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(asset);
    return acc;
  }, {} as Record<string, Asset[]>);

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
      maximumFractionDigits: 0,
    }).format(value);
  };

  const calculateWeight = (assetValue: number) => {
    return totalValue > 0 ? ((assetValue / totalValue) * 100).toFixed(2) : '0.00';
  };

  const formatDetenteur = (detenteur: string | undefined) => {
    if (!detenteur) return familyProfile?.prenom || 'Utilisateur';
    
    switch (detenteur.toLowerCase()) {
      case 'user':
      case 'utilisateur':
        return familyProfile?.prenom || 'Utilisateur';
      case 'spouse':
      case 'conjoint':
        return maritalStatus?.prenom_conjoint || 'Conjoint';
      case 'common':
      case 'commun':
      case 'couple':
        return 'Commun';
      default:
        return detenteur;
    }
  };

  return (
    <FullTable>
      <FullTable.Colgroup>
        <FullTable.Col className="w-[30%]" />
        <FullTable.Col className="w-[15%]" />
        <FullTable.Col className="w-[10%]" />
        <FullTable.Col className="w-[15%]" />
        <FullTable.Col className="w-[15%]" />
        <FullTable.Col className="w-[15%]" />
      </FullTable.Colgroup>
      <FullTable.Header>
        <FullTable.Row>
          <FullTable.Head>Catégorie / Actif</FullTable.Head>
          <FullTable.Head>Détenteur</FullTable.Head>
          <FullTable.Head>Poids</FullTable.Head>
          <FullTable.Head>Valeur</FullTable.Head>
          <FullTable.Head>+/- Value</FullTable.Head>
          <FullTable.Head>Actions</FullTable.Head>
        </FullTable.Row>
      </FullTable.Header>
      <FullTable.Body interactive>
        {Object.entries(assetsByCategory)
          .sort(([, assetsA], [, assetsB]) => {
            const valueA = assetsA.reduce((sum, asset) => sum + (asset.valeur_estimee || 0), 0);
            const valueB = assetsB.reduce((sum, asset) => sum + (asset.valeur_estimee || 0), 0);
            return valueB - valueA; // Tri décroissant (plus haute valeur en premier)
          })
          .map(([category, categoryAssets]) => {
          const categoryValue = categoryAssets.reduce((sum, asset) => sum + (asset.valeur_estimee || 0), 0);
          const categoryWeight = calculateWeight(categoryValue);
          const isExpanded = expandedCategories.has(category);

          return (
            <React.Fragment key={category}>
              {/* Ligne de catégorie */}
              <FullTable.Row>
                <FullTable.Cell>
                  <Button
                    variant="ghost"
                    className="p-0 h-auto font-normal flex items-center gap-2"
                    onClick={() => toggleCategory(category)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                     {category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()}
                  </Button>
                </FullTable.Cell>
                <FullTable.Cell>
                  {" "}
                </FullTable.Cell>
                <FullTable.Cell>
                  {categoryWeight}%
                </FullTable.Cell>
                <FullTable.Cell>
                  {formatCurrency(categoryValue)}
                </FullTable.Cell>
                <FullTable.Cell>
                  <span className="text-muted-foreground">—</span>
                </FullTable.Cell>
                <FullTable.Cell> </FullTable.Cell>
              </FullTable.Row>

              {/* Lignes des actifs de la catégorie */}
              {isExpanded && categoryAssets.map((asset) => {
                const assetWeight = calculateWeight(asset.valeur_estimee || 0);
                
                return (
                  <FullTable.Row key={asset.id} className="border-t border-gray-alpha-400 first:border-t-0">
                    <FullTable.Cell className="pl-12 bg-background-200 py-0.5">
                      <div>
                        <div className="font-normal text-sm">{asset.nature}</div>
                        {asset.denomination && (
                          <div className="text-xs text-muted-foreground">
                            {asset.denomination}
                          </div>
                        )}
                      </div>
                    </FullTable.Cell>
                    <FullTable.Cell className="bg-background-200 py-0.5">
                      <span className="text-sm">{formatDetenteur(asset.detenteur)}</span>
                    </FullTable.Cell>
                    <FullTable.Cell className="bg-background-200 py-0.5">
                      <span className="text-sm">{assetWeight}%</span>
                    </FullTable.Cell>
                    <FullTable.Cell className="bg-background-200 py-0.5">
                      <span className="text-sm">{asset.valeur_estimee ? formatCurrency(asset.valeur_estimee) : 'Non évalué'}</span>
                    </FullTable.Cell>
                    <FullTable.Cell className="bg-background-200 py-0.5">
                      <span className="text-muted-foreground text-sm">—</span>
                    </FullTable.Cell>
                    <FullTable.Cell className="bg-background-200 py-0.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="rounded-full shadow-none"
                              aria-label="Open edit menu"
                            >
                              <MoreHorizontal size={16} strokeWidth={2} aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => onAssetEdit(asset)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            {onAssetDelete && (
                              <DropdownMenuItem onClick={() => onAssetDelete(asset)}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </FullTable.Cell>
                  </FullTable.Row>
                );
              })}
            </React.Fragment>
          );
        })}
        
        <FullTable.Row isTotal>
          <FullTable.Cell colSpan={3} className="font-semibold text-foreground">
            Total
          </FullTable.Cell>
          <FullTable.Cell className="font-semibold text-foreground">
            {formatCurrency(totalValue)}
          </FullTable.Cell>
          <FullTable.Cell className="font-semibold text-foreground">
            —
          </FullTable.Cell>
          <FullTable.Cell> </FullTable.Cell>
        </FullTable.Row>
      </FullTable.Body>
    </FullTable>
  );
};