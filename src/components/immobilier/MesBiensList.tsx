import { useEffect, useMemo, useState } from 'react';
import { Building2, FileText, Home, MoreHorizontal, Wallet } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Chip } from '@/components/layout/workspace-panel';
import { assetService, type Asset, type AssetCharge, type AssetRevenu } from '@/services/assetService';
import { computeQuotePart } from '@/lib/immobilier/rentabilite';
import { computeFluxBien, computeIndicateurs, type IndicateursFlux } from '@/lib/immobilier/portefeuille';
import { formatCurrency } from '@/lib/patrimoine/utils';
import type { Emprunt } from '@/services/passifService';
import { RENTAL_PROPERTY_TYPES } from '@/schemas/immobilierPropertySchema';
import { CITRON_MID, GREY, LAGON, LAGON_INK, CITRON_INK } from '@/components/budget/budgetColors';

interface MesBiensListProps {
  assets: Asset[];
  emprunts?: Emprunt[];
  isMeuble: (asset: Asset) => boolean;
  onOpen: (asset: Asset) => void;
  onGestion: (asset: Asset) => void;
}

// Familles de biens, dans l'ordre d'affichage.
const GROUPES = [
  { id: 'residences', label: 'Résidences', color: LAGON_INK },
  { id: 'locatif', label: 'Immobilier locatif', color: LAGON },
  { id: 'parts', label: 'Pierre-papier & parts', color: CITRON_MID },
  { id: 'terrains', label: 'Terrains & forêts', color: CITRON_INK },
  { id: 'autres', label: 'Autres biens', color: GREY },
] as const;

type GroupeId = typeof GROUPES[number]['id'];

const groupeOf = (nature = ''): GroupeId => {
  if (RENTAL_PROPERTY_TYPES.includes(nature)) return 'locatif';
  if (/^résidence|maison mobile/i.test(nature)) return 'residences';
  if (/^parts de/i.test(nature)) return 'parts';
  if (/terrain|bois|forêt/i.test(nature)) return 'terrains';
  return 'autres';
};

