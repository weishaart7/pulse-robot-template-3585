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
import { AssetDetailsDialog } from './AssetDetailsDialog';

interface PatrimoineTreeViewProps {
  assets: Asset[];
  onAssetEdit: (asset: Asset) => void;
  onAssetDelete?: (asset: Asset) => void;
}

export const PatrimoineTreeView = ({ assets, onAssetEdit, onAssetDelete }: PatrimoineTreeViewProps) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
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

  // Couleurs par catégorie
  const categoryColors: Record<string, string> = {
    'IMMOBILIER': 'bg-[#05E8A4]',
    'FINANCIER': 'bg-[#89FC00]',
    'EPARGNE': 'bg-[#FF0095]',
    'PROFESSIONNEL': 'bg-[#D5B7FF]',
    'MOBILIER': 'bg-[#2609D6]',
    'AUTRES': 'bg-[#FF8B55]',
  };

  const getCategoryColor = (category: string) => {
    return categoryColors[category.toUpperCase()] || 'bg-primary';
  };

  return (
    <>
    <FullTable variant="categorized">
      <FullTable.Colgroup>
        <FullTable.Col className="w-[45%]" />
        <FullTable.Col className="w-[15%]" />
        <FullTable.Col className="w-[15%]" />
        <FullTable.Col className="w-[15%]" />
        <FullTable.Col className="w-[10%]" />
      </FullTable.Colgroup>
      <FullTable.Header>
        <FullTable.Row>
          <FullTable.Head>Nom</FullTable.Head>
          <FullTable.Head>Répartition</FullTable.Head>
          <FullTable.Head>Valeur</FullTable.Head>
          <FullTable.Head>+/- value Tout</FullTable.Head>
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
              <FullTable.Row isCategory>
                <FullTable.Cell>
                  <Button
                    variant="ghost"
                    className="p-0 h-auto font-medium flex items-center gap-3 hover:bg-transparent"
                    onClick={() => toggleCategory(category)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div className={`w-2 h-2 rounded-full ${getCategoryColor(category)}`} />
                    <span className="text-foreground">{category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()}</span>
                  </Button>
                </FullTable.Cell>
                <FullTable.Cell>
                  <span className="font-semibold">{categoryWeight} %</span>
                </FullTable.Cell>
                <FullTable.Cell>
                  <span className="font-semibold">{formatCurrency(categoryValue)}</span>
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
                  <FullTable.Row 
                    key={asset.id} 
                    className="border-t border-border/30 cursor-pointer hover:bg-muted/30"
                    onClick={() => {
                      setSelectedAsset(asset);
                      setDetailsOpen(true);
                    }}
                  >
                    <FullTable.Cell className="pl-14 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${getCategoryColor(category)} opacity-60`} />
                        <div className="flex-1">
                          <div className="font-normal text-sm text-foreground">{asset.denomination || asset.nature}</div>
                          {asset.etablissement && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {asset.etablissement}
                            </div>
                          )}
                        </div>
                      </div>
                    </FullTable.Cell>
                    <FullTable.Cell className="py-2.5">
                      <span className="text-sm text-muted-foreground">{assetWeight} %</span>
                    </FullTable.Cell>
                    <FullTable.Cell className="py-2.5">
                      <span className="text-sm text-foreground">{asset.valeur_estimee ? formatCurrency(asset.valeur_estimee) : 'Non évalué'}</span>
                    </FullTable.Cell>
                    <FullTable.Cell className="py-2.5">
                      <span className="text-muted-foreground text-sm">—</span>
                    </FullTable.Cell>
                    <FullTable.Cell className="py-2.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="rounded-full shadow-none h-8 w-8"
                              aria-label="Open edit menu"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal size={16} strokeWidth={2} aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              onAssetEdit(asset);
                            }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            {onAssetDelete && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                onAssetDelete(asset);
                              }}>
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
          <FullTable.Cell colSpan={2} className="font-bold text-foreground text-base">
            Total
          </FullTable.Cell>
          <FullTable.Cell className="font-bold text-foreground text-base">
            {formatCurrency(totalValue)}
          </FullTable.Cell>
          <FullTable.Cell className="font-semibold text-foreground">
            —
          </FullTable.Cell>
          <FullTable.Cell> </FullTable.Cell>
        </FullTable.Row>
      </FullTable.Body>
    </FullTable>

    <AssetDetailsDialog 
      asset={selectedAsset}
      open={detailsOpen}
      onOpenChange={setDetailsOpen}
    />
    </>
  );
};