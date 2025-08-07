import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AssetForm } from '@/components/assets/AssetForm';
import { PatrimoineDashboard } from '@/components/PatrimoineDashboard';
import { useAssets } from '@/hooks/useAssets';
import { Asset, AssetCharge } from '@/services/assetService';
import { getAssetCategory } from '@/constants/assetTypes';

export const PatrimoineSection = () => {
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const { assets, createAsset, updateAsset, deleteAsset, loading } = useAssets();

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

  const handleAssetDelete = async (assetId: string) => {
    try {
      await deleteAsset(assetId);
      setShowAssetForm(false);
      setEditingAsset(null);
    } catch (error) {
      console.error('Error deleting asset:', error);
    }
  };

  if (showAssetForm) {
    return (
      <div className="p-6">
        <AssetForm
          asset={editingAsset || undefined}
          onSubmit={handleAssetSubmit}
          onDelete={editingAsset ? handleAssetDelete : undefined}
          onCancel={() => {
            setShowAssetForm(false);
            setEditingAsset(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Mon Patrimoine
            </h1>
            <p className="text-muted-foreground mt-1">
              Vue d'ensemble de vos actifs patrimoniaux
            </p>
          </div>
          {assets.length > 0 && (
            <Button onClick={() => setShowAssetForm(true)} className="flex items-center gap-2 shadow-lg">
              <Plus className="h-4 w-4" />
              Nouvel actif
            </Button>
          )}
        </div>

        {assets.length === 0 ? (
          <Card className="border-dashed border-2 text-center p-12 bg-gradient-to-br from-card to-muted/20">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Plus className="h-8 w-8 text-primary" />
              </div>
              <CardHeader className="p-0">
                <CardTitle className="text-xl">Commencez votre inventaire</CardTitle>
                <CardDescription className="text-base">
                  Ajoutez vos premiers actifs pour visualiser votre patrimoine
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Button onClick={() => setShowAssetForm(true)} size="lg" className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Ajouter mon premier actif
                </Button>
              </CardContent>
            </div>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Dashboard avec graphique */}
            <PatrimoineDashboard assets={assets} />
            
            {/* Liste des actifs */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-card to-muted/20 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Mes actifs ({assets.length})</CardTitle>
                    <CardDescription>
                      Gérez et consultez vos biens patrimoniaux
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {assets.map((asset) => (
                    <Card 
                      key={asset.id} 
                      className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-primary/20 hover:border-l-primary"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-lg font-semibold leading-tight group-hover:text-primary transition-colors">
                            {asset.nature}
                          </CardTitle>
                          <Badge variant="outline" className="shrink-0 text-xs font-medium">
                            {getAssetCategory(asset.nature)}
                          </Badge>
                        </div>
                        {asset.denomination && (
                          <CardDescription className="line-clamp-2 text-sm">
                            {asset.denomination}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          {asset.valeur_estimee && (
                            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                              <span className="text-sm font-medium text-muted-foreground">Valeur estimée</span>
                              <span className="text-lg font-bold text-primary">
                                {asset.valeur_estimee.toLocaleString()} €
                              </span>
                            </div>
                          )}
                          {asset.detenteur && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Détenteur</span>
                              <span className="text-sm font-medium">{asset.detenteur}</span>
                            </div>
                          )}
                          {asset.date_estimation && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Dernière estimation</span>
                              <span className="text-sm font-medium">
                                {new Date(asset.date_estimation).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                          onClick={() => {
                            setEditingAsset(asset);
                            setShowAssetForm(true);
                          }}
                        >
                          Modifier l'actif
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};