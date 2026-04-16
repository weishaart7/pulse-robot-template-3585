import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, ArrowLeft, Receipt, ShieldCheck, BadgePercent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAssets } from '@/hooks/useAssets';
import { usePassifs, useEmprunts } from '@/hooks/usePassifs';
import { useFamilyProfile, useMaritalStatus } from '@/hooks/useFamilyData';
import { usePatrimoineCalculations } from '@/hooks/usePatrimoineCalculations';
import { getAssetCategory } from '@/constants/assetTypes';
import { getCategoryColor } from '@/lib/patrimoine/utils';

// Natures soumises au PFU (12,8% IR + 18,6% PS = 31,4%)
const NATURES_PFU: string[] = [
  "Actions",
  "Obligations",
  "Bons du Trésor",
  "Titres de dette subordonné",
  "Compte-titres",
  "Parts de FIP",
  "Parts de FIP Corse",
  "Parts de FCPI",
  "Fonds de private equity (LBO, growth, venture)",
  "Fonds de dette privée",
  "Club deals",
  "SPV d'investissement (structures ad hoc)",
  "Produits structurés",
  "Autres produits dérivés (Swap, Warrants, CFD...)",
  "Credit default swap",
  "Contrat à terme",
  "Options",
  "Stock-options",
];

// Natures exonérées
const NATURES_EXONEREES: string[] = [
  "Livret A",
  "Livret de développement durable et solidaire (LDDS)",
  "Livret d'épargne populaire (LEP)",
  "Livret Jeune",
];

const PFU_RATE = 0.314; // 31,4%
const PFU_IR = 0.128;   // 12,8%
const PFU_PS = 0.186;   // 18,6%

type FiscalRegime = 'pfu' | 'exonere' | 'non_determine';

const getFiscalRegime = (nature: string): FiscalRegime => {
  if (NATURES_PFU.includes(nature)) return 'pfu';
  if (NATURES_EXONEREES.includes(nature)) return 'exonere';
  return 'non_determine';
};

interface PatrimoinePlusValuesProps {
  onBack?: () => void;
}

export const PatrimoinePlusValues = ({ onBack }: PatrimoinePlusValuesProps) => {
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
      {onBack && (
        <Button variant="ghost" size="sm" onClick={onBack} className="flex items-center gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" />
          Retour au résumé
        </Button>
      )}
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

      {/* Section Fiscalité */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Fiscalité des plus-values
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const taxableAssets = assetsWithPlusValue.filter(a => {
              const regime = getFiscalRegime(a.nature);
              return regime !== 'non_determine' && a.plusValue > 0;
            });
            const allAssetsWithRegime = assetsWithPlusValue.filter(a => a.plusValue > 0).map(a => ({
              ...a,
              regime: getFiscalRegime(a.nature)
            }));

            const totalPFU = allAssetsWithRegime
              .filter(a => a.regime === 'pfu')
              .reduce((sum, a) => sum + a.plusValue * PFU_RATE, 0);

            const totalExonere = allAssetsWithRegime
              .filter(a => a.regime === 'exonere')
              .reduce((sum, a) => sum + a.plusValue, 0);

            const totalNonDetermine = allAssetsWithRegime
              .filter(a => a.regime === 'non_determine')
              .reduce((sum, a) => sum + a.plusValue, 0);

            if (allAssetsWithRegime.length === 0) {
              return (
                <p className="text-muted-foreground text-center py-8 text-sm">
                  Aucune plus-value à fiscaliser
                </p>
              );
            }

            return (
              <div className="space-y-6">
                {/* Résumé fiscal */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      <BadgePercent className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">PFU (31,4%)</span>
                    </div>
                    <p className="text-xl font-bold text-foreground">{formatCurrency(totalPFU)}</p>
                    <p className="text-xs text-muted-foreground mt-1">IR 12,8% + PS 18,6%</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Exonéré</span>
                    </div>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalExonere)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Plus-values non imposées</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Non déterminé</span>
                    </div>
                    <p className="text-xl font-bold text-muted-foreground">{formatCurrency(totalNonDetermine)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Régime à préciser</p>
                  </div>
                </div>

                {/* Tableau détail fiscal */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 font-medium text-muted-foreground">Actif</th>
                        <th className="pb-3 font-medium text-muted-foreground text-right">Plus-value</th>
                        <th className="pb-3 font-medium text-muted-foreground text-center">Régime</th>
                        <th className="pb-3 font-medium text-muted-foreground text-right">IR (12,8%)</th>
                        <th className="pb-3 font-medium text-muted-foreground text-right">PS (18,6%)</th>
                        <th className="pb-3 font-medium text-muted-foreground text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allAssetsWithRegime.map(asset => {
                        const ir = asset.regime === 'pfu' ? asset.plusValue * PFU_IR : 0;
                        const ps = asset.regime === 'pfu' ? asset.plusValue * PFU_PS : 0;
                        const total = ir + ps;
                        return (
                          <tr key={asset.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                            <td className="py-3">
                              <div>
                                <p className="font-medium text-foreground">{asset.denomination}</p>
                                <p className="text-xs text-muted-foreground">{asset.nature}</p>
                              </div>
                            </td>
                            <td className="py-3 text-right font-medium text-green-600 dark:text-green-400">
                              +{formatCurrency(asset.plusValue)}
                            </td>
                            <td className="py-3 text-center">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                asset.regime === 'pfu'
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                                  : asset.regime === 'exonere'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                  : 'bg-muted text-muted-foreground'
                              }`}>
                                {asset.regime === 'pfu' ? 'PFU 31,4%' : asset.regime === 'exonere' ? 'Exonéré' : 'N/D'}
                              </span>
                            </td>
                            <td className="py-3 text-right text-muted-foreground">
                              {asset.regime === 'pfu' ? formatCurrency(ir) : '—'}
                            </td>
                            <td className="py-3 text-right text-muted-foreground">
                              {asset.regime === 'pfu' ? formatCurrency(ps) : '—'}
                            </td>
                            <td className="py-3 text-right font-semibold text-foreground">
                              {asset.regime === 'pfu' ? formatCurrency(total) : asset.regime === 'exonere' ? '0 €' : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
};
