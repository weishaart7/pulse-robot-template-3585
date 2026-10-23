import { useState, useEffect } from 'react';
import { reductionsCreditsImpotService, ReductionsCreditsImpot } from '@/services/reductionsCreditsImpotService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const useReductionsCreditsImpot = () => {
  const [data, setData] = useState<ReductionsCreditsImpot | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { isAuthenticated } = useAuth();

  const fetchData = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const revenus = await reductionsCreditsImpotService.getReductionsCreditsImpot();
      setData(revenus);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching reductions credits impot:', error);
      }
      toast({
        title: "Erreur",
        description: "Impossible de charger les réductions et crédits d'impôt",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveData = async (revenus: ReductionsCreditsImpot) => {
    if (!isAuthenticated) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour enregistrer",
        variant: "destructive",
      });
      throw new Error('Utilisateur non connecté');
    }

    try {
      setSaving(true);
      const savedRevenus = await reductionsCreditsImpotService.upsertReductionsCreditsImpot(revenus);
      setData(savedRevenus);
      toast({
        title: "Succès",
        description: "Réductions et crédits d'impôt enregistrés avec succès",
      });
      return savedRevenus;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error saving reductions credits impot:', error);
      }
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer les réductions et crédits d'impôt",
        variant: "destructive",
      });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return { data, loading, saving, saveData, refetch: fetchData };
};
