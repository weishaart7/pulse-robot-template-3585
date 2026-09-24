import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react';
import { Asset } from '@/services/assetService';
import { assetService } from '@/services/assetService';
import { formatCurrency } from '@/lib/patrimoine/utils';
import { computeAmortissement, computeQuotePart } from '@/lib/immobilier/rentabilite';
import { useFamilyProfile, useMaritalStatus, useFamilyLinks } from '@/hooks/useFamilyData';
import { assetDemembrementService, AssetDemembrement } from '@/services/assetDemembrementService';
import { getFractionDemembrement } from '@/lib/patrimoine/demembrementFraction';

interface ImmobilierOverviewProps {
  assets: Asset[];
}

// Facteurs de conversion périodicité -> annuel/mensuel. `PERIODICITE_OPTIONS`
// (immobilierPropertySchema.ts) propose Mensuelle/Trimestrielle/Semestrielle/Annuelle pour les revenus
// comme pour les charges. Une valeur non reconnue garde son comportement existant : traitée comme déjà
// annuelle pour les revenus (`defaultAnnualFactor`/`defaultMonthlyDivisor` = 1/12), exclue (0) pour les
// charges — cf. docs/immobilier.md §3.
const annualFactor = (periodicite: string | undefined, defaultFactor: number): number => {
  switch ((periodicite || '').toLowerCase()) {
    case 'mensuelle': return 12;
    case 'trimestrielle': return 4;
    case 'semestrielle': return 2;
    case 'annuelle': return 1;
    default: return defaultFactor;
  }
};
const monthlyDivisor = (periodicite: string | undefined, defaultDivisor: number | null): number | null => {
  switch ((periodicite || '').toLowerCase()) {
    case 'mensuelle': return 1;
    case 'trimestrielle': return 3;
    case 'semestrielle': return 6;
    case 'annuelle': return 12;
    default: return defaultDivisor;
  }
};

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
  const [assetDemembrements, setAssetDemembrements] = useState<AssetDemembrement[]>([]);
  const { data: familyProfile } = useFamilyProfile();
  const { data: maritalStatus } = useMaritalStatus();
  const { data: familyLinks } = useFamilyLinks();

  useEffect(() => {
    assetDemembrementService.getAllForUser()
      .then(setAssetDemembrements)
      .catch(() => setAssetDemembrements([]));
  }, []);

  // Même contexte que le Résumé Patrimoine (PatrimoinePlusValues.tsx), pour que la fraction de
  // démembrement (barème 669 CGI) appliquée ici soit identique.
  const demembrementCtx = useMemo(
    () => ({ familyProfile, maritalStatus, familyLinks }),
    [familyProfile, maritalStatus, familyLinks]
  );

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
        let totalCreditMensuel = 0;
        let totalPrixAchat = 0;
        let totalInvestissement = 0;
        let totalValeurActuelle = 0;
        let totalCoutAcquisition = 0;

        for (const asset of assets) {
          // Quote-part du foyer (indivision) : pondère revenus, charges, crédit et base de
          // rentabilité, valeur estimée et plus-value, comme les simulateurs de rentabilité (100 % si
          // non renseignée).
          const quotePart = computeQuotePart(asset) / 100;

          // Prix d'achat et investissement total
          const prixAchat = (asset.valeur_acquisition || 0) * quotePart;
          const fraisAcquisition = (asset.frais_acquisition || 0) * quotePart;
          totalPrixAchat += prixAchat;
          totalInvestissement += prixAchat + fraisAcquisition;
          
          // Démembrement (barème 669 CGI) : une valeur estimée en usufruit/nue-propriété ne
          // vaut pas sa valeur pleine propriété — même fraction que le Résumé Patrimoine
          // (getFractionDemembrement), pour que « Valeur totale » et « Plus-value brute »
          // restent cohérentes entre les deux modules. Un actif démembré dont l'âge de
          // l'usufruitier n'est pas calculable est exclu de ces deux totaux (comme dans
          // Patrimoine), plutôt que compté à sa valeur pleine propriété.
          const demembrementsForAsset = assetDemembrements.filter((d) => d.asset_id === asset.id);
          const fraction = getFractionDemembrement(asset, demembrementsForAsset, demembrementCtx);

          if (fraction !== null) {
            // Valeur actuelle
            totalValeurActuelle += (asset.valeur_estimee || 0) * fraction * quotePart;

            // Coût d'acquisition pour la plus-value : champs immobilier détaillés
            // (montant_immeuble + frais annexes) si renseignés, sinon repli sur les champs
            // génériques d'acquisition (valeur_acquisition/frais_acquisition) — un actif créé
            // via le formulaire générique Patrimoine n'a jamais les champs détaillés. Même
            // repli, et frais_acquisition non pondéré par la fraction, qu'au Résumé Patrimoine
            // (calculatePlusValue dans PatrimoinePlusValues.tsx).
            const coutDetaille = (asset.montant_immeuble || 0)
              + (asset.frais_agence || 0)
              + (asset.frais_notaire || 0)
              + (asset.frais_bancaires || 0)
              + (asset.frais_hypotheque || 0)
              + (asset.travaux_renovation || 0)
              + (asset.travaux_construction || 0)
              + (asset.meubles || 0);
            const coutAcquisition = coutDetaille > 0
              ? coutDetaille * fraction
              : (asset.valeur_acquisition || 0) * fraction + (asset.frais_acquisition || 0);
            totalCoutAcquisition += coutAcquisition * quotePart;
          }

          // Revenus — tous les biens transférés, pas seulement les biens locatifs : un bien
          // (résidence secondaire, terrain...) peut avoir des revenus/charges sans être de
          // nature locative (cf. RENTAL_PROPERTY_TYPES), notamment via le formulaire générique
          // d'actif (AssetForm.tsx, onglet "Charges") qui n'est pas restreint par nature.
          const revenus = await assetService.getAssetRevenus(asset.id);
          for (const revenu of revenus) {
            const montant = (revenu.montant || 0) * quotePart;
            totalLoyerAnnuel += montant * annualFactor(revenu.periodicite, 1);
            totalRevenusMensuels += montant / (monthlyDivisor(revenu.periodicite, 12) as number);
          }

          // Financement : mensualité de crédit + assurance emprunteur, nulles si le bien n'est pas
          // financé ou si le prêt est soldé (même moteur que les simulateurs de rentabilité).
          const credit = computeAmortissement(asset);
          totalCreditMensuel += (credit.mensualiteCredit + credit.mensualiteAssurance) * quotePart;

          // Charges
          const charges = await assetService.getAssetCharges(asset.id);
          for (const charge of charges) {
            const montant = (charge.montant || 0) * quotePart;
            totalChargesAnnuelles += montant * annualFactor(charge.periodicite, 0);

            const divisor = monthlyDivisor(charge.periodicite, null);
            totalChargesMensuelles += divisor ? montant / divisor : 0;
          }
        }

        // Calcul des métriques
        const rentabiliteBrute = totalPrixAchat > 0 
          ? (totalLoyerAnnuel / totalPrixAchat) * 100 
          : 0;

        const rentabiliteNette = totalInvestissement > 0
          ? ((totalLoyerAnnuel - totalChargesAnnuelles) / totalInvestissement) * 100
          : 0;

        const cashflowMensuel = totalRevenusMensuels - totalChargesMensuelles - totalCreditMensuel;
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
        if (import.meta.env.DEV) {
          console.error('Error calculating metrics:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    calculateMetrics();
  }, [assets, assetDemembrements, demembrementCtx]);

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
          <p className="text-xs text-muted-foreground">somme des valeurs estimées (quote-part du foyer)</p>
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
          <div className={`text-2xl font-bold ${metrics.cashflowMensuel >= 0 ? 'text-positive' : 'text-destructive'}`}>
            {formatCurrency(metrics.cashflowMensuel)}
          </div>
          <p className="text-xs text-muted-foreground">revenus - charges - crédit mensuels</p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Plus-value brute</CardTitle>
          {metrics.plusValueBrute >= 0 ? (
            <TrendingUp className="h-4 w-4 text-positive" />
          ) : (
            <TrendingDown className="h-4 w-4 text-destructive" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${metrics.plusValueBrute >= 0 ? 'text-positive' : 'text-destructive'}`}>
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
