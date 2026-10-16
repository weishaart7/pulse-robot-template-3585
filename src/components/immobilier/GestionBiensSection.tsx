import { useEffect, useState } from 'react';
import { Chip } from '@/components/layout/workspace-panel';
import { assetService, type Asset, type AssetCharge, type AssetRevenu } from '@/services/assetService';
import { annualiserCharge, annualiserRevenu, computeChargesAnnuelles, computeLoyersAnnuels } from '@/lib/immobilier/rentabilite';
import { formatCurrency } from '@/lib/patrimoine/utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface GestionBiensSectionProps {
  assets: Asset[];
}

interface LigneConsolidee {
  type: 'Revenu' | 'Charge';
  nature: string;
  montant: number;
  periodicite: string;
  montantAnnualise: number;
}

export const GestionBiensSection = ({ assets }: GestionBiensSectionProps) => {
  const [revenus, setRevenus] = useState<AssetRevenu[]>([]);
  const [charges, setCharges] = useState<AssetCharge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const assetIds = assets.map((a) => a.id).filter((id): id is string => !!id);
    if (assetIds.length === 0) {
      setRevenus([]);
      setCharges([]);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    Promise.all([
      assetService.getAssetRevenusByAssetIds(assetIds),
      assetService.getAssetChargesByAssetIds(assetIds),
    ])
      .then(([revenusData, chargesData]) => {
        if (cancelled) return;
        setRevenus(revenusData);
        setCharges(chargesData);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets.map((a) => a.id).join(',')]);

  if (isLoading) {
    return <div className="px-8 py-6"><LoadingSpinner /></div>;
  }

  const revenusParBien = new Map<string, AssetRevenu[]>();
  for (const r of revenus) {
    const list = revenusParBien.get(r.asset_id) || [];
    list.push(r);
    revenusParBien.set(r.asset_id, list);
  }
  const chargesParBien = new Map<string, AssetCharge[]>();
  for (const c of charges) {
    const list = chargesParBien.get(c.asset_id) || [];
    list.push(c);
    chargesParBien.set(c.asset_id, list);
  }

  const biensAvecLignes = assets
    .filter((a) => a.id && ((revenusParBien.get(a.id) || []).length > 0 || (chargesParBien.get(a.id) || []).length > 0))
    .map((asset) => {
      const revenusBien = revenusParBien.get(asset.id!) || [];
      const chargesBien = chargesParBien.get(asset.id!) || [];
      const lignes: LigneConsolidee[] = [
        ...revenusBien.map((r): LigneConsolidee => ({
          type: 'Revenu',
          nature: r.nature,
          montant: r.montant,
          periodicite: r.periodicite,
          montantAnnualise: annualiserRevenu(r),
        })),
        ...chargesBien.map((c): LigneConsolidee => ({
          type: 'Charge',
          nature: c.denomination || c.type_charge,
          montant: c.montant,
          periodicite: c.periodicite,
          montantAnnualise: annualiserCharge(c),
        })),
      ];
      const loyersAnnuels = computeLoyersAnnuels(revenusBien);
      const chargesAnnuelles = computeChargesAnnuelles(chargesBien);
      return { asset, lignes, loyersAnnuels, chargesAnnuelles };
    });

  if (biensAvecLignes.length === 0) {
    return (
      <div className="px-8 py-7">
        <p className="max-w-md text-[13px] text-muted-foreground">
          Aucun revenu ni charge enregistré pour le moment. Ils se saisissent depuis « Mes biens », menu ⋯ →
          « Revenus et charges ».
        </p>
      </div>
    );
  }

  const totalLoyers = biensAvecLignes.reduce((s, b) => s + b.loyersAnnuels, 0);
  const totalCharges = biensAvecLignes.reduce((s, b) => s + b.chargesAnnuelles, 0);

  const net = (n: number) => `${n >= 0 ? '+' : '−'}${formatCurrency(Math.abs(n))}`;

  // Vue consolidée en « panneau de travail » : rappel et totaux du portefeuille, puis une section par
  // bien (empilées en colonnes, comme les catégories du Budget) avec ses lignes et son solde annuel.
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 px-8 py-4">
        <p className="max-w-xl text-[12.5px] text-muted-foreground">
          Revenus et charges de tous les biens, annualisés. Pour ajouter ou modifier une ligne : « Mes biens »,
          menu ⋯ → « Revenus et charges ».
        </p>
        <dl className="flex items-baseline gap-6 text-[13px] tabular-nums">
          <div className="flex items-baseline gap-2">
            <dt className="text-muted-foreground">Revenus</dt>
            <dd className="font-medium text-foreground">{formatCurrency(totalLoyers)}</dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt className="text-muted-foreground">Charges</dt>
            <dd className="font-medium text-foreground">{formatCurrency(totalCharges)}</dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt className="text-muted-foreground">Solde annuel</dt>
            <dd className={`font-medium ${totalLoyers - totalCharges >= 0 ? 'text-positive' : 'text-destructive'}`}>
              {net(totalLoyers - totalCharges)}
            </dd>
          </div>
        </dl>
      </div>

      <div className={`border-t border-border gap-0 [column-rule:1px_solid_hsl(var(--border))] ${biensAvecLignes.length > 1 ? 'lg:columns-2' : ''}`}>
        {biensAvecLignes.map(({ asset, lignes, loyersAnnuels, chargesAnnuelles }) => (
          <section key={asset.id} className="break-inside-avoid border-b border-border px-8 py-5">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h3 className="flex min-w-0 items-center gap-2 text-[14.5px] font-medium tracking-[-0.01em] text-foreground">
                <span aria-hidden className="h-3 w-[3px] shrink-0 rounded-full bg-lagon" />
                <span className="truncate">{asset.denomination || 'Sans dénomination'}</span>
                <span className="text-[12px] font-normal tabular-nums text-muted-foreground">{lignes.length}</span>
              </h3>
              <span className={`shrink-0 text-[13px] font-medium tabular-nums ${loyersAnnuels - chargesAnnuelles >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                {net(loyersAnnuels - chargesAnnuelles)}
                <span className="ml-1 font-normal text-muted-foreground">/ an</span>
              </span>
            </div>
            <ul className="-mx-2 divide-y divide-border border-y border-border">
              {lignes.map((ligne, idx) => (
                <li key={`${asset.id}-${idx}`} className="flex items-center gap-3 px-2 py-2 text-[13px]">
                  <span className="w-[4.25rem] shrink-0">
                    <Chip tone={ligne.type === 'Revenu' ? 'lagon' : 'citron'}>{ligne.type}</Chip>
                  </span>
                  <span className="min-w-0 flex-1 truncate text-foreground">{ligne.nature}</span>
                  <span className="shrink-0 text-right tabular-nums">
                    <span className="block font-medium text-foreground">
                      {ligne.type === 'Charge' ? '−' : '+'}{formatCurrency(ligne.montantAnnualise)}
                      <span className="ml-1 font-normal text-muted-foreground">/ an</span>
                    </span>
                    <span className="block text-[12px] text-muted-foreground">
                      {ligne.montant.toLocaleString('fr-FR')} € · <span className="lowercase">{ligne.periodicite}</span>
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 flex justify-end gap-4 text-[12px] tabular-nums text-muted-foreground">
              <span>Revenus {formatCurrency(loyersAnnuels)}</span>
              <span>Charges {formatCurrency(chargesAnnuelles)}</span>
            </p>
          </section>
        ))}
      </div>
    </div>
  );
};
