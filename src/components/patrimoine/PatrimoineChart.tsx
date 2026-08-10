import React, { useMemo } from 'react';
import { SectorsDonut } from '@/components/ui/sectors-donut';
import { Asset } from '@/services/assetService';
import { Passif, Emprunt } from '@/services/passifService';
import { getAssetCategory } from '@/constants/assetTypes';
interface PatrimoineChartProps {
  assets: Asset[];
  passifs: Passif[];
  emprunts: Emprunt[];
  selectedCategory: string | null;
}
const CATEGORY_COLORS: Record<string, string> = {
  'actifs immobiliers': '#05E8A4',
  'actifs mobiliers corporels': '#2609D6',
  'actifs professionnels': '#D5B7FF',
  'épargne retraite et prévoyance': '#7B0700',
  'épargne et assurance-vie': '#FF0095',
  'épargne salariale': '#FF8B55',
  'épargne bancaire / liquidités': '#314A46',
  'valeurs mobilières et placements financiers': '#89FC00',
  'autres': '#FF8B55'
};
export const PatrimoineChart = ({
  assets,
  passifs,
  emprunts,
  selectedCategory
}: PatrimoineChartProps) => {
  const chartData = useMemo(() => {
    // Vue par catégorie pour les actifs
    const categoryData = assets.reduce((acc, asset) => {
      const category = getAssetCategory(asset.nature);
      const value = asset.valeur_estimee || 0;
      if (!acc[category]) {
        acc[category] = {
          category,
          value: 0,
          assets: []
        };
      }
      acc[category].value += value;
      acc[category].assets.push(asset);
      return acc;
    }, {} as Record<string, {
      category: string;
      value: number;
      assets: Asset[];
    }>);
    const actifData = Object.values(categoryData).map(item => ({
      name: item.category.charAt(0).toUpperCase() + item.category.slice(1),
      value: item.value,
      color: CATEGORY_COLORS[item.category] || '#FF8B55',
      assets: item.assets,
      type: 'actif'
    }));

    // Ajouter les passifs
    const totalPassifs = passifs.reduce((sum, passif) => sum + (passif.montant_du || 0), 0) + emprunts.reduce((sum, emprunt) => sum + (emprunt.capital_restant_du || 0), 0);
    if (totalPassifs > 0) {
      actifData.push({
        name: 'Passifs',
        value: totalPassifs,
        color: '#EF4444',
        assets: [],
        type: 'passif'
      });
    }
    return actifData.sort((a, b) => b.value - a.value);
  }, [assets, passifs, emprunts]);
  const totalActifs = chartData.filter(item => item.type === 'actif').reduce((sum, item) => sum + item.value, 0);
  const totalPassifs = chartData.filter(item => item.type === 'passif').reduce((sum, item) => sum + item.value, 0);
  const patrimoineNet = totalActifs - totalPassifs;
  const totalBrut = totalActifs + totalPassifs;
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };
  const formatCompact = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  };
  const sectors = chartData.map(item => ({
    label: item.name,
    pct: totalBrut > 0 ? (item.value / totalBrut) * 100 : 0,
    value: item.value,
    color: item.color
  }));
  return (
    <div title={formatCurrency(patrimoineNet)}>
      <SectorsDonut
        sectors={sectors}
        formatValue={formatCompact}
        centerLabel={formatCompact(patrimoineNet)}
        centerCaption="Patrimoine net"
      />
    </div>
  );
};