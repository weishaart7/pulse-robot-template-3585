import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ShieldCheck, BadgePercent, AlertTriangle, Info } from 'lucide-react';
import { SectionHeader } from '@/components/family/SectionHeader';
import { PatrimoinePanel, BackButton } from './PatrimoinePanel';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAssets } from '@/hooks/useAssets';
import { Asset } from '@/services/assetService';
import { usePassifs, useEmprunts } from '@/hooks/usePassifs';
import { useFamilyProfile, useMaritalStatus, useFamilyLinks } from '@/hooks/useFamilyData';
import { usePatrimoineCalculations } from '@/hooks/usePatrimoineCalculations';
import { getCategoryColor } from '@/lib/patrimoine/utils';
import { getNatureDisplayLabel } from '@/constants/assetTypes';
import { resolveAssetFiscalRegime, caracteristiquesFiscalesActif } from '@/lib/patrimoine/assetFiscalRegime';
import { useSocietes } from '@/hooks/useSocietes';
import { useRachatsAssuranceVie } from '@/hooks/useRachatsAssuranceVie';
import { assetDemembrementService, AssetDemembrement } from '@/services/assetDemembrementService';

interface PatrimoinePlusValuesProps {
  onBack?: () => void;
}

export const PatrimoinePlusValues = ({ onBack }: PatrimoinePlusValuesProps) => {
  const { assets } = useAssets();
  const { passifs } = usePassifs();
  const { emprunts } = useEmprunts();
  const { data: familyProfile } = useFamilyProfile();
  const { data: maritalStatus } = useMaritalStatus();
  const { data: familyLinks } = useFamilyLinks();
  const [assetDemembrements, setAssetDemembrements] = useState<AssetDemembrement[]>([]);

  useEffect(() => {
    assetDemembrementService.getAllForUser()
      .then(setAssetDemembrements)
      .catch(() => {
        setAssetDemembrements([]);
        toast.error("Impossible de charger les démembrements");
      });
  }, []);

  const {
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

  const { totalPlusValues, totalMoinsValues, netPlusValue, byCategory, assetsWithPlusValue } = plusValuesSummary;
  const isPositive = netPlusValue >= 0;

  const signed = (n: number) => `${n > 0 ? '+' : ''}${formatCurrency(n)}`;
  const categories = Object.entries(byCategory)
    .filter(([, data]) => data.count > 0)
    .sort((a, b) => Math.abs(b[1].plusValue) - Math.abs(a[1].plusValue));

  return (
    <PatrimoinePanel
      trail="Plus-values"
      title="Plus-values"
      summary={`Résultat net latent ${signed(netPlusValue)}`}
      actions={onBack && <BackButton onClick={onBack} label="Retour au résumé" />}
      bare
    >
      {/* Bandeau des totaux */}
      <div className="grid grid-cols-1 divide-y divide-border border-b border-border md:grid-cols-3 md:divide-x md:divide-y-0">
        <StatTile label="Plus-values" sub="Gains latents" value={`+${formatCurrency(totalPlusValues)}`} valueClass="text-positive" />
        <StatTile label="Moins-values" sub="Pertes latentes" value={`-${formatCurrency(totalMoinsValues)}`} valueClass="text-destructive" />
        <StatTile label="Résultat net" sub="Balance globale" value={signed(netPlusValue)} valueClass={isPositive ? 'text-foreground' : 'text-destructive'} large />
      </div>

      {/* Détail par actif + par catégorie */}
      <div className="grid grid-cols-1 divide-y divide-border border-b border-border lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        <div className="min-w-0 px-8 py-6 lg:col-span-2">
          <SectionHeader title="Détail par actif" />
          {assetsWithPlusValue.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              Renseignez la valeur d'acquisition de vos actifs pour calculer les plus-values.
            </p>
          ) : (
            <div className="no-scrollbar overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="h-9 text-[12px] font-normal text-muted-foreground text-left">Actif</th>
                    <th className="h-9 text-[12px] font-normal text-muted-foreground text-right">Acquisition</th>
                    <th className="h-9 text-[12px] font-normal text-muted-foreground text-right">Estimation</th>
                    <th className="h-9 text-[12px] font-normal text-muted-foreground text-right">+/- value</th>
                    <th className="h-9 text-[12px] font-normal text-muted-foreground text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {assetsWithPlusValue.map((asset) => {
                    const pct = asset.valeurAcquisition > 0 ? (asset.plusValue / asset.valeurAcquisition) * 100 : 0;
                    const positive = asset.plusValue >= 0;
                    return (
                      <tr key={asset.id} className="border-b border-border last:border-0 transition-colors hover:bg-secondary/60">
                        <td className="py-2 pr-3">
                          <p className="text-[13px] text-foreground">{asset.denomination}</p>
                          <p className="mt-0.5 text-[12px] text-muted-foreground">{getNatureDisplayLabel(asset.nature)}</p>
                        </td>
                        <td className="py-2 text-right text-[13px] tabular-nums text-muted-foreground">{formatCurrency(asset.valeurAcquisition)}</td>
                        <td className="py-2 text-right text-[13px] tabular-nums text-foreground">{formatCurrency(asset.valeurEstimee)}</td>
                        <td className={`py-2 text-right text-[13px] tabular-nums ${positive ? 'text-positive' : 'text-destructive'}`}>{signed(asset.plusValue)}</td>
                        <td className={`py-2 pl-3 text-right text-[12px] tabular-nums ${positive ? 'text-positive' : 'text-destructive'}`}>
                          {positive ? '+' : ''}{pct.toFixed(1)} %
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="px-8 py-6">
          <SectionHeader title="Par catégorie" />
          {categories.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">Aucune donnée</p>
          ) : (
            <ul className="border-b border-border">
              {categories.map(([category, data]) => (
                <li key={category} className="flex items-center justify-between gap-3 border-t border-border py-2.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <span aria-hidden className="h-3 w-[3px] shrink-0 rounded-full" style={{ backgroundColor: getCategoryColor(category) }} />
                    <span className="truncate text-[13px] text-foreground">{category.charAt(0).toUpperCase() + category.slice(1)}</span>
                    <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">{data.count}</span>
                  </span>
                  <span className={`shrink-0 text-[13px] tabular-nums ${data.plusValue >= 0 ? 'text-positive' : 'text-destructive'}`}>{signed(data.plusValue)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Fiscalité */}
      <div className="px-8 py-6">
        <SectionHeader title="Fiscalité des plus-values" />
        <div className="mb-5 flex items-start gap-3 rounded-[2px] border border-border bg-secondary/50 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
          <div className="space-y-1">
            <p className="text-[13px] font-medium text-foreground">Fiscalité différenciée selon l'enveloppe</p>
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              Les régimes ci-dessous correspondent à la <strong>nature de l'actif</strong>. Certains placements suivent une fiscalité <strong>spécifique liée à l'enveloppe</strong> qui les détient :
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[12px] leading-relaxed text-muted-foreground">
              <li>SCPI logée dans un CTO → revenus fonciers + PV immobilière (et non PFU)</li>
              <li>Titres dans un Plan d'Épargne en Actions (PEA / PEA-PME) → exonération après 5 ans</li>
              <li>Assurance-vie → fiscalité spécifique selon antériorité du contrat (8 ans)</li>
              <li>PER → fiscalité de sortie selon le mode (capital ou rente)</li>
              <li>Immobilier détenu en propre → abattement pour durée de détention</li>
            </ul>
          </div>
        </div>
        <FiscalContent assetsWithPlusValue={assetsWithPlusValue} assets={assets} formatCurrency={formatCurrency} />
      </div>
    </PatrimoinePanel>
  );
};

/* Sub-components */

// Case d'un bandeau de totaux (même gabarit que le Résumé).
const StatTile = ({ label, sub, value, valueClass, large }: {
  label: string; sub?: string; value: string; valueClass: string; large?: boolean;
}) => (
  <div className="px-8 py-5">
    <p className="text-[12px] text-muted-foreground">{label}</p>
    <p className={`mt-2 font-medium leading-none tabular-nums ${large ? 'text-[30px] tracking-[-0.03em]' : 'text-[20px] tracking-[-0.02em]'} ${valueClass}`}>{value}</p>
    {sub && <p className="mt-2 text-[12px] text-muted-foreground">{sub}</p>}
  </div>
);

const REGIME_BADGE_CLASSES: Record<string, string> = {
  pfu: 'bg-spark/10 text-foreground ',
  exonere_partiel: 'bg-positive/10 text-positive ',
  exonere_total: 'bg-positive/10 text-positive ',
  informatif: 'bg-secondary text-muted-foreground ',
  choix: 'bg-secondary text-muted-foreground ',
  non_determine: 'bg-muted text-muted-foreground/70',
};

const FiscalContent = ({
  assetsWithPlusValue,
  assets,
  formatCurrency
}: {
  assetsWithPlusValue: Array<{ id: string; denomination: string; nature: string; plusValue: number; valeurEstimee: number; valeurAcquisition: number; fraisAcquisition: number; dateAcquisition?: string; origineActif?: string[]; partsCedants: number[] }>;
  assets: Asset[];
  formatCurrency: (v: number) => string;
}) => {
  const { societes } = useSocietes();
  const regimesSocietes = useMemo(
    () => Object.fromEntries(societes.map((s) => [s.id, s.regime_fiscal])),
    [societes]
  );
  const plusValuesParActif = useMemo(
    () => Object.fromEntries(assetsWithPlusValue.map(a => [a.id, a.plusValue])),
    [assetsWithPlusValue]
  );
  const rachatsAV = useRachatsAssuranceVie(assets, plusValuesParActif);
  const allAssetsWithRegime = assetsWithPlusValue.filter(a => a.plusValue > 0).map(a => {
    const fullAsset = assets.find(asset => asset.id === a.id);
    return {
      ...a,
      regime: rachatsAV[a.id] ?? resolveAssetFiscalRegime({
        nature: a.nature,
        ctoMultiActifs: fullAsset?.cto_multi_actifs,
        ctoNatureSousJacent: fullAsset?.cto_nature_sous_jacent,
        plusValue: a.plusValue,
        valeurEstimee: a.valeurEstimee,
        dateAcquisition: a.dateAcquisition,
        valeurAcquisition: a.valeurAcquisition,
        fraisAcquisition: a.fraisAcquisition,
        origineActif: a.origineActif,
        partsCedants: a.partsCedants,
        ...caracteristiquesFiscalesActif(fullAsset, regimesSocietes),
      }),
    };
  });

  const totalCalcule = allAssetsWithRegime
    .filter(a => a.regime.total !== null)
    .reduce((sum, a) => sum + (a.regime.total as number), 0);
  const totalExonerePartiel = allAssetsWithRegime
    .filter(a => a.regime.tone === 'exonere_partiel')
    .reduce((sum, a) => sum + a.plusValue, 0);
  const totalNonDetermine = allAssetsWithRegime
    .filter(a => a.regime.total === null)
    .reduce((sum, a) => sum + a.plusValue, 0);

  if (allAssetsWithRegime.length === 0) {
    return <p className="text-[13px] text-muted-foreground">Aucune plus-value à fiscaliser</p>;
  }

  return (
    <div className="space-y-6">
      {/* Fiscal summary */}
      <div className="grid grid-cols-1 divide-y divide-border border-y border-border md:grid-cols-3 md:divide-x md:divide-y-0">
        <FiscalSummaryCard
          icon={BadgePercent}
          iconColor="text-spark"
          label="Fiscalité estimée"
          value={formatCurrency(totalCalcule)}
          valueColor="text-foreground"
          subtitle="Total des régimes calculables"
          accentColor="bg-gradient-to-r from-spark to-spark"
        />
        <FiscalSummaryCard
          icon={ShieldCheck}
          iconColor="text-positive"
          label="Dont IR exonéré"
          value={formatCurrency(totalExonerePartiel)}
          valueColor="text-positive "
          subtitle="PS (18,6%) restant dus"
          accentColor="bg-gradient-to-r from-positive to-positive"
        />
        <FiscalSummaryCard
          icon={null}
          iconColor=""
          label="Non déterminé"
          value={formatCurrency(totalNonDetermine)}
          valueColor="text-muted-foreground"
          subtitle="Régime à préciser / à ventiler"
          accentColor="bg-muted-foreground/20"
        />
      </div>

      {/* Fiscal table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {['Actif', 'Plus-value', 'Régime', 'IR', 'PS', 'Total'].map((h, i) => (
                <th key={h} className={`h-9 text-[12px] font-normal text-muted-foreground ${
                  i === 0 ? 'text-left' : i === 2 ? 'text-center' : 'text-right'
                }`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allAssetsWithRegime.map(asset => {
              const { regime } = asset;
              return (
                <tr key={asset.id} className="border-b border-border last:border-0 transition-colors hover:bg-secondary/60">
                  <td className="py-2 pr-3">
                    <p className="text-[13px] text-foreground">{asset.denomination}</p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">{asset.nature}</p>
                  </td>
                  <td className="py-2 text-right font-medium text-positive text-[13px] tabular-nums">
                    +{formatCurrency(asset.plusValue)}
                  </td>
                  <td className="py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className={`inline-flex h-6 items-center rounded-[2px] px-2 text-[12px] font-medium ${REGIME_BADGE_CLASSES[regime.tone]}`}>
                        {regime.badge}
                      </span>
                      {regime.note && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                              <Info className="h-3 w-3" strokeWidth={1.5} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs text-[12px] leading-relaxed">
                            {regime.note}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </td>
                  <td className="py-2 text-right text-muted-foreground/70 text-[13px] tabular-nums">
                    {regime.irDetail && (
                      <p className="text-[10px] text-muted-foreground/60 font-normal">{regime.irDetail}</p>
                    )}
                    {regime.ir !== null ? formatCurrency(regime.ir) : '—'}
                  </td>
                  <td className="py-2 text-right text-muted-foreground/70 text-[13px] tabular-nums">
                    {regime.psDetail && (
                      <p className="text-[10px] text-muted-foreground/60 font-normal">{regime.psDetail}</p>
                    )}
                    {regime.ps !== null ? formatCurrency(regime.ps) : '—'}
                  </td>
                  <td className="py-2 text-right font-semibold text-foreground text-[13px] tabular-nums">
                    {regime.alternatives ? (
                      <div className="flex flex-col items-end gap-0.5">
                        {regime.alternatives.map((alt, idx) => (
                          <span key={alt.label} className="text-[11px] font-medium text-muted-foreground/80 whitespace-nowrap">
                            {idx === 0 ? 'Forfait' : 'Réel'} : {formatCurrency(alt.total)}
                          </span>
                        ))}
                      </div>
                    ) : regime.total !== null ? (
                      <>
                        {regime.totalDetail && (
                          <p className="text-[10px] text-muted-foreground/60 font-normal">{regime.totalDetail}</p>
                        )}
                        {formatCurrency(regime.total)}
                      </>
                    ) : (
                      '—'
                    )}
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
  label, value, valueColor, subtitle
}: {
  icon?: React.ElementType | null; iconColor?: string; label: string; value: string; valueColor: string; subtitle: string; accentColor?: string;
}) => (
  <div className="py-4 md:px-5 md:first:pl-0">
    <p className="text-[12px] text-muted-foreground">{label}</p>
    <p className={`mt-2 text-[18px] font-medium leading-none tracking-[-0.02em] tabular-nums ${valueColor}`}>{value}</p>
    <p className="mt-2 text-[12px] text-muted-foreground">{subtitle}</p>
  </div>
);
