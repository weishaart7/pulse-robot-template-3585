import { PatrimoinePanel } from './PatrimoinePanel';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PanelDivider, PanelTitle, SummaryRow, panelLinkClass } from '@/components/layout/workspace-panel';
import RangeNavigator from '@/components/ui/range-navigator';
import { PATRIMOINE } from '@/lib/palette';
import { computePatrimoineBreakdown, computeRepartitionNette } from './PatrimoineChart';
import { PlusValuesCard } from './PlusValuesCard';
import { RepartitionActifs } from './RepartitionActifs';
import { useAssets } from '@/hooks/useAssets';
import { usePassifs, useEmprunts } from '@/hooks/usePassifs';
import { useFamilyProfile, useMaritalStatus, useFamilyLinks } from '@/hooks/useFamilyData';
import { usePatrimoineCalculations, UnqualifiedItem } from '@/hooks/usePatrimoineCalculations';
import { assetValorisationService, AssetValorisation } from '@/services/assetValorisationService';
import { assetDemembrementService, AssetDemembrement } from '@/services/assetDemembrementService';
import { computeEvolutionPatrimoine } from '@/lib/patrimoine/evolutionPatrimoine';
import { ArrowUpRight, ArrowDownRight, ArrowRight } from 'lucide-react';

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
      passifs,
      emprunts,
      assetDemembrements,
      demembrementCtx
    }),
    [assets, valorisations, passifs, emprunts, assetDemembrements, demembrementCtx]
  );

  const evolutionPoints = useMemo(
    () => evolutionPatrimoine.map((p) => ({ date: p.date, value: p.net, marked: p.valorisation })),
    [evolutionPatrimoine]
  );

  // Composition des actifs par catégorie — même calcul que la Vue d'ensemble (part du foyer,
  // démembrement pondéré, éléments non qualifiés exclus).
  const composition = useMemo(() => {
    const items = computePatrimoineBreakdown(assets, passifs, emprunts, assetDemembrements, demembrementCtx)
      .filter(i => i.type === 'actif' && i.value > 0);
    const total = items.reduce((sum, i) => sum + i.value, 0);
    return items.map(i => ({ ...i, pct: total > 0 ? (i.value / total) * 100 : 0 }));
  }, [assets, passifs, emprunts, assetDemembrements, demembrementCtx]);

  const repartitionNette = useMemo(
    () => computeRepartitionNette(assets, passifs, emprunts, assetDemembrements, demembrementCtx),
    [assets, passifs, emprunts, assetDemembrements, demembrementCtx]
  );

  // Variation du patrimoine net sur 12 mois (ou depuis le premier point d'historique s'il est plus récent).
  const variation = useMemo(() => {
    if (evolutionPatrimoine.length < 2) return null;
    const last = evolutionPatrimoine[evolutionPatrimoine.length - 1];
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const base = [...evolutionPatrimoine].reverse().find(p => p.date <= cutoffStr) ?? evolutionPatrimoine[0];
    if (base === last) return null;
    return {
      delta: last.net - base.net,
      // Pas de % sur une base nulle ou négative : il n'aurait pas de sens.
      pct: base.net > 0 ? ((last.net - base.net) / base.net) * 100 : null,
      depuis: base.date <= cutoffStr ? 'sur 12 mois' : `depuis le ${new Date(base.date).toLocaleDateString('fr-FR')}`,
    };
  }, [evolutionPatrimoine]);
  // Moins d'un euro d'écart : variation nulle, flèche à plat en orange.
  const variationStable = !!variation && Math.round(variation.delta) === 0;

  const tauxEndettement = financialSummary.totalActifs > 0 ? (financialSummary.totalPassifs / financialSummary.totalActifs) * 100 : 0;

  // Points d'attention : ce qui fausse ou affaiblit les chiffres affichés.
  const unAn = new Date();
  unAn.setFullYear(unAn.getFullYear() - 1);
  const nonEvalues = assets.filter(a => !a.valeur_estimee || a.valeur_estimee <= 0);
  const estimationsAnciennes = assets.filter(a => a.valeur_estimee && a.date_estimation && new Date(a.date_estimation) < unAn);
  const pointsAttention = [
    unqualifiedItems.length > 0 && {
      tone: 'bg-spark',
      label: `${unqualifiedItems.length} élément${unqualifiedItems.length > 1 ? 's' : ''} exclu${unqualifiedItems.length > 1 ? 's' : ''} des totaux`,
      detail: unqualifiedItems.map(i => `${i.label}${UNQUALIFIED_REASON_LABEL[i.reason ?? 'qualification']}`).join(', '),
    },
    nonEvalues.length > 0 && {
      tone: 'bg-spark',
      label: `${nonEvalues.length} actif${nonEvalues.length > 1 ? 's' : ''} sans valeur estimée`,
      detail: nonEvalues.slice(0, 3).map(a => a.denomination || a.nature).join(', ') + (nonEvalues.length > 3 ? '…' : ''),
    },
    estimationsAnciennes.length > 0 && {
      tone: 'bg-citron-ink',
      label: `${estimationsAnciennes.length} estimation${estimationsAnciennes.length > 1 ? 's' : ''} de plus d'un an`,
      detail: estimationsAnciennes.slice(0, 3).map(a => a.denomination || a.nature).join(', ') + (estimationsAnciennes.length > 3 ? '…' : ''),
    },
  ].filter(Boolean) as { tone: string; label: string; detail: string }[];

  const pv = patrimoineParPersonne;
  const share = (v: number) => (pv.totalValue > 0 ? (v / pv.totalValue) * 100 : 0);

  return (
    <PatrimoinePanel
      trail="Résumé"
      title="Résumé"
      summary={[
        `${assets.length} actif${assets.length > 1 ? 's' : ''}`,
        `${passifs.length + emprunts.length} passif${passifs.length + emprunts.length > 1 ? 's' : ''}`,
        composition.length > 0 && `${composition.length} catégorie${composition.length > 1 ? 's' : ''}`,
      ].filter(Boolean).join(' · ')}
      bare
    >
      {/* En-tête : patrimoine net et sa variation, puis évolution des actifs. */}
      <div className="grid grid-cols-1 divide-y divide-border border-b border-border lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:divide-x lg:divide-y-0">
        <div className="px-8 py-6">
          <p className="text-[12px] text-muted-foreground">Patrimoine net</p>
          <p className="mt-2 text-[34px] font-medium leading-none tracking-[-0.03em] tabular-nums text-foreground">
            {formatCurrency(financialSummary.patrimoineNet)}
          </p>
          {variation && (
            <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]">
              <span className={`inline-flex h-6 items-center gap-1 rounded-[2px] px-2 font-medium tabular-nums ${
                variationStable ? 'bg-[#ffa451]/15 text-[#ffa451]' : variation.delta > 0 ? 'bg-positive/10 text-positive' : 'bg-destructive/10 text-destructive'
              }`}>
                {variationStable ? <ArrowRight className="h-3.5 w-3.5" /> : variation.delta > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {variationStable
                  ? (variation.pct !== null ? '0,0 %' : formatCurrency(0))
                  : variation.pct !== null
                    ? `${variation.delta > 0 ? '+' : ''}${variation.pct.toFixed(1).replace('.', ',')} %`
                    : `${variation.delta > 0 ? '+' : ''}${formatCurrency(variation.delta)}`}
              </span>
              <span className="text-muted-foreground">
                {variation.depuis}{variation.pct !== null && ` (${variationStable ? formatCurrency(0) : `${variation.delta > 0 ? '+' : ''}${formatCurrency(variation.delta)}`})`}
              </span>
            </p>
          )}
          <dl className="mt-5">
            <SummaryRow label="Actifs"><span className="tabular-nums">{formatCurrency(financialSummary.totalActifs)}</span></SummaryRow>
            <SummaryRow label="Passifs"><span className="tabular-nums">{formatCurrency(financialSummary.totalPassifs)}</span></SummaryRow>
            <SummaryRow label="Endettement">
              <span className="tabular-nums">{tauxEndettement.toFixed(1).replace('.', ',')} %</span>
              <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">des actifs</span>
            </SummaryRow>
          </dl>
        </div>

        <div className="px-8 py-6">
          {evolutionPatrimoine.length === 0 ? (
            <>
              <PanelTitle>Évolution du patrimoine net</PanelTitle>
              <p className="mt-4 text-[13px] text-muted-foreground">
                Pas encore d'historique de valorisation. Ajoutez des valorisations à vos actifs pour voir l'évolution de votre patrimoine dans le temps.
              </p>
            </>
          ) : (
            <RangeNavigator color={PATRIMOINE.lagonProfond} title={<PanelTitle>Évolution du patrimoine net</PanelTitle>} points={evolutionPoints} formatValue={formatCurrency} />
          )}
        </div>
      </div>

      <RepartitionActifs
        categories={composition.map(c => ({ name: c.name, value: c.value, pct: c.pct, color: c.color }))}
        nette={repartitionNette}
        formatCurrency={formatCurrency}
      />

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
          <PanelTitle>Points d'attention</PanelTitle>
          {pointsAttention.length === 0 ? (
            <p className="mt-4 flex items-center gap-2 text-[13px] text-foreground">
              <span className="h-2.5 w-2.5 rounded-[2px] bg-positive" />
              Rien à signaler : tous les actifs sont qualifiés et valorisés.
            </p>
          ) : (
            <ul className="mt-3">
              {pointsAttention.map(p => (
                <li key={p.label} className="border-t border-border py-2.5 first:border-t-0 first:pt-1">
                  <p className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-[2px] ${p.tone}`} />
                    {p.label}
                  </p>
                  {p.detail && <p className="mt-0.5 pl-[18px] text-[12px] text-muted-foreground">{p.detail}</p>}
                </li>
              ))}
            </ul>
          )}
          <PanelDivider />
          <p className="text-[12px] text-muted-foreground">Objectifs patrimoniaux : fonctionnalité à venir.</p>
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
