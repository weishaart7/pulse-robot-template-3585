import { useState, useEffect } from 'react';
import { revenusNonSalariesService, RevenusNonSalaries } from '@/services/revenusNonSalariesService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const useRevenusNonSalaries = () => {
  const [data, setData] = useState<RevenusNonSalaries | null>(null);
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
      const revenus = await revenusNonSalariesService.getRevenusNonSalaries();
      setData(revenus);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching revenus non salaries:', error);
      }
      toast({
        title: "Erreur",
        description: "Impossible de charger les revenus non salariés",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveData = async (revenus: RevenusNonSalaries) => {
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
      const savedRevenus = await revenusNonSalariesService.upsertRevenusNonSalaries(revenus);
      setData(savedRevenus);
      toast({
        title: "Succès",
        description: "Revenus non salariés enregistrés avec succès",
      });
      return savedRevenus;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error saving revenus non salaries:', error);
      }
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer les revenus non salariés",
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
