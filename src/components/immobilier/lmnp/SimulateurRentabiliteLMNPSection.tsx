import { useEffect, useState } from 'react';
import { PanelTitle, SummaryRow } from '@/components/layout/workspace-panel';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { assetService, type Asset, type AssetCharge, type AssetRevenu } from '@/services/assetService';
import { computeRentabiliteLMNP, type RentabiliteLMNPResult } from '@/lib/immobilier/rentabilite';
import { formatCurrency } from '@/lib/patrimoine/utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface SimulateurRentabiliteLMNPSectionProps {
  asset: Asset;
}

const formatPercent = (value: number | null): string => {
  if (value === null) return '—';
  return `${(value * 100).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
};

export const SimulateurRentabiliteLMNPSection = ({ asset }: SimulateurRentabiliteLMNPSectionProps) => {
  const [revenus, setRevenus] = useState<AssetRevenu[]>([]);
  const [charges, setCharges] = useState<AssetCharge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tmiInput, setTmiInput] = useState('30');

  useEffect(() => {
    if (!asset.id) return;
    let cancelled = false;
    setIsLoading(true);
    Promise.all([
      assetService.getAssetRevenus(asset.id),
      assetService.getAssetCharges(asset.id),
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
  }, [asset.id]);

  const tmi = (parseFloat(tmiInput) || 0) / 100;
  const result: RentabiliteLMNPResult = computeRentabiliteLMNP(asset, revenus, charges, tmi);


  const pctInput = (id: string, label: string, value: string, onChange: (v: string) => void, hint?: string) => (
    <div className="max-w-[14rem] space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          step="1"
          min="0"
          max="100"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-background border-border shadow-none pr-8 tabular-nums"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px] text-muted-foreground">%</span>
      </div>
      {hint && <p className="text-[12px] leading-5 text-muted-foreground">{hint}</p>}
    </div>
  );

  const regimeLabel = result.regimeRecommande === 'equivalent'
    ? 'équivalent'
    : result.regimeRecommande === 'micro-bic' ? 'micro-BIC' : 'réel';

  // Simulateur en bandeaux de « panneau de travail », comme celui de la location nue : à gauche les
  // taux saisis et les chiffres du bien, à droite la comparaison micro-BIC / réel.
  return (
    <section>
      <div className="px-8 pt-6 pb-4">
        <PanelTitle>Simulateur de rentabilité · LMNP</PanelTitle>
      </div>
      {isLoading ? (
        <div className="border-t border-border px-8 py-6">
          <LoadingSpinner text="Chargement des revenus et charges..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 divide-y divide-border border-t border-border lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:divide-x lg:divide-y-0">
          <div className="space-y-4 px-8 py-6">
            {pctInput('tmi-lmnp', "Taux marginal d'imposition", tmiInput, setTmiInput)}
            <dl className="pt-1">
              <SummaryRow label="Loyers"><span className="tabular-nums">{formatCurrency(result.loyersAnnuels)}</span><span className="ml-1.5 text-[12px] font-normal text-muted-foreground">par an</span></SummaryRow>
              <SummaryRow label="Charges"><span className="tabular-nums">{formatCurrency(result.chargesAnnuelles)}</span><span className="ml-1.5 text-[12px] font-normal text-muted-foreground">par an</span></SummaryRow>
              <SummaryRow label="Cashflow net">
                <span className={`tabular-nums ${result.cashflowNetMensuel >= 0 ? 'text-positive' : 'text-destructive'}`}>{formatCurrency(result.cashflowNetMensuel)}</span>
                <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">par mois</span>
              </SummaryRow>
              <SummaryRow label="Rendement brut"><span className="tabular-nums">{formatPercent(result.rendementBrut)}</span></SummaryRow>
            </dl>
          </div>

          <div className="min-w-0 px-8 py-6">
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
              <div>
                <h4 className="text-[14px] font-medium text-foreground">Micro-BIC</h4>
                <dl className="mt-3">
                  <SummaryRow label="Imposable">
                    <span className="tabular-nums">{formatCurrency(result.microBic.revenuImposable)}</span>
                    <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">abatt. {(result.microBic.abattementTaux * 100).toFixed(0)} %</span>
                  </SummaryRow>
                  <SummaryRow label="Impôt"><span className="tabular-nums">{formatCurrency(result.microBic.impotRevenu)}</span></SummaryRow>
                  <SummaryRow label="Prél. sociaux"><span className="tabular-nums">{formatCurrency(result.microBic.prelevementsSociaux)}</span><span className="ml-1.5 text-[12px] font-normal text-muted-foreground">18,6 %</span></SummaryRow>
                  <SummaryRow label="Net-net"><span className="tabular-nums">{formatPercent(result.microBic.rendementNetNet)}</span></SummaryRow>
                </dl>
                {result.microBic.depassementPlafond && (
                  <p className="mt-2 rounded-[2px] border border-spark/30 bg-spark/5 px-3 py-2 text-[12px] text-foreground">
                    Plafond micro-BIC dépassé ({formatCurrency(result.microBic.plafondRecettes)}) : bascule au réel obligatoire.
                  </p>
                )}
              </div>
              <div>
                <h4 className="text-[14px] font-medium text-foreground">Régime réel</h4>
                <dl className="mt-3">
                  <SummaryRow label="Déductible"><span className="tabular-nums">{formatCurrency(result.reel.chargesDeductibles)}</span><span className="ml-1.5 text-[12px] font-normal text-muted-foreground">charges, intérêts, ass.</span></SummaryRow>
                  <SummaryRow label="Amortissement">
                    <span className="tabular-nums">{formatCurrency(result.reel.amortissementDeductible)}</span>
                    {result.reel.amortissementNonDeductible > 0 && (
                      <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">dont {formatCurrency(result.reel.amortissementNonDeductible)} non déductible, non reporté</span>
                    )}
                  </SummaryRow>
                  <SummaryRow label="Résultat"><span className="tabular-nums">{formatCurrency(result.reel.resultatFiscal)}</span></SummaryRow>
                  <SummaryRow label="Impôt"><span className="tabular-nums">{formatCurrency(result.reel.impotRevenu)}</span></SummaryRow>
                  <SummaryRow label="Prél. sociaux"><span className="tabular-nums">{formatCurrency(result.reel.prelevementsSociaux)}</span><span className="ml-1.5 text-[12px] font-normal text-muted-foreground">18,6 %</span></SummaryRow>
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