const fmtPct = (n: number) => `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;

// Colonnes : bien, valeur, rentabilité brute, cashflow, actions.
const ROW_GRID = 'grid grid-cols-[minmax(0,1fr)_auto_2rem] md:grid-cols-[minmax(0,1fr)_8rem_6.5rem_7.5rem_2rem] items-center gap-x-4';

// Liste des biens en « panneau de travail », sur le modèle des membres de Famille : une section par
// famille de biens, une ligne par bien avec valeur, rentabilité brute et cashflow mensuel (mêmes
// formules et pondération quote-part que la Vue d'ensemble, lib/immobilier/portefeuille.ts).
export const MesBiensList = ({ assets, emprunts = [], isMeuble, onOpen, onGestion }: MesBiensListProps) => {
  const [revenus, setRevenus] = useState<AssetRevenu[]>([]);
  const [charges, setCharges] = useState<AssetCharge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const idsKey = assets.map(a => a.id).join(',');

  useEffect(() => {
    const ids = assets.map(a => a.id).filter((id): id is string => !!id);
    if (ids.length === 0) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    Promise.all([assetService.getAssetRevenusByAssetIds(ids), assetService.getAssetChargesByAssetIds(ids)])
      .then(([r, c]) => {
        if (cancelled) return;
        setRevenus(r);
        setCharges(c);
      })
      .catch((error) => {
        if (import.meta.env.DEV) console.error('Erreur chargement des flux des biens:', error);
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  const indicateurs = useMemo(() => {
    const map = new Map<string, IndicateursFlux & { aDesFlux: boolean }>();
    for (const asset of assets) {
      if (!asset.id) continue;
      const r = revenus.filter(x => x.asset_id === asset.id);
      const c = charges.filter(x => x.asset_id === asset.id);
      const flux = computeFluxBien(asset, r, c, emprunts);
      map.set(asset.id, { ...computeIndicateurs(flux), aDesFlux: r.length > 0 || c.length > 0 || flux.loyerAnnuel > 0 || flux.creditMensuel > 0 });
    }
    return map;
  }, [assets, revenus, charges, emprunts]);

  const groupes = GROUPES
    .map(g => {
      const biens = assets
        .filter(a => groupeOf(a.nature) === g.id)
        .sort((a, b) => (b.valeur_estimee || 0) - (a.valeur_estimee || 0));
      return { ...g, biens, total: biens.reduce((s, a) => s + (a.valeur_estimee || 0), 0) };
    })
    .filter(g => g.biens.length > 0);

  if (assets.length === 0) {
    return (
      <div className="px-8 py-7">
        <p className="max-w-md text-[13px] text-muted-foreground">
          Aucun bien pour le moment : les actifs immobiliers créés dans Patrimoine → Actifs apparaissent ici
          automatiquement.
        </p>
      </div>
    );
  }

  return (
    <div>
      {groupes.map(g => (
        <section key={g.id} className="border-b border-border px-8 py-5 last:border-b-0">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h3 className="flex items-center gap-2 text-[14.5px] font-medium tracking-[-0.01em] text-foreground">
              <span aria-hidden className="h-3 w-[3px] rounded-full" style={{ backgroundColor: g.color }} />
              {g.label}
              <span className="text-[12px] font-normal tabular-nums text-muted-foreground">{g.biens.length}</span>
            </h3>
            <span className="text-[13px] font-medium tabular-nums text-foreground">{formatCurrency(g.total)}</span>
          </div>

          <div className={`${ROW_GRID} border-b border-border pb-2 text-[12px] text-muted-foreground`}>
            <span>Bien</span>
            <span className="text-right">Valeur estimée</span>
            <span className="hidden text-right md:block">Rent. brute</span>
            <span className="hidden text-right md:block">Cashflow / mois</span>
            <span />
          </div>

          <ul className="-mx-2 divide-y divide-border">
            {g.biens.map(asset => {
              const ind = asset.id ? indicateurs.get(asset.id) : undefined;
              const quotePart = computeQuotePart(asset);
              const locatif = RENTAL_PROPERTY_TYPES.includes(asset.nature || '');
              const isHouse = /maison/i.test(`${asset.typologie_bien} ${asset.denomination} ${asset.nature}`);
              const Icon = isHouse ? Home : Building2;
              return (
                <li
                  key={asset.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpen(asset)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpen(asset);
                    }
                  }}
                  className={`${ROW_GRID} cursor-pointer px-2 py-2.5 transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] text-foreground"
                      style={{ backgroundColor: `${g.color}2e` }}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{asset.denomination || 'Sans dénomination'}</p>
                      <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
                        <span className="truncate text-xs text-muted-foreground">{asset.nature}</span>
                        {isMeuble(asset) && <Chip tone="lagon">Meublé</Chip>}
                        {quotePart < 100 && <Chip>Quote-part {quotePart.toLocaleString('fr-FR')} %</Chip>}
                      </div>
                    </div>
                  </div>

                  <span className="text-right text-sm font-medium tabular-nums text-foreground">
                    {asset.valeur_estimee ? formatCurrency(asset.valeur_estimee) : '—'}
                  </span>
                  <span className="hidden text-right text-sm tabular-nums md:block">
                    {isLoading ? '…' : ind && ind.aDesFlux && ind.rentabiliteBrute !== 0 ? fmtPct(ind.rentabiliteBrute) : <span className="text-muted-foreground">—</span>}
                  </span>
                  <span className="hidden text-right text-sm tabular-nums md:block">
                    {isLoading ? '…' : ind && ind.aDesFlux ? (
                      <span className={ind.cashflowMensuel >= 0 ? 'text-positive' : 'text-destructive'}>
                        {ind.cashflowMensuel >= 0 ? '+' : ''}{formatCurrency(ind.cashflowMensuel)}
                      </span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </span>

                  <div className="flex justify-end" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label="Ouvrir le menu"
                          className="flex h-8 w-8 items-center justify-center rounded-[2px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        >
                          <MoreHorizontal size={16} strokeWidth={2} aria-hidden="true" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onOpen(asset)}>
                          <FileText />
                          Voir la fiche
                        </DropdownMenuItem>
                        {locatif && (
                          <DropdownMenuItem onClick={() => onGestion(asset)}>
                            <Wallet />
                            Revenus et charges
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
};
