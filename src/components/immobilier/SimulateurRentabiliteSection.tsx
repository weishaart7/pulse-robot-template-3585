import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { assetService, type Asset, type AssetCharge, type AssetRevenu } from '@/services/assetService';
import { computeRentabilite, type RentabiliteResult } from '@/lib/immobilier/rentabilite';
import { formatCurrency } from '@/lib/patrimoine/utils';

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
  const result: RentabiliteResult = computeRentabilite(asset, revenus, charges, tmi);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Simulateur de rentabilité</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement des revenus et charges...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Loyers annuels</p>
                <p className="font-medium">{formatCurrency(result.loyersAnnuels)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Charges annuelles</p>
                <p className="font-medium">{formatCurrency(result.chargesAnnuelles)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Cashflow net mensuel</p>
                <p className="font-medium">{formatCurrency(result.cashflowNetMensuel)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Rendement brut</p>
                <p className="font-medium">{formatPercent(result.rendementBrut)}</p>
              </div>
            </div>

            <div className="max-w-[200px] space-y-2">
              <Label htmlFor="tmi">Taux marginal d'imposition (%)</Label>
              <Input
                id="tmi"
                type="number"
                step="1"
                min="0"
                max="100"
                value={tmiInput}
                onChange={(e) => setTmiInput(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-4 space-y-2">
                <h4 className="font-semibold">Micro-foncier</h4>
                <p className="text-sm text-muted-foreground">
                  Revenu imposable (abattement 30 %) : {formatCurrency(result.microFoncier.revenuImposable)}
                </p>
                <p className="text-sm">Impôt sur le revenu : {formatCurrency(result.microFoncier.impotRevenu)}</p>
                <p className="text-sm">Prélèvements sociaux (17,2 %) : {formatCurrency(result.microFoncier.prelevementsSociaux)}</p>
                <p className="text-sm font-medium">Rendement net-net : {formatPercent(result.microFoncier.rendementNetNet)}</p>
              </div>

              <div className="rounded-lg border p-4 space-y-2">
                <h4 className="font-semibold">Régime réel</h4>
                <p className="text-sm text-muted-foreground">
                  Charges déductibles (charges + intérêts + assurance) : {formatCurrency(result.reel.chargesDeductibles)}
                </p>
                <p className="text-sm">Résultat foncier : {formatCurrency(result.reel.resultatFoncier)}</p>
                {result.reel.deficitImputableRevenuGlobal > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Déficit imputable sur le revenu global (plafonné à 10 700 €) : {formatCurrency(result.reel.deficitImputableRevenuGlobal)}
                    {' '}— économie d'impôt potentielle : {formatCurrency(result.reel.economieImpotPotentielle)}
                  </p>
                )}
                <p className="text-sm">Impôt sur le revenu : {formatCurrency(result.reel.impotRevenu)}</p>
                <p className="text-sm">Prélèvements sociaux (17,2 %) : {formatCurrency(result.reel.prelevementsSociaux)}</p>
                <p className="text-sm font-medium">Rendement net-net : {formatPercent(result.reel.rendementNetNet)}</p>
              </div>
            </div>

            <p className="text-sm">
              Régime le plus favorable au TMI saisi :{' '}
              <span className="font-semibold">
                {result.regimeRecommande === 'equivalent'
                  ? 'équivalent'
                  : result.regimeRecommande === 'micro-foncier'
                    ? 'micro-foncier'
                    : 'réel'}
              </span>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};
