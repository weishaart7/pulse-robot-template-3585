import { useState, useEffect, useCallback } from 'react';
import { assetService, AssetRevenu } from '@/services/assetService';
import { useToast } from '@/hooks/use-toast';

export const useAssetRevenus = (assetId: string | undefined) => {
  const [revenus, setRevenus] = useState<AssetRevenu[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchRevenus = useCallback(async () => {
    if (!assetId) {
      setRevenus([]);
      return;
    }
    try {
      setLoading(true);
      const data = await assetService.getAssetRevenus(assetId);
      setRevenus(data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les revenus associés",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    fetchRevenus();
  }, [fetchRevenus]);

  const createRevenu = async (revenu: Omit<AssetRevenu, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newRevenu = await assetService.createAssetRevenu(revenu);
      setRevenus(prev => [newRevenu, ...prev]);
      toast({
        title: "Succès",
        description: "Revenu ajouté avec succès",
      });
      return newRevenu;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le revenu",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateRevenu = async (id: string, revenu: Partial<AssetRevenu>) => {
    try {
      const updated = await assetService.updateAssetRevenu(id, revenu);
      setRevenus(prev => prev.map(r => r.id === id ? updated : r));
      toast({
        title: "Succès",
        description: "Revenu mis à jour avec succès",
      });
      return updated;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le revenu",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteRevenu = async (id: string) => {
    try {
      await assetService.deleteAssetRevenu(id);
      setRevenus(prev => prev.filter(r => r.id !== id));
      toast({
        title: "Succès",
        description: "Revenu supprimé avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le revenu",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    revenus,
    loading,
    createRevenu,
    updateRevenu,
    deleteRevenu,
    fetchRevenus,
  };
};
