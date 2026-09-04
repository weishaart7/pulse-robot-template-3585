import { useState, useEffect } from 'react';
import { revenusExoneresTauxEffectifService, RevenusExoneresTauxEffectif } from '@/services/revenusExoneresTauxEffectifService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const useRevenusExoneresTauxEffectif = () => {
  const [data, setData] = useState<RevenusExoneresTauxEffectif | null>(null);
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
      const revenus = await revenusExoneresTauxEffectifService.getRevenusExoneresTauxEffectif();
      setData(revenus);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching revenus exoneres taux effectif:', error);
      }
      toast({
        title: "Erreur",
        description: "Impossible de charger les salaires et pensions exonérés",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveData = async (revenus: RevenusExoneresTauxEffectif) => {
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
      const savedRevenus = await revenusExoneresTauxEffectifService.upsertRevenusExoneresTauxEffectif(revenus);
      setData(savedRevenus);
      toast({
        title: "Succès",
        description: "Salaires et pensions exonérés enregistrés avec succès",
      });
      return savedRevenus;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error saving revenus exoneres taux effectif:', error);
      }
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer les salaires et pensions exonérés",
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
