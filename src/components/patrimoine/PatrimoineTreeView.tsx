import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Asset } from '@/services/assetService';
import { getAssetCategory } from '@/constants/assetTypes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FullTable } from '@/components/ui/full-table';
import { useFamilyProfile, useMaritalStatus } from '@/hooks/useFamilyData';

interface PatrimoineTreeViewProps {
  assets: Asset[];
  onAssetEdit: (asset: Asset) => void;
}

export const PatrimoineTreeView = ({ assets, onAssetEdit }: PatrimoineTreeViewProps) => {
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
      <FullTable.Body striped interactive>
        {Object.entries(assetsByCategory).map(([category, categoryAssets]) => {
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
                    <Badge variant="secondary" className="ml-2 uppercase">
                      {categoryAssets.length}
                    </Badge>
                  </Button>
                </FullTable.Cell>
                <FullTable.Cell>
                  <span className="text-muted-foreground">—</span>
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
                <FullTable.Cell>—</FullTable.Cell>
              </FullTable.Row>

              {/* Lignes des actifs de la catégorie */}
              {isExpanded && categoryAssets.map((asset) => {
                const assetWeight = calculateWeight(asset.valeur_estimee || 0);
                
                return (
                  <FullTable.Row key={asset.id}>
                    <FullTable.Cell className="pl-8">
                      <div>
                        <div className="font-normal">{asset.nature}</div>
                        {asset.denomination && (
                          <div className="text-sm text-muted-foreground">
                            {asset.denomination}
                          </div>
                        )}
                      </div>
                    </FullTable.Cell>
                    <FullTable.Cell>
                      {formatDetenteur(asset.detenteur)}
                    </FullTable.Cell>
                    <FullTable.Cell>
                      {assetWeight}%
                    </FullTable.Cell>
                    <FullTable.Cell>
                      {asset.valeur_estimee ? formatCurrency(asset.valeur_estimee) : 'Non évalué'}
                    </FullTable.Cell>
                    <FullTable.Cell>
                      <span className="text-muted-foreground">—</span>
                    </FullTable.Cell>
                    <FullTable.Cell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAssetEdit(asset)}
                        className="h-8 px-2"
                      >
                        Modifier
                      </Button>
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
          <FullTable.Cell>—</FullTable.Cell>
        </FullTable.Row>
      </FullTable.Body>
    </FullTable>
  );
};