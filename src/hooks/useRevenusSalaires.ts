import { useState, useEffect } from 'react';
import { revenusSalairesService, RevenusSalaires } from '@/services/revenusSalairesService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const useRevenusSalaires = () => {
  const [data, setData] = useState<RevenusSalaires | null>(null);
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
      const revenus = await revenusSalairesService.getRevenusSalaires();
      setData(revenus);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching revenus salaires:', error);
      }
      toast({
        title: "Erreur",
        description: "Impossible de charger les revenus de salaires",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveData = async (revenus: RevenusSalaires) => {
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
      const savedRevenus = await revenusSalairesService.upsertRevenusSalaires(revenus);
      setData(savedRevenus);
      toast({
        title: "Succès",
        description: "Revenus de salaires enregistrés avec succès",
      });
      return savedRevenus;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error saving revenus salaires:', error);
      }
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer les revenus de salaires",
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
