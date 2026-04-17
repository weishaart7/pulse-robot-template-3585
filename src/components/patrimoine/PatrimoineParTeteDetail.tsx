import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, User, Users, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { useAssets } from '@/hooks/useAssets';
import { usePassifs, useEmprunts } from '@/hooks/usePassifs';
import { useFamilyProfile, useMaritalStatus } from '@/hooks/useFamilyData';
import { usePatrimoineCalculations } from '@/hooks/usePatrimoineCalculations';
import { getCategoryColor } from '@/lib/patrimoine/utils';
import { getAssetCategory } from '@/constants/assetTypes';

interface PatrimoineParTeteDetailProps {
  onBack?: () => void;
}

export const PatrimoineParTeteDetail = ({ onBack }: PatrimoineParTeteDetailProps) => {
  const { assets } = useAssets();
  const { passifs } = usePassifs();
  const { emprunts } = useEmprunts();
  const { data: familyProfile } = useFamilyProfile();
  const { data: maritalStatus } = useMaritalStatus();

  const {
    patrimoineParPersonne,
    formatCurrency
  } = usePatrimoineCalculations({
    assets,
    passifs,
    emprunts,
    userFirstName: familyProfile?.prenom || 'Vous',
    spouseFirstName: maritalStatus?.prenom_conjoint || 'Conjoint',
    statutCouple: maritalStatus?.statut_couple
  });

  const {
    userFirstName, spouseFirstName, showSpouse,
    userValue, spouseValue, totalValue,
    userActifs, spouseActifs,
    userOwnValue, spouseOwnValue,
    userSharedValue, spouseSharedValue,
    userPassifs, spousePassifs
  } = patrimoineParPersonne;

  // Répartition par catégorie / par personne (parts attribuées)
  const computeByCategory = (forSpouse: boolean) => {
    const map: Record<string, number> = {};
    assets.forEach((a: any) => {
      const valeur = Number(a.valeur_estimee || 0);
      if (!valeur) return;
      const pctU = a.pourcentage_utilisateur ?? 100;
      const pctC = a.pourcentage_conjoint ?? 0;
      const detenteur = (a.detenteur || '').toLowerCase();
      let part = 0;
      if (detenteur === 'common' || detenteur === 'commun' || detenteur === 'couple' || detenteur === 'le couple') {
        part = valeur * ((forSpouse ? pctC : pctU) / 100);
      } else if (forSpouse && (detenteur === 'spouse' || detenteur === 'conjoint')) {
        part = valeur;
      } else if (!forSpouse && (detenteur === 'user' || detenteur === 'utilisateur' || !detenteur)) {
        part = valeur;
      }
      if (part > 0) {
        const cat = getAssetCategory(a.nature);
        map[cat] = (map[cat] || 0) + part;
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  };

  const userByCategory = computeByCategory(false);
  const spouseByCategory = showSpouse ? computeByCategory(true) : [];

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

      {/* Top totals */}
      <div className={`grid grid-cols-1 ${showSpouse ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-5`}>
        <PersonHeroCard
          icon={User}
          name={userFirstName}
          netValue={userValue}
          actifs={userActifs}
          passifs={userPassifs}
          shareOfTotal={totalValue > 0 ? (userValue / totalValue) * 100 : 100}
          accent="bg-gradient-to-r from-primary to-primary/80"
          formatCurrency={formatCurrency}
          delay="0ms"
        />
        {showSpouse && (
          <PersonHeroCard
            icon={Users}
            name={spouseFirstName}
            netValue={spouseValue}
            actifs={spouseActifs}
            passifs={spousePassifs}
            shareOfTotal={totalValue > 0 ? (spouseValue / totalValue) * 100 : 0}
            accent="bg-gradient-to-r from-emerald-400 to-emerald-500"
            formatCurrency={formatCurrency}
            delay="60ms"
          />
        )}
        <SummaryCard
          label="Patrimoine net total"
          subtitle="Foyer"
          value={formatCurrency(totalValue)}
          icon={Wallet}
          accent="bg-gradient-to-r from-foreground/40 to-foreground/20"
          delay="120ms"
        />
      </div>

      {/* Breakdown propre/commun */}
      {showSpouse && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BreakdownCard
            name={userFirstName}
            ownValue={userOwnValue}
            sharedValue={userSharedValue}
            actifs={userActifs}
            formatCurrency={formatCurrency}
            delay="180ms"
          />
          <BreakdownCard
            name={spouseFirstName}
            ownValue={spouseOwnValue}
            sharedValue={spouseSharedValue}
            actifs={spouseActifs}
            formatCurrency={formatCurrency}
            delay="240ms"
          />
        </div>
      )}

      {/* By category */}
      <div className={`grid grid-cols-1 ${showSpouse ? 'lg:grid-cols-2' : ''} gap-6`}>
        <CategoryCard
          name={userFirstName}
          entries={userByCategory}
          total={userActifs}
          formatCurrency={formatCurrency}
          delay="300ms"
        />
        {showSpouse && (
          <CategoryCard
            name={spouseFirstName}
            entries={spouseByCategory}
            total={spouseActifs}
            formatCurrency={formatCurrency}
            delay="360ms"
          />
        )}
      </div>
    </div>
  );
};

/* Sub-components */

const PersonHeroCard = ({
  icon: Icon, name, netValue, actifs, passifs, shareOfTotal, accent, formatCurrency, delay
}: {
  icon: React.ElementType; name: string; netValue: number; actifs: number; passifs: number;
  shareOfTotal: number; accent: string; formatCurrency: (n: number) => string; delay: string;
}) => (
  <div
    className="group relative rounded-2xl border border-border/60 bg-card overflow-hidden transition-all duration-500 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 animate-fade-in"
    style={{ animationDelay: delay }}
  >
    <div className={`h-[3px] ${accent} opacity-80 group-hover:opacity-100 transition-opacity duration-300`} />
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest">{name}</p>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">{shareOfTotal.toFixed(1)}% du patrimoine total</p>
        </div>
        <div className={`h-10 w-10 rounded-xl ${accent.replace('bg-gradient-to-r', 'bg-gradient-to-br')} flex items-center justify-center opacity-90 group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="h-[18px] w-[18px] text-white" strokeWidth={1.5} />
        </div>
      </div>
      <p className="text-[28px] font-bold text-foreground tracking-tight leading-none mb-4">{formatCurrency(netValue)}</p>
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/40">
        <div>
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3 text-emerald-500" strokeWidth={2} />
            <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider">Actifs</p>
          </div>
          <p className="text-[13px] font-semibold text-foreground tabular-nums mt-0.5">{formatCurrency(actifs)}</p>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <TrendingDown className="h-3 w-3 text-rose-500" strokeWidth={2} />
            <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider">Passifs</p>
          </div>
          <p className="text-[13px] font-semibold text-foreground tabular-nums mt-0.5">{formatCurrency(passifs)}</p>
        </div>
      </div>
    </div>
  </div>
);

const SummaryCard = ({
  label, subtitle, value, icon: Icon, accent, delay
}: {
  label: string; subtitle: string; value: string; icon: React.ElementType; accent: string; delay: string;
}) => (
  <div
    className="group relative rounded-2xl border border-border/60 bg-card overflow-hidden transition-all duration-500 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 animate-fade-in"
    style={{ animationDelay: delay }}
  >
    <div className={`h-[3px] ${accent} opacity-80 group-hover:opacity-100 transition-opacity duration-300`} />
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[13px] font-medium text-muted-foreground tracking-wide">{label}</p>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">{subtitle}</p>
        </div>
        <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
          <Icon className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.5} />
        </div>
      </div>
      <p className="text-[28px] font-bold text-foreground tracking-tight leading-none">{value}</p>
    </div>
  </div>
);

const BreakdownCard = ({
  name, ownValue, sharedValue, actifs, formatCurrency, delay
}: {
  name: string; ownValue: number; sharedValue: number; actifs: number;
  formatCurrency: (n: number) => string; delay: string;
}) => {
  const ownPct = actifs > 0 ? (ownValue / actifs) * 100 : 0;
  const sharedPct = actifs > 0 ? (sharedValue / actifs) * 100 : 0;
  return (
    <Card className="border-border/60 shadow-none animate-fade-in" style={{ animationDelay: delay }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-[13px] font-semibold tracking-tight text-muted-foreground/80 uppercase tracking-widest">
          {name} — biens propres / communs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex h-2 w-full rounded-full overflow-hidden bg-muted/60">
          <div className="bg-primary/70 transition-all duration-700" style={{ width: `${ownPct}%` }} />
          <div className="bg-emerald-400/70 transition-all duration-700" style={{ width: `${sharedPct}%` }} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border/40 p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-primary/70" />
              <p className="text-[11px] text-muted-foreground/70 uppercase tracking-wider">Biens propres</p>
            </div>
            <p className="text-[16px] font-bold text-foreground tabular-nums">{formatCurrency(ownValue)}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">{ownPct.toFixed(1)}% des actifs</p>
          </div>
          <div className="rounded-xl border border-border/40 p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400/70" />
              <p className="text-[11px] text-muted-foreground/70 uppercase tracking-wider">Part biens communs</p>
            </div>
            <p className="text-[16px] font-bold text-foreground tabular-nums">{formatCurrency(sharedValue)}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sharedPct.toFixed(1)}% des actifs</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const CategoryCard = ({
  name, entries, total, formatCurrency, delay
}: {
  name: string; entries: [string, number][]; total: number;
  formatCurrency: (n: number) => string; delay: string;
}) => (
  <Card className="border-border/60 shadow-none animate-fade-in" style={{ animationDelay: delay }}>
    <CardHeader className="pb-2">
      <CardTitle className="text-[13px] font-semibold text-muted-foreground/80 uppercase tracking-widest">
        {name} — répartition par catégorie
      </CardTitle>
    </CardHeader>
    <CardContent>
      {entries.length === 0 ? (
        <p className="text-muted-foreground/60 text-center py-8 text-sm">Aucun actif attribué</p>
      ) : (
        <div className="space-y-3">
          {entries.map(([cat, value]) => {
            const pct = total > 0 ? (value / total) * 100 : 0;
            return (
              <div key={cat} className="space-y-1.5">
                <div className="flex items-center justify-between text-[12px]">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getCategoryColor(cat) }}
                    />
                    <span className="text-foreground/85 capitalize truncate">{cat}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground/80 tabular-nums">
                    <span className="font-medium text-foreground">{formatCurrency(value)}</span>
                    <span className="text-[10px] opacity-70">{pct.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="w-full bg-muted/60 h-1 rounded-full overflow-hidden">
                  <div
                    className="h-1 rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: getCategoryColor(cat) }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CardContent>
  </Card>
);
