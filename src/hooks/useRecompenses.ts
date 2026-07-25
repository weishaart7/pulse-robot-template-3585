import { useState, useEffect, useCallback } from 'react';
import { recompensesCreancesService } from '@/services/recompensesCreancesService';
import { Recompense } from '@/types/recompense';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export function useRecompenses() {
  const [data, setData] = useState<Recompense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { isAuthenticated } = useAuth();

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      const recompenses = await recompensesCreancesService.getRecompenses();
      setData(recompenses);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les récompenses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addRecompense = async (recompense: Omit<Recompense, 'id' | 'user_id'>) => {
    try {
      setSaving(true);
      const created = await recompensesCreancesService.createRecompense(recompense);
      setData(prev => [...prev, created]);
      return created;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la récompense",
        variant: "destructive",
      });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const removeRecompense = async (id: string) => {
    try {
      setSaving(true);
      await recompensesCreancesService.deleteRecompense(id);
      setData(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la récompense",
        variant: "destructive",
      });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  return { data, loading, saving, addRecompense, removeRecompense };
}
