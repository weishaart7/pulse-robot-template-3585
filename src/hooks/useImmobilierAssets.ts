import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Asset } from '@/services/assetService';
import { ASSET_CATEGORIES } from '@/constants/assetTypes';

const IMMOBILIER_NATURES = ASSET_CATEGORIES['actifs immobiliers'] as readonly string[];

export const useImmobilierAssets = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
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
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAssets(data || []);
    } catch (error) {
      console.error('Error fetching immobilier assets:', error);
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
    isLoading,
    refetch: fetchImmobilierAssets
  };
};
