import { useState, useEffect, useCallback } from 'react';
import { useToast } from './use-toast';
import { 
  ifiImmeubleBatiService,
  ifiImmeableNonBatiService,
  ifiBienDetenuIndirectementService,
  ifiBienProfessionnelExonereService
} from '@/services/ifiService';
import type {
  IFIImmeubleBati,
  IFIImmeableNonBati,
  IFIBienDetenuIndirectement,
  IFIBienProfessionnelExonere,
} from '@/types/ifi';

// Hook pour Immeubles Bâtis
export const useIFIImmeubleBatis = () => {
  const [biens, setBiens] = useState<IFIImmeubleBati[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchBiens = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ifiImmeubleBatiService.getAll();
      setBiens(data);
    } catch (error) {
      console.error('Erreur lors du chargement des immeubles bâtis:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les immeubles bâtis",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createBien = useCallback(async (bien: Omit<IFIImmeubleBati, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const newBien = await ifiImmeubleBatiService.create(bien);
      setBiens(prev => [newBien, ...prev]);
      toast({
        title: "Succès",
        description: "Immeuble bâti ajouté avec succès",
      });
      return newBien;
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter l'immeuble bâti",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  const updateBien = useCallback(async (id: string, bien: Partial<IFIImmeubleBati>) => {
    try {
      const updatedBien = await ifiImmeubleBatiService.update(id, bien);
      setBiens(prev => prev.map(b => b.id === id ? updatedBien : b));
      toast({
        title: "Succès",
        description: "Immeuble bâti modifié avec succès",
      });
      return updatedBien;
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier l'immeuble bâti",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  const deleteBien = useCallback(async (id: string) => {
    try {
      await ifiImmeubleBatiService.delete(id);
      setBiens(prev => prev.filter(b => b.id !== id));
      toast({
        title: "Succès",
        description: "Immeuble bâti supprimé avec succès",
      });
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'immeuble bâti",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchBiens();
  }, [fetchBiens]);

  return {
    biens,
    loading,
    fetchBiens,
    createBien,
    updateBien,
    deleteBien,
  };
};

// Hook pour Immeubles Non Bâtis
export const useIFIImmeublesNonBatis = () => {
  const [biens, setBiens] = useState<IFIImmeableNonBati[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchBiens = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ifiImmeableNonBatiService.getAll();
      setBiens(data);
    } catch (error) {
      console.error('Erreur lors du chargement des immeubles non bâtis:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les immeubles non bâtis",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createBien = useCallback(async (bien: Omit<IFIImmeableNonBati, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const newBien = await ifiImmeableNonBatiService.create(bien);
      setBiens(prev => [newBien, ...prev]);
      toast({
        title: "Succès",
        description: "Immeuble non bâti ajouté avec succès",
      });
      return newBien;
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter l'immeuble non bâti",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  const updateBien = useCallback(async (id: string, bien: Partial<IFIImmeableNonBati>) => {
    try {
      const updatedBien = await ifiImmeableNonBatiService.update(id, bien);
      setBiens(prev => prev.map(b => b.id === id ? updatedBien : b));
      toast({
        title: "Succès",
        description: "Immeuble non bâti modifié avec succès",
      });
      return updatedBien;
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier l'immeuble non bâti",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  const deleteBien = useCallback(async (id: string) => {
    try {
      await ifiImmeableNonBatiService.delete(id);
      setBiens(prev => prev.filter(b => b.id !== id));
      toast({
        title: "Succès",
        description: "Immeuble non bâti supprimé avec succès",
      });
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'immeuble non bâti",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchBiens();
  }, [fetchBiens]);

  return {
    biens,
    loading,
    fetchBiens,
    createBien,
    updateBien,
    deleteBien,
  };
};

// Hook pour Biens Détenus Indirectement
export const useIFIBiensDetenusIndirectement = () => {
  const [biens, setBiens] = useState<IFIBienDetenuIndirectement[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchBiens = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ifiBienDetenuIndirectementService.getAll();
      setBiens(data);
    } catch (error) {
      console.error('Erreur lors du chargement des biens détenus indirectement:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les biens détenus indirectement",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createBien = useCallback(async (bien: Omit<IFIBienDetenuIndirectement, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const newBien = await ifiBienDetenuIndirectementService.create(bien);
      setBiens(prev => [newBien, ...prev]);
      toast({
        title: "Succès",
        description: "Bien détenu indirectement ajouté avec succès",
      });
      return newBien;
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le bien détenu indirectement",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  const updateBien = useCallback(async (id: string, bien: Partial<IFIBienDetenuIndirectement>) => {
    try {
      const updatedBien = await ifiBienDetenuIndirectementService.update(id, bien);
      setBiens(prev => prev.map(b => b.id === id ? updatedBien : b));
      toast({
        title: "Succès",
        description: "Bien détenu indirectement modifié avec succès",
      });
      return updatedBien;
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le bien détenu indirectement",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  const deleteBien = useCallback(async (id: string) => {
    try {
      await ifiBienDetenuIndirectementService.delete(id);
      setBiens(prev => prev.filter(b => b.id !== id));
      toast({
        title: "Succès",
        description: "Bien détenu indirectement supprimé avec succès",
      });
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le bien détenu indirectement",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchBiens();
  }, [fetchBiens]);

  return {
    biens,
    loading,
    fetchBiens,
    createBien,
    updateBien,
    deleteBien,
  };
};

// Hook pour Biens Professionnels Exonérés
export const useIFIBiensProfessionnelsExoneres = () => {
  const [biens, setBiens] = useState<IFIBienProfessionnelExonere[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchBiens = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ifiBienProfessionnelExonereService.getAll();
      setBiens(data);
    } catch (error) {
      console.error('Erreur lors du chargement des biens professionnels exonérés:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les biens professionnels exonérés",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createBien = useCallback(async (bien: Omit<IFIBienProfessionnelExonere, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const newBien = await ifiBienProfessionnelExonereService.create(bien);
      setBiens(prev => [newBien, ...prev]);
      toast({
        title: "Succès",
        description: "Bien professionnel exonéré ajouté avec succès",
      });
      return newBien;
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le bien professionnel exonéré",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  const updateBien = useCallback(async (id: string, bien: Partial<IFIBienProfessionnelExonere>) => {
    try {
      const updatedBien = await ifiBienProfessionnelExonereService.update(id, bien);
      setBiens(prev => prev.map(b => b.id === id ? updatedBien : b));
      toast({
        title: "Succès",
        description: "Bien professionnel exonéré modifié avec succès",
      });
      return updatedBien;
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le bien professionnel exonéré",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  const deleteBien = useCallback(async (id: string) => {
    try {
      await ifiBienProfessionnelExonereService.delete(id);
      setBiens(prev => prev.filter(b => b.id !== id));
      toast({
        title: "Succès",
        description: "Bien professionnel exonéré supprimé avec succès",
      });
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le bien professionnel exonéré",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchBiens();
  }, [fetchBiens]);

  return {
    biens,
    loading,
    fetchBiens,
    createBien,
    updateBien,
    deleteBien,
  };
};