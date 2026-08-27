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
  // Récupère tous les démembrements de l'utilisateur courant en une seule
  // requête (utilisé par les vues listant plusieurs actifs à la fois, pour
  // éviter une requête par actif via getByAsset).
  async getAllForUser(): Promise<AssetDemembrement[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('asset_demembrements')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []) as AssetDemembrement[];
  },

  async getByAsset(assetId: string): Promise<AssetDemembrement[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('asset_demembrements')
      .select('*')
      .eq('asset_id', assetId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []) as AssetDemembrement[];
  },

  async getByFamilyLink(familyLinkId: string): Promise<AssetDemembrementWithAsset[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('asset_demembrements')
      .select('*, assets(*)')
      .eq('family_link_id', familyLinkId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []) as AssetDemembrementWithAsset[];
  },

  async replaceForAsset(assetId: string, demembrements: Omit<AssetDemembrement, 'id' | 'user_id' | 'created_at' | 'updated_at'>[]) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // On récupère d'abord les lignes existantes pour ne les supprimer qu'une
    // fois les nouvelles lignes insérées avec succès : si l'insert échoue,
    // le démembrement existant reste intact au lieu d'être perdu.
    const { data: existing, error: fetchError } = await supabase
      .from('asset_demembrements')
      .select('id')
      .eq('asset_id', assetId)
      .eq('user_id', user.id);
    if (fetchError) throw fetchError;
    const existingIds = (existing || []).map((row) => row.id);

    if (demembrements.length === 0) {
      if (existingIds.length === 0) return [];
      const { error: delError } = await supabase
        .from('asset_demembrements')
        .delete()
        .in('id', existingIds);
      if (delError) throw delError;
      return [];
    }

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

    if (existingIds.length > 0) {
      const { error: delError } = await supabase
        .from('asset_demembrements')
        .delete()
        .in('id', existingIds);
      if (delError) {
        throw new Error(
          "La nouvelle contrepartie de démembrement a été enregistrée mais l'ancienne n'a pas pu être supprimée. Merci de vérifier cet actif."
        );
      }
    }

    return (data || []) as AssetDemembrement[];
  },
};
