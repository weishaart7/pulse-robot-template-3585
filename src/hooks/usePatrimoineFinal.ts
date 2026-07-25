import { useState, useEffect, useCallback } from 'react';
import { patrimoineFinalService } from '@/services/patrimoineAcquetsService';
import { PatrimoineFinal } from '@/types/participationAcquets';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export function usePatrimoineFinal() {
  const [data, setData] = useState<PatrimoineFinal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { isAuthenticated } = useAuth();

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      const lignes = await patrimoineFinalService.getAll();
      setData(lignes);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger le patrimoine final",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addLigne = async (ligne: Omit<PatrimoineFinal, 'id' | 'user_id'>) => {
    try {
      setSaving(true);
      const created = await patrimoineFinalService.create(ligne);
      setData(prev => [...prev, created]);
      return created;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la ligne",
        variant: "destructive",
      });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const removeLigne = async (id: string) => {
    try {
      setSaving(true);
      await patrimoineFinalService.remove(id);
      setData(prev => prev.filter(l => l.id !== id));
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la ligne",
        variant: "destructive",
      });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  return { data, loading, saving, addLigne, removeLigne };
}
