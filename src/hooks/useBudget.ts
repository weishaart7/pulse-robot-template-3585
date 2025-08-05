import { useState, useEffect } from 'react';
import { budgetService, Revenu, Charge } from '@/services/budgetService';
import { useToast } from '@/hooks/use-toast';

export const useRevenus = () => {
  const [revenus, setRevenus] = useState<Revenu[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchRevenus = async () => {
    setLoading(true);
    try {
      const data = await budgetService.getRevenus();
      setRevenus(data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de récupérer les revenus",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createRevenu = async (revenu: Omit<Revenu, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Revenu> => {
    try {
      const newRevenu = await budgetService.createRevenu(revenu);
      setRevenus(prev => [newRevenu, ...prev]);
      toast({
        title: "Succès",
        description: "Revenu ajouté avec succès"
      });
      return newRevenu;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer le revenu",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateRevenu = async (id: string, revenu: Partial<Revenu>): Promise<Revenu> => {
    try {
      const updatedRevenu = await budgetService.updateRevenu(id, revenu);
      setRevenus(prev => prev.map(item => item.id === id ? updatedRevenu : item));
      toast({
        title: "Succès",
        description: "Revenu modifié avec succès"
      });
      return updatedRevenu;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le revenu",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteRevenu = async (id: string): Promise<void> => {
    try {
      await budgetService.deleteRevenu(id);
      setRevenus(prev => prev.filter(item => item.id !== id));
      toast({
        title: "Succès",
        description: "Revenu supprimé avec succès"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le revenu",
        variant: "destructive"
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchRevenus();
  }, []);

  return {
    revenus,
    loading,
    fetchRevenus,
    createRevenu,
    updateRevenu,
    deleteRevenu
  };
};

export const useCharges = () => {
  const [charges, setCharges] = useState<Charge[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchCharges = async () => {
    setLoading(true);
    try {
      const data = await budgetService.getCharges();
      setCharges(data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de récupérer les charges",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createCharge = async (charge: Omit<Charge, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Charge> => {
    try {
      const newCharge = await budgetService.createCharge(charge);
      setCharges(prev => [newCharge, ...prev]);
      toast({
        title: "Succès",
        description: "Charge ajoutée avec succès"
      });
      return newCharge;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer la charge",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateCharge = async (id: string, charge: Partial<Charge>): Promise<Charge> => {
    try {
      const updatedCharge = await budgetService.updateCharge(id, charge);
      setCharges(prev => prev.map(item => item.id === id ? updatedCharge : item));
      toast({
        title: "Succès",
        description: "Charge modifiée avec succès"
      });
      return updatedCharge;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier la charge",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteCharge = async (id: string): Promise<void> => {
    try {
      await budgetService.deleteCharge(id);
      setCharges(prev => prev.filter(item => item.id !== id));
      toast({
        title: "Succès",
        description: "Charge supprimée avec succès"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la charge",
        variant: "destructive"
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchCharges();
  }, []);

  return {
    charges,
    loading,
    fetchCharges,
    createCharge,
    updateCharge,
    deleteCharge
  };
};