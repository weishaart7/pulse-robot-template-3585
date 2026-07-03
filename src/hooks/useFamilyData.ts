import { useState, useEffect } from 'react';
import { familyService, FamilyProfile, MaritalStatus, FamilyLink } from '@/services/familyService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { compterEnfantsFiscalementACharge } from '@/lib/fiscal';

const syncNombreEnfantsCharges = async (links: FamilyLink[]) => {
  try {
    await familyService.upsertMaritalStatus({
      nombre_enfants_charges: compterEnfantsFiscalementACharge(links),
    });
  } catch (error) {
    console.error('Error syncing nombre_enfants_charges:', error);
  }
};

export const useFamilyProfile = () => {
  const [data, setData] = useState<FamilyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { isAuthenticated, loading: authLoading } = useAuth();

  const fetchData = async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
      const profile = await familyService.getFamilyProfile();
      setData(profile);
    } catch (error) {
      console.error('Error fetching family profile:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du profil familial",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveData = async (profile: FamilyProfile) => {
    // Attendre que l'authentification soit chargée
    if (authLoading) {
      toast({
        title: "Chargement",
        description: "Vérification de l'authentification en cours...",
      });
      return;
    }
    
    if (!isAuthenticated) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour enregistrer",
        variant: "destructive",
      });
      throw new Error('Utilisateur non connecté');
    }

    try {
      setSaving(true);
      const savedProfile = await familyService.upsertFamilyProfile(profile);
      setData(savedProfile);
      toast({
        title: "Succès",
        description: "Fiche client enregistrée avec succès",
      });
      return savedProfile;
    } catch (error) {
      console.error('Error saving family profile:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la fiche client",
        variant: "destructive",
      });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAuthenticated]);

  return { data, loading, saving, saveData, refetch: fetchData };
};

export const useMaritalStatus = () => {
  const [data, setData] = useState<MaritalStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { isAuthenticated } = useAuth();

  const fetchData = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const status = await familyService.getMaritalStatus();
      setData(status);
    } catch (error) {
      console.error('Error fetching marital status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données de situation matrimoniale",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveData = async (status: MaritalStatus) => {
    if (!isAuthenticated) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour enregistrer",
        variant: "destructive",
      });
      throw new Error('Utilisateur non connecté');
    }

    try {
      setSaving(true);
      const savedStatus = await familyService.upsertMaritalStatus(status);
      setData(savedStatus);
      toast({
        title: "Succès",
        description: "Situation matrimoniale enregistrée avec succès",
      });
      return savedStatus;
    } catch (error) {
      console.error('Error saving marital status:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la situation matrimoniale",
        variant: "destructive",
      });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAuthenticated]);

  return { data, loading, saving, saveData, refetch: fetchData };
};

export const useFamilyData = () => {
  const { data: familyMembers, ...familyLinksData } = useFamilyLinks();
  return { familyMembers, ...familyLinksData };
};

export const useFamilyLinks = () => {
  const [data, setData] = useState<FamilyLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { isAuthenticated } = useAuth();

  const fetchData = async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
      const links = await familyService.getFamilyLinks();
      setData(links);
    } catch (error) {
      console.error('Error fetching family links:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les liens familiaux",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addLink = async (link: Omit<FamilyLink, 'id' | 'user_id'>) => {
    try {
      setSaving(true);
      const newLink = await familyService.createFamilyLink(link);
      setData(prev => {
        const updated = [...prev, newLink];
        syncNombreEnfantsCharges(updated);
        return updated;
      });
      toast({
        title: "Succès",
        description: "Membre de la famille ajouté avec succès",
      });
      return newLink;
    } catch (error) {
      console.error('Error adding family link:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le membre de la famille",
        variant: "destructive",
      });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const updateLink = async (id: string, link: Partial<FamilyLink>) => {
    try {
      setSaving(true);
      const updatedLink = await familyService.updateFamilyLink(id, link);
      setData(prev => {
        const updated = prev.map(item => item.id === id ? updatedLink : item);
        syncNombreEnfantsCharges(updated);
        return updated;
      });
      toast({
        title: "Succès",
        description: "Membre de la famille modifié avec succès",
      });
      return updatedLink;
    } catch (error) {
      console.error('Error updating family link:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le membre de la famille",
        variant: "destructive",
      });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const deleteLink = async (id: string) => {
    try {
      setSaving(true);
      await familyService.deleteFamilyLink(id);
      setData(prev => {
        const updated = prev.filter(item => item.id !== id);
        syncNombreEnfantsCharges(updated);
        return updated;
      });
      toast({
        title: "Succès",
        description: "Membre de la famille supprimé avec succès",
      });
    } catch (error) {
      console.error('Error deleting family link:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le membre de la famille",
        variant: "destructive",
      });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const deleteLinks = async (ids: string[]) => {
    try {
      setSaving(true);
      await familyService.deleteFamilyLinks(ids);
      setData(prev => {
        const updated = prev.filter(item => !ids.includes(item.id!));
        syncNombreEnfantsCharges(updated);
        return updated;
      });
      toast({
        title: "Succès",
        description: `${ids.length} membre(s) de la famille supprimé(s) avec succès`,
      });
    } catch (error) {
      console.error('Error deleting family links:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer les membres de la famille",
        variant: "destructive",
      });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAuthenticated]);

  return { 
    data, 
    loading, 
    saving, 
    addLink, 
    updateLink, 
    deleteLink, 
    deleteLinks,
    refetch: fetchData 
  };
};