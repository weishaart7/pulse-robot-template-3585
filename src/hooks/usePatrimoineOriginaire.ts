import { useState, useEffect, useCallback } from 'react';
import { patrimoineOriginaireService } from '@/services/patrimoineAcquetsService';
import { PatrimoineOriginaire } from '@/types/participationAcquets';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export function usePatrimoineOriginaire() {
  const [data, setData] = useState<PatrimoineOriginaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { isAuthenticated } = useAuth();

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      const lignes = await patrimoineOriginaireService.getAll();
      setData(lignes);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger le patrimoine originaire",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addLigne = async (ligne: Omit<PatrimoineOriginaire, 'id' | 'user_id'>) => {
    try {
      setSaving(true);
      const created = await patrimoineOriginaireService.create(ligne);
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
      await patrimoineOriginaireService.remove(id);
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
