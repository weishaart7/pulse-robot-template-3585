import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { assetService, type Asset, type AssetCharge, type AssetRevenu } from '@/services/assetService';
import { computeLoyersAnnuels, computeQuotePart, computeRentabilite, type RentabiliteResult } from '@/lib/immobilier/rentabilite';
import { SEUIL_MICRO_FONCIER } from '@/lib/immobilier/foncierFoyer';
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
            {regimeReelObligatoireFoyer && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Régime réel obligatoire</AlertTitle>
                <AlertDescription>
                  Vos revenus fonciers bruts, tous biens loués nus confondus, s'élèvent à{' '}
                  {formatCurrency(loyersBrutsFoyer)} et dépassent le seuil du micro-foncier ({formatCurrency(SEUIL_MICRO_FONCIER)}).
                  Le régime réel s'applique de plein droit sur l'ensemble de vos biens loués nus.
                </AlertDescription>
              </Alert>
            )}

            {quotePart < 100 && (
              <p className="text-sm text-muted-foreground">
                Bien détenu en indivision : montants ci-dessous ramenés à votre quote-part de {quotePart} %.
              </p>
            )}

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
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">Micro-foncier</h4>
                  {result.regimeActif === 'micro-foncier' && <Badge variant="secondary">Régime actif</Badge>}
                  {regimeReelObligatoireFoyer && <Badge variant="outline">Non applicable</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  Revenu imposable (abattement 30 %) : {formatCurrency(result.microFoncier.revenuImposable)}
                </p>
                <p className="text-sm">Impôt sur le revenu : {formatCurrency(result.microFoncier.impotRevenu)}</p>
                <p className="text-sm">Prélèvements sociaux (17,2 %) : {formatCurrency(result.microFoncier.prelevementsSociaux)}</p>
                <p className="text-sm font-medium">Rendement net-net : {formatPercent(result.microFoncier.rendementNetNet)}</p>
              </div>

              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">Régime réel</h4>
                  {(result.regimeActif === 'reel' || regimeReelObligatoireFoyer) && <Badge variant="secondary">Régime actif</Badge>}
                </div>
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
              {' '}— vue indicative pour ce bien isolé. Pour l'imputation réelle du déficit et le report
              pluriannuel, voir la synthèse foncière du foyer dans l'onglet Vue d'ensemble.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};
