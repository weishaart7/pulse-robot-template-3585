import { INK, VIOLET, EGGSHELL } from '@/lib/palette';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import RangeNavigator from '@/components/ui/range-navigator';
import { PatrimoineChart } from './PatrimoineChart';
import { PlusValuesCard } from './PlusValuesCard';
import { useAssets } from '@/hooks/useAssets';
import { usePassifs, useEmprunts } from '@/hooks/usePassifs';
import { useFamilyProfile, useMaritalStatus, useFamilyLinks } from '@/hooks/useFamilyData';
import { usePatrimoineCalculations } from '@/hooks/usePatrimoineCalculations';
import { assetValorisationService, AssetValorisation } from '@/services/assetValorisationService';
import { assetDemembrementService, AssetDemembrement } from '@/services/assetDemembrementService';
import { computeEvolutionPatrimoine } from '@/lib/patrimoine/evolutionPatrimoine';
import { User, Users, Target, AlertTriangle } from 'lucide-react';

interface PatrimoineResumeProps {
  onNavigateToPlusValues?: () => void;
  onNavigateToParTete?: () => void;
}

// Palette Famille (teal identité / lime accent positif / rose pour les
// passifs) appliquée aux cartes résumé — cf. docs/patrimoine.md.
const TEAL = INK;
const LIME = VIOLET;
const LIME_ICON = EGGSHELL;

