import { useState, useEffect } from 'react';
import { revenusCapitauxMobiliersService, RevenusCapitauxMobiliers } from '@/services/revenusCapitauxMobiliersService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const useRevenusCapitauxMobiliers = () => {
  const [data, setData] = useState<RevenusCapitauxMobiliers | null>(null);
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
      const revenus = await revenusCapitauxMobiliersService.getRevenusCapitauxMobiliers();
      setData(revenus);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching revenus capitaux mobiliers:', error);
      }
      toast({
        title: "Erreur",
        description: "Impossible de charger les revenus de capitaux mobiliers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveData = async (revenus: RevenusCapitauxMobiliers) => {
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
      const savedRevenus = await revenusCapitauxMobiliersService.upsertRevenusCapitauxMobiliers(revenus);
      setData(savedRevenus);
      toast({
        title: "Succès",
        description: "Revenus de capitaux mobiliers enregistrés avec succès",
      });
      return savedRevenus;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error saving revenus capitaux mobiliers:', error);
      }
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer les revenus de capitaux mobiliers",
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
