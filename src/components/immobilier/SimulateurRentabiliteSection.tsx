import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Chip, PanelTitle, SummaryRow } from '@/components/layout/workspace-panel';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { assetService, type Asset, type AssetCharge, type AssetRevenu } from '@/services/assetService';
import { computeLoyersAnnuels, computeQuotePart, computeRentabilite, type RentabiliteResult } from '@/lib/immobilier/rentabilite';
import { SEUIL_MICRO_FONCIER } from '@/lib/immobilier/foncierFoyer';
import { formatCurrency } from '@/lib/patrimoine/utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface SimulateurRentabiliteSectionProps {
  asset: Asset;
}

const formatPercent = (value: number | null): string => {
  if (value === null) return '—';
  return `${(value * 100).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
};

export const SimulateurRentabiliteSection = ({ asset }: SimulateurRentabiliteSectionProps) => {
  const [revenus, setRevenus] = useState<AssetRevenu[]>([]);
  const [charges, setCharges] = useState<AssetCharge[]>([]);
  const [loyersBrutsFoyer, setLoyersBrutsFoyer] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [tmiInput, setTmiInput] = useState('30');

  useEffect(() => {
    if (!asset.id) return;
    let cancelled = false;
    setIsLoading(true);

    (async () => {
      const [revenusData, chargesData, biensNus] = await Promise.all([
        assetService.getAssetRevenus(asset.id!),
        assetService.getAssetCharges(asset.id!),
        assetService.getBiensLocationNue(),
      ]);
      if (cancelled) return;

      setRevenus(revenusData);
      setCharges(chargesData);

      // Loyers bruts de l'ensemble des biens loués nus du foyer (y compris celui-ci) :
      // le seuil micro-foncier s'apprécie tous biens confondus, pas par bien.
      const biensNusIds = biensNus.map((b) => b.id).filter((id): id is string => !!id);
      const revenusFoyer = await assetService.getAssetRevenusByAssetIds(biensNusIds);
      if (cancelled) return;
      setLoyersBrutsFoyer(computeLoyersAnnuels(revenusFoyer));
    })().finally(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [asset.id]);

  const tmi = (parseFloat(tmiInput) || 0) / 100;
  const quotePart = computeQuotePart(asset);
  const result: RentabiliteResult = computeRentabilite(asset, revenus, charges, tmi, quotePart);
  const regimeReelObligatoireFoyer = loyersBrutsFoyer > SEUIL_MICRO_FONCIER;

  const regimeLabel = result.regimeRecommande === 'equivalent'
    ? 'équivalent'
    : result.regimeRecommande === 'micro-foncier' ? 'micro-foncier' : 'réel';

  // Simulateur en bandeaux de « panneau de travail » : en-tête, puis à gauche le taux marginal et les
  // chiffres du bien, à droite la comparaison micro-foncier / réel.
  return (
    <section>
      <div className="px-8 pt-6 pb-4">
        <PanelTitle>Simulateur de rentabilité</PanelTitle>
        <p className="mt-1 max-w-3xl text-[12.5px] text-muted-foreground">
          Vue indicative pour ce bien isolé. Pour l'imputation réelle du déficit et le report pluriannuel, voir la
          synthèse foncière du foyer dans la Vue d'ensemble.
        </p>
        {!isLoading && regimeReelObligatoireFoyer && (
          <div className="mt-4 flex items-start gap-3 rounded-[2px] border border-spark/30 bg-spark/5 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-spark" strokeWidth={1.75} />
            <p className="text-[13px] text-foreground">
              <span className="font-medium">Régime réel obligatoire.</span>{' '}
              Vos revenus fonciers bruts, tous biens loués nus confondus, s'élèvent à {formatCurrency(loyersBrutsFoyer)} et
              dépassent le seuil du micro-foncier ({formatCurrency(SEUIL_MICRO_FONCIER)}) : le régime réel s'applique de
              plein droit sur l'ensemble de vos biens loués nus.
            </p>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="border-t border-border px-8 py-6">
          <LoadingSpinner text="Chargement des revenus et charges..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 divide-y divide-border border-t border-border lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:divide-x lg:divide-y-0">
          <div className="px-8 py-6">
            <div className="max-w-[14rem] space-y-1.5">
              <Label htmlFor="tmi">Taux marginal d'imposition</Label>
              <div className="relative">
                <Input
                  id="tmi"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={tmiInput}
                  onChange={(e) => setTmiInput(e.target.value)}
                  className="bg-background border-border shadow-none pr-8 tabular-nums"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px] text-muted-foreground">%</span>
              </div>
            </div>
            <dl className="mt-5">
              <SummaryRow label="Loyers"><span className="tabular-nums">{formatCurrency(result.loyersAnnuels)}</span><span className="ml-1.5 text-[12px] font-normal text-muted-foreground">par an</span></SummaryRow>
              <SummaryRow label="Charges"><span className="tabular-nums">{formatCurrency(result.chargesAnnuelles)}</span><span className="ml-1.5 text-[12px] font-normal text-muted-foreground">par an</span></SummaryRow>
              <SummaryRow label="Cashflow net">
                <span className={`tabular-nums ${result.cashflowNetMensuel >= 0 ? 'text-positive' : 'text-destructive'}`}>{formatCurrency(result.cashflowNetMensuel)}</span>
                <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">par mois</span>
              </SummaryRow>
              <SummaryRow label="Rendement brut"><span className="tabular-nums">{formatPercent(result.rendementBrut)}</span></SummaryRow>
            </dl>
            {quotePart < 100 && (
              <p className="mt-3 text-[12px] leading-5 text-muted-foreground">
                Bien détenu en indivision : montants ramenés à votre quote-part de {quotePart} %.
              </p>
            )}
          </div>

          <div className="min-w-0 px-8 py-6">
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-[14px] font-medium text-foreground">Micro-foncier</h4>
                  {result.regimeActif === 'micro-foncier' && <Chip tone="lagon">Régime actif</Chip>}
                  {regimeReelObligatoireFoyer && <Chip>Non applicable</Chip>}
                </div>
                <dl className="mt-3">
                  <SummaryRow label="Imposable"><span className="tabular-nums">{formatCurrency(result.microFoncier.revenuImposable)}</span><span className="ml-1.5 text-[12px] font-normal text-muted-foreground">abatt. 30 %</span></SummaryRow>
                  <SummaryRow label="Impôt"><span className="tabular-nums">{formatCurrency(result.microFoncier.impotRevenu)}</span></SummaryRow>
                  <SummaryRow label="Prél. sociaux"><span className="tabular-nums">{formatCurrency(result.microFoncier.prelevementsSociaux)}</span><span className="ml-1.5 text-[12px] font-normal text-muted-foreground">17,2 %</span></SummaryRow>
                  <SummaryRow label="Net-net"><span className="tabular-nums">{formatPercent(result.microFoncier.rendementNetNet)}</span></SummaryRow>
                </dl>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-[14px] font-medium text-foreground">Régime réel</h4>
                  {(result.regimeActif === 'reel' || regimeReelObligatoireFoyer) && <Chip tone="lagon">Régime actif</Chip>}
                </div>
                <dl className="mt-3">
                  <SummaryRow label="Déductible"><span className="tabular-nums">{formatCurrency(result.reel.chargesDeductibles)}</span><span className="ml-1.5 text-[12px] font-normal text-muted-foreground">charges + intérêts + ass.</span></SummaryRow>
                  <SummaryRow label="Résultat"><span className="tabular-nums">{formatCurrency(result.reel.resultatFoncier)}</span></SummaryRow>
                  {result.reel.deficitImputableRevenuGlobal > 0 && (
                    <SummaryRow label="Déficit imput.">
                      <span className="tabular-nums">{formatCurrency(result.reel.deficitImputableRevenuGlobal)}</span>
                      <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">
                        plafond 10 700 € · économie {formatCurrency(result.reel.economieImpotPotentielle)}
                      </span>
                    </SummaryRow>
                  )}
                  <SummaryRow label="Impôt"><span className="tabular-nums">{formatCurrency(result.reel.impotRevenu)}</span></SummaryRow>
                  <SummaryRow label="Prél. sociaux"><span className="tabular-nums">{formatCurrency(result.reel.prelevementsSociaux)}</span><span className="ml-1.5 text-[12px] font-normal text-muted-foreground">17,2 %</span></SummaryRow>
                  <SummaryRow label="Net-net"><span className="tabular-nums">{formatPercent(result.reel.rendementNetNet)}</span></SummaryRow>
                </dl>
              </div>
            </div>
            <p className="mt-5 border-t border-border pt-4 text-[13px] text-foreground">
              Régime le plus favorable au taux saisi : <span className="font-medium">{regimeLabel}</span>
            </p>
          </div>
        </div>
      )}
    </section>
  );
};
