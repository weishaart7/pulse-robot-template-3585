import { useState } from 'react';
import { useQuery, useQueryClient, QueryClient } from '@tanstack/react-query';
import { familyService, FamilyProfile, MaritalStatus, FamilyLink } from '@/services/familyService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { compterEnfantsFiscalementACharge } from '@/lib/fiscal';
import { buildStatutCoupleWrite } from '@/lib/family/maritalStatus';
import { buildDonationDernierVivantWrite, DonationDernierVivantFields } from '@/lib/family/donationDernierVivant';

// Cache partagé (React Query) : tous les composants qui appellent ces hooks
// lisent la même copie, et chaque écriture met le cache à jour pour tous —
// plutôt qu'une copie locale par composant qui se désynchronisait (ex. statut
// du couple changé dans FamilleSection mais pas vu par l'arbre familial).
// L'id utilisateur fait partie de la clé : pas de fuite de cache entre comptes.
export const familyQueryKeys = {
  profile: (userId?: string) => ['family', 'profile', userId] as const,
  marital: (userId?: string) => ['family', 'marital', userId] as const,
  links: (userId?: string) => ['family', 'links', userId] as const,
};

const FAMILY_QUERY_OPTIONS = {
  staleTime: 30_000,
  // Un rechargement au retour sur l'onglet réinitialiserait les formulaires en
  // cours d'édition (form.reset sur changement de data).
  refetchOnWindowFocus: false,
};

// Le toast d'erreur est émis dans la queryFn : une seule fois par échec de
// chargement, et non une fois par composant abonné.
const withLoadErrorToast = async <T,>(load: () => Promise<T>, description: string): Promise<T> => {
  try {
    return await load();
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error(description, error);
    }
    toast({ title: "Erreur", description, variant: "destructive" });
    throw error;
  }
};

const syncNombreEnfantsCharges = async (links: FamilyLink[], queryClient: QueryClient, userId?: string) => {
  try {
    const saved = await familyService.upsertMaritalStatus({
      nombre_enfants_charges: compterEnfantsFiscalementACharge(links),
    });
    queryClient.setQueryData(familyQueryKeys.marital(userId), saved);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error syncing nombre_enfants_charges:', error);
    }
  }
};

export const useFamilyProfile = () => {
  const [saving, setSaving] = useState(false);
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const key = familyQueryKeys.profile(user?.id);

  const query = useQuery({
    queryKey: key,
    queryFn: () => withLoadErrorToast(
      () => familyService.getFamilyProfile(),
      "Impossible de charger les données du profil familial"
    ),
    enabled: isAuthenticated && !!user,
    ...FAMILY_QUERY_OPTIONS,
  });

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
      queryClient.setQueryData(key, savedProfile);
      toast({
        title: "Succès",
        description: "Fiche client enregistrée avec succès",
      });
      return savedProfile;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error saving family profile:', error);
      }
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

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    saving,
    saveData,
    refetch: async () => { await query.refetch(); },
  };
};

export const useMaritalStatus = () => {
  const [saving, setSaving] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const key = familyQueryKeys.marital(user?.id);

  const query = useQuery({
    queryKey: key,
    queryFn: () => withLoadErrorToast(
      () => familyService.getMaritalStatus(),
      "Impossible de charger les données de situation matrimoniale"
    ),
    enabled: isAuthenticated && !!user,
    ...FAMILY_QUERY_OPTIONS,
  });

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
      queryClient.setQueryData(key, savedStatus);
      toast({
        title: "Succès",
        description: "Situation matrimoniale enregistrée avec succès",
      });
      return savedStatus;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error saving marital status:', error);
      }
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

  // Point d'écriture unique de statut_couple, appelé par FamilleSection.tsx
  // (menu Statut) et PartnerForm.tsx (payload conjoint) — plutôt que chacun
  // n'upsert sa propre construction partielle du champ.
  const setStatutCouple = (statutCouple: string | null, extra?: Partial<MaritalStatus>) =>
    saveData(buildStatutCoupleWrite(statutCouple, extra));

  // Point d'écriture unique des 4 colonnes de donation au dernier vivant,
  // appelé par RelationInfoForm.tsx (onglet Donation) — plutôt qu'un upsert
  // partiel dupliqué. Relit l'état frais en base juste avant d'écrire
  // (updates: null) pour ne jamais écraser silencieusement une modification
  // faite entre-temps ailleurs.
  const setDonationDernierVivant = async (
    updates: DonationDernierVivantFields | null,
    extra?: Partial<MaritalStatus>
  ) => {
    const fresh = await familyService.getMaritalStatus();
    return saveData(buildDonationDernierVivantWrite(updates, fresh, extra));
  };

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    saving,
    saveData,
    setStatutCouple,
    setDonationDernierVivant,
    refetch: async () => { await query.refetch(); },
  };
};

