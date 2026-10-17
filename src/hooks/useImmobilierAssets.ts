import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Asset } from '@/services/assetService';
import { passifService, type Emprunt } from '@/services/passifService';
import { ASSET_CATEGORIES } from '@/constants/assetTypes';

const IMMOBILIER_NATURES = ASSET_CATEGORIES['actifs immobiliers'] as readonly string[];

export const useImmobilierAssets = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  // Emprunts Patrimoine reliés aux biens : source qui fait foi pour leurs crédits (lib/immobilier/credit.ts).
  const [emprunts, setEmprunts] = useState<Emprunt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchImmobilierAssets = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', user.id)
        .eq('transfert_immobilier', true)
        .in('nature', IMMOBILIER_NATURES as unknown as string[])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Cast sûr : les colonnes resserrées en union dans Asset sont garanties par
      // une contrainte CHECK en base (cf. assetService.ts).
      const biens = (data || []) as Asset[];
      const ids = biens.map((b) => b.id).filter((id): id is string => !!id);
      setEmprunts(await passifService.getEmpruntsByAssetIds(ids));
      setAssets(biens);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error fetching immobilier assets:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les biens immobiliers",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchImmobilierAssets();
  }, []);

  return {
    assets,
    emprunts,
    isLoading,
    refetch: fetchImmobilierAssets
  };
};