export const PatrimoineResume = ({ onNavigateToPlusValues, onNavigateToParTete }: PatrimoineResumeProps) => {
  const { assets } = useAssets();
  const { passifs } = usePassifs();
  const { emprunts } = useEmprunts();
  const { data: familyProfile } = useFamilyProfile();
  const { data: maritalStatus } = useMaritalStatus();
  const { data: familyLinks } = useFamilyLinks();
  const [valorisations, setValorisations] = useState<AssetValorisation[]>([]);
  const [assetDemembrements, setAssetDemembrements] = useState<AssetDemembrement[]>([]);

  useEffect(() => {
    assetValorisationService.getAllForUser()
      .then(setValorisations)
      .catch(() => {
        setValorisations([]);
        toast.error("Impossible de charger l'historique de valorisation");
      });
    assetDemembrementService.getAllForUser()
      .then(setAssetDemembrements)
      .catch(() => {
        setAssetDemembrements([]);
        toast.error("Impossible de charger les démembrements");
      });
  }, []);

  const {
    financialSummary,
    patrimoineParPersonne,
    unqualifiedItems,
    plusValuesSummary,
    formatCurrency
  } = usePatrimoineCalculations({
    assets,
    passifs,
    emprunts,
    userFirstName: familyProfile?.prenom || 'Vous',
    spouseFirstName: maritalStatus?.prenom_conjoint || 'Conjoint',
    statutCouple: maritalStatus?.statut_couple,
    assetDemembrements,
    demembrementCtx: { familyProfile, maritalStatus, familyLinks }
  });

  const evolutionPatrimoine = useMemo(
    () => computeEvolutionPatrimoine(assets, valorisations, {
      assetDemembrements,
      demembrementCtx: { familyProfile, maritalStatus, familyLinks }
    }),
    [assets, valorisations, assetDemembrements, familyProfile, maritalStatus, familyLinks]
  );

  const evolutionPoints = useMemo(
    () => evolutionPatrimoine.map((p) => ({ date: p.date, value: p.total })),
    [evolutionPatrimoine]
  );

  return (
    <div className="space-y-8">
      {unqualifiedItems.length > 0 && (
        <div className="rounded-lg border border-spark/30 bg-spark/10 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-spark mt-0.5 shrink-0" strokeWidth={1.75} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground ">
              {unqualifiedItems.length} élément{unqualifiedItems.length > 1 ? 's' : ''} exclu{unqualifiedItems.length > 1 ? 's' : ''} des totaux ci-dessous
            </p>
            <p className="text-xs text-foreground/80 ">
              {unqualifiedItems.map(i => `${i.label}${i.reason === 'demembrement' ? ' (âge de l\'usufruitier non renseigné)' : ' (propre/commun non qualifié)'}`).join(', ')} — à compléter dans Patrimoine pour être pris en compte.
            </p>
          </div>
        </div>
      )}

      {/* Patrimoine net — mis en avant en titre. Le -mt-12 compense l'écart de
          padding vertical entre <main> (pt-3) + PatrimoineSection (p-6) +
          ce wrapper (mt-6) d'une part, et la marge du haut de la navbar
          latérale (mt-3) d'autre part, pour aligner leurs bords supérieurs. Annulé
          quand IncompleteAssetsBanner est affiché au-dessus (conteneur
          [data-banner] non vide, cf. PatrimoineSection.tsx). */}
      <div className="-mt-12 group-has-[[data-banner]:not(:empty)]/patrimoine:mt-0 animate-fade-in">
        <p className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">Patrimoine net</p>
        <div className="mt-1">
          <p className="text-4xl md:text-5xl font-bold text-foreground tracking-tight" style={{ fontFamily: "'Kode Mono', monospace" }}>
            {formatCurrency(financialSummary.patrimoineNet)}
          </p>
        </div>
      </div>

      {/* Chart section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 border border-border hover:shadow-sm transition-shadow duration-500 animate-fade-in" style={{ animationDelay: '180ms' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px] font-semibold tracking-tight">Répartition du patrimoine</CardTitle>
          </CardHeader>
          <CardContent>
            <PatrimoineChart
              assets={assets}
              passifs={passifs}
              emprunts={emprunts}
              selectedCategory={null}
              assetDemembrements={assetDemembrements}
              demembrementCtx={{ familyProfile, maritalStatus, familyLinks }}
            />
          </CardContent>
        </Card>

        {/* Evolution chart */}
        <Card className="lg:col-span-2 border border-border hover:shadow-sm transition-shadow duration-500 animate-fade-in" style={{ animationDelay: '210ms' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px] font-semibold tracking-tight">Évolution des actifs</CardTitle>
          </CardHeader>
          <CardContent>
            {evolutionPatrimoine.length === 0 ? (
              <p className="text-muted-foreground/70 text-center py-10 text-sm">
                Pas encore d'historique de valorisation. Ajoutez des valorisations à vos actifs pour voir l'évolution de votre patrimoine dans le temps.
              </p>
            ) : (
              <RangeNavigator points={evolutionPoints} formatValue={formatCurrency} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patrimoine par tête */}
        <Card
          onClick={onNavigateToParTete}
          className={`border border-border hover:shadow-sm transition-shadow duration-500 animate-fade-in ${onNavigateToParTete ? 'cursor-pointer hover:border-border' : ''}`}
          style={{ animationDelay: '240ms' }}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px] font-semibold tracking-tight">Patrimoine par tête</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <PersonCard
              icon={User}
              tone="teal"
              name={patrimoineParPersonne.userFirstName}
              value={formatCurrency(patrimoineParPersonne.userValue)}
              showDetails={patrimoineParPersonne.showSpouse}
              details={
                patrimoineParPersonne.showSpouse ? (
                  <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground/80">
                    <div>Actifs : {formatCurrency(patrimoineParPersonne.userActifs)}</div>
                    {patrimoineParPersonne.userOwnValue > 0 && <div className="ml-3 opacity-70">• Biens propres : {formatCurrency(patrimoineParPersonne.userOwnValue)}</div>}
                    {patrimoineParPersonne.userSharedValue > 0 && <div className="ml-3 opacity-70">• Part biens communs : {formatCurrency(patrimoineParPersonne.userSharedValue)}</div>}
                    {patrimoineParPersonne.userPassifs > 0 && <div className="text-destructive/80">Passifs : {formatCurrency(patrimoineParPersonne.userPassifs)}</div>}
                  </div>
                ) : null
              }
            />

            {patrimoineParPersonne.showSpouse && (
              <PersonCard
                icon={Users}
                tone="lime"
                name={patrimoineParPersonne.spouseFirstName}
                value={formatCurrency(patrimoineParPersonne.spouseValue)}
                showDetails
                details={
                  <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground/80">
                    <div>Actifs : {formatCurrency(patrimoineParPersonne.spouseActifs)}</div>
                    {patrimoineParPersonne.spouseOwnValue > 0 && <div className="ml-3 opacity-70">• Biens propres : {formatCurrency(patrimoineParPersonne.spouseOwnValue)}</div>}
                    {patrimoineParPersonne.spouseSharedValue > 0 && <div className="ml-3 opacity-70">• Part biens communs : {formatCurrency(patrimoineParPersonne.spouseSharedValue)}</div>}
                    {patrimoineParPersonne.spousePassifs > 0 && <div className="text-destructive/80">Passifs : {formatCurrency(patrimoineParPersonne.spousePassifs)}</div>}
                  </div>
                }
              />
            )}

            {/* Progress bars */}
            <div className="space-y-3 pt-3">
              <ProgressBar
                label={patrimoineParPersonne.userFirstName}
                color={TEAL}
                value={patrimoineParPersonne.totalValue > 0 ? patrimoineParPersonne.userValue / patrimoineParPersonne.totalValue * 100 : 0}
              />
              {patrimoineParPersonne.showSpouse && (
                <ProgressBar
                  label={patrimoineParPersonne.spouseFirstName}
                  color={LIME}
                  value={patrimoineParPersonne.totalValue > 0 ? patrimoineParPersonne.spouseValue / patrimoineParPersonne.totalValue * 100 : 0}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Plus-values card */}
        <div 
          onClick={onNavigateToPlusValues} 
          className={`${onNavigateToPlusValues ? 'cursor-pointer' : ''} animate-fade-in`}
          style={{ animationDelay: '300ms' }}
        >
          <PlusValuesCard plusValuesSummary={plusValuesSummary} />
        </div>

        {/* Objectifs */}
        <Card className="border border-border hover:shadow-sm transition-shadow duration-500 animate-fade-in" style={{ animationDelay: '360ms' }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px] font-semibold tracking-tight">Objectifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="p-4 rounded-md bg-muted/50 mb-4 group-hover:bg-muted transition-colors">
                <Target className="h-6 w-6 text-muted-foreground/60" strokeWidth={1.5} />
              </div>
              <p className="text-muted-foreground/80 text-sm font-medium">
                Définissez vos objectifs patrimoniaux
              </p>
              <p className="text-[11px] text-muted-foreground/50 mt-1.5">
                Fonctionnalité à venir
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

/* Sub-components */

const PersonCard = ({
  icon: Icon,
  tone = 'teal',
  name,
  value,
  showDetails,
  details
}: {
  icon: React.ElementType;
  tone?: 'teal' | 'lime';
  name: string;
  value: string;
  showDetails?: boolean;
  details?: React.ReactNode;
}) => {
  const badgeBg = tone === 'lime' ? LIME : `${TEAL}1a`;
  const iconColor = tone === 'lime' ? LIME_ICON : TEAL;
  return (
    <div className="group flex items-start gap-3.5 p-4 rounded-2xl border border-border/50 bg-card hover:border-border transition-all duration-300">
      <div className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center transition-colors duration-300" style={{ backgroundColor: badgeBg }}>
        <Icon className="h-[18px] w-[18px]" style={{ color: iconColor }} strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
          {name}
        </p>
        <p className="text-xl font-bold text-foreground tracking-tight">
          {value}
        </p>
        {details}
      </div>
    </div>
  );
};

const ProgressBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between text-[11px]">
      <span className="text-muted-foreground/70">{label}</span>
      <span className="font-semibold text-foreground/80">{Math.round(value)}%</span>
    </div>
    <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
      <div
        className="h-1.5 rounded-full transition-all duration-700 ease-out"
        style={{ width: `${value}%`, backgroundColor: color }}
      />
    </div>
  </div>
);
