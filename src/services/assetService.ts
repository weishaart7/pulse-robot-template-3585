import { supabase } from '@/integrations/supabase/client';

export interface Asset {
  id?: string;
  user_id?: string;
  nature: string;
  denomination?: string;
  etablissement?: string;
  mode_detention?: string;
  beneficiaire_autre_partie?: string;
  valeur_estimee?: number;
  date_estimation?: string;
  revalorisation_annuelle?: number;
  detenteur?: string;
  pourcentage_utilisateur?: number;
  pourcentage_conjoint?: number;
  valeur_acquisition?: number;
  frais_acquisition?: number;
  date_acquisition?: string;
  origine_actif?: string[];
  situation_particuliere?: string[];
  attachement_emotionnel?: number;
  transfert_immobilier?: boolean;
  typologie_bien?: string;
  surface_m2?: number;
  statut_bien?: string;
  montant_immeuble?: number;
  frais_agence?: number;
  frais_notaire?: number;
  frais_bancaires?: number;
  frais_hypotheque?: number;
  travaux_renovation?: number;
  travaux_construction?: number;
  meubles?: number;
  financement_actif?: boolean;
  financement_duree_mois?: number;
  financement_apport?: number;
  financement_taux_credit?: number;
  financement_taux_assurance?: number;
  type_location?: string;
  regime_location?: string;
  zone_bien?: string;
  pourcentage_terrain_force?: number;
  type_location_lmnp?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AssetCharge {
  id?: string;
  asset_id: string;
  type_charge: 'Charges courantes' | 'Charges fiscales';
  denomination: string;
  debiteur: 'Époux 1' | 'Époux 2' | 'Couple';
  montant: number;
  unite: '€' | '%';
  periodicite: 'annuelle' | 'trimestrielle' | 'mensuelle';
  date_debut: string;
  duree_type: 'Indéterminée' | 'Jusqu\'à date' | 'Pendant années';
  duree_fin_date?: string;
  duree_annees?: number;
  impact_budget?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AssetRevenu {
  id?: string;
  asset_id: string;
  nature: string;
  montant: number;
  periodicite: 'Mensuelle' | 'Trimestrielle' | 'Annuelle';
  date_debut: string;
  date_fin?: string;
  commentaire?: string;
  impact_budget?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const assetService = {
  async getAssets() {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getAsset(id: string) {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async createAsset(asset: Omit<Asset, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('assets')
      .insert({ ...asset, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateAsset(id: string, asset: Partial<Asset>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Verify user owns this asset before updating
    const { data: existingAsset } = await supabase
      .from('assets')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existingAsset || existingAsset.user_id !== user.id) {
      throw new Error('Unauthorized: Asset not found or access denied');
    }

    const { data, error } = await supabase
      .from('assets')
      .update(asset)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteAsset(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Verify user owns this asset before deleting
    const { data: existingAsset } = await supabase
      .from('assets')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existingAsset || existingAsset.user_id !== user.id) {
      throw new Error('Unauthorized: Asset not found or access denied');
    }

    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getAssetCharges(assetId: string): Promise<AssetCharge[]> {
    const { data, error } = await supabase
      .from('asset_charges')
      .select('*')
      .eq('asset_id', assetId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as AssetCharge[];
  },

  async createAssetCharge(charge: Omit<AssetCharge, 'id' | 'created_at' | 'updated_at'>): Promise<AssetCharge> {
    const { data, error } = await supabase
      .from('asset_charges')
      .insert(charge)
      .select()
      .single();

    if (error) throw error;
    return data as AssetCharge;
  },

  async updateAssetCharge(id: string, charge: Partial<AssetCharge>): Promise<AssetCharge> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Verify user owns the asset associated with this charge
    const { data: chargeWithAsset } = await supabase
      .from('asset_charges')
      .select(`
        id,
        asset_id,
        assets!inner(user_id)
      `)
      .eq('id', id)
      .single();

    if (!chargeWithAsset || chargeWithAsset.assets.user_id !== user.id) {
      throw new Error('Unauthorized: Asset charge not found or access denied');
    }

    const { data, error } = await supabase
      .from('asset_charges')
      .update(charge)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as AssetCharge;
  },

  async deleteAssetCharge(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Verify user owns the asset associated with this charge
    const { data: chargeWithAsset } = await supabase
      .from('asset_charges')
      .select(`
        id,
        asset_id,
        assets!inner(user_id)
      `)
      .eq('id', id)
      .single();

    if (!chargeWithAsset || chargeWithAsset.assets.user_id !== user.id) {
      throw new Error('Unauthorized: Asset charge not found or access denied');
    }

    const { error } = await supabase
      .from('asset_charges')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getAssetRevenus(assetId: string): Promise<AssetRevenu[]> {
    const { data, error } = await supabase
      .from('asset_revenus')
      .select('*')
      .eq('asset_id', assetId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as AssetRevenu[];
  },

  async createAssetRevenu(revenu: Omit<AssetRevenu, 'id' | 'created_at' | 'updated_at'>): Promise<AssetRevenu> {
    const { data, error } = await supabase
      .from('asset_revenus')
      .insert(revenu)
      .select()
      .single();

    if (error) throw error;
    return data as AssetRevenu;
  },

  async updateAssetRevenu(id: string, revenu: Partial<AssetRevenu>): Promise<AssetRevenu> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // First get the revenu to find the asset_id
    const { data: existingRevenu, error: fetchError } = await supabase
      .from('asset_revenus')
      .select('asset_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingRevenu) {
      throw new Error('Asset revenu not found');
    }

    // Verify user owns the asset
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('user_id')
      .eq('id', existingRevenu.asset_id)
      .single();

    if (assetError || !asset || asset.user_id !== user.id) {
      throw new Error('Unauthorized: Asset not found or access denied');
    }

    const { data, error } = await supabase
      .from('asset_revenus')
      .update(revenu)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as AssetRevenu;
  },

  async deleteAssetRevenu(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // First get the revenu to find the asset_id
    const { data: existingRevenu, error: fetchError } = await supabase
      .from('asset_revenus')
      .select('asset_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingRevenu) {
      throw new Error('Asset revenu not found');
    }

    // Verify user owns the asset
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('user_id')
      .eq('id', existingRevenu.asset_id)
      .single();

    if (assetError || !asset || asset.user_id !== user.id) {
      throw new Error('Unauthorized: Asset not found or access denied');
    }

    const { error } = await supabase
      .from('asset_revenus')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};