import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react';
import { Asset } from '@/services/assetService';
import { assetService } from '@/services/assetService';

interface ImmobilierOverviewProps {
  assets: Asset[];
}

interface AssetMetrics {
  nombreBiens: number;
  rentabiliteBrute: number;
  rentabiliteNette: number;
  cashflowMensuel: number;
  plusValueBrute: number;
  tauxPlusValue: number;
}

export const ImmobilierOverview: React.FC<ImmobilierOverviewProps> = ({ assets }) => {
  const [metrics, setMetrics] = useState<AssetMetrics>({
    nombreBiens: 0,
    rentabiliteBrute: 0,
    rentabiliteNette: 0,
    cashflowMensuel: 0,
    plusValueBrute: 0,
    tauxPlusValue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calculateMetrics = async () => {
      try {
        setLoading(true);
        
        const locativeAssets = assets.filter(a => 
          ['Immeubles locatifs (loués nus)', 'Immeubles locatifs (LMNP)', 'Immeubles locatifs (LMP)', 'Immeubles professionnels (hors LMP)'].includes(a.nature || '')
        );

        let totalLoyerAnnuel = 0;
        let totalChargesAnnuelles = 0;
        let totalRevenusMensuels = 0;
        let totalChargesMensuelles = 0;
        let totalPrixAchat = 0;
        let totalInvestissement = 0;
        let totalValeurActuelle = 0;
        let totalCapitalRestantDu = 0;

        for (const asset of assets) {
          // Prix d'achat et investissement total
          const prixAchat = (asset.valeur_acquisition || 0);
          const fraisAcquisition = (asset.frais_acquisition || 0);
          totalPrixAchat += prixAchat;
          totalInvestissement += prixAchat + fraisAcquisition;
          
          // Valeur actuelle
          totalValeurActuelle += (asset.valeur_estimee || 0);

          // Revenus
          const revenus = await assetService.getAssetRevenus(asset.id);
          for (const revenu of revenus) {
            const montantAnnuel = revenu.periodicite === 'Mensuelle' 
              ? (revenu.montant || 0) * 12 
              : (revenu.montant || 0);
            totalLoyerAnnuel += montantAnnuel;

            // Pour cashflow, ne prendre que les assets locatifs
            if (locativeAssets.some(la => la.id === asset.id)) {
              const montantMensuel = revenu.periodicite === 'Mensuelle'
                ? (revenu.montant || 0)
                : (revenu.montant || 0) / 12;
              totalRevenusMensuels += montantMensuel;
            }
          }

          // Charges
          const charges = await assetService.getAssetCharges(asset.id);
          for (const charge of charges) {
            const montantAnnuel = charge.periodicite === 'mensuelle'
              ? (charge.montant || 0) * 12
              : charge.periodicite === 'annuelle'
              ? (charge.montant || 0)
              : 0;
            totalChargesAnnuelles += montantAnnuel;

            // Pour cashflow
            if (locativeAssets.some(la => la.id === asset.id)) {
              const montantMensuel = charge.periodicite === 'mensuelle'
                ? (charge.montant || 0)
                : charge.periodicite === 'annuelle'
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

        const plusValueBrute = totalValeurActuelle - totalInvestissement - totalCapitalRestantDu;
        
        const tauxPlusValue = totalInvestissement > 0
          ? (plusValueBrute / totalInvestissement) * 100
          : 0;

        setMetrics({
          nombreBiens: assets.length,
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

    if (assets.length > 0) {
      calculateMetrics();
    } else {
      setLoading(false);
    }
  }, [assets]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

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
          <CardTitle className="text-sm font-medium">
            Nombre de biens
          </CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.nombreBiens}</div>
          <p className="text-xs text-muted-foreground">
            en portefeuille
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Rentabilité brute
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPercent(metrics.rentabiliteBrute)}</div>
          <p className="text-xs text-muted-foreground">
            loyer annuel / prix d'achat
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Rentabilité nette
          </CardTitle>
          <Percent className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPercent(metrics.rentabiliteNette)}</div>
          <p className="text-xs text-muted-foreground">
            (loyer - charges) / investissement
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Cashflow mensuel
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${metrics.cashflowMensuel >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(metrics.cashflowMensuel)}
          </div>
          <p className="text-xs text-muted-foreground">
            revenus - charges mensuelles
          </p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Plus-value brute
          </CardTitle>
          {metrics.plusValueBrute >= 0 ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${metrics.plusValueBrute >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
