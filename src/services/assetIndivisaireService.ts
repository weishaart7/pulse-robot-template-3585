import { supabase } from '@/integrations/supabase/client';
import { Asset } from '@/services/assetService';

export interface AssetIndivisaire {
  id?: string;
  user_id?: string;
  asset_id: string;
  type_indivisaire: 'famille' | 'tiers';
  family_link_id?: string | null;
  nom_libre?: string | null;
  pourcentage: number;
  created_at?: string;
  updated_at?: string;
}

export interface AssetIndivisaireWithAsset extends AssetIndivisaire {
  assets: Asset | null;
}

export const assetIndivisaireService = {
  async getByAsset(assetId: string): Promise<AssetIndivisaire[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('asset_indivisaires')
      .select('*')
      .eq('asset_id', assetId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []) as AssetIndivisaire[];
  },

  async getByFamilyLink(familyLinkId: string): Promise<AssetIndivisaireWithAsset[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // La RLS fait déjà foi ; ce .eq('user_id', ...) évite juste de matcher
    // 0 ligne si elle venait à être mal réappliquée, par cohérence avec familyService.ts.
    const { data, error } = await supabase
      .from('asset_indivisaires')
      .select('*, assets(*)')
      .eq('family_link_id', familyLinkId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []) as AssetIndivisaireWithAsset[];
  },

  async replaceForAsset(assetId: string, indivisaires: Omit<AssetIndivisaire, 'id' | 'user_id' | 'created_at' | 'updated_at'>[]) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const total = indivisaires.reduce((sum, i) => sum + (Number(i.pourcentage) || 0), 0);
    if (total > 100.01) {
      throw new Error(`Le total des parts des co-indivisaires (${total.toFixed(1)}%) dépasse 100%.`);
    }

    // On récupère d'abord les lignes existantes pour ne les supprimer qu'une
    // fois les nouvelles lignes insérées avec succès : si l'insert échoue,
    // les co-indivisaires existants restent intacts au lieu d'être perdus.
    const { data: existing, error: fetchError } = await supabase
      .from('asset_indivisaires')
      .select('id')
      .eq('asset_id', assetId)
      .eq('user_id', user.id);
    if (fetchError) throw fetchError;
    const existingIds = (existing || []).map((row) => row.id);

    if (indivisaires.length === 0) {
      if (existingIds.length === 0) return [];
      const { error: delError } = await supabase
        .from('asset_indivisaires')
        .delete()
        .in('id', existingIds);
      if (delError) throw delError;
      return [];
    }

    const payload = indivisaires.map((i) => ({
      ...i,
      asset_id: assetId,
      user_id: user.id,
    }));

    const { data, error } = await supabase
      .from('asset_indivisaires')
      .insert(payload)
      .select();
    if (error) throw error;

    if (existingIds.length > 0) {
      const { error: delError } = await supabase
        .from('asset_indivisaires')
        .delete()
        .in('id', existingIds);
      if (delError) {
        throw new Error(
          "Les nouveaux co-indivisaires ont été enregistrés mais les anciens n'ont pas pu être supprimés. Merci de vérifier la répartition de cet actif."
        );
      }
    }

    return (data || []) as AssetIndivisaire[];
  },
};
