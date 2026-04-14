import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, MoreHorizontal, Edit, Trash2, Search, TrendingUp, TrendingDown } from 'lucide-react';
import { Asset } from '@/services/assetService';
import { getAssetCategory, NATURES_WITHOUT_ACQUISITION } from '@/constants/assetTypes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FullTable } from '@/components/ui/full-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useFamilyProfile, useMaritalStatus } from '@/hooks/useFamilyData';
import { AssetDetailsDialog } from './AssetDetailsDialog';
import { formatCurrency, getCategoryColor, calculatePlusValue, mapDetenteurToDisplay } from '@/lib/patrimoine/utils';

interface PatrimoineTreeViewProps {
  assets: Asset[];
  onAssetEdit: (asset: Asset) => void;
  onAssetDelete?: (asset: Asset) => void;
}

export const PatrimoineTreeView = ({ assets, onAssetEdit, onAssetDelete }: PatrimoineTreeViewProps) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { data: familyProfile } = useFamilyProfile();
  const { data: maritalStatus } = useMaritalStatus();

  const familyInfo = useMemo(() => ({
    hasPartner: !!maritalStatus?.prenom_conjoint,
    userFirstName: familyProfile?.prenom || 'Utilisateur',
    partnerFirstName: maritalStatus?.prenom_conjoint || 'Conjoint'
  }), [familyProfile, maritalStatus]);

  // Filter assets based on search
  const filteredAssets = useMemo(() => {
    if (!searchQuery.trim()) return assets;
    const query = searchQuery.toLowerCase();
    return assets.filter(asset => 
      (asset.denomination?.toLowerCase().includes(query)) ||
      (asset.nature.toLowerCase().includes(query)) ||
      (asset.etablissement?.toLowerCase().includes(query))
    );
  }, [assets, searchQuery]);

  const totalValue = filteredAssets.reduce((sum, asset) => sum + (asset.valeur_estimee || 0), 0);

  // Group assets by category
  const assetsByCategory = useMemo(() => {
    return filteredAssets.reduce((acc, asset) => {
      const category = getAssetCategory(asset.nature);
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(asset);
      return acc;
    }, {} as Record<string, Asset[]>);
  }, [filteredAssets]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const calculateWeight = (assetValue: number) => {
    return totalValue > 0 ? ((assetValue / totalValue) * 100).toFixed(2) : '0.00';
  };

  const formatDetenteur = (detenteur: string | undefined) => {
    return mapDetenteurToDisplay(detenteur, familyInfo);
  };

  // Calculate plus-value for display
  const getPlusValueDisplay = (asset: Asset) => {
    const { plusValue, hasData } = calculatePlusValue(
      asset.valeur_estimee,
      asset.valeur_acquisition,
      asset.frais_acquisition
    );
    
    if (!hasData) return { display: '—', className: 'text-muted-foreground', value: 0 };
    
    if (plusValue > 0) {
      return { 
        display: `+${formatCurrency(plusValue)}`, 
        className: 'text-green-600 dark:text-green-400',
        value: plusValue
      };
    } else if (plusValue < 0) {
      return { 
        display: formatCurrency(plusValue), 
        className: 'text-red-600 dark:text-red-400',
        value: plusValue
      };
    }
    return { display: '0 €', className: 'text-muted-foreground', value: 0 };
  };

  // Calculate category plus-value
  const getCategoryPlusValue = (categoryAssets: Asset[]) => {
    let total = 0;
    let hasAnyData = false;
    
    categoryAssets.forEach(asset => {
      const { plusValue, hasData } = calculatePlusValue(
        asset.valeur_estimee,
        asset.valeur_acquisition,
        asset.frais_acquisition
      );
      if (hasData) {
        total += plusValue;
        hasAnyData = true;
      }
    });

    if (!hasAnyData) return { display: '—', className: 'text-muted-foreground' };
    
    if (total > 0) {
      return { 
        display: `+${formatCurrency(total)}`, 
        className: 'text-green-600 dark:text-green-400 font-semibold'
      };
    } else if (total < 0) {
      return { 
        display: formatCurrency(total), 
        className: 'text-red-600 dark:text-red-400 font-semibold'
      };
    }
    return { display: '0 €', className: 'text-muted-foreground font-semibold' };
  };

  return (
    <>
      {/* Search bar */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un actif..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <FullTable variant="categorized">
        <FullTable.Colgroup>
          <FullTable.Col className="w-[35%]" />
          <FullTable.Col className="w-[15%]" />
          <FullTable.Col className="w-[15%]" />
          <FullTable.Col className="w-[15%]" />
          <FullTable.Col className="w-[12%]" />
          <FullTable.Col className="w-[8%]" />
        </FullTable.Colgroup>
        <FullTable.Header>
          <FullTable.Row>
            <FullTable.Head>Nom</FullTable.Head>
            <FullTable.Head>Détenteur</FullTable.Head>
            <FullTable.Head>Répartition</FullTable.Head>
            <FullTable.Head>Valeur</FullTable.Head>
            <FullTable.Head>+/- value</FullTable.Head>
            <FullTable.Head>Actions</FullTable.Head>
          </FullTable.Row>
        </FullTable.Header>
        <FullTable.Body interactive>
          {Object.entries(assetsByCategory)
            .sort(([, assetsA], [, assetsB]) => {
              const valueA = assetsA.reduce((sum, asset) => sum + (asset.valeur_estimee || 0), 0);
              const valueB = assetsB.reduce((sum, asset) => sum + (asset.valeur_estimee || 0), 0);
              return valueB - valueA;
            })
            .map(([category, categoryAssets]) => {
              const categoryValue = categoryAssets.reduce((sum, asset) => sum + (asset.valeur_estimee || 0), 0);
              const categoryWeight = calculateWeight(categoryValue);
              const isExpanded = expandedCategories.has(category);
              const categoryPlusValue = getCategoryPlusValue(categoryAssets);

              return (
                <React.Fragment key={category}>
                  {/* Category row */}
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
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getCategoryColor(category) }} />
                        <span className="text-foreground">{category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()}</span>
                      </Button>
                    </FullTable.Cell>
                    <FullTable.Cell>
                      <span className="text-muted-foreground">—</span>
                    </FullTable.Cell>
                    <FullTable.Cell>
                      <span className="font-semibold">{categoryWeight} %</span>
                    </FullTable.Cell>
                    <FullTable.Cell>
                      <span className="font-semibold">{formatCurrency(categoryValue)}</span>
                    </FullTable.Cell>
                    <FullTable.Cell>
                      <span className={categoryPlusValue.className}>{categoryPlusValue.display}</span>
                    </FullTable.Cell>
                    <FullTable.Cell> </FullTable.Cell>
                  </FullTable.Row>

                  {/* Asset rows */}
                  {isExpanded && categoryAssets.map((asset) => {
                    const assetWeight = calculateWeight(asset.valeur_estimee || 0);
                    const plusValueInfo = getPlusValueDisplay(asset);

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
                            <div className="w-1.5 h-1.5 rounded-full opacity-60" style={{ backgroundColor: getCategoryColor(category) }} />
                            <div className="flex-1">
                              <div className="font-normal text-sm text-foreground">
                                {asset.denomination || asset.nature}
                                {asset.mode_detention && asset.mode_detention !== 'Pleine propriété' && (
                                  <span className="ml-2 text-xs text-muted-foreground italic">({asset.mode_detention})</span>
                                )}
                              </div>
                              {asset.etablissement && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {asset.etablissement}
                                </div>
                              )}
                            </div>
                          </div>
                        </FullTable.Cell>
                        <FullTable.Cell className="py-2.5">
                          <span className="text-sm text-muted-foreground">{formatDetenteur(asset.detenteur)}</span>
                        </FullTable.Cell>
                        <FullTable.Cell className="py-2.5">
                          <span className="text-sm text-muted-foreground">{assetWeight} %</span>
                        </FullTable.Cell>
                        <FullTable.Cell className="py-2.5">
                          <span className="text-sm text-foreground">{asset.valeur_estimee ? formatCurrency(asset.valeur_estimee) : 'Non évalué'}</span>
                        </FullTable.Cell>
                        <FullTable.Cell className="py-2.5">
                          <span className={`text-sm ${plusValueInfo.className}`}>{plusValueInfo.display}</span>
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
            <FullTable.Cell colSpan={3} className="font-bold text-foreground text-base">
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
