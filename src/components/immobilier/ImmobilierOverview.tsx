import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react';
import { Asset } from '@/services/assetService';
import { assetService } from '@/services/assetService';
import { formatCurrency } from '@/lib/patrimoine/utils';
import { RENTAL_PROPERTY_TYPES } from '@/schemas/immobilierPropertySchema';

interface ImmobilierOverviewProps {
  assets: Asset[];
}

interface AssetMetrics {
  nombreBiens: number;
  valeurTotaleBiens: number;
  rentabiliteBrute: number;
  rentabiliteNette: number;
  cashflowMensuel: number;
  plusValueBrute: number;
  tauxPlusValue: number;
}

export const ImmobilierOverview: React.FC<ImmobilierOverviewProps> = ({ assets }) => {
  const [metrics, setMetrics] = useState<AssetMetrics>({
    nombreBiens: 0,
    valeurTotaleBiens: 0,
    rentabiliteBrute: 0,
    rentabiliteNette: 0,
    cashflowMensuel: 0,
    plusValueBrute: 0,
    tauxPlusValue: 0,
  });
  const [loading, setLoading] = useState(true);

  const locativeAssetIds = useMemo(() => {
    return new Set(
      assets
        .filter(a => RENTAL_PROPERTY_TYPES.slice(0, 4).includes(a.nature || ''))
        .map(a => a.id)
    );
  }, [assets]);

  useEffect(() => {
    const calculateMetrics = async () => {
      if (assets.length === 0) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        let totalLoyerAnnuel = 0;
        let totalChargesAnnuelles = 0;
        let totalRevenusMensuels = 0;
        let totalChargesMensuelles = 0;
        let totalPrixAchat = 0;
        let totalInvestissement = 0;
        let totalValeurActuelle = 0;
        let totalCoutAcquisition = 0;

        for (const asset of assets) {
          // Prix d'achat et investissement total
          const prixAchat = asset.valeur_acquisition || 0;
          const fraisAcquisition = asset.frais_acquisition || 0;
          totalPrixAchat += prixAchat;
          totalInvestissement += prixAchat + fraisAcquisition;
          
          // Valeur actuelle
          totalValeurActuelle += asset.valeur_estimee || 0;

          // Coût d'acquisition complet pour plus-value
          totalCoutAcquisition += (asset.montant_immeuble || 0)
            + (asset.frais_agence || 0)
            + (asset.frais_notaire || 0)
            + (asset.frais_bancaires || 0)
            + (asset.frais_hypotheque || 0)
            + (asset.travaux_renovation || 0)
            + (asset.travaux_construction || 0)
            + (asset.meubles || 0);

          const isLocative = locativeAssetIds.has(asset.id);

          // Revenus
          const revenus = await assetService.getAssetRevenus(asset.id);
          for (const revenu of revenus) {
            const montantAnnuel = revenu.periodicite === 'Mensuelle' 
              ? (revenu.montant || 0) * 12 
              : (revenu.montant || 0);
            totalLoyerAnnuel += montantAnnuel;

            if (isLocative) {
              const montantMensuel = revenu.periodicite === 'Mensuelle'
                ? (revenu.montant || 0)
                : (revenu.montant || 0) / 12;
              totalRevenusMensuels += montantMensuel;
            }
          }

          // Charges
          const charges = await assetService.getAssetCharges(asset.id);
          for (const charge of charges) {
            const periodicite = charge.periodicite?.toLowerCase();
            const montantAnnuel = periodicite === 'mensuelle'
              ? (charge.montant || 0) * 12
              : periodicite === 'annuelle'
              ? (charge.montant || 0)
              : 0;
            totalChargesAnnuelles += montantAnnuel;

            if (isLocative) {
              const montantMensuel = periodicite === 'mensuelle'
                ? (charge.montant || 0)
                : periodicite === 'annuelle'
                ? (charge.montant || 0) / 12
                : 0;
              totalChargesMensuelles += montantMensuel;
            }
          }
        }

        // Calcul des métriques
        const rentabiliteBrute = totalPrixAchat > 0 
          ? (totalLoyerAnnuel / totalPrixAchat) * 100 
          : 0;

        const rentabiliteNette = totalInvestissement > 0
          ? ((totalLoyerAnnuel - totalChargesAnnuelles) / totalInvestissement) * 100
          : 0;

        const cashflowMensuel = totalRevenusMensuels - totalChargesMensuelles;
        const plusValueBrute = totalValeurActuelle - totalCoutAcquisition;
        
        const tauxPlusValue = totalCoutAcquisition > 0
          ? (plusValueBrute / totalCoutAcquisition) * 100
          : 0;

        setMetrics({
          nombreBiens: assets.length,
          valeurTotaleBiens: totalValeurActuelle,
          rentabiliteBrute,
          rentabiliteNette,
          cashflowMensuel,
          plusValueBrute,
          tauxPlusValue,
        });
      } catch (error) {
        console.error('Error calculating metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    calculateMetrics();
  }, [assets, locativeAssetIds]);

  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Chargement des statistiques...</p>
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Aucun bien immobilier</h3>
        <p className="text-muted-foreground">
          Ajoutez des biens depuis la section Patrimoine pour voir vos statistiques ici.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Nombre de biens</CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.nombreBiens}</div>
          <p className="text-xs text-muted-foreground">en portefeuille</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Valeur totale</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(metrics.valeurTotaleBiens)}</div>
          <p className="text-xs text-muted-foreground">somme des valeurs estimées</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Rentabilité brute</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPercent(metrics.rentabiliteBrute)}</div>
          <p className="text-xs text-muted-foreground">loyer annuel / prix d'achat</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Rentabilité nette</CardTitle>
          <Percent className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPercent(metrics.rentabiliteNette)}</div>
          <p className="text-xs text-muted-foreground">(loyer - charges) / investissement</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cashflow mensuel</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${metrics.cashflowMensuel >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
            {formatCurrency(metrics.cashflowMensuel)}
          </div>
          <p className="text-xs text-muted-foreground">revenus - charges mensuelles</p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Plus-value brute</CardTitle>
          {metrics.plusValueBrute >= 0 ? (
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-destructive" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${metrics.plusValueBrute >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
            {formatCurrency(metrics.plusValueBrute)}
          </div>
          <p className="text-xs text-muted-foreground">
            Taux de plus-value : {formatPercent(metrics.tauxPlusValue)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
