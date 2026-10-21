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
  // Biens détenus par une société du foyer : gérés ici (loyers, charges, crédit) mais hors totaux du
  // foyer, regroupés par société dans « Mes biens ».
  const [biensSocietes, setBiensSocietes] = useState<(Asset & { societeDenomination: string })[]>([]);
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
        .is('societe_proprietaire_id', null)
        .in('nature', IMMOBILIER_NATURES as unknown as string[])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Cast sûr : les colonnes resserrées en union dans Asset sont garanties par
      // une contrainte CHECK en base (cf. assetService.ts).
      const biens = (data || []) as Asset[];
      const [{ data: deSocietes }, { data: societes }] = await Promise.all([
        supabase.from('assets').select('*').eq('user_id', user.id)
          .not('societe_proprietaire_id', 'is', null)
          .in('nature', IMMOBILIER_NATURES as unknown as string[]),
        supabase.from('societes').select('id, denomination'),
      ]);
      const noms = new Map((societes || []).map((s) => [s.id, s.denomination]));
      const biensSoc = ((deSocietes || []) as Asset[]).map((b) => ({
        ...b,
        societeDenomination: noms.get(b.societe_proprietaire_id!) || 'Société',
      }));
      const ids = [...biens, ...biensSoc].map((b) => b.id).filter((id): id is string => !!id);
      setEmprunts(await passifService.getEmpruntsByAssetIds(ids));
      setAssets(biens);
      setBiensSocietes(biensSoc);
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
    biensSocietes,
    emprunts,
    isLoading,
    refetch: fetchImmobilierAssets
  };
};
