import { hasConjoint } from '@/lib/family/maritalStatus';
import { Chip } from '@/components/layout/workspace-panel';
import React, { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { ChevronRight, MoreHorizontal, Pencil, Trash2, TrendingUp, TrendingDown, Scale, Link2, AlertTriangle } from 'lucide-react';
import { Asset } from '@/services/assetService';
import { Emprunt } from '@/services/passifService';
import { getAssetCategory, NATURES_WITHOUT_ACQUISITION, getNatureDisplayLabel } from '@/constants/assetTypes';
import { Button } from '@/components/ui/button';
import { FullTable } from '@/components/ui/full-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useFamilyProfile, useMaritalStatus, useFamilyLinks } from '@/hooks/useFamilyData';
import { useEmprunts } from '@/hooks/usePassifs';
import { assetDemembrementService, AssetDemembrement } from '@/services/assetDemembrementService';
import { AssetDetailsDialog } from './AssetDetailsDialog';
import { formatCurrency, getCategoryColor, mapDetenteurToDisplay } from '@/lib/patrimoine/utils';
import { computePlusValueActif } from '@/lib/patrimoine/plusValueActif';
import { resolveAssetFiscalRegime, caracteristiquesFiscalesActif } from '@/lib/patrimoine/assetFiscalRegime';
import { useSocietes } from '@/hooks/useSocietes';
import { useRachatsAssuranceVie } from '@/hooks/useRachatsAssuranceVie';
import { getFractionDemembrement, DemembrementFractionContext } from '@/lib/patrimoine/demembrementFraction';
import { computeQuotePart } from '@/lib/immobilier/rentabilite';

const libelleCategorie = (category: string) => category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();

interface PatrimoineTreeViewProps {
  searchQuery: string;
  assets: Asset[];
  onAssetEdit: (asset: Asset) => void;
  onAssetDelete?: (asset: Asset) => void;
}

export const PatrimoineTreeView = ({ assets, searchQuery, onAssetEdit, onAssetDelete }: PatrimoineTreeViewProps) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { data: familyProfile } = useFamilyProfile();
  const { data: maritalStatus } = useMaritalStatus();
  const { data: familyLinks } = useFamilyLinks();
  const { emprunts } = useEmprunts();
  const [demembrements, setDemembrements] = useState<AssetDemembrement[]>([]);

  useEffect(() => {
    assetDemembrementService.getAllForUser()
      .then(setDemembrements)
      .catch(() => {
        setDemembrements([]);
        toast.error('Impossible de charger les démembrements de propriété');
      });
  }, []);

  const demembrementsByAsset = useMemo(() => {
    return demembrements.reduce((acc, d) => {
      if (!acc[d.asset_id]) acc[d.asset_id] = [];
      acc[d.asset_id].push(d);
      return acc;
    }, {} as Record<string, AssetDemembrement[]>);
  }, [demembrements]);

  const demembrementCtx: DemembrementFractionContext = useMemo(
    () => ({ familyProfile, maritalStatus, familyLinks }),
    [familyProfile, maritalStatus, familyLinks]
  );

  // Fraction (barème 669 CGI) à appliquer à un actif en Usufruit/Nue-propriété
  // — même pondération que le Résumé Patrimoine (usePatrimoineCalculations.ts).
  // null si l'âge de l'usufruitier n'est pas calculable.
  const getDemembrementFraction = (asset: Asset): number | null => {
    const demembrementsForAsset = asset.id ? (demembrementsByAsset[asset.id] || []) : [];
    return getFractionDemembrement(asset, demembrementsForAsset, demembrementCtx);
  };

  // Valeur pondérée par le démembrement, 0 si la fraction n'est pas calculable
  // (même traitement que demembrement.valueById dans usePatrimoineCalculations.ts) —
  // vaut asset.valeur_estimee pour un actif en pleine propriété (fraction 1).
  // Pondérée aussi par la quote-part du foyer (computeQuotePart) : en indivision
  // avec des tiers, la part des co-indivisaires n'entre pas dans la liste, comme
  // dans le Résumé et dans Immobilier > Mes biens.
  const getPartFoyer = (asset: Asset): number => computeQuotePart(asset) / 100;
  const getWeightedValue = (asset: Asset): number => {
    if (asset.valeur_estimee === undefined || asset.valeur_estimee === null) return 0;
    const fraction = getDemembrementFraction(asset);
    return fraction === null ? 0 : asset.valeur_estimee * fraction * getPartFoyer(asset);
  };

  const empruntsByAsset = useMemo(() => {
    return emprunts.reduce((acc, e) => {
      if (!e.asset_id) return acc;
      if (!acc[e.asset_id]) acc[e.asset_id] = [];
      acc[e.asset_id].push(e);
      return acc;
    }, {} as Record<string, Emprunt[]>);
  }, [emprunts]);

  const getDemembrementCounterpartLabel = (d: AssetDemembrement) => {
    if (d.type_partie === 'tiers') return d.nom_libre || 'Tiers';
    const m = familyLinks?.find((fl) => fl.id === d.family_link_id);
    return m ? (m.prenom ? `${m.prenom} ${m.nom}` : m.nom) : 'Membre de la famille';
  };

  const getEmpruntTooltip = (list: Emprunt[]) => (
    <div className="space-y-1">
      {list.map((e) => (
        <div key={e.id}>
          {e.libelle} — {formatCurrency(e.capital_restant_du || 0)} restant dû
          {' · '}Garantie : {e.type_garantie || 'Aucune'}
          {' · '}Assuré : {e.assure ? 'Oui' : 'Non'}
        </div>
      ))}
    </div>
  );

  const familyInfo = useMemo(() => ({
    hasPartner: hasConjoint(maritalStatus),
    userFirstName: familyProfile?.prenom || 'Utilisateur',
    partnerFirstName: maritalStatus?.prenom_conjoint || 'Conjoint'
  }), [familyProfile, maritalStatus]);

  // Filter assets based on search
  const filteredAssets = useMemo(() => {
    if (!searchQuery.trim()) return assets;
    const query = searchQuery.toLowerCase();
    return assets.filter(asset => 
      (asset.denomination?.toLowerCase().includes(query)) ||
      (asset.nature.toLowerCase().includes(query)) ||
      (asset.etablissement?.toLowerCase().includes(query))
    );
  }, [assets, searchQuery]);

  const totalValue = filteredAssets.reduce((sum, asset) => sum + getWeightedValue(asset), 0);

  // Group assets by category
  const assetsByCategory = useMemo(() => {
    return filteredAssets.reduce((acc, asset) => {
      const category = getAssetCategory(asset.nature);
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(asset);
      return acc;
    }, {} as Record<string, Asset[]>);
  }, [filteredAssets]);

  // Une recherche déroule toutes les catégories qui contiennent un résultat.
  useEffect(() => {
    if (searchQuery.trim()) {
      setExpandedCategories(new Set(Object.keys(assetsByCategory)));
    }
  }, [searchQuery, assetsByCategory]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const calculateWeight = (assetValue: number) => {
    const poids = totalValue > 0 ? (assetValue / totalValue) * 100 : 0;
    return poids.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  };

  const formatDetenteur = (detenteur: string | undefined) => {
    return mapDetenteurToDisplay(detenteur, familyInfo);
  };

  const { societes } = useSocietes();
  const regimesSocietes = useMemo(
    () => Object.fromEntries(societes.map((s) => [s.id, s.regime_fiscal])),
    [societes]
  );

  // Contrats d'assurance-vie / capitalisation : régime de rachat calculé pour tout le foyer.
  const plusValuesAV = useMemo(() => {
    const map: Record<string, number> = {};
    assets.filter(a => a.id && (getAssetCategory(a.nature) === 'épargne et assurance-vie' || a.nature === 'Contrat article 82' || a.nature === 'Vie entière')).forEach(a => {
      const pv = computePlusValueActif(a, demembrementsByAsset[a.id!] || [], demembrementCtx);
      if (pv) map[a.id!] = pv.plusValue;
    });
    return map;
  }, [assets, demembrementsByAsset, demembrementCtx]);
  const rachatsAV = useRachatsAssuranceVie(assets, plusValuesAV);

  // Calculate plus-value for display
  const getPlusValueDisplay = (asset: Asset) => {
    // No plus-value for liquid assets
    if (NATURES_WITHOUT_ACQUISITION.includes(asset.nature)) {
      return { display: '—', className: 'text-muted-foreground', value: 0, regimeNonDetermine: false };
    }

    // Même calcul que le Résumé (computePlusValueActif), sur la part du foyer
    // dans le bien : null si non calculable (âge de l'usufruitier
    // inconnu, démembré sans date d'acquisition, valeurs absentes).
    const pv = computePlusValueActif(asset, asset.id ? (demembrementsByAsset[asset.id] || []) : [], demembrementCtx, getPartFoyer(asset));
    if (!pv) return { display: '—', className: 'text-muted-foreground', value: 0, regimeNonDetermine: false };
    const { plusValue } = pv;

    const regime = (asset.id && rachatsAV[asset.id]) || resolveAssetFiscalRegime({
      nature: asset.nature,
      ctoMultiActifs: asset.cto_multi_actifs,
      ctoNatureSousJacent: asset.cto_nature_sous_jacent,
      plusValue,
      valeurEstimee: pv.valeurEstimee,
      dateAcquisition: asset.date_acquisition,
      ...caracteristiquesFiscalesActif(asset, regimesSocietes),
    });
    const regimeNonDetermine = regime.tone === 'non_determine';

    if (plusValue > 0) {
      return {
        display: `+${formatCurrency(plusValue)}`,
        className: 'text-positive ',
        value: plusValue,
        regimeNonDetermine
      };
    } else if (plusValue < 0) {
      return {
        display: formatCurrency(plusValue),
        className: 'text-destructive ',
        value: plusValue,
        regimeNonDetermine
      };
    }
    return { display: '0 €', className: 'text-muted-foreground', value: 0, regimeNonDetermine };
  };

  // Calculate category plus-value
  const getCategoryPlusValue = (categoryAssets: Asset[]) => {
    let total = 0;
    let hasAnyData = false;

    categoryAssets.forEach(asset => {
      // Même calcul que getPlusValueDisplay ci-dessus.
      const pv = computePlusValueActif(asset, asset.id ? (demembrementsByAsset[asset.id] || []) : [], demembrementCtx, getPartFoyer(asset));
      const hasData = pv !== null;
      const plusValue = pv?.plusValue ?? 0;
      if (hasData) {
        total += plusValue;
        hasAnyData = true;
      }
    });

    if (!hasAnyData) return { display: '—', className: 'text-muted-foreground' };
    
    if (total > 0) {
      return { 
        display: `+${formatCurrency(total)}`, 
        className: 'text-positive'
      };
    } else if (total < 0) {
      return { 
        display: formatCurrency(total), 
        className: 'text-destructive'
      };
    }
    return { display: '0 €', className: 'text-muted-foreground' };
  };

  const categoriesTriees = Object.entries(assetsByCategory)
    .map(([category, list]) => ({ category, list, valeur: list.reduce((sum, asset) => sum + getWeightedValue(asset), 0) }))
    .sort((a, b) => b.valeur - a.valeur);
  const plusValueTotale = getCategoryPlusValue(filteredAssets);
  const nbNonEvalues = filteredAssets.filter((a) => !a.valeur_estimee).length;

  return (
    <>
      {filteredAssets.length > 0 && (
        // Bandeau de totaux, même construction que la page Passifs.
        <dl className="grid grid-cols-2 gap-x-10 gap-y-4 border-b border-border pb-6 md:grid-cols-3">
          <div>
            <dt className="text-[12px] text-muted-foreground">Total des actifs</dt>
            <dd className="mt-1 text-[22px] font-medium leading-none tracking-[-0.02em] tabular-nums">{formatCurrency(totalValue)}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-muted-foreground">Plus-values latentes</dt>
            <dd className={`mt-1 text-[22px] font-medium leading-none tracking-[-0.02em] tabular-nums ${plusValueTotale.className}`}>{plusValueTotale.display}</dd>
          </div>
          <div className="col-span-2 md:col-span-1">
            <dt className="text-[12px] text-muted-foreground">Répartition</dt>
            <dd className="mt-2">
              <div className="flex h-[6px] w-full overflow-hidden bg-muted">
                {categoriesTriees.map(({ category, valeur }) => (
                  <Tooltip key={category}>
                    <TooltipTrigger asChild>
                      <span className="h-full" style={{ width: `${totalValue > 0 ? (valeur / totalValue) * 100 : 0}%`, backgroundColor: getCategoryColor(category) }} />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">{libelleCategorie(category)} · {calculateWeight(valeur)} %</TooltipContent>
                  </Tooltip>
                ))}
              </div>
              <p className="mt-1.5 text-[12px] text-muted-foreground">
                {categoriesTriees.length} catégorie{categoriesTriees.length > 1 ? 's' : ''}
                {nbNonEvalues > 0 && ` · ${nbNonEvalues} actif${nbNonEvalues > 1 ? 's' : ''} non évalué${nbNonEvalues > 1 ? 's' : ''}`}
              </p>
            </dd>
          </div>
        </dl>
      )}

      {/* Mise en page fixe : colonnes chiffrées à largeur fixe, le libellé prend le reste et se tronque. */}
      <div className="[&_table]:table-fixed">
      <FullTable variant="categorized">
        <FullTable.Colgroup>
          <FullTable.Col />
          <FullTable.Col className="hidden w-[130px] lg:table-column" />
          <FullTable.Col className="w-[64px]" />
          <FullTable.Col className="w-[104px]" />
          <FullTable.Col className="w-[104px]" />
          <FullTable.Col className="w-[40px]" />
        </FullTable.Colgroup>
        <FullTable.Header>
          <FullTable.Row>
            <FullTable.Head className="pl-0">Actif</FullTable.Head>
            <FullTable.Head className="hidden lg:table-cell">Détenteur</FullTable.Head>
            <FullTable.Head className="text-right">Poids</FullTable.Head>
            <FullTable.Head className="text-right">Valeur</FullTable.Head>
            <FullTable.Head className="text-right">+/- value</FullTable.Head>
            <FullTable.Head><span className="sr-only">Actions</span></FullTable.Head>
          </FullTable.Row>
        </FullTable.Header>
        <FullTable.Body interactive>
          {categoriesTriees.map(({ category, list: categoryAssets, valeur: categoryValue }) => {
              const categoryWeight = calculateWeight(categoryValue);
              const isExpanded = expandedCategories.has(category);
              const categoryPlusValue = getCategoryPlusValue(categoryAssets);

              return (
                <React.Fragment key={category}>
                  {/* Category row */}
                  <FullTable.Row isCategory>
                    <FullTable.Cell className="pl-0">
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        className="flex w-full min-w-0 items-center gap-2 rounded-[2px] text-left text-[13.5px] font-medium tracking-[-0.01em] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground"
                        onClick={() => toggleCategory(category)}
                      >
                        <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        <span aria-hidden className="h-3 w-[3px] shrink-0 rounded-full" style={{ backgroundColor: getCategoryColor(category) }} />
                        <span className="truncate text-foreground">{libelleCategorie(category)}</span>
                        <span className="shrink-0 text-[12px] font-normal tabular-nums text-muted-foreground">{categoryAssets.length}</span>
                      </button>
                    </FullTable.Cell>
                    <FullTable.Cell className="hidden lg:table-cell"> </FullTable.Cell>
                    <FullTable.Cell className="whitespace-nowrap text-right tabular-nums text-muted-foreground">
                      {categoryWeight} %
                    </FullTable.Cell>
                    <FullTable.Cell className="whitespace-nowrap text-right tabular-nums">
                      {formatCurrency(categoryValue)}
                    </FullTable.Cell>
                    <FullTable.Cell className="whitespace-nowrap text-right tabular-nums">
                      <span className={categoryPlusValue.className}>{categoryPlusValue.display}</span>
                    </FullTable.Cell>
                    <FullTable.Cell> </FullTable.Cell>
                  </FullTable.Row>

                  {/* Asset rows */}
                  {isExpanded && categoryAssets.map((asset) => {
                    const weightedValue = getWeightedValue(asset);
                    const assetWeight = calculateWeight(weightedValue);
                    const plusValueInfo = getPlusValueDisplay(asset);

                    return (
                      <FullTable.Row
                        key={asset.id}
                        className="cursor-pointer"
                        onClick={() => {
                          setSelectedAsset(asset);
                          setDetailsOpen(true);
                        }}
                      >
                        <FullTable.Cell className="py-2 pl-[35px]">
                          <div className="flex items-center gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 text-[13px] text-foreground">
                                <span className="truncate">{asset.denomination || getNatureDisplayLabel(asset.nature)}</span>
                                {asset.mode_detention && asset.mode_detention !== 'Pleine propriété' && (
                                  <Chip>{asset.mode_detention}</Chip>
                                )}
                                {asset.id && demembrementsByAsset[asset.id]?.length > 0 && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Scale className="h-3.5 w-3.5 text-muted-foreground shrink-0" strokeWidth={1.75} />
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">
                                      {demembrementsByAsset[asset.id].map(getDemembrementCounterpartLabel).join(', ')}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                {asset.id && empruntsByAsset[asset.id]?.length > 0 && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" strokeWidth={1.75} />
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">
                                      {getEmpruntTooltip(empruntsByAsset[asset.id])}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                              {asset.etablissement && (
                                <div className="mt-0.5 truncate text-[12px] text-muted-foreground">
                                  {asset.etablissement}
                                </div>
                              )}
                            </div>
                          </div>
                        </FullTable.Cell>
                        <FullTable.Cell className="hidden truncate py-2 lg:table-cell">
                          <span className="text-[13px] text-muted-foreground">{formatDetenteur(asset.detenteur)}</span>
                        </FullTable.Cell>
                        <FullTable.Cell className="whitespace-nowrap py-2 text-right">
                          <span className="text-[13px] tabular-nums text-muted-foreground">{assetWeight} %</span>
                        </FullTable.Cell>
                        <FullTable.Cell className="whitespace-nowrap py-2 text-right">
                          <span className={asset.valeur_estimee ? 'text-[13px] tabular-nums text-foreground' : 'text-[12px] text-muted-foreground'}>{asset.valeur_estimee ? formatCurrency(weightedValue) : 'Non évalué'}</span>
                        </FullTable.Cell>
                        <FullTable.Cell className="py-2">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className={`whitespace-nowrap text-[13px] tabular-nums ${plusValueInfo.className}`}>{plusValueInfo.display}</span>
                            {plusValueInfo.regimeNonDetermine && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center justify-center rounded-[2px] bg-spark/10 p-0.5">
                                    <AlertTriangle className="h-3 w-3 text-spark " strokeWidth={2} />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  Régime fiscal non déterminé
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </FullTable.Cell>
                        <FullTable.Cell className="py-2 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 rounded-[2px] shadow-none"
                                aria-label="Ouvrir le menu"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal size={16} strokeWidth={2} aria-hidden="true" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                onAssetEdit(asset);
                              }}>
                                <Pencil />
                                Modifier
                              </DropdownMenuItem>
                              {onAssetDelete && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem variant="destructive" onClick={(e) => {
                                    e.stopPropagation();
                                    onAssetDelete(asset);
                                  }}>
                                    <Trash2 />
                                    Supprimer
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </FullTable.Cell>
                      </FullTable.Row>
                    );
                  })}
                </React.Fragment>
              );
            })}

          <FullTable.Row isTotal>
            <FullTable.Cell className="pl-0 text-[13.5px] font-medium text-foreground">
              Total
            </FullTable.Cell>
            <FullTable.Cell className="hidden lg:table-cell"> </FullTable.Cell>
            <FullTable.Cell> </FullTable.Cell>
            <FullTable.Cell className="whitespace-nowrap text-right text-[13.5px] font-medium tabular-nums text-foreground">
              {formatCurrency(totalValue)}
            </FullTable.Cell>
            <FullTable.Cell className="whitespace-nowrap text-right text-[13.5px] font-medium tabular-nums">
              <span className={plusValueTotale.className}>{plusValueTotale.display}</span>
            </FullTable.Cell>
            <FullTable.Cell> </FullTable.Cell>
          </FullTable.Row>
        </FullTable.Body>
      </FullTable>
      </div>

      <AssetDetailsDialog
        asset={selectedAsset}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </>
  );
};
