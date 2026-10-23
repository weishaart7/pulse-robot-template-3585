import { useState, useEffect } from 'react';
import { prelevementSourceDiversService, PrelevementSourceDivers } from '@/services/prelevementSourceDiversService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const usePrelevementSourceDivers = () => {
  const [data, setData] = useState<PrelevementSourceDivers | null>(null);
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
      const revenus = await prelevementSourceDiversService.getPrelevementSourceDivers();
      setData(revenus);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching prelevement source divers:', error);
      }
      toast({
        title: "Erreur",
        description: "Impossible de charger le prélèvement à la source et divers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveData = async (revenus: PrelevementSourceDivers) => {
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
      const savedRevenus = await prelevementSourceDiversService.upsertPrelevementSourceDivers(revenus);
      setData(savedRevenus);
      toast({
        title: "Succès",
        description: "Prélèvement à la source et divers enregistrés avec succès",
      });
      return savedRevenus;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error saving prelevement source divers:', error);
      }
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer le prélèvement à la source et divers",
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
