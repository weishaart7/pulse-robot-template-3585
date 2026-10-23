import { useState, useEffect } from 'react';
import { plusValuesGainsDiversService, PlusValuesGainsDivers } from '@/services/plusValuesGainsDiversService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const usePlusValuesGainsDivers = () => {
  const [data, setData] = useState<PlusValuesGainsDivers | null>(null);
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
      const revenus = await plusValuesGainsDiversService.getPlusValuesGainsDivers();
      setData(revenus);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching plus-values gains divers:', error);
      }
      toast({
        title: "Erreur",
        description: "Impossible de charger les plus-values et gains divers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveData = async (revenus: PlusValuesGainsDivers) => {
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
      const savedRevenus = await plusValuesGainsDiversService.upsertPlusValuesGainsDivers(revenus);
      setData(savedRevenus);
      toast({
        title: "Succès",
        description: "Plus-values et gains divers enregistrés avec succès",
      });
      return savedRevenus;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error saving plus-values gains divers:', error);
      }
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer les plus-values et gains divers",
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
