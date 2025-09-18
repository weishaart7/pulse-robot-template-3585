import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PatrimoineTreeView } from './PatrimoineTreeView';
import { AssetForm } from '@/components/assets/AssetForm';
import { Plus } from 'lucide-react';
import { useAssets } from '@/hooks/useAssets';
import { Asset, AssetCharge, assetService } from '@/services/assetService';

export const PatrimoineActifs = () => {
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const { assets, createAsset, updateAsset } = useAssets();

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
      />
    </div>
  );
};