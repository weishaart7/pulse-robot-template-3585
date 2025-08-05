import { useState, useEffect } from 'react';
import { assetService, Asset, AssetCharge } from '@/services/assetService';
import { useToast } from '@/hooks/use-toast';

export const useAssets = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const data = await assetService.getAssets();
      setAssets(data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les actifs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createAsset = async (asset: Omit<Asset, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const newAsset = await assetService.createAsset(asset);
      setAssets(prev => [newAsset, ...prev]);
      toast({
        title: "Succès",
        description: "Actif créé avec succès",
      });
      return newAsset;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer l'actif",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateAsset = async (id: string, asset: Partial<Asset>) => {
    try {
      const updatedAsset = await assetService.updateAsset(id, asset);
      setAssets(prev => prev.map(a => a.id === id ? updatedAsset : a));
      toast({
        title: "Succès",
        description: "Actif mis à jour avec succès",
      });
      return updatedAsset;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'actif",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteAsset = async (id: string) => {
    try {
      await assetService.deleteAsset(id);
      setAssets(prev => prev.filter(a => a.id !== id));
      toast({
        title: "Succès",
        description: "Actif supprimé avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'actif",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  return {
    assets,
    loading,
    createAsset,
    updateAsset,
    deleteAsset,
    fetchAssets
  };
};

export const useAssetCharges = (assetId: string) => {
  const [charges, setCharges] = useState<AssetCharge[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchCharges = async () => {
    if (!assetId) return;
    try {
      setLoading(true);
      const data = await assetService.getAssetCharges(assetId);
      setCharges(data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les charges",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createCharge = async (charge: Omit<AssetCharge, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newCharge = await assetService.createAssetCharge(charge);
      setCharges(prev => [newCharge, ...prev]);
      toast({
        title: "Succès",
        description: "Charge ajoutée avec succès",
      });
      return newCharge;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter la charge",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateCharge = async (id: string, charge: Partial<AssetCharge>) => {
    try {
      const updatedCharge = await assetService.updateAssetCharge(id, charge);
      setCharges(prev => prev.map(c => c.id === id ? updatedCharge : c));
      toast({
        title: "Succès",
        description: "Charge mise à jour avec succès",
      });
      return updatedCharge;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la charge",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteCharge = async (id: string) => {
    try {
      await assetService.deleteAssetCharge(id);
      setCharges(prev => prev.filter(c => c.id !== id));
      toast({
        title: "Succès",
        description: "Charge supprimée avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la charge",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchCharges();
  }, [assetId]);

  return {
    charges,
    loading,
    createCharge,
    updateCharge,
    deleteCharge,
    fetchCharges
  };
};