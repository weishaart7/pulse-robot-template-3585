import { useState, useEffect } from 'react';
import { pensionsRetraitesRentesService, PensionsRetraitesRentes } from '@/services/pensionsRetraitesRentesService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const usePensionsRetraitesRentes = () => {
  const [data, setData] = useState<PensionsRetraitesRentes | null>(null);
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
      const pensions = await pensionsRetraitesRentesService.getPensionsRetraitesRentes();
      setData(pensions);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching pensions retraites rentes:', error);
      }
      toast({
        title: "Erreur",
        description: "Impossible de charger les pensions, retraites et rentes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveData = async (pensions: PensionsRetraitesRentes) => {
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
      const savedPensions = await pensionsRetraitesRentesService.upsertPensionsRetraitesRentes(pensions);
      setData(savedPensions);
      toast({
        title: "Succès",
        description: "Pensions, retraites et rentes enregistrées avec succès",
      });
      return savedPensions;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error saving pensions retraites rentes:', error);
      }
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer les pensions, retraites et rentes",
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
