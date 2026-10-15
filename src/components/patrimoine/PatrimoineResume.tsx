import { PatrimoinePanel } from './PatrimoinePanel';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PanelTitle, SummaryRow, panelLinkClass } from '@/components/layout/workspace-panel';
import RangeNavigator from '@/components/ui/range-navigator';
import { PatrimoineChart } from './PatrimoineChart';
import { PlusValuesCard } from './PlusValuesCard';
import { useAssets } from '@/hooks/useAssets';
import { usePassifs, useEmprunts } from '@/hooks/usePassifs';
import { useFamilyProfile, useMaritalStatus, useFamilyLinks } from '@/hooks/useFamilyData';
import { usePatrimoineCalculations, UnqualifiedItem } from '@/hooks/usePatrimoineCalculations';
import { assetValorisationService, AssetValorisation } from '@/services/assetValorisationService';
import { assetDemembrementService, AssetDemembrement } from '@/services/assetDemembrementService';
import { computeEvolutionPatrimoine } from '@/lib/patrimoine/evolutionPatrimoine';
import { AlertTriangle } from 'lucide-react';

interface PatrimoineResumeProps {
  onNavigateToPlusValues?: () => void;
  onNavigateToParTete?: () => void;
}

const UNQUALIFIED_REASON_LABEL: Record<NonNullable<UnqualifiedItem['reason']>, string> = {
  qualification: ' (propre/commun non qualifié)',
  demembrement: " (âge de l'usufruitier non renseigné)",
  demembrement_contrepartie: ' (contrepartie du démembrement supprimée)',
};

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

  const demembrementCtx = useMemo(
    () => ({ familyProfile, maritalStatus, familyLinks }),
    [familyProfile, maritalStatus, familyLinks]
  );

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
    demembrementCtx
  });

  const evolutionPatrimoine = useMemo(
    () => computeEvolutionPatrimoine(assets, valorisations, {
      assetDemembrements,
      demembrementCtx
    }),
    [assets, valorisations, assetDemembrements, demembrementCtx]
  );

  const evolutionPoints = useMemo(
    () => evolutionPatrimoine.map((p) => ({ date: p.date, value: p.total })),
    [evolutionPatrimoine]
  );

  const pv = patrimoineParPersonne;
  const share = (v: number) => (pv.totalValue > 0 ? (v / pv.totalValue) * 100 : 0);

  return (
    <PatrimoinePanel
      trail="Résumé"
      title="Résumé"
      summary={`Actifs ${formatCurrency(financialSummary.totalActifs)} · Passifs ${formatCurrency(financialSummary.totalPassifs)}`}
      bare
    >
      {unqualifiedItems.length > 0 && (
        <div className="border-b border-border px-8 py-5">
          <div className="flex items-start gap-3 rounded-[2px] border border-spark/30 bg-spark/10 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-spark" strokeWidth={1.75} />
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-foreground">
                {unqualifiedItems.length} élément{unqualifiedItems.length > 1 ? 's' : ''} exclu{unqualifiedItems.length > 1 ? 's' : ''} des totaux ci-dessous
              </p>
              <p className="mt-0.5 text-[12px] text-foreground/80">
                {unqualifiedItems.map(i => `${i.label}${UNQUALIFIED_REASON_LABEL[i.reason ?? 'qualification']}`).join(', ')} — à compléter dans Patrimoine pour être pris en compte.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bandeau des totaux : patrimoine net mis en avant, actifs et passifs à côté. */}
      <div className="grid grid-cols-1 divide-y divide-border border-b border-border md:grid-cols-3 md:divide-x md:divide-y-0">
        <div className="px-8 py-5">
          <p className="text-[12px] text-muted-foreground">Patrimoine net</p>
          <p className="mt-2 text-[30px] font-medium leading-none tracking-[-0.03em] tabular-nums text-foreground">
            {formatCurrency(financialSummary.patrimoineNet)}
          </p>
        </div>
        <div className="px-8 py-5">
          <p className="text-[12px] text-muted-foreground">Actifs</p>
          <p className="mt-2 text-[20px] font-medium leading-none tracking-[-0.02em] tabular-nums text-foreground">{formatCurrency(financialSummary.totalActifs)}</p>
        </div>
        <div className="px-8 py-5">
          <p className="text-[12px] text-muted-foreground">Passifs</p>
          <p className="mt-2 text-[20px] font-medium leading-none tracking-[-0.02em] tabular-nums text-foreground">{formatCurrency(financialSummary.totalPassifs)}</p>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 divide-y divide-border border-b border-border lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        <div className="px-8 py-6">
          <PanelTitle>Répartition du patrimoine</PanelTitle>
          <div className="mt-4">
            <PatrimoineChart
              assets={assets}
              passifs={passifs}
              emprunts={emprunts}
              selectedCategory={null}
              assetDemembrements={assetDemembrements}
              demembrementCtx={demembrementCtx}
            />
          </div>
        </div>
        <div className="px-8 py-6 lg:col-span-2">
          <PanelTitle>Évolution des actifs</PanelTitle>
          <div className="mt-4">
            {evolutionPatrimoine.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">
                Pas encore d'historique de valorisation. Ajoutez des valorisations à vos actifs pour voir l'évolution de votre patrimoine dans le temps.
              </p>
            ) : (
              <RangeNavigator points={evolutionPoints} formatValue={formatCurrency} />
            )}
          </div>
        </div>
      </div>

      {/* Par tête, plus-values, objectifs */}
      <div className="grid grid-cols-1 divide-y divide-border lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        <div className="px-8 py-6">
          <PanelTitle action={onNavigateToParTete ? <button type="button" onClick={onNavigateToParTete} className={panelLinkClass}>Voir le détail</button> : undefined}>
            Patrimoine par tête
          </PanelTitle>
          <div className="mt-4 space-y-5">
            <PersonBlock
              name={pv.userFirstName}
              value={formatCurrency(pv.userValue)}
              share={pv.showSpouse ? share(pv.userValue) : undefined}
              barClassName="bg-lagon"
              rows={pv.showSpouse ? [
                ['Actifs', formatCurrency(pv.userActifs)],
                pv.userOwnValue > 0 ? ['Biens propres', formatCurrency(pv.userOwnValue)] : null,
                pv.userSharedValue > 0 ? ['Part des communs', formatCurrency(pv.userSharedValue)] : null,
                pv.userPassifs > 0 ? ['Passifs', formatCurrency(pv.userPassifs)] : null,
              ] : []}
            />
            {pv.showSpouse && (
              <PersonBlock
                name={pv.spouseFirstName}
                value={formatCurrency(pv.spouseValue)}
                share={share(pv.spouseValue)}
                barClassName="bg-citron"
                rows={[
                  ['Actifs', formatCurrency(pv.spouseActifs)],
                  pv.spouseOwnValue > 0 ? ['Biens propres', formatCurrency(pv.spouseOwnValue)] : null,
                  pv.spouseSharedValue > 0 ? ['Part des communs', formatCurrency(pv.spouseSharedValue)] : null,
                  pv.spousePassifs > 0 ? ['Passifs', formatCurrency(pv.spousePassifs)] : null,
                ]}
              />
            )}
          </div>
        </div>

        <div className="px-8 py-6">
          <PlusValuesCard plusValuesSummary={plusValuesSummary} onOpen={onNavigateToPlusValues} />
        </div>

        <div className="px-8 py-6">
          <PanelTitle>Objectifs</PanelTitle>
          <p className="mt-3 text-[13px] text-muted-foreground">Définissez vos objectifs patrimoniaux.</p>
          <p className="mt-1 text-[12px] text-muted-foreground/70">Fonctionnalité à venir</p>
        </div>
      </div>
    </PatrimoinePanel>
  );
};

