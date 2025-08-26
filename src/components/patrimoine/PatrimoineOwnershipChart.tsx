import React, { useMemo } from 'react';
import { Asset } from '@/services/assetService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFamilyProfile, useMaritalStatus } from '@/hooks/useFamilyData';

interface PatrimoineOwnershipChartProps {
  assets: Asset[];
}

export const PatrimoineOwnershipChart = ({ assets }: PatrimoineOwnershipChartProps) => {
  const { data: familyProfile } = useFamilyProfile();
  const { data: maritalStatus } = useMaritalStatus();

  const isInCouple = useMemo(() => {
    return maritalStatus?.statut_couple && 
           ['marie', 'pacs', 'concubinage'].includes(maritalStatus.statut_couple.toLowerCase());
  }, [maritalStatus]);

  const ownershipData = useMemo(() => {
    const userFirstName = familyProfile?.prenom || 'Vous';
    const spouseFirstName = maritalStatus?.prenom_conjoint || 'Conjoint';

    // Catégoriser les actifs selon le détenteur
    const userAssets = assets.filter(asset => 
      asset.detenteur === 'user' || asset.detenteur === 'utilisateur' || !asset.detenteur
    );
    const spouseAssets = assets.filter(asset => 
      asset.detenteur === 'spouse' || asset.detenteur === 'conjoint'
    );
    const commonAssets = assets.filter(asset => 
      asset.detenteur === 'common' || asset.detenteur === 'commun' || asset.mode_detention === 'indivision'
    );

    const userValue = userAssets.reduce((sum, asset) => sum + (asset.valeur_estimee || 0), 0);
    const spouseValue = spouseAssets.reduce((sum, asset) => sum + (asset.valeur_estimee || 0), 0);
    const commonValue = commonAssets.reduce((sum, asset) => sum + (asset.valeur_estimee || 0), 0);
    
    const totalValue = userValue + spouseValue + commonValue;

    const categories = [
      {
        label: `Biens propres de ${userFirstName}`,
        value: userValue,
        percentage: totalValue > 0 ? (userValue / totalValue) * 100 : 0,
        color: '#E879F9', // primary purple
        show: true
      }
    ];

    if (isInCouple) {
      categories.push(
        {
          label: 'Biens communs',
          value: commonValue,
          percentage: totalValue > 0 ? (commonValue / totalValue) * 100 : 0,
          color: '#F97316', // orange
          show: true
        },
        {
          label: `Biens propres de ${spouseFirstName}`,
          value: spouseValue,
          percentage: totalValue > 0 ? (spouseValue / totalValue) * 100 : 0,
          color: '#06B6D4', // cyan
          show: true
        }
      );
    }

    return { categories: categories.filter(cat => cat.show), totalValue };
  }, [assets, familyProfile, maritalStatus, isInCouple]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (assets.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Répartition par détenteur</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Aucun actif à afficher
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Répartition par détenteur</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {ownershipData.categories.map((category, index) => (
          <div key={index} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{category.label}</span>
              <span className="text-sm text-muted-foreground">
                {formatCurrency(category.value)}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-8">
              <div
                className="h-8 rounded-full flex items-center justify-end pr-3 text-white text-sm font-medium transition-all duration-500 ease-out"
                style={{
                  width: `${Math.max(category.percentage, 2)}%`,
                  backgroundColor: category.color
                }}
              >
                {category.percentage > 10 && `${category.percentage.toFixed(1)}%`}
              </div>
            </div>
            {category.percentage <= 10 && (
              <div className="text-right text-xs text-muted-foreground">
                {category.percentage.toFixed(1)}%
              </div>
            )}
          </div>
        ))}
        
        <div className="pt-4 border-t border-border">
          <div className="flex justify-between items-center font-semibold">
            <span>Total du patrimoine</span>
            <span>{formatCurrency(ownershipData.totalValue)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};