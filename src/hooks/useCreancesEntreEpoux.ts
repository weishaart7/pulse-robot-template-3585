import { useState, useEffect, useCallback } from 'react';
import { recompensesCreancesService } from '@/services/recompensesCreancesService';
import { CreanceEntreEpoux } from '@/types/creanceEntreEpoux';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export function useCreancesEntreEpoux() {
  const [data, setData] = useState<CreanceEntreEpoux[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { isAuthenticated } = useAuth();

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      const creances = await recompensesCreancesService.getCreancesEntreEpoux();
      setData(creances);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les créances entre époux",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addCreance = async (creance: Omit<CreanceEntreEpoux, 'id' | 'user_id'>) => {
    try {
      setSaving(true);
      const created = await recompensesCreancesService.createCreanceEntreEpoux(creance);
      setData(prev => [...prev, created]);
      return created;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la créance",
        variant: "destructive",
      });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const removeCreance = async (id: string) => {
    try {
      setSaving(true);
      await recompensesCreancesService.deleteCreanceEntreEpoux(id);
      setData(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la créance",
        variant: "destructive",
      });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  return { data, loading, saving, addCreance, removeCreance };
}
