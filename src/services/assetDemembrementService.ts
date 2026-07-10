import { supabase } from '@/integrations/supabase/client';
import { Asset } from '@/services/assetService';

export interface AssetDemembrement {
  id?: string;
  user_id?: string;
  asset_id: string;
  role: 'Usufruitier' | 'Nu-propriétaire';
  type_partie: 'famille' | 'tiers';
  family_link_id?: string | null;
  nom_libre?: string | null;
  date_naissance_tiers?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AssetDemembrementWithAsset extends AssetDemembrement {
  assets: Asset | null;
}

export const assetDemembrementService = {
  async getByAsset(assetId: string): Promise<AssetDemembrement[]> {
    const { data, error } = await supabase
      .from('asset_demembrements')
      .select('*')
      .eq('asset_id', assetId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []) as AssetDemembrement[];
  },

  async getByFamilyLink(familyLinkId: string): Promise<AssetDemembrementWithAsset[]> {
    const { data, error } = await supabase
      .from('asset_demembrements')
      .select('*, assets(*)')
      .eq('family_link_id', familyLinkId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []) as AssetDemembrementWithAsset[];
  },

  async replaceForAsset(assetId: string, demembrements: Omit<AssetDemembrement, 'id' | 'user_id' | 'created_at' | 'updated_at'>[]) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Delete existing
    const { error: delError } = await supabase
      .from('asset_demembrements')
      .delete()
      .eq('asset_id', assetId);
    if (delError) throw delError;

    if (demembrements.length === 0) return [];

    const payload = demembrements.map((d) => ({
      ...d,
      asset_id: assetId,
      user_id: user.id,
    }));

    const { data, error } = await supabase
      .from('asset_demembrements')
      .insert(payload)
      .select();
    if (error) throw error;
    return (data || []) as AssetDemembrement[];
  },
};
