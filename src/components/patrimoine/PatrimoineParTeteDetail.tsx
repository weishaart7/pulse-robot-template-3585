import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { SummaryRow } from '@/components/layout/workspace-panel';
import { SectionHeader } from '@/components/family/SectionHeader';
import { PatrimoinePanel, BackButton } from './PatrimoinePanel';
import { useAssets } from '@/hooks/useAssets';
import { usePassifs, useEmprunts } from '@/hooks/usePassifs';
import { useFamilyProfile, useMaritalStatus, useFamilyLinks } from '@/hooks/useFamilyData';
import { usePatrimoineCalculations } from '@/hooks/usePatrimoineCalculations';
import { getCategoryColor } from '@/lib/patrimoine/utils';
import { getAssetCategory } from '@/constants/assetTypes';
import { getRepartitionFoyer, BienNonQualifieError } from '@/lib/patrimoine/succession';
import { assetDemembrementService, AssetDemembrement } from '@/services/assetDemembrementService';

interface PatrimoineParTeteDetailProps {
  onBack?: () => void;
}

export const PatrimoineParTeteDetail = ({ onBack }: PatrimoineParTeteDetailProps) => {
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
    patrimoineParPersonne,
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

  const {
    userFirstName, spouseFirstName, showSpouse,
    userValue, spouseValue, totalValue,
    userActifs, spouseActifs,
    userOwnValue, spouseOwnValue,
    userSharedValue, spouseSharedValue,
    userPassifs, spousePassifs
  } = patrimoineParPersonne;

  // Répartition par catégorie / par personne (parts attribuées) — même
  // source unique que patrimoineParPersonne (getRepartitionFoyer) : un bien
  // jamais qualifié est exclu silencieusement ici (déjà signalé une fois par
  // le résumé principal via unqualifiedItems, pas la peine de dupliquer
  // l'avertissement dans cette vue détaillée).
  const computeByCategory = (forSpouse: boolean) => {
    const map: Record<string, number> = {};
    assets.forEach((a: any) => {
      const valeur = Number(a.valeur_estimee || 0);
      if (!valeur) return;
      let repartition: { user: number; spouse: number };
      try {
        repartition = getRepartitionFoyer(a, a.denomination || a.nature);
      } catch (error) {
        if (error instanceof BienNonQualifieError) return;
        throw error;
      }
      const part = valeur * (forSpouse ? repartition.spouse : repartition.user);
      if (part > 0) {
        const cat = getAssetCategory(a.nature);
        map[cat] = (map[cat] || 0) + part;
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  };

  const userByCategory = computeByCategory(false);
  const spouseByCategory = showSpouse ? computeByCategory(true) : [];

  const people = [
    { key: 'user', name: userFirstName, net: userValue, actifs: userActifs, passifs: userPassifs, own: userOwnValue, shared: userSharedValue, byCategory: userByCategory, bar: 'bg-lagon' },
    ...(showSpouse
      ? [{ key: 'spouse', name: spouseFirstName, net: spouseValue, actifs: spouseActifs, passifs: spousePassifs, own: spouseOwnValue, shared: spouseSharedValue, byCategory: spouseByCategory, bar: 'bg-citron' }]
      : []),
  ];
  const cols = showSpouse ? 'lg:grid-cols-2' : '';

  return (
    <PatrimoinePanel
      trail="Patrimoine par tête"
      title="Patrimoine par tête"
      summary={`Patrimoine net du foyer ${formatCurrency(totalValue)}`}
      actions={onBack && <BackButton onClick={onBack} label="Retour au résumé" />}
      bare
    >
      {/* Bandeau : patrimoine net de chacun, puis du foyer */}
      <div className={`grid grid-cols-1 divide-y divide-border border-b border-border md:divide-x md:divide-y-0 ${showSpouse ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        {people.map(p => (
          <div key={p.key} className="px-8 py-5">
            <p className="text-[12px] text-muted-foreground">{p.name}</p>
            <p className="mt-2 text-[20px] font-medium leading-none tracking-[-0.02em] tabular-nums text-foreground">{formatCurrency(p.net)}</p>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-[1px] bg-secondary">
                <div className={`h-full ${p.bar}`} style={{ width: `${totalValue > 0 ? (p.net / totalValue) * 100 : 100}%` }} />
              </div>
              <span className="w-12 text-right text-[12px] tabular-nums text-muted-foreground">
                {(totalValue > 0 ? (p.net / totalValue) * 100 : 100).toFixed(1)} %
              </span>
            </div>
            <dl className="mt-3">
              <SummaryRow label="Actifs"><span className="tabular-nums">{formatCurrency(p.actifs)}</span></SummaryRow>
              <SummaryRow label="Passifs"><span className="tabular-nums">{formatCurrency(p.passifs)}</span></SummaryRow>
            </dl>
          </div>
        ))}
        <div className="px-8 py-5">
          <p className="text-[12px] text-muted-foreground">Foyer</p>
          <p className="mt-2 text-[30px] font-medium leading-none tracking-[-0.03em] tabular-nums text-foreground">{formatCurrency(totalValue)}</p>
          <p className="mt-2 text-[12px] text-muted-foreground">Patrimoine net total</p>
        </div>
      </div>

      {/* Biens propres / part des communs */}
      {showSpouse && (
        <div className={`grid grid-cols-1 divide-y divide-border border-b border-border lg:divide-x lg:divide-y-0 ${cols}`}>
          {people.map(p => {
            const ownPct = p.actifs > 0 ? (p.own / p.actifs) * 100 : 0;
            const sharedPct = p.actifs > 0 ? (p.shared / p.actifs) * 100 : 0;
            return (
              <div key={p.key} className="px-8 py-6">
                <SectionHeader title={`${p.name} — biens propres / communs`} />
                <div className="flex h-1.5 w-full overflow-hidden rounded-[1px] bg-secondary">
                  <div className="bg-lagon-ink" style={{ width: `${ownPct}%` }} />
                  <div className="bg-lagon" style={{ width: `${sharedPct}%` }} />
                </div>
                <dl className="mt-3">
                  <SummaryRow label="Biens propres">
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[2px] bg-lagon-ink" /><span className="tabular-nums">{formatCurrency(p.own)}</span></span>
                      <span className="text-[12px] font-normal tabular-nums text-muted-foreground">{ownPct.toFixed(1)} %</span>
                    </span>
                  </SummaryRow>
                  <SummaryRow label="Part des communs">
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[2px] bg-lagon" /><span className="tabular-nums">{formatCurrency(p.shared)}</span></span>
                      <span className="text-[12px] font-normal tabular-nums text-muted-foreground">{sharedPct.toFixed(1)} %</span>
                    </span>
                  </SummaryRow>
                </dl>
              </div>
            );
          })}
        </div>
      )}

      {/* Répartition par catégorie */}
      <div className={`grid grid-cols-1 divide-y divide-border lg:divide-x lg:divide-y-0 ${cols}`}>
        {people.map(p => (
          <div key={p.key} className="px-8 py-6">
            <SectionHeader title={`${p.name} — répartition par catégorie`} />
            {p.byCategory.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">Aucun actif attribué</p>
            ) : (
              <ul className="space-y-3">
                {p.byCategory.map(([cat, value]) => {
                  const pct = p.actifs > 0 ? (value / p.actifs) * 100 : 0;
                  return (
                    <li key={cat}>
                      <div className="flex items-center justify-between gap-3 text-[13px]">
                        <span className="flex min-w-0 items-center gap-2">
                          <span aria-hidden className="h-3 w-[3px] shrink-0 rounded-full" style={{ backgroundColor: getCategoryColor(cat) }} />
                          <span className="truncate capitalize text-foreground">{cat}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2 tabular-nums">
                          <span className="text-foreground">{formatCurrency(value)}</span>
                          <span className="w-9 text-right text-[12px] text-muted-foreground">{pct.toFixed(0)} %</span>
                        </span>
                      </div>
                      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-[1px] bg-secondary">
                        <div className="h-full" style={{ width: `${pct}%`, backgroundColor: getCategoryColor(cat) }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </div>
    </PatrimoinePanel>
  );
};