/* Sous-composants */

// Patrimoine d'une personne : montant, part du total (barre) et détail en lignes libellé / valeur.
const PersonBlock = ({ name, value, share, barClassName, rows }: {
  name: string;
  value: string;
  share?: number;
  barClassName: string;
  rows: ([string, string] | null)[];
}) => (
  <div>
    <div className="flex items-baseline justify-between gap-3">
      <p className="text-[13px] font-medium text-foreground">{name}</p>
      <p className="text-[15px] font-medium tabular-nums text-foreground">{value}</p>
    </div>
    {share !== undefined && (
      <div className="mt-2 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-[1px] bg-secondary">
          <div className={`h-full transition-all duration-700 ease-out ${barClassName}`} style={{ width: `${share}%` }} />
        </div>
        <span className="w-9 text-right text-[12px] tabular-nums text-muted-foreground">{Math.round(share)} %</span>
      </div>
    )}
    {rows.some(Boolean) && (
      <dl className="mt-2">
        {rows.filter((r): r is [string, string] => !!r).map(([label, v]) => (
          <SummaryRow key={label} label={label}>
            <span className={label === 'Passifs' ? 'tabular-nums text-destructive' : 'tabular-nums'}>{v}</span>
          </SummaryRow>
        ))}
      </dl>
    )}
  </div>
);
