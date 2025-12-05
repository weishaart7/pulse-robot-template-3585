import { useState, useEffect, useCallback, useMemo } from 'react';
import { societeValorisationService, SocieteValorisation } from '@/services/societeValorisationService';
import { toast } from 'sonner';

export const useSocieteValorisations = (societeId: string | null) => {
  const [valorisations, setValorisations] = useState<SocieteValorisation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchValorisations = useCallback(async () => {
    if (!societeId) {
      setValorisations([]);
      return;
    }
    
    setLoading(true);
    try {
      const data = await societeValorisationService.getBySociete(societeId);
      setValorisations(data);
    } catch (error) {
      console.error('Erreur chargement valorisations:', error);
      toast.error('Erreur lors du chargement des valorisations');
    } finally {
      setLoading(false);
    }
  }, [societeId]);

  useEffect(() => {
    fetchValorisations();
  }, [fetchValorisations]);

  const addValorisation = async (valorisation: Omit<SocieteValorisation, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      await societeValorisationService.create(valorisation);
      await fetchValorisations();
      toast.success('Valorisation ajoutée');
    } catch (error) {
      console.error('Erreur ajout valorisation:', error);
      toast.error('Erreur lors de l\'ajout de la valorisation');
    }
  };

  const updateValorisation = async (id: string, valorisation: Partial<SocieteValorisation>) => {
    try {
      await societeValorisationService.update(id, valorisation);
      await fetchValorisations();
      toast.success('Valorisation mise à jour');
    } catch (error) {
      console.error('Erreur mise à jour valorisation:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const deleteValorisation = async (id: string) => {
    try {
      await societeValorisationService.delete(id);
      await fetchValorisations();
      toast.success('Valorisation supprimée');
    } catch (error) {
      console.error('Erreur suppression valorisation:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const stats = useMemo(() => {
    if (valorisations.length === 0) {
      return {
        valeurActuelle: null,
        valeurInitiale: null,
        evolution: null,
        evolutionPourcent: null,
      };
    }

    const valeurActuelle = valorisations[valorisations.length - 1]?.valeur || null;
    const valeurInitiale = valorisations[0]?.valeur || null;
    
    let evolution = null;
    let evolutionPourcent = null;
    
    if (valeurActuelle !== null && valeurInitiale !== null && valeurInitiale > 0) {
      evolution = valeurActuelle - valeurInitiale;
      evolutionPourcent = ((valeurActuelle - valeurInitiale) / valeurInitiale) * 100;
    }

    return {
      valeurActuelle,
      valeurInitiale,
      evolution,
      evolutionPourcent,
    };
  }, [valorisations]);

  // Prepare data for chart
  const chartData = useMemo(() => {
    return valorisations.map(v => ({
      date: v.date_valorisation,
      valeur: v.valeur,
      methode: v.methode_valorisation || 'Non spécifiée',
    }));
  }, [valorisations]);

  return {
    valorisations,
    loading,
    addValorisation,
    updateValorisation,
    deleteValorisation,
    refetch: fetchValorisations,
    stats,
    chartData,
  };
};
