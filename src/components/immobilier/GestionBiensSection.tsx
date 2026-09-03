import { Fragment, useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { assetService, type Asset, type AssetCharge, type AssetRevenu } from '@/services/assetService';
import { annualiserCharge, annualiserRevenu, computeChargesAnnuelles, computeLoyersAnnuels } from '@/lib/immobilier/rentabilite';
import { formatCurrency } from '@/lib/patrimoine/utils';

interface GestionBiensSectionProps {
  assets: Asset[];
}

interface LigneConsolidee {
  type: 'Revenu' | 'Charge';
  nature: string;
  montant: number;
  periodicite: string;
  montantAnnualise: number;
}

export const GestionBiensSection = ({ assets }: GestionBiensSectionProps) => {
  const [revenus, setRevenus] = useState<AssetRevenu[]>([]);
  const [charges, setCharges] = useState<AssetCharge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const assetIds = assets.map((a) => a.id).filter((id): id is string => !!id);
    if (assetIds.length === 0) {
      setRevenus([]);
      setCharges([]);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    Promise.all([
      assetService.getAssetRevenusByAssetIds(assetIds),
      assetService.getAssetChargesByAssetIds(assetIds),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets.map((a) => a.id).join(',')]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground text-center py-12">Chargement...</p>;
  }

  const revenusParBien = new Map<string, AssetRevenu[]>();
  for (const r of revenus) {
    const list = revenusParBien.get(r.asset_id) || [];
    list.push(r);
    revenusParBien.set(r.asset_id, list);
  }
  const chargesParBien = new Map<string, AssetCharge[]>();
  for (const c of charges) {
    const list = chargesParBien.get(c.asset_id) || [];
    list.push(c);
    chargesParBien.set(c.asset_id, list);
  }

  const biensAvecLignes = assets
    .filter((a) => a.id && ((revenusParBien.get(a.id) || []).length > 0 || (chargesParBien.get(a.id) || []).length > 0))
    .map((asset) => {
      const revenusBien = revenusParBien.get(asset.id!) || [];
      const chargesBien = chargesParBien.get(asset.id!) || [];
      const lignes: LigneConsolidee[] = [
        ...revenusBien.map((r): LigneConsolidee => ({
          type: 'Revenu',
          nature: r.nature,
          montant: r.montant,
          periodicite: r.periodicite,
          montantAnnualise: annualiserRevenu(r),
        })),
        ...chargesBien.map((c): LigneConsolidee => ({
          type: 'Charge',
          nature: c.denomination || c.type_charge,
          montant: c.montant,
          periodicite: c.periodicite,
          montantAnnualise: annualiserCharge(c),
        })),
      ];
      const loyersAnnuels = computeLoyersAnnuels(revenusBien);
      const chargesAnnuelles = computeChargesAnnuelles(chargesBien);
      return { asset, lignes, loyersAnnuels, chargesAnnuelles };
    });

  if (biensAvecLignes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Aucun revenu ni charge enregistré pour le moment.</p>
      </div>
    );
  }

  const totalLoyers = biensAvecLignes.reduce((s, b) => s + b.loyersAnnuels, 0);
  const totalCharges = biensAvecLignes.reduce((s, b) => s + b.chargesAnnuelles, 0);

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Bien</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Nature</TableHead>
            <TableHead className="text-right">Montant</TableHead>
            <TableHead>Périodicité</TableHead>
            <TableHead className="text-right">Montant annualisé</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {biensAvecLignes.map(({ asset, lignes, loyersAnnuels, chargesAnnuelles }) => (
            <Fragment key={asset.id}>
              {lignes.map((ligne, idx) => (
                <TableRow key={`${asset.id}-${idx}`}>
                  {idx === 0 && (
                    <TableCell rowSpan={lignes.length} className="align-top font-medium">
                      {asset.denomination || 'Sans dénomination'}
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge variant={ligne.type === 'Revenu' ? 'default' : 'secondary'}>{ligne.type}</Badge>
                  </TableCell>
                  <TableCell>{ligne.nature}</TableCell>
                  <TableCell className="text-right">{ligne.montant.toLocaleString('fr-FR')} €</TableCell>
                  <TableCell className="capitalize">{ligne.periodicite}</TableCell>
                  <TableCell className="text-right">{formatCurrency(ligne.montantAnnualise)}</TableCell>
                </TableRow>
              ))}
              <TableRow key={`${asset.id}-soustotal`} className="bg-muted/30 font-medium">
                <TableCell colSpan={4}>Sous-total « {asset.denomination || 'Sans dénomination'} »</TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">
                  Revenus {formatCurrency(loyersAnnuels)} / Charges {formatCurrency(chargesAnnuelles)}
                </TableCell>
                <TableCell className="text-right">{formatCurrency(loyersAnnuels - chargesAnnuelles)}</TableCell>
              </TableRow>
            </Fragment>
          ))}
          <TableRow className="bg-muted/50 font-bold">
            <TableCell colSpan={4}>Total portefeuille</TableCell>
            <TableCell className="text-right text-xs text-muted-foreground">
              Revenus {formatCurrency(totalLoyers)} / Charges {formatCurrency(totalCharges)}
            </TableCell>
            <TableCell className="text-right">{formatCurrency(totalLoyers - totalCharges)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};
