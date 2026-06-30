import { useState, useEffect, useCallback } from 'react';
import { useToast } from './use-toast';
import {
  ifiImmeubleBatiService,
  ifiImmeableNonBatiService,
  ifiBienDetenuIndirectementService,
  ifiBienProfessionnelExonereService,
  ifiPassifDeductionService,
  ifiHypotheseService
} from '@/services/ifiService';
import type {
  IFIImmeubleBati,
  IFIImmeableNonBati,
  IFIBienDetenuIndirectement,
  IFIBienProfessionnelExonere,
  IFIPassifDeduction,
  IFIHypothese,
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
// Hook pour Passifs et Déductions
export const useIFIPassifsDeductions = () => {
  const [passifs, setPassifs] = useState<IFIPassifDeduction[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchPassifs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ifiPassifDeductionService.getAll();
      setPassifs(data);
    } catch (error) {
      console.error('Erreur lors du chargement des passifs IFI:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les passifs et déductions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createPassif = useCallback(async (passif: Omit<IFIPassifDeduction, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const newPassif = await ifiPassifDeductionService.create(passif);
      setPassifs(prev => [newPassif, ...prev]);
      toast({
        title: "Succès",
        description: "Passif ajouté avec succès",
      });
      return newPassif;
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le passif",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  const updatePassif = useCallback(async (id: string, passif: Partial<IFIPassifDeduction>) => {
    try {
      const updatedPassif = await ifiPassifDeductionService.update(id, passif);
      setPassifs(prev => prev.map(p => p.id === id ? updatedPassif : p));
      toast({
        title: "Succès",
        description: "Passif modifié avec succès",
      });
      return updatedPassif;
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le passif",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  const deletePassif = useCallback(async (id: string) => {
    try {
      await ifiPassifDeductionService.delete(id);
      setPassifs(prev => prev.filter(p => p.id !== id));
      toast({
        title: "Succès",
        description: "Passif supprimé avec succès",
      });
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le passif",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchPassifs();
  }, [fetchPassifs]);

  return {
    passifs,
    loading,
    fetchPassifs,
    createPassif,
    updatePassif,
    deletePassif,
  };
};

// Hook pour Hypothèses (table générique clé/valeur)
export const useIFIHypotheses = () => {
  const [hypotheses, setHypotheses] = useState<IFIHypothese[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchHypotheses = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ifiHypotheseService.getAll();
      setHypotheses(data);
    } catch (error) {
      console.error('Erreur lors du chargement des hypothèses IFI:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les hypothèses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const saveHypothese = useCallback(async (typeHypothese: string, fields: Partial<IFIHypothese>) => {
    try {
      const saved = await ifiHypotheseService.upsertByType(typeHypothese, fields);
      setHypotheses(prev => {
        const exists = prev.some(h => h.type_hypothese === typeHypothese);
        return exists
          ? prev.map(h => h.type_hypothese === typeHypothese ? saved : h)
          : [saved, ...prev];
      });
      return saved;
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de l'hypothèse:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer l'hypothèse",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  useEffect(() => {
    fetchHypotheses();
  }, [fetchHypotheses]);

  return {
    hypotheses,
    loading,
    fetchHypotheses,
    saveHypothese,
  };
};
