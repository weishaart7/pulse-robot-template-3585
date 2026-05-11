import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PatrimoineTreeView } from './PatrimoineTreeView';
import { AssetForm } from '@/components/assets/AssetForm';
import { Plus } from 'lucide-react';
import { useAssets } from '@/hooks/useAssets';
import { Asset, AssetCharge, assetService } from '@/services/assetService';
import { societeService } from '@/services/societeService';
import { isSocieteEligibleNature, natureToTypeSociete } from '@/lib/patrimoine/societeTransfer';

export const PatrimoineActifs = () => {
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const { assets, createAsset, updateAsset, deleteAsset } = useAssets();

  const syncSocieteFromAsset = async (savedAsset: Asset) => {
    if (!savedAsset?.id) return;
    if (!isSocieteEligibleNature(savedAsset.nature)) return;
    if (!savedAsset.transfert_societe) return;
    if (savedAsset.societe_id) return; // déjà lié

    try {
      const created = await societeService.create({
        denomination: savedAsset.denomination || savedAsset.nature,
        type_societe: natureToTypeSociete(savedAsset.nature),
        valeur_estimee: savedAsset.valeur_estimee ?? undefined,
        pourcentage_utilisateur: savedAsset.pourcentage_utilisateur ?? undefined,
        pourcentage_conjoint: savedAsset.pourcentage_conjoint ?? undefined,
      } as any);
      await assetService.updateAsset(savedAsset.id, { societe_id: created.id } as any);
    } catch (err) {
      console.error('Auto-création société depuis actif échouée:', err);
    }
  };

  const handleAssetSubmit = async (assetData: any, charges: AssetCharge[]) => {
    try {
      let savedAsset;
      if (editingAsset) {
        savedAsset = await updateAsset(editingAsset.id!, assetData);
      } else {
        savedAsset = await createAsset(assetData);
      }

      // Save charges for the asset
      if (charges.length > 0) {
        await Promise.all(
          charges.map(charge => {
            const chargeData = {
              ...charge,
              asset_id: savedAsset.id
            };

            // Remove temporary id for new charges
            if (charge.id?.startsWith('temp-')) {
              delete chargeData.id;
            }

            return charge.id?.startsWith('temp-')
              ? assetService.createAssetCharge(chargeData)
              : assetService.updateAssetCharge(charge.id!, chargeData);
          })
        );
      }

      // Création/lien automatique d'une société si applicable
      await syncSocieteFromAsset(savedAsset as Asset);

      setShowAssetForm(false);
      setEditingAsset(null);
    } catch (error) {
      console.error('Error saving asset:', error);
    }
  };

  if (showAssetForm) {
    return (
      <div className="space-y-6">
        <AssetForm
          asset={editingAsset || undefined}
          onSubmit={handleAssetSubmit}
          onCancel={() => {
            setShowAssetForm(false);
            setEditingAsset(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Gestion des actifs</h3>
        <Button onClick={() => setShowAssetForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Ajouter un actif
        </Button>
      </div>
      
      <PatrimoineTreeView 
        assets={assets}
        onAssetEdit={(asset) => {
          setEditingAsset(asset);
          setShowAssetForm(true);
        }}
        onAssetDelete={(asset) => {
          if (asset.id) {
            deleteAsset(asset.id);
          }
        }}
      />
    </div>
  );
};