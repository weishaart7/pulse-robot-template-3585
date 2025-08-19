import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AssetForm } from '@/components/assets/AssetForm';
import { PatrimoineSidebar } from '@/components/patrimoine/PatrimoineSidebar';
import { PatrimoineMainContent } from '@/components/patrimoine/PatrimoineMainContent';
import { useAssets } from '@/hooks/useAssets';
import { Asset, AssetCharge } from '@/services/assetService';

export const PatrimoineSection = () => {
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
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

  if (assets.length === 0) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Patrimoine</h2>
          <p className="text-muted-foreground">
            Gérez vos actifs patrimoniaux
          </p>
        </div>
        <Card className="text-center p-8">
          <CardHeader>
            <CardTitle>Aucun actif enregistré</CardTitle>
            <CardDescription>
              Commencez par ajouter votre premier actif patrimonial
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowAssetForm(true)} className="flex items-center gap-2">
              Ajouter un actif
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full relative">
      {/* Sidebar gauche - position fixe */}
      <PatrimoineSidebar
        assets={assets}
        onAssetEdit={(asset) => {
          setEditingAsset(asset);
          setShowAssetForm(true);
        }}
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
      />
      
      {/* Contenu principal - avec marge de 12px par rapport à la sidebar */}
      <div className="ml-[332px] flex-1 pr-3">
        <PatrimoineMainContent
        assets={assets}
        selectedCategory={selectedCategory}
        onAssetEdit={(asset) => {
          setEditingAsset(asset);
          setShowAssetForm(true);
        }}
          onAddAsset={() => setShowAssetForm(true)}
        />
      </div>
    </div>
  );
};