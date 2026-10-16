import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { PanelTitle, SummaryRow } from '@/components/layout/workspace-panel';
import { CITRON_INK, CITRON_MID, GREY, GREY_LIGHT, LAGON, LAGON_DEEP, LAGON_INK, LAGON_MID } from '@/components/budget/budgetColors';
import { Asset } from '@/services/assetService';
import { assetService } from '@/services/assetService';
import { formatCurrency } from '@/lib/patrimoine/utils';
import { computeQuotePart } from '@/lib/immobilier/rentabilite';
import { computeFluxBien, computeIndicateurs, sommeFlux, type FluxBien } from '@/lib/immobilier/portefeuille';
import { useFamilyProfile, useMaritalStatus, useFamilyLinks } from '@/hooks/useFamilyData';
import { assetDemembrementService, AssetDemembrement } from '@/services/assetDemembrementService';
import { getFractionDemembrement } from '@/lib/patrimoine/demembrementFraction';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

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
  /** Valeur retenue par bien (même pondération que la valeur totale), pour la répartition. */
  parBien: { id: string; nom: string; valeur: number }[];
}

// Couleurs de la répartition par bien : palette des panneaux de travail (lagon / citron / gris).
const BIEN_COLORS = [LAGON_INK, LAGON, CITRON_MID, LAGON_MID, CITRON_INK, LAGON_DEEP, GREY, GREY_LIGHT];

