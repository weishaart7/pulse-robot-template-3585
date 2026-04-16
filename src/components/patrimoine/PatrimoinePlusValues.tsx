import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, ArrowLeft, Receipt, ShieldCheck, BadgePercent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAssets } from '@/hooks/useAssets';
import { usePassifs, useEmprunts } from '@/hooks/usePassifs';
import { useFamilyProfile, useMaritalStatus } from '@/hooks/useFamilyData';
import { usePatrimoineCalculations } from '@/hooks/usePatrimoineCalculations';
import { getCategoryColor } from '@/lib/patrimoine/utils';

// Natures soumises au PFU (12,8% IR + 18,6% PS = 31,4%)
const NATURES_PFU: string[] = [
  "Actions", "Obligations", "Bons du Trésor", "Titres de dette subordonné",
  "Compte-titres", "Parts de FIP", "Parts de FIP Corse", "Parts de FCPI",
  "Fonds de private equity (LBO, growth, venture)", "Fonds de dette privée",
  "Club deals", "SPV d'investissement (structures ad hoc)", "Produits structurés",
  "Autres produits dérivés (Swap, Warrants, CFD...)", "Credit default swap",
  "Contrat à terme", "Options", "Stock-options",
];

const NATURES_EXONEREES: string[] = [
  "Livret A", "Livret de développement durable et solidaire (LDDS)",
  "Livret d'épargne populaire (LEP)", "Livret Jeune",
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
    <div className="space-y-8 animate-fade-in">
      {onBack && (
        <button 
          onClick={onBack} 
          className="group inline-flex items-center gap-2 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 -ml-1"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform duration-200" strokeWidth={1.5} />
          Retour au résumé
        </button>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <SummaryCard
          label="Plus-values"
          subtitle="Gains latents"
          value={`+${formatCurrency(totalPlusValues)}`}
          icon={TrendingUp}
          accentColor="bg-gradient-to-r from-emerald-400 to-emerald-500"
          delay="0ms"
        />
        <SummaryCard
          label="Moins-values"
          subtitle="Pertes latentes"
          value={`-${formatCurrency(totalMoinsValues)}`}
          icon={TrendingDown}
          accentColor="bg-gradient-to-r from-rose-400 to-rose-500"
          delay="60ms"
        />
        <SummaryCard
          label="Résultat net"
          subtitle="Balance globale"
          value={`${isPositive ? '+' : ''}${formatCurrency(netPlusValue)}`}
          icon={Wallet}
          accentColor={isPositive ? "bg-gradient-to-r from-primary to-primary/80" : "bg-gradient-to-r from-rose-400 to-rose-500"}
          delay="120ms"
        />
      </div>

      {/* Detail + categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 animate-fade-in" style={{ animationDelay: '180ms' }}>
          <Card className="border-border/60 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-[15px] font-semibold tracking-tight">Détail par actif</CardTitle>
            </CardHeader>
            <CardContent>
              {assetsWithPlusValue.length === 0 ? (
                <p className="text-muted-foreground/70 text-center py-10 text-sm">
                  Renseignez la valeur d'acquisition de vos actifs pour calculer les plus-values
                </p>
              ) : (
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/40">
                        <th className="pb-3 text-left text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">Actif</th>
                        <th className="pb-3 text-right text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">Acquisition</th>
                        <th className="pb-3 text-right text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">Estimation</th>
                        <th className="pb-3 text-right text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">+/- Value</th>
                        <th className="pb-3 text-right text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assetsWithPlusValue.map((asset, idx) => {
                        const pct = asset.valeurAcquisition > 0
                          ? ((asset.plusValue / asset.valeurAcquisition) * 100)
                          : 0;
                        const positive = asset.plusValue >= 0;
                        return (
                          <tr 
                            key={asset.id} 
                            className="border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors duration-200"
                          >
                            <td className="py-3.5">
                              <p className="font-medium text-foreground text-[13px]">{asset.denomination}</p>
                              <p className="text-[11px] text-muted-foreground/60 mt-0.5">{asset.nature}</p>
                            </td>
                            <td className="py-3.5 text-right text-muted-foreground/70 text-[13px] tabular-nums">{formatCurrency(asset.valeurAcquisition)}</td>
                            <td className="py-3.5 text-right text-foreground font-medium text-[13px] tabular-nums">{formatCurrency(asset.valeurEstimee)}</td>
                            <td className="py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {positive ? (
                                  <ArrowUpRight className="h-3 w-3 text-emerald-500" strokeWidth={2} />
                                ) : (
                                  <ArrowDownRight className="h-3 w-3 text-rose-500" strokeWidth={2} />
                                )}
                                <span className={`font-semibold text-[13px] tabular-nums ${positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                  {positive ? '+' : ''}{formatCurrency(asset.plusValue)}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 text-right">
                              <span className={`text-[11px] font-semibold px-2 py-[3px] rounded-md tabular-nums ${
                                positive 
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' 
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300'
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

        {/* Category sidebar */}
        <div className="animate-fade-in" style={{ animationDelay: '240ms' }}>
          <Card className="border-border/60 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-[15px] font-semibold tracking-tight">Par catégorie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(byCategory)
                .filter(([_, data]) => data.count > 0)
                .sort((a, b) => Math.abs(b[1].plusValue) - Math.abs(a[1].plusValue))
                .map(([category, data]) => {
                  const positive = data.plusValue >= 0;
                  return (
                    <div key={category} className="group p-3.5 rounded-xl border border-border/40 bg-card hover:border-border/70 transition-all duration-300">
                      <div className="flex items-center gap-2.5 mb-1">
                        <div
                          className="w-[7px] h-[7px] rounded-full flex-shrink-0 ring-2 ring-offset-1 ring-offset-card"
                          style={{ backgroundColor: getCategoryColor(category), boxShadow: `0 0 6px ${getCategoryColor(category)}40` }}
                        />
                        <span className="text-[13px] font-medium text-foreground/90">
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </span>
                        <span className="text-[10px] text-muted-foreground/50 ml-auto tabular-nums">{data.count} actif{data.count > 1 ? 's' : ''}</span>
                      </div>
                      <p className={`text-lg font-bold ml-[19px] tracking-tight ${positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {positive ? '+' : ''}{formatCurrency(data.plusValue)}
                      </p>
                    </div>
                  );
                })}
              {Object.keys(byCategory).length === 0 && (
                <p className="text-muted-foreground/60 text-center py-6 text-sm">Aucune donnée</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Fiscal section */}
      <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
        <Card className="border-border/60 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
              <Receipt className="h-4 w-4 text-muted-foreground/50" strokeWidth={1.5} />
              Fiscalité des plus-values
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FiscalContent assetsWithPlusValue={assetsWithPlusValue} formatCurrency={formatCurrency} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

/* Sub-components */

const SummaryCard = ({ 
  label, subtitle, value, icon: Icon, accentColor, delay 
}: { 
  label: string; subtitle: string; value: string; icon: React.ElementType; accentColor: string; delay: string;
}) => (
  <div 
    className="group relative rounded-2xl border border-border/60 bg-card overflow-hidden transition-all duration-500 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 animate-fade-in"
    style={{ animationDelay: delay }}
  >
    <div className={`h-[3px] ${accentColor} opacity-80 group-hover:opacity-100 transition-opacity duration-300`} />
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[13px] font-medium text-muted-foreground tracking-wide">{label}</p>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">{subtitle}</p>
        </div>
        <div className={`h-10 w-10 rounded-xl ${accentColor.replace('bg-gradient-to-r', 'bg-gradient-to-br')} flex items-center justify-center opacity-90 group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="h-[18px] w-[18px] text-white" strokeWidth={1.5} />
        </div>
      </div>
      <p className="text-[28px] font-bold text-foreground tracking-tight leading-none">{value}</p>
    </div>
  </div>
);

const FiscalContent = ({ 
  assetsWithPlusValue, 
  formatCurrency 
}: { 
  assetsWithPlusValue: Array<{ id: string; denomination: string; nature: string; plusValue: number; valeurEstimee: number; valeurAcquisition: number }>; 
  formatCurrency: (v: number) => string;
}) => {
  const allAssetsWithRegime = assetsWithPlusValue.filter(a => a.plusValue > 0).map(a => ({
    ...a,
    regime: getFiscalRegime(a.nature)
  }));

  const totalPFU = allAssetsWithRegime.filter(a => a.regime === 'pfu').reduce((sum, a) => sum + a.plusValue * PFU_RATE, 0);
  const totalExonere = allAssetsWithRegime.filter(a => a.regime === 'exonere').reduce((sum, a) => sum + a.plusValue, 0);
  const totalNonDetermine = allAssetsWithRegime.filter(a => a.regime === 'non_determine').reduce((sum, a) => sum + a.plusValue, 0);

  if (allAssetsWithRegime.length === 0) {
    return <p className="text-muted-foreground/60 text-center py-10 text-sm">Aucune plus-value à fiscaliser</p>;
  }

  return (
    <div className="space-y-6">
      {/* Fiscal summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FiscalSummaryCard
          icon={BadgePercent}
          iconColor="text-amber-500"
          label="PFU (31,4%)"
          value={formatCurrency(totalPFU)}
          valueColor="text-foreground"
          subtitle="IR 12,8% + PS 18,6%"
          accentColor="bg-gradient-to-r from-amber-400 to-amber-500"
        />
        <FiscalSummaryCard
          icon={ShieldCheck}
          iconColor="text-emerald-500"
          label="Exonéré"
          value={formatCurrency(totalExonere)}
          valueColor="text-emerald-600 dark:text-emerald-400"
          subtitle="Plus-values non imposées"
          accentColor="bg-gradient-to-r from-emerald-400 to-emerald-500"
        />
        <FiscalSummaryCard
          icon={null}
          iconColor=""
          label="Non déterminé"
          value={formatCurrency(totalNonDetermine)}
          valueColor="text-muted-foreground"
          subtitle="Régime à préciser"
          accentColor="bg-muted-foreground/20"
        />
      </div>

      {/* Fiscal table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40">
              {['Actif', 'Plus-value', 'Régime', 'IR (12,8%)', 'PS (18,6%)', 'Total'].map((h, i) => (
                <th key={h} className={`pb-3 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest ${
                  i === 0 ? 'text-left' : i === 2 ? 'text-center' : 'text-right'
                }`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allAssetsWithRegime.map(asset => {
              const ir = asset.regime === 'pfu' ? asset.plusValue * PFU_IR : 0;
              const ps = asset.regime === 'pfu' ? asset.plusValue * PFU_PS : 0;
              const total = ir + ps;
              return (
                <tr key={asset.id} className="border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors duration-200">
                  <td className="py-3.5">
                    <p className="font-medium text-foreground text-[13px]">{asset.denomination}</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-0.5">{asset.nature}</p>
                  </td>
                  <td className="py-3.5 text-right font-medium text-emerald-600 dark:text-emerald-400 text-[13px] tabular-nums">
                    +{formatCurrency(asset.plusValue)}
                  </td>
                  <td className="py-3.5 text-center">
                    <span className={`text-[11px] font-semibold px-2 py-[3px] rounded-md ${
                      asset.regime === 'pfu'
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
                        : asset.regime === 'exonere'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                        : 'bg-muted text-muted-foreground/70'
                    }`}>
                      {asset.regime === 'pfu' ? 'PFU 31,4%' : asset.regime === 'exonere' ? 'Exonéré' : 'N/D'}
                    </span>
                  </td>
                  <td className="py-3.5 text-right text-muted-foreground/70 text-[13px] tabular-nums">
                    {asset.regime === 'pfu' ? formatCurrency(ir) : '—'}
                  </td>
                  <td className="py-3.5 text-right text-muted-foreground/70 text-[13px] tabular-nums">
                    {asset.regime === 'pfu' ? formatCurrency(ps) : '—'}
                  </td>
                  <td className="py-3.5 text-right font-semibold text-foreground text-[13px] tabular-nums">
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
};

const FiscalSummaryCard = ({ 
  icon: Icon, iconColor, label, value, valueColor, subtitle, accentColor 
}: { 
  icon: React.ElementType | null; iconColor: string; label: string; value: string; valueColor: string; subtitle: string; accentColor: string;
}) => (
  <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
    <div className={`h-[2px] ${accentColor}`} />
    <div className="p-4">
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon className={`h-3.5 w-3.5 ${iconColor}`} strokeWidth={1.5} />}
        <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">{label}</span>
      </div>
      <p className={`text-xl font-bold tracking-tight ${valueColor}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground/50 mt-1">{subtitle}</p>
    </div>
  </div>
);
