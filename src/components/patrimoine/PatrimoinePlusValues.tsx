import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useAssets } from '@/hooks/useAssets';
import { usePassifs, useEmprunts } from '@/hooks/usePassifs';
import { useFamilyProfile, useMaritalStatus } from '@/hooks/useFamilyData';
import { usePatrimoineCalculations } from '@/hooks/usePatrimoineCalculations';
import { getAssetCategory } from '@/constants/assetTypes';
import { getCategoryColor } from '@/lib/patrimoine/utils';

export const PatrimoinePlusValues = () => {
  const { assets } = useAssets();
  const { passifs } = usePassifs();
  const { emprunts } = useEmprunts();
  const { data: familyProfile } = useFamilyProfile();
  const { data: maritalStatus } = useMaritalStatus();

  const {
    plusValuesSummary,
    formatCurrency
  } = usePatrimoineCalculations({
    assets,
    passifs,
    emprunts,
    userFirstName: familyProfile?.prenom || 'Vous',
    spouseFirstName: maritalStatus?.prenom_conjoint || 'Conjoint',
    statutCouple: maritalStatus?.statut_couple
  });

  const { totalPlusValues, totalMoinsValues, netPlusValue, byCategory, assetsWithPlusValue } = plusValuesSummary;
  const isPositive = netPlusValue >= 0;

  const plusValues = assetsWithPlusValue.filter(a => a.plusValue > 0);
  const moinsValues = assetsWithPlusValue.filter(a => a.plusValue < 0).sort((a, b) => a.plusValue - b.plusValue);

  return (
    <div className="space-y-6">
      {/* Résumé en haut */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-lg bg-green-100 dark:bg-green-900">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Plus-values</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">+{formatCurrency(totalPlusValues)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-lg bg-red-100 dark:bg-red-900">
                <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Moins-values</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">-{formatCurrency(totalMoinsValues)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`p-2.5 rounded-lg ${isPositive ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                <Wallet className={`h-5 w-5 ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Résultat net</p>
                <p className={`text-2xl font-bold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isPositive ? '+' : ''}{formatCurrency(netPlusValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tableau détaillé des plus/moins-values */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Détail par actif</CardTitle>
            </CardHeader>
            <CardContent>
              {assetsWithPlusValue.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 text-sm">
                  Renseignez la valeur d'acquisition de vos actifs pour calculer les plus-values
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 font-medium text-muted-foreground">Actif</th>
                        <th className="pb-3 font-medium text-muted-foreground text-right">Acquisition</th>
                        <th className="pb-3 font-medium text-muted-foreground text-right">Estimation</th>
                        <th className="pb-3 font-medium text-muted-foreground text-right">+/- Value</th>
                        <th className="pb-3 font-medium text-muted-foreground text-right">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assetsWithPlusValue.map(asset => {
                        const pct = asset.valeurAcquisition > 0
                          ? ((asset.plusValue / asset.valeurAcquisition) * 100)
                          : 0;
                        const positive = asset.plusValue >= 0;
                        return (
                          <tr key={asset.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                            <td className="py-3">
                              <div>
                                <p className="font-medium text-foreground">{asset.denomination}</p>
                                <p className="text-xs text-muted-foreground">{asset.nature}</p>
                              </div>
                            </td>
                            <td className="py-3 text-right text-muted-foreground">{formatCurrency(asset.valeurAcquisition)}</td>
                            <td className="py-3 text-right text-foreground font-medium">{formatCurrency(asset.valeurEstimee)}</td>
                            <td className="py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {positive ? (
                                  <ArrowUpRight className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                                ) : (
                                  <ArrowDownRight className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                                )}
                                <span className={`font-semibold ${positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                  {positive ? '+' : ''}{formatCurrency(asset.plusValue)}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 text-right">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                positive 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                                  : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                              }`}>
                                {positive ? '+' : ''}{pct.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Répartition par catégorie */}
        <Card>
          <CardHeader>
            <CardTitle>Par catégorie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(byCategory)
              .filter(([_, data]) => data.count > 0)
              .sort((a, b) => Math.abs(b[1].plusValue) - Math.abs(a[1].plusValue))
              .map(([category, data]) => {
                const positive = data.plusValue >= 0;
                return (
                  <div key={category} className="p-3 rounded-lg border bg-card hover:border-muted-foreground/20 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: getCategoryColor(category) }}
                      />
                      <span className="text-sm font-medium text-foreground">
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">{data.count} actif{data.count > 1 ? 's' : ''}</span>
                    </div>
                    <p className={`text-lg font-bold ${positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {positive ? '+' : ''}{formatCurrency(data.plusValue)}
                    </p>
                  </div>
                );
              })}
            {Object.keys(byCategory).length === 0 && (
              <p className="text-muted-foreground text-center py-4 text-sm">Aucune donnée</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
