import { useState, useEffect } from 'react';
import { chargesDeductiblesService, ChargesDeductibles } from '@/services/chargesDeductiblesService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const useChargesDeductibles = () => {
  const [data, setData] = useState<ChargesDeductibles | null>(null);
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
      const revenus = await chargesDeductiblesService.getChargesDeductibles();
      setData(revenus);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching charges deductibles:', error);
      }
      toast({
        title: "Erreur",
        description: "Impossible de charger les charges déductibles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveData = async (revenus: ChargesDeductibles) => {
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
      const savedRevenus = await chargesDeductiblesService.upsertChargesDeductibles(revenus);
      setData(savedRevenus);
      toast({
        title: "Succès",
        description: "Charges déductibles enregistrées avec succès",
      });
      return savedRevenus;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error saving charges deductibles:', error);
      }
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer les charges déductibles",
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