// Alias historique (clé familyMembers), utilisé par ProcessusCalcul.tsx,
// LegsForm.tsx et RevenusForm.tsx.
export const useFamilyData = () => {
  const { data: familyMembers, ...familyLinksData } = useFamilyLinks();
  return { familyMembers, ...familyLinksData };
};

const EMPTY_LINKS: FamilyLink[] = [];

export const useFamilyLinks = () => {
  const [saving, setSaving] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const key = familyQueryKeys.links(user?.id);

  const query = useQuery({
    queryKey: key,
    queryFn: () => withLoadErrorToast(
      () => familyService.getFamilyLinks(),
      "Impossible de charger les liens familiaux"
    ),
    enabled: isAuthenticated && !!user,
    ...FAMILY_QUERY_OPTIONS,
  });
  const data = query.data ?? EMPTY_LINKS;

  // Applique la nouvelle liste au cache partagé puis resynchronise
  // marital_status.nombre_enfants_charges — effet de bord hors de toute mise à
  // jour d'état React, pour ne pas être rejoué deux fois en StrictMode.
  const commitLinks = async (update: (prev: FamilyLink[]) => FamilyLink[]) => {
    const updated = update(queryClient.getQueryData<FamilyLink[]>(key) ?? []);
    queryClient.setQueryData(key, updated);
    await syncNombreEnfantsCharges(updated, queryClient, user?.id);
  };

  const addLink = async (link: Omit<FamilyLink, 'id' | 'user_id'>) => {
    try {
      setSaving(true);
      const newLink = await familyService.createFamilyLink(link);
      await commitLinks(prev => [...prev, newLink]);
      toast({
        title: "Succès",
        description: "Membre de la famille ajouté avec succès",
      });
      return newLink;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error adding family link:', error);
      }
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
      await commitLinks(prev => prev.map(item => item.id === id ? updatedLink : item));
      toast({
        title: "Succès",
        description: "Membre de la famille modifié avec succès",
      });
      return updatedLink;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error updating family link:', error);
      }
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

  // Supprime un membre après avoir nullifié enfant_de/parent_de des membres
  // qui en dépendent (Petit-enfant → Enfant, Arrière petit-enfant →
  // Petit-enfant, Grand-parent → Parent, Neveu/Nièce → Frère/Sœur, Petit
  // neveu/nièce → Neveu/Nièce, Cousin/Cousine → Oncle/Tante — cf.
  // useFamilyLinkLogic.ts::getParentOptions). Sans ce nettoyage, ces membres
  // gardent une référence fantôme vers un id supprimé, invisible dans le
  // FamilyGraph de transmissionHelpers.ts : la souche disparaît silencieusement
  // du calcul de dévolution légale plutôt que d'échouer bruyamment.
  // Les deux opérations sont faites dans une seule transaction côté Postgres
  // (familyService.deleteFamilyLinkCascade) : un échec n'en applique aucune.
  const deleteLinkWithCascade = async (id: string) => {
    try {
      setSaving(true);
      const dependents = data.filter(item => item.enfant_de === id);
      await familyService.deleteFamilyLinkCascade(id);
      await commitLinks(prev => prev
        .filter(item => item.id !== id)
        .map(item => (item.enfant_de === id ? { ...item, enfant_de: null, parent_de: null } : item)));
      toast({
        title: "Succès",
        description: dependents.length > 0
          ? `Membre supprimé avec succès. Rattachement de ${dependents.length} membre(s) réinitialisé.`
          : "Membre de la famille supprimé avec succès",
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error deleting family link with cascade:', error);
      }
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

  return {
    data,
    loading: query.isLoading,
    saving,
    addLink,
    updateLink,
    deleteLinkWithCascade,
    refetch: async () => { await query.refetch(); },
  };
};
