import { useState, useEffect } from 'react';
import { passifService, type Emprunt, type Passif } from '@/services/passifService';
import { useErrorHandler } from './useErrorHandler';
import { useToast } from './use-toast';

export const useEmprunts = () => {
  const [emprunts, setEmprunts] = useState<Emprunt[]>([]);
  const [loading, setLoading] = useState(true);
  const { handleError } = useErrorHandler();
  const { toast } = useToast();

  const fetchEmprunts = async () => {
    try {
      setLoading(true);
      const data = await passifService.getEmprunts();
      setEmprunts(data);
    } catch (error) {
      handleError(error, 'Erreur lors du chargement des emprunts');
    } finally {
      setLoading(false);
    }
  };

  const createEmprunt = async (emprunt: Omit<Emprunt, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Emprunt> => {
    try {
      const newEmprunt = await passifService.createEmprunt(emprunt);
      setEmprunts(prev => [newEmprunt, ...prev]);
      toast({
        title: "Succès",
        description: "L'emprunt a été ajouté avec succès",
      });
      return newEmprunt;
    } catch (error) {
      handleError(error, 'Erreur lors de la création de l\'emprunt');
      throw error;
    }
  };

  const updateEmprunt = async (id: string, emprunt: Partial<Emprunt>): Promise<Emprunt> => {
    try {
      const updatedEmprunt = await passifService.updateEmprunt(id, emprunt);
      setEmprunts(prev => prev.map(e => e.id === id ? updatedEmprunt : e));
      toast({
        title: "Succès",
        description: "L'emprunt a été modifié avec succès",
      });
      return updatedEmprunt;
    } catch (error) {
      handleError(error, 'Erreur lors de la modification de l\'emprunt');
      throw error;
    }
  };

  const deleteEmprunt = async (id: string): Promise<void> => {
    try {
      await passifService.deleteEmprunt(id);
      setEmprunts(prev => prev.filter(e => e.id !== id));
      toast({
        title: "Succès",
        description: "L'emprunt a été supprimé avec succès",
      });
    } catch (error) {
      handleError(error, 'Erreur lors de la suppression de l\'emprunt');
    }
  };

  useEffect(() => {
    fetchEmprunts();
  }, []);

  return {
    emprunts,
    loading,
    fetchEmprunts,
    createEmprunt,
    updateEmprunt,
    deleteEmprunt,
  };
};

export const usePassifs = () => {
  const [passifs, setPassifs] = useState<Passif[]>([]);
  const [loading, setLoading] = useState(true);
  const { handleError } = useErrorHandler();
  const { toast } = useToast();

  const fetchPassifs = async () => {
    try {
      setLoading(true);
      const data = await passifService.getPassifs();
      setPassifs(data);
    } catch (error) {
      handleError(error, 'Erreur lors du chargement des passifs');
    } finally {
      setLoading(false);
    }
  };

  const createPassif = async (passif: Omit<Passif, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Passif> => {
    try {
      const newPassif = await passifService.createPassif(passif);
      setPassifs(prev => [newPassif, ...prev]);
      toast({
        title: "Succès",
        description: "Le passif a été ajouté avec succès",
      });
      return newPassif;
    } catch (error) {
      handleError(error, 'Erreur lors de la création du passif');
      throw error;
    }
  };

  const updatePassif = async (id: string, passif: Partial<Passif>): Promise<Passif> => {
    try {
      const updatedPassif = await passifService.updatePassif(id, passif);
      setPassifs(prev => prev.map(p => p.id === id ? updatedPassif : p));
      toast({
        title: "Succès",
        description: "Le passif a été modifié avec succès",
      });
      return updatedPassif;
    } catch (error) {
      handleError(error, 'Erreur lors de la modification du passif');
      throw error;
    }
  };

  const deletePassif = async (id: string): Promise<void> => {
    try {
      await passifService.deletePassif(id);
      setPassifs(prev => prev.filter(p => p.id !== id));
      toast({
        title: "Succès",
        description: "Le passif a été supprimé avec succès",
      });
    } catch (error) {
      handleError(error, 'Erreur lors de la suppression du passif');
    }
  };

  useEffect(() => {
    fetchPassifs();
  }, []);

  return {
    passifs,
    loading,
    fetchPassifs,
    createPassif,
    updatePassif,
    deletePassif,
  };
};