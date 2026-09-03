import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { assetService, type Asset, type AssetCharge, type AssetRevenu } from '@/services/assetService';
import { computeRentabiliteLMP, TAUX_COTISATIONS_SOCIALES_LMP_DEFAUT, type RentabiliteLMPResult } from '@/lib/immobilier/rentabilite';
import { formatCurrency } from '@/lib/patrimoine/utils';

interface SimulateurRentabiliteLMPSectionProps {
  asset: Asset;
}

const formatPercent = (value: number | null): string => {
  if (value === null) return '—';
  return `${(value * 100).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
};

export const SimulateurRentabiliteLMPSection = ({ asset }: SimulateurRentabiliteLMPSectionProps) => {
  const [revenus, setRevenus] = useState<AssetRevenu[]>([]);
  const [charges, setCharges] = useState<AssetCharge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tmiInput, setTmiInput] = useState('30');
  const [tauxCotisationsInput, setTauxCotisationsInput] = useState(
    String(TAUX_COTISATIONS_SOCIALES_LMP_DEFAUT * 100),
  );

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
  const tauxCotisationsSociales = (parseFloat(tauxCotisationsInput) || 0) / 100;
  const result: RentabiliteLMPResult = computeRentabiliteLMP(asset, revenus, charges, tmi, tauxCotisationsSociales);

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

            <div className="flex flex-wrap gap-4">
              <div className="max-w-[200px] space-y-2">
                <Label htmlFor="tmi-lmp">Taux marginal d'imposition (%)</Label>
                <Input
                  id="tmi-lmp"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={tmiInput}
                  onChange={(e) => setTmiInput(e.target.value)}
                />
              </div>
              <div className="max-w-[220px] space-y-2">
                <Label htmlFor="cotisations-lmp">Taux de cotisations sociales estimé (%)</Label>
                <Input
                  id="cotisations-lmp"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={tauxCotisationsInput}
                  onChange={(e) => setTauxCotisationsInput(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Ordre de grandeur (SSI, 30-45 % selon le bénéfice) — pas de calcul exact, saisie libre.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-4 space-y-2">
                <h4 className="font-semibold">Micro-BIC</h4>
                <p className="text-sm text-muted-foreground">
                  Revenu imposable (abattement {(result.microBic.abattementTaux * 100).toFixed(0)} %) : {formatCurrency(result.microBic.revenuImposable)}
                </p>
                {result.microBic.depassementPlafond && (
                  <p className="text-sm text-amber-600">
                    Dépassement du plafond micro-BIC ({formatCurrency(result.microBic.plafondRecettes)}) — bascule au réel obligatoire.
                  </p>
                )}
                <p className="text-sm">Impôt sur le revenu : {formatCurrency(result.microBic.impotRevenu)}</p>
                <p className="text-sm">Cotisations sociales estimées : {formatCurrency(result.microBic.cotisationsSociales)}</p>
                <p className="text-sm font-medium">Rendement net-net : {formatPercent(result.microBic.rendementNetNet)}</p>
              </div>

              <div className="rounded-lg border p-4 space-y-2">
                <h4 className="font-semibold">Régime réel</h4>
                <p className="text-sm text-muted-foreground">
                  Charges déductibles (charges + intérêts + assurance + amortissement) : {formatCurrency(result.reel.chargesDeductibles + result.totalAmortissementImmeuble)}
                </p>
                <p className="text-sm">Résultat fiscal : {formatCurrency(result.reel.resultatFiscal)}</p>
                {result.reel.deficitImputableRevenuGlobal > 0 && (
                  <p className="text-sm text-emerald-600">
                    Déficit imputable sur le revenu global, sans plafond en LMP : {formatCurrency(result.reel.deficitImputableRevenuGlobal)}
                    {' '}— économie d'impôt potentielle : {formatCurrency(result.reel.economieImpotPotentielle)}
                  </p>
                )}
                <p className="text-sm">Impôt sur le revenu : {formatCurrency(result.reel.impotRevenu)}</p>
                <p className="text-sm">Cotisations sociales estimées : {formatCurrency(result.reel.cotisationsSociales)}</p>
                <p className="text-sm font-medium">Rendement net-net : {formatPercent(result.reel.rendementNetNet)}</p>
              </div>
            </div>

            <p className="text-sm">
              Régime le plus favorable aux taux saisis :{' '}
              <span className="font-semibold">
                {result.regimeRecommande === 'equivalent'
                  ? 'équivalent'
                  : result.regimeRecommande === 'micro-bic'
                    ? 'micro-BIC'
                    : 'réel'}
              </span>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};
