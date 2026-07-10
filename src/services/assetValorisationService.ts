import { supabase } from '@/integrations/supabase/client';

export interface AssetValorisation {
  id?: string;
  user_id?: string;
  asset_id: string;
  date_valorisation: string;
  valeur: number;
  created_at?: string;
}

export const assetValorisationService = {
  // Récupère l'ensemble des valorisations de l'utilisateur courant, tous
  // actifs confondus, en une seule requête (utilisé pour l'agrégation
  // temporelle du patrimoine total, par opposition à getByAssetId qui ne
  // porte que sur un actif à la fois).
  async getAllForUser(): Promise<AssetValorisation[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('asset_valorisations')
      .select('*')
      .eq('user_id', user.id)
      .order('date_valorisation', { ascending: true });

    if (error) throw error;
    return (data || []) as AssetValorisation[];
  },

  async getByAssetId(assetId: string): Promise<AssetValorisation[]> {
    const { data, error } = await supabase
      .from('asset_valorisations')
      .select('*')
      .eq('asset_id', assetId)
      .order('date_valorisation', { ascending: false });

    if (error) throw error;
    return (data || []) as AssetValorisation[];
  },

  async create(valorisation: Omit<AssetValorisation, 'id' | 'user_id' | 'created_at'>): Promise<AssetValorisation> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('asset_valorisations')
      .insert({ ...valorisation, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    return data as AssetValorisation;
  },

  async update(id: string, valorisation: Partial<Omit<AssetValorisation, 'id' | 'user_id' | 'created_at'>>): Promise<AssetValorisation> {
    const { data, error } = await supabase
      .from('asset_valorisations')
      .update(valorisation)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as AssetValorisation;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('asset_valorisations')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Crée ou écrase (même asset_id + date_valorisation) la ligne d'historique du jour.
  // Utilisé par l'alimentation automatique à la sauvegarde d'un actif.
  async upsertForDate(assetId: string, dateValorisation: string, valeur: number): Promise<AssetValorisation> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('asset_valorisations')
      .upsert(
        { asset_id: assetId, date_valorisation: dateValorisation, valeur, user_id: user.id },
        { onConflict: 'asset_id,date_valorisation' }
      )
      .select()
      .single();

    if (error) throw error;
    return data as AssetValorisation;
  },
};
