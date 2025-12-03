import { supabase } from '@/integrations/supabase/client';

export interface Revenu {
  id: string;
  user_id: string;
  nature: string;
  libelle: string;
  beneficiaire?: string;
  montant?: number;
  revenu_disponible: boolean;
  commentaire?: string;
  created_at: string;
  updated_at: string;
  // Extended fields for immobilier
  source?: 'budget' | 'immobilier';
  asset_id?: string;
  asset_name?: string;
}

export interface Charge {
  id: string;
  user_id: string;
  nature: string;
  libelle: string;
  debiteur?: string;
  montant?: number;
  commentaire?: string;
  created_at: string;
  updated_at: string;
  // Extended fields for immobilier
  source?: 'budget' | 'immobilier';
  asset_id?: string;
  asset_name?: string;
}

// Helper to convert periodicity to annual amount
const convertToAnnual = (montant: number, periodicite: string): number => {
  const p = periodicite.toLowerCase();
  if (p === 'mensuel' || p === 'mensuelle') {
    return montant * 12;
  }
  if (p === 'trimestriel' || p === 'trimestrielle') {
    return montant * 4;
  }
  if (p === 'semestriel' || p === 'semestrielle') {
    return montant * 2;
  }
  return montant; // annuel/annuelle or default
};

export const budgetService = {
  // Revenus
  async getRevenus(): Promise<Revenu[]> {
    const { data, error } = await supabase
      .from('revenus')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(r => ({ ...r, source: 'budget' as const }));
  },

  async getAssetRevenusForBudget(): Promise<Revenu[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Fetch asset_revenus with impact_budget = true
    const { data: revenusData, error: revenusError } = await supabase
      .from('asset_revenus')
      .select('id, asset_id, nature, montant, periodicite, commentaire, created_at, updated_at')
      .eq('impact_budget', true);

    if (revenusError) throw revenusError;
    if (!revenusData || revenusData.length === 0) return [];

    // Get unique asset_ids
    const assetIds = [...new Set(revenusData.map(r => r.asset_id))];

    // Fetch user's assets
    const { data: assetsData, error: assetsError } = await supabase
      .from('assets')
      .select('id, denomination, user_id')
      .eq('user_id', user.id)
      .in('id', assetIds);

    if (assetsError) throw assetsError;

    // Create a map of assets
    const assetsMap = new Map((assetsData || []).map(a => [a.id, a]));

    // Transform asset_revenus to Revenu format, filtering by user's assets
    return revenusData
      .filter(item => assetsMap.has(item.asset_id))
      .map(item => {
        const asset = assetsMap.get(item.asset_id);
        return {
          id: item.id,
          user_id: user.id,
          nature: item.nature || 'Revenus locatifs',
          libelle: `${item.nature || 'Revenu'} - ${asset?.denomination || 'Bien immobilier'}`,
          beneficiaire: 'Immobilier',
          montant: convertToAnnual(item.montant || 0, item.periodicite),
          revenu_disponible: true,
          commentaire: item.commentaire,
          created_at: item.created_at,
          updated_at: item.updated_at,
          source: 'immobilier' as const,
          asset_id: item.asset_id,
          asset_name: asset?.denomination || 'Bien immobilier'
        };
      });
  },

  async createRevenu(revenu: Omit<Revenu, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Revenu> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('revenus')
      .insert([{ ...revenu, user_id: userData.user.id }])
      .select()
      .single();

    if (error) throw error;
    return { ...data, source: 'budget' as const };
  },

  async updateRevenu(id: string, revenu: Partial<Revenu>): Promise<Revenu> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Verify user owns this revenue before updating
    const { data: existingRevenu } = await supabase
      .from('revenus')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existingRevenu || existingRevenu.user_id !== user.id) {
      throw new Error('Unauthorized: Revenue not found or access denied');
    }

    const { data, error } = await supabase
      .from('revenus')
      .update(revenu)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { ...data, source: 'budget' as const };
  },

  async deleteRevenu(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Verify user owns this revenue before deleting
    const { data: existingRevenu } = await supabase
      .from('revenus')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existingRevenu || existingRevenu.user_id !== user.id) {
      throw new Error('Unauthorized: Revenue not found or access denied');
    }

    const { error } = await supabase
      .from('revenus')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Charges
  async getCharges(): Promise<Charge[]> {
    const { data, error } = await supabase
      .from('charges')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(c => ({ ...c, source: 'budget' as const }));
  },

  async getAssetChargesForBudget(): Promise<Charge[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('asset_charges')
      .select(`
        id,
        asset_id,
        type_charge,
        denomination,
        debiteur,
        montant,
        periodicite,
        created_at,
        updated_at,
        assets!inner (
          id,
          denomination,
          user_id
        )
      `)
      .eq('impact_budget', true);

    if (error) throw error;

    // Transform asset_charges to Charge format
    return (data || [])
      .filter((item: any) => item.assets?.user_id === user.id)
      .map((item: any) => ({
        id: item.id,
        user_id: user.id,
        nature: item.type_charge || 'Charges locatives',
        libelle: `${item.denomination || item.type_charge} - ${item.assets?.denomination || 'Bien immobilier'}`,
        debiteur: item.debiteur || 'Immobilier',
        montant: convertToAnnual(item.montant || 0, item.periodicite),
        commentaire: undefined,
        created_at: item.created_at,
        updated_at: item.updated_at,
        source: 'immobilier' as const,
        asset_id: item.asset_id,
        asset_name: item.assets?.denomination || 'Bien immobilier'
      }));
  },

  async createCharge(charge: Omit<Charge, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Charge> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('charges')
      .insert([{ ...charge, user_id: userData.user.id }])
      .select()
      .single();

    if (error) throw error;
    return { ...data, source: 'budget' as const };
  },

  async updateCharge(id: string, charge: Partial<Charge>): Promise<Charge> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Verify user owns this charge before updating
    const { data: existingCharge } = await supabase
      .from('charges')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existingCharge || existingCharge.user_id !== user.id) {
      throw new Error('Unauthorized: Charge not found or access denied');
    }

    const { data, error } = await supabase
      .from('charges')
      .update(charge)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { ...data, source: 'budget' as const };
  },

  async deleteCharge(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Verify user owns this charge before deleting
    const { data: existingCharge } = await supabase
      .from('charges')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existingCharge || existingCharge.user_id !== user.id) {
      throw new Error('Unauthorized: Charge not found or access denied');
    }

    const { error } = await supabase
      .from('charges')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
