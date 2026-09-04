import { useState, useEffect } from 'react';
import { gainsActionnariatSalarieService, GainsActionnariatSalarie } from '@/services/gainsActionnariatSalarieService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const useGainsActionnariatSalarie = () => {
  const [data, setData] = useState<GainsActionnariatSalarie | null>(null);
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
      const gains = await gainsActionnariatSalarieService.getGainsActionnariatSalarie();
      setData(gains);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching gains actionnariat salarie:', error);
      }
      toast({
        title: "Erreur",
        description: "Impossible de charger les gains d'actionnariat salarié",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveData = async (gains: GainsActionnariatSalarie) => {
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
      const savedGains = await gainsActionnariatSalarieService.upsertGainsActionnariatSalarie(gains);
      setData(savedGains);
      toast({
        title: "Succès",
        description: "Gains d'actionnariat salarié enregistrés avec succès",
      });
      return savedGains;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error saving gains actionnariat salarie:', error);
      }
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer les gains d'actionnariat salarié",
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