export const ImmobilierOverview: React.FC<ImmobilierOverviewProps> = ({ assets }) => {
  const [metrics, setMetrics] = useState<AssetMetrics>({
    nombreBiens: 0,
    valeurTotaleBiens: 0,
    rentabiliteBrute: 0,
    rentabiliteNette: 0,
    cashflowMensuel: 0,
    plusValueBrute: 0,
    tauxPlusValue: 0,
    parBien: [],
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
        
        const fluxBiens: FluxBien[] = [];
        let totalValeurActuelle = 0;
        let totalCoutAcquisition = 0;
        const parBien: AssetMetrics['parBien'] = [];

        for (const asset of assets) {
          // Quote-part du foyer (indivision) : pondère revenus, charges, crédit et base de
          // rentabilité, valeur estimée et plus-value, comme les simulateurs de rentabilité (100 % si
          // non renseignée).
          const quotePart = computeQuotePart(asset) / 100;

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
            const valeurBien = (asset.valeur_estimee || 0) * fraction * quotePart;
            totalValeurActuelle += valeurBien;
            parBien.push({ id: asset.id || asset.denomination || asset.nature, nom: asset.denomination || asset.nature, valeur: valeurBien });

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

          // Revenus, charges et crédit — tous les biens transférés, pas seulement les biens locatifs :
          // un bien (résidence secondaire, terrain...) peut avoir des revenus/charges sans être de
          // nature locative (cf. RENTAL_PROPERTY_TYPES), notamment via le formulaire générique
          // d'actif (AssetForm.tsx, onglet "Charges") qui n'est pas restreint par nature. Mêmes
          // formules que les indicateurs par bien de « Mes biens » (lib/immobilier/portefeuille.ts).
          const [revenus, charges] = await Promise.all([
            assetService.getAssetRevenus(asset.id),
            assetService.getAssetCharges(asset.id),
          ]);
          fluxBiens.push(computeFluxBien(asset, revenus, charges));
        }

        // Calcul des métriques
        const { rentabiliteBrute, rentabiliteNette, cashflowMensuel } = computeIndicateurs(sommeFlux(fluxBiens));
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
          parBien: parBien.filter(b => b.valeur > 0).sort((a, b) => b.valeur - a.valeur),
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

  const formatPercent = (value: number) =>
    `${value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;

  if (loading) {
    return <div className="px-8 py-6"><LoadingSpinner text="Chargement des statistiques..." /></div>;
  }

  if (assets.length === 0) {
    return (
      <div className="px-8 py-7">
        <p className="max-w-md text-[13px] text-muted-foreground">
          Aucun bien immobilier : les actifs de nature immobilière créés dans Patrimoine apparaissent ici automatiquement.
        </p>
      </div>
    );
  }

  const gain = metrics.plusValueBrute >= 0;

  // En-tête du portefeuille, sur le modèle du Résumé Patrimoine : valeur et plus-value, indicateurs en
  // lignes libellé / valeur, puis répartition de la valeur par bien.
  return (
    <div className="grid grid-cols-1 divide-y divide-border border-b border-border lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:divide-x lg:divide-y-0">
      <div className="px-8 py-6">
        <p className="text-[12px] text-muted-foreground">Valeur du portefeuille</p>
        <p className="mt-2 text-[34px] font-medium leading-none tracking-[-0.03em] tabular-nums text-foreground">
          {formatCurrency(metrics.valeurTotaleBiens)}
        </p>
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]">
          <span className={`inline-flex h-6 items-center gap-1 rounded-[2px] px-2 font-medium tabular-nums ${gain ? 'bg-positive/10 text-positive' : 'bg-destructive/10 text-destructive'}`}>
            {gain ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {gain ? '+' : ''}{formatPercent(metrics.tauxPlusValue)}
          </span>
          <span className="text-muted-foreground">
            plus-value brute ({gain ? '+' : ''}{formatCurrency(metrics.plusValueBrute)})
          </span>
        </p>
        <dl className="mt-5">
          <SummaryRow label="Biens"><span className="tabular-nums">{metrics.nombreBiens}</span></SummaryRow>
          <SummaryRow label="Cashflow">
            <span className={`tabular-nums ${metrics.cashflowMensuel >= 0 ? 'text-positive' : 'text-destructive'}`}>
              {formatCurrency(metrics.cashflowMensuel)}
            </span>
            <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">par mois, crédit compris</span>
          </SummaryRow>
          <SummaryRow label="Rent. brute">
            <span className="tabular-nums">{formatPercent(metrics.rentabiliteBrute)}</span>
            <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">loyers / prix de revient</span>
          </SummaryRow>
          <SummaryRow label="Rent. nette">
            <span className="tabular-nums">{formatPercent(metrics.rentabiliteNette)}</span>
            <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">après charges / prix de revient</span>
          </SummaryRow>
        </dl>
      </div>

      <div className="px-8 py-6">
        <PanelTitle>Répartition par bien</PanelTitle>
        {metrics.parBien.length === 0 || metrics.valeurTotaleBiens <= 0 ? (
          <p className="mt-3 text-[13px] text-muted-foreground">Aucun bien valorisé.</p>
        ) : (
          <>
            <div className="mt-4 flex h-2.5 w-full gap-[2px] overflow-hidden rounded-[1px]">
              {metrics.parBien.map((b, i) => (
                <div
                  key={b.id}
                  title={`${b.nom} · ${formatPercent((b.valeur / metrics.valeurTotaleBiens) * 100)}`}
                  className="h-full"
                  style={{ width: `${(b.valeur / metrics.valeurTotaleBiens) * 100}%`, backgroundColor: BIEN_COLORS[i % BIEN_COLORS.length] }}
                />
              ))}
            </div>
            <ul className="mt-5 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
              {metrics.parBien.map((b, i) => (
                <li key={b.id} className="flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 text-[13px] text-foreground">
                    <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-[2px] ring-1 ring-inset ring-black/10" style={{ backgroundColor: BIEN_COLORS[i % BIEN_COLORS.length] }} />
                    <span className="truncate">{b.nom}</span>
                  </span>
                  <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                    <span className="text-[13px] font-medium text-foreground">{formatCurrency(b.valeur)}</span>
                    <span className="w-14 text-right text-[12px] text-muted-foreground">
                      {((b.valeur / metrics.valeurTotaleBiens) * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
};
