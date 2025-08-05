import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AssetForm } from '@/components/assets/AssetForm';
import { useAssets } from '@/hooks/useAssets';
import { Asset, AssetCharge } from '@/services/assetService';

export const PatrimoineSection = () => {
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const { assets, createAsset, updateAsset, loading } = useAssets();

  const handleAssetSubmit = async (assetData: any, charges: AssetCharge[]) => {
    try {
      let savedAsset;
      if (editingAsset) {
        savedAsset = await updateAsset(editingAsset.id!, assetData);
      } else {
        savedAsset = await createAsset(assetData);
      }
      
      // TODO: Save charges when asset is created/updated
      // This would require additional API calls or batch operations
      
      setShowAssetForm(false);
      setEditingAsset(null);
    } catch (error) {
      console.error('Error saving asset:', error);
    }
  };

  if (showAssetForm) {
    return (
      <div className="p-6">
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
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Patrimoine</h2>
        <p className="text-muted-foreground">
          Gérez vos actifs patrimoniaux
        </p>
      </div>

      {assets.length === 0 ? (
        <Card className="text-center p-8">
          <CardHeader>
            <CardTitle>Aucun actif enregistré</CardTitle>
            <CardDescription>
              Commencez par ajouter votre premier actif patrimonial
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowAssetForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Ajouter un actif
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Mes actifs</h3>
            <Button onClick={() => setShowAssetForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Ajouter un actif
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {assets.map((asset) => (
              <Card key={asset.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-base">{asset.nature}</CardTitle>
                  {asset.denomination && (
                    <CardDescription className="line-clamp-2">
                      {asset.denomination}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {asset.valeur_estimee && (
                      <p>
                        <span className="font-medium">Valeur estimée:</span> {asset.valeur_estimee.toLocaleString()} €
                      </p>
                    )}
                    {asset.detenteur && (
                      <p>
                        <span className="font-medium">Détenteur:</span> {asset.detenteur}
                      </p>
                    )}
                    {asset.date_estimation && (
                      <p>
                        <span className="font-medium">Date d'estimation:</span> {new Date(asset.date_estimation).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-4"
                    onClick={() => {
                      setEditingAsset(asset);
                      setShowAssetForm(true);
                    }}
                  >
                    Modifier
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};