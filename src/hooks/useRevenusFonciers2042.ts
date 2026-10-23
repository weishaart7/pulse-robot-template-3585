import { useState, useEffect } from 'react';
import { revenusFonciers2042Service, RevenusFonciers2042 } from '@/services/revenusFonciers2042Service';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const useRevenusFonciers2042 = () => {
  const [data, setData] = useState<RevenusFonciers2042 | null>(null);
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
      const revenus = await revenusFonciers2042Service.getRevenusFonciers2042();
      setData(revenus);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching revenus fonciers 2042:', error);
      }
      toast({
        title: "Erreur",
        description: "Impossible de charger les revenus fonciers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveData = async (revenus: RevenusFonciers2042) => {
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
      const savedRevenus = await revenusFonciers2042Service.upsertRevenusFonciers2042(revenus);
      setData(savedRevenus);
      toast({
        title: "Succès",
        description: "Revenus fonciers enregistrés avec succès",
      });
      return savedRevenus;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error saving revenus fonciers 2042:', error);
      }
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer les revenus fonciers",
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
