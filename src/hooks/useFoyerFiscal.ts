import { useState, useEffect } from 'react';
import { foyerFiscalService, FoyerFiscal } from '@/services/foyerFiscalService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const useFoyerFiscal = () => {
  const [data, setData] = useState<FoyerFiscal | null>(null);
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
      const foyer = await foyerFiscalService.getFoyerFiscal();
      setData(foyer);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching foyer fiscal:', error);
      }
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du foyer fiscal",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveData = async (foyer: FoyerFiscal) => {
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
      const savedFoyer = await foyerFiscalService.upsertFoyerFiscal(foyer);
      setData(savedFoyer);
      toast({
        title: "Succès",
        description: "Foyer fiscal enregistré avec succès",
      });
      return savedFoyer;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error saving foyer fiscal:', error);
      }
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer le foyer fiscal",
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
