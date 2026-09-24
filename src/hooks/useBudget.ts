import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { budgetService, Revenu, Charge } from '@/services/budgetService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

// Cache React Query partagé entre les onglets Budget et le Dashboard : les requêtes simultanées sont
// dédupliquées et un écran rouvert affiche immédiatement les données en cache. Elles restent revalidées en
// arrière-plan à chaque montage (staleTime 0), car Patrimoine/Immobilier peuvent modifier les sources
// importées (impact_budget, reporter_budget) sans invalider ce cache.
export const budgetQueryKeys = {
  revenus: (userId?: string) => ['budget', 'revenus', userId] as const,
  charges: (userId?: string) => ['budget', 'charges', userId] as const,
};

const BUDGET_STALE_TIME = 0;

interface ChargesData {
  charges: Charge[];
  // Charges d'actif exprimées en % : aucune assiette n'est définie en amont (Patrimoine/Immobilier se
  // contentent de les afficher), elles sont donc exclues du budget et seulement signalées (docs/budget.md).
  chargesEnPourcentage: Charge[];
}

export const useRevenus = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = budgetQueryKeys.revenus(user?.id);

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const [classicRevenus, assetRevenus] = await Promise.all([
        budgetService.getRevenus(),
        budgetService.getAssetRevenusForBudget()
      ]);
      return [...classicRevenus, ...assetRevenus];
    },
    enabled: !!user,
    staleTime: BUDGET_STALE_TIME,
  });

  useEffect(() => {
    if (query.isError) {
      toast({ title: "Erreur", description: "Impossible de récupérer les revenus", variant: "destructive" });
    }
  }, [query.isError, toast]);

  const setRevenus = (update: (prev: Revenu[]) => Revenu[]) =>
    queryClient.setQueryData<Revenu[]>(key, prev => update(prev || []));

  const createRevenu = async (revenu: Omit<Revenu, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Revenu> => {
    try {
      const newRevenu = await budgetService.createRevenu(revenu);
      setRevenus(prev => [newRevenu, ...prev]);
      toast({ title: "Succès", description: "Revenu ajouté avec succès" });
      return newRevenu;
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de créer le revenu", variant: "destructive" });
      throw error;
    }
  };

  const updateRevenu = async (id: string, revenu: Partial<Revenu>): Promise<Revenu> => {
    try {
      const updatedRevenu = await budgetService.updateRevenu(id, revenu);
      setRevenus(prev => prev.map(item => item.id === id ? updatedRevenu : item));
      toast({ title: "Succès", description: "Revenu modifié avec succès" });
      return updatedRevenu;
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de modifier le revenu", variant: "destructive" });
      throw error;
    }
  };

  const deleteRevenu = async (id: string): Promise<void> => {
    try {
      await budgetService.deleteRevenu(id);
      setRevenus(prev => prev.filter(item => item.id !== id));
      toast({ title: "Succès", description: "Revenu supprimé avec succès" });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer le revenu", variant: "destructive" });
      throw error;
    }
  };

  return {
    revenus: query.data ?? [],
    loading: query.isLoading,
    fetchRevenus: () => query.refetch(),
    createRevenu,
    updateRevenu,
    deleteRevenu
  };
};

export const useCharges = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = budgetQueryKeys.charges(user?.id);

  const query = useQuery({
    queryKey: key,
    queryFn: async (): Promise<ChargesData> => {
      // Charges classiques, charges d'actif et emprunts (reporter_budget = true)
      const [classicCharges, assetCharges, empruntsCharges] = await Promise.all([
        budgetService.getCharges(),
        budgetService.getAssetChargesForBudget(),
        budgetService.getEmpruntsChargesForBudget()
      ]);
      return {
        charges: [...classicCharges, ...assetCharges.filter(c => c.unite !== '%'), ...empruntsCharges],
        chargesEnPourcentage: assetCharges.filter(c => c.unite === '%'),
      };
    },
    enabled: !!user,
    staleTime: BUDGET_STALE_TIME,
  });

  useEffect(() => {
    if (query.isError) {
      toast({ title: "Erreur", description: "Impossible de récupérer les charges", variant: "destructive" });
    }
  }, [query.isError, toast]);

  const setCharges = (update: (prev: Charge[]) => Charge[]) =>
    queryClient.setQueryData<ChargesData>(key, prev => ({
      charges: update(prev?.charges || []),
      chargesEnPourcentage: prev?.chargesEnPourcentage || [],
    }));

  const createCharge = async (charge: Omit<Charge, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Charge> => {
    try {
      const newCharge = await budgetService.createCharge(charge);
      setCharges(prev => [newCharge, ...prev]);
      toast({ title: "Succès", description: "Charge ajoutée avec succès" });
      return newCharge;
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de créer la charge", variant: "destructive" });
      throw error;
    }
  };

  const updateCharge = async (id: string, charge: Partial<Charge>): Promise<Charge> => {
    try {
      const updatedCharge = await budgetService.updateCharge(id, charge);
      setCharges(prev => prev.map(item => item.id === id ? updatedCharge : item));
      toast({ title: "Succès", description: "Charge modifiée avec succès" });
      return updatedCharge;
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de modifier la charge", variant: "destructive" });
      throw error;
    }
  };

  const deleteCharge = async (id: string): Promise<void> => {
    try {
      await budgetService.deleteCharge(id);
      setCharges(prev => prev.filter(item => item.id !== id));
      toast({ title: "Succès", description: "Charge supprimée avec succès" });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer la charge", variant: "destructive" });
      throw error;
    }
  };

  return {
    charges: query.data?.charges ?? [],
    chargesEnPourcentage: query.data?.chargesEnPourcentage ?? [],
    loading: query.isLoading,
    fetchCharges: () => query.refetch(),
    createCharge,
    updateCharge,
    deleteCharge
  };
};
