import { useState, useEffect, useCallback, useMemo } from 'react';
import { societeDividendeService, SocieteDividende } from '@/services/societeDividendeService';
import { toast } from 'sonner';

export const useSocieteDividendes = (societeId: string | null) => {
  const [dividendes, setDividendes] = useState<SocieteDividende[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDividendes = useCallback(async () => {
    if (!societeId) {
      setDividendes([]);
      return;
    }
    
    setLoading(true);
    try {
      const data = await societeDividendeService.getBySociete(societeId);
      setDividendes(data);
    } catch (error) {
      console.error('Erreur chargement dividendes:', error);
      toast.error('Erreur lors du chargement des dividendes');
    } finally {
      setLoading(false);
    }
  }, [societeId]);

  useEffect(() => {
    fetchDividendes();
  }, [fetchDividendes]);

  const addDividende = async (dividende: Omit<SocieteDividende, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      await societeDividendeService.create(dividende);
      await fetchDividendes();
      toast.success('Dividende ajouté');
    } catch (error) {
      console.error('Erreur ajout dividende:', error);
      toast.error('Erreur lors de l\'ajout du dividende');
    }
  };

  const updateDividende = async (id: string, dividende: Partial<SocieteDividende>) => {
    try {
      await societeDividendeService.update(id, dividende);
      await fetchDividendes();
      toast.success('Dividende mis à jour');
    } catch (error) {
      console.error('Erreur mise à jour dividende:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const deleteDividende = async (id: string) => {
    try {
      await societeDividendeService.delete(id);
      await fetchDividendes();
      toast.success('Dividende supprimé');
    } catch (error) {
      console.error('Erreur suppression dividende:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const stats = useMemo(() => {
    if (dividendes.length === 0) {
      return {
        totalBrut: 0,
        totalNet: 0,
        moyenneBrut: 0,
        dernierDividende: null,
        nombreDistributions: 0,
      };
    }

    const totalBrut = dividendes.reduce((sum, d) => sum + (d.montant_brut || 0), 0);
    const totalNet = dividendes.reduce((sum, d) => sum + (d.montant_net || d.montant_brut || 0), 0);
    
    return {
      totalBrut,
      totalNet,
      moyenneBrut: totalBrut / dividendes.length,
      dernierDividende: dividendes[0] || null,
      nombreDistributions: dividendes.length,
    };
  }, [dividendes]);

  return {
    dividendes,
    loading,
    addDividende,
    updateDividende,
    deleteDividende,
    refetch: fetchDividendes,
    stats,
  };
};
