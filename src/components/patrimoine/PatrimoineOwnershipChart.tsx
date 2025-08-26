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

    // Calculer les valeurs selon le détenteur et les quote-parts
    let userValue = 0;
    let spouseValue = 0;

    assets.forEach(asset => {
      const estimatedValue = asset.valeur_estimee || 0;
      
      if (asset.detenteur === 'user' || asset.detenteur === 'utilisateur' || !asset.detenteur) {
        // Biens propres de l'utilisateur
        userValue += estimatedValue;
      } else if (asset.detenteur === 'spouse' || asset.detenteur === 'conjoint') {
        // Biens propres du conjoint
        spouseValue += estimatedValue;
      } else if (asset.detenteur === 'common' || asset.detenteur === 'commun' || asset.detenteur === 'couple') {
        // Biens communs - répartir selon les quote-parts
        const userQuote = (asset.pourcentage_utilisateur || 50) / 100;
        const spouseQuote = (asset.pourcentage_conjoint || 50) / 100;
        
        userValue += estimatedValue * userQuote;
        spouseValue += estimatedValue * spouseQuote;
      }
    });
    
    const totalValue = userValue + spouseValue;

    const categories = [
      {
        label: `Biens de ${userFirstName}`,
        value: userValue,
        percentage: totalValue > 0 ? (userValue / totalValue) * 100 : 0,
        color: '#E879F9', // primary purple
        show: true
      }
    ];

    if (isInCouple && spouseValue > 0) {
      categories.push({
        label: `Biens de ${spouseFirstName}`,
        value: spouseValue,
        percentage: totalValue > 0 ? (spouseValue / totalValue) * 100 : 0,
        color: '#06B6D4', // cyan
        show: true
      });
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
        {/* Graphique en barres */}
        <div className="space-y-3">
          {ownershipData.categories.map((category, index) => (
            <div key={index} className="w-full bg-muted h-8">
              <div
                className="h-8 flex items-center justify-center text-white text-sm font-medium transition-all duration-500 ease-out"
                style={{
                  width: `${Math.max(category.percentage, 2)}%`,
                  backgroundColor: category.color
                }}
              >
                {category.percentage > 15 && `${category.percentage.toFixed(1)}%`}
              </div>
            </div>
          ))}
        </div>
        
        {/* Légende */}
        <div className="grid grid-cols-1 gap-3 pt-4">
          {ownershipData.categories.map((category, index) => (
            <div key={index} className="flex items-center gap-3">
              <div 
                className="w-4 h-4 flex-shrink-0"
                style={{ backgroundColor: category.color }}
              />
              <div className="flex-1">
                <div className="text-xs font-medium">{category.label}</div>
                <div className="text-xs text-muted-foreground">
                  {formatCurrency(category.value)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};