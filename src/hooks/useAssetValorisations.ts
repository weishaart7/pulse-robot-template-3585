import { useState, useEffect, useCallback } from 'react';
import { assetValorisationService, AssetValorisation } from '@/services/assetValorisationService';
import { useToast } from '@/hooks/use-toast';

export const useAssetValorisations = (assetId: string | undefined) => {
  const [valorisations, setValorisations] = useState<AssetValorisation[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchValorisations = useCallback(async () => {
    if (!assetId) {
      setValorisations([]);
      return;
    }
    try {
      setLoading(true);
      const data = await assetValorisationService.getByAssetId(assetId);
      setValorisations(data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger l'historique de valorisation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    fetchValorisations();
  }, [fetchValorisations]);

  const createValorisation = async (valorisation: Omit<AssetValorisation, 'id' | 'user_id' | 'created_at'>) => {
    try {
      const newValorisation = await assetValorisationService.create(valorisation);
      setValorisations(prev => [newValorisation, ...prev].sort((a, b) => b.date_valorisation.localeCompare(a.date_valorisation)));
      toast({
        title: "Succès",
        description: "Valorisation ajoutée avec succès",
      });
      return newValorisation;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter la valorisation",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateValorisation = async (id: string, valorisation: Partial<Omit<AssetValorisation, 'id' | 'user_id' | 'created_at'>>) => {
    try {
      const updated = await assetValorisationService.update(id, valorisation);
      setValorisations(prev => prev.map(v => v.id === id ? updated : v).sort((a, b) => b.date_valorisation.localeCompare(a.date_valorisation)));
      toast({
        title: "Succès",
        description: "Valorisation mise à jour avec succès",
      });
      return updated;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la valorisation",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteValorisation = async (id: string) => {
    try {
      await assetValorisationService.delete(id);
      setValorisations(prev => prev.filter(v => v.id !== id));
      toast({
        title: "Succès",
        description: "Valorisation supprimée avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la valorisation",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    valorisations,
    loading,
    createValorisation,
    updateValorisation,
    deleteValorisation,
    fetchValorisations,
  };
};
