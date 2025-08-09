import { useState, useEffect } from 'react';
import { liberaliteService, Liberalite } from '@/services/liberaliteService';
import { toast } from '@/hooks/use-toast';

export const useLiberalites = () => {
  const [liberalites, setLiberalites] = useState<Liberalite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLiberalites = async () => {
    try {
      setLoading(true);
      const data = await liberaliteService.getLiberalites();
      setLiberalites(data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les libéralités",
        variant: "destructive",
      });
      console.error('Error fetching liberalites:', error);
    } finally {
      setLoading(false);
    }
  };

  const createLiberalite = async (liberalite: Omit<Liberalite, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const newLiberalite = await liberaliteService.createLiberalite(liberalite);
      setLiberalites(prev => [newLiberalite, ...prev]);
      toast({
        title: "Succès",
        description: `${liberalite.type === 'donation' ? 'Donation' : 'Legs'} ajouté avec succès`,
      });
      return newLiberalite;
    } catch (error) {
      toast({
        title: "Erreur",
        description: `Impossible d'ajouter ${liberalite.type === 'donation' ? 'la donation' : 'le legs'}`,
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateLiberalite = async (id: string, liberalite: Partial<Liberalite>) => {
    try {
      const updatedLiberalite = await liberaliteService.updateLiberalite(id, liberalite);
      setLiberalites(prev => prev.map(l => l.id === id ? updatedLiberalite : l));
      toast({
        title: "Succès",
        description: "Libéralité modifiée avec succès",
      });
      return updatedLiberalite;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier la libéralité",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteLiberalite = async (id: string) => {
    try {
      await liberaliteService.deleteLiberalite(id);
      setLiberalites(prev => prev.filter(l => l.id !== id));
      toast({
        title: "Succès",
        description: "Libéralité supprimée avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la libéralité",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchLiberalites();
  }, []);

  return {
    liberalites,
    loading,
    fetchLiberalites,
    createLiberalite,
    updateLiberalite,
    deleteLiberalite
  };
};