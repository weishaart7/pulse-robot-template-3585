import { supabase } from '@/integrations/supabase/client';

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

export const assetIndivisaireService = {
  async getByAsset(assetId: string): Promise<AssetIndivisaire[]> {
    const { data, error } = await supabase
      .from('asset_indivisaires')
      .select('*')
      .eq('asset_id', assetId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []) as AssetIndivisaire[];
  },

  async replaceForAsset(assetId: string, indivisaires: Omit<AssetIndivisaire, 'id' | 'user_id' | 'created_at' | 'updated_at'>[]) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Delete existing
    const { error: delError } = await supabase
      .from('asset_indivisaires')
      .delete()
      .eq('asset_id', assetId);
    if (delError) throw delError;

    if (indivisaires.length === 0) return [];

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
    return (data || []) as AssetIndivisaire[];
  },
};
