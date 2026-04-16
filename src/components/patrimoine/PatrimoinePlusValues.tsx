import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, ArrowLeft, Receipt, ShieldCheck, BadgePercent, ExternalLink } from 'lucide-react';
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

const PFU_RATE = 0.314;
const PFU_IR = 0.128;
const PFU_PS = 0.186;

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

  return (
    <div className="space-y-8">
      {onBack && (
        <Button variant="ghost" size="sm" onClick={onBack} className="flex items-center gap-2 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Retour au résumé
        </Button>
      )}

      {/* Summary cards with colored top borders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <div className="h-1 bg-green-500" />
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Plus-values</p>
                <p className="text-xs text-muted-foreground/70">Gains latents</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground">+{formatCurrency(totalPlusValues)}</p>
          </div>
        </div>

        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <div className="h-1 bg-red-500" />
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Moins-values</p>
                <p className="text-xs text-muted-foreground/70">Pertes latentes</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground">-{formatCurrency(totalMoinsValues)}</p>
          </div>
        </div>

        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <div className={`h-1 ${isPositive ? 'bg-primary' : 'bg-red-500'}`} />
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Résultat net</p>
                <p className="text-xs text-muted-foreground/70">Balance globale</p>
              </div>
              <div className={`h-9 w-9 rounded-full flex items-center justify-center ${isPositive ? 'bg-primary/10' : 'bg-red-100 dark:bg-red-900/40'}`}>
                <Wallet className={`h-4 w-4 ${isPositive ? 'text-primary' : 'text-red-600 dark:text-red-400'}`} />
              </div>
            </div>
            <p className={`text-3xl font-bold ${isPositive ? 'text-foreground' : 'text-red-600 dark:text-red-400'}`}>
              {isPositive ? '+' : ''}{formatCurrency(netPlusValue)}
            </p>
          </div>
        </div>
      </div>

      {/* Detail table + categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Détail par actif</CardTitle>
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
                      <tr className="border-b">
                        <th className="pb-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Actif</th>
                        <th className="pb-3 text-right font-medium text-muted-foreground text-xs uppercase tracking-wider">Acquisition</th>
                        <th className="pb-3 text-right font-medium text-muted-foreground text-xs uppercase tracking-wider">Estimation</th>
                        <th className="pb-3 text-right font-medium text-muted-foreground text-xs uppercase tracking-wider">+/- Value</th>
                        <th className="pb-3 text-right font-medium text-muted-foreground text-xs uppercase tracking-wider">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assetsWithPlusValue.map(asset => {
                        const pct = asset.valeurAcquisition > 0
                          ? ((asset.plusValue / asset.valeurAcquisition) * 100)
                          : 0;
                        const positive = asset.plusValue >= 0;
                        return (
                          <tr key={asset.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="py-3.5">
                              <p className="font-medium text-foreground text-sm">{asset.denomination}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{asset.nature}</p>
                            </td>
                            <td className="py-3.5 text-right text-muted-foreground">{formatCurrency(asset.valeurAcquisition)}</td>
                            <td className="py-3.5 text-right text-foreground font-medium">{formatCurrency(asset.valeurEstimee)}</td>
                            <td className="py-3.5 text-right">
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
                            <td className="py-3.5 text-right">
                              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                                positive 
                                  ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                                  : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
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

        {/* Category breakdown */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Par catégorie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {Object.entries(byCategory)
              .filter(([_, data]) => data.count > 0)
              .sort((a, b) => Math.abs(b[1].plusValue) - Math.abs(a[1].plusValue))
              .map(([category, data]) => {
                const positive = data.plusValue >= 0;
                return (
                  <div key={category} className="p-3.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getCategoryColor(category) }}
                      />
                      <span className="text-sm font-medium text-foreground">
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">{data.count} actif{data.count > 1 ? 's' : ''}</span>
                    </div>
                    <p className={`text-lg font-bold ml-5 ${positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
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

      {/* Fiscal section */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            Fiscalité des plus-values
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
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
                {/* Fiscal summary cards with colored top borders */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-xl border bg-card overflow-hidden">
                    <div className="h-1 bg-amber-500" />
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <BadgePercent className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">PFU (31,4%)</span>
                      </div>
                      <p className="text-2xl font-bold text-foreground">{formatCurrency(totalPFU)}</p>
                      <p className="text-xs text-muted-foreground mt-1">IR 12,8% + PS 18,6%</p>
                    </div>
                  </div>
                  <div className="rounded-xl border bg-card overflow-hidden">
                    <div className="h-1 bg-green-500" />
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Exonéré</span>
                      </div>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalExonere)}</p>
                      <p className="text-xs text-muted-foreground mt-1">Plus-values non imposées</p>
                    </div>
                  </div>
                  <div className="rounded-xl border bg-card overflow-hidden">
                    <div className="h-1 bg-muted-foreground/30" />
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Non déterminé</span>
                      </div>
                      <p className="text-2xl font-bold text-muted-foreground">{formatCurrency(totalNonDetermine)}</p>
                      <p className="text-xs text-muted-foreground mt-1">Régime à préciser</p>
                    </div>
                  </div>
                </div>

                {/* Fiscal detail table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="pb-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Actif</th>
                        <th className="pb-3 text-right font-medium text-muted-foreground text-xs uppercase tracking-wider">Plus-value</th>
                        <th className="pb-3 text-center font-medium text-muted-foreground text-xs uppercase tracking-wider">Régime</th>
                        <th className="pb-3 text-right font-medium text-muted-foreground text-xs uppercase tracking-wider">IR (12,8%)</th>
                        <th className="pb-3 text-right font-medium text-muted-foreground text-xs uppercase tracking-wider">PS (18,6%)</th>
                        <th className="pb-3 text-right font-medium text-muted-foreground text-xs uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allAssetsWithRegime.map(asset => {
                        const ir = asset.regime === 'pfu' ? asset.plusValue * PFU_IR : 0;
                        const ps = asset.regime === 'pfu' ? asset.plusValue * PFU_PS : 0;
                        const total = ir + ps;
                        return (
                          <tr key={asset.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="py-3.5">
                              <p className="font-medium text-foreground text-sm">{asset.denomination}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{asset.nature}</p>
                            </td>
                            <td className="py-3.5 text-right font-medium text-green-600 dark:text-green-400">
                              +{formatCurrency(asset.plusValue)}
                            </td>
                            <td className="py-3.5 text-center">
                              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                                asset.regime === 'pfu'
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                  : asset.regime === 'exonere'
                                  ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                  : 'bg-muted text-muted-foreground'
                              }`}>
                                {asset.regime === 'pfu' ? 'PFU 31,4%' : asset.regime === 'exonere' ? 'Exonéré' : 'N/D'}
                              </span>
                            </td>
                            <td className="py-3.5 text-right text-muted-foreground">
                              {asset.regime === 'pfu' ? formatCurrency(ir) : '—'}
                            </td>
                            <td className="py-3.5 text-right text-muted-foreground">
                              {asset.regime === 'pfu' ? formatCurrency(ps) : '—'}
                            </td>
                            <td className="py-3.5 text-right font-semibold text-foreground">
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
