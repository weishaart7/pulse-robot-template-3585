import { supabase } from '@/integrations/supabase/client';

export interface Revenu {
  id: string;
  user_id: string;
  nature: string;
  libelle: string;
  beneficiaire?: string;
  revenu_disponible: boolean;
  commentaire?: string;
  created_at: string;
  updated_at: string;
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
}

export const budgetService = {
  // Revenus
  async getRevenus(): Promise<Revenu[]> {
    const { data, error } = await supabase
      .from('revenus')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
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
    return data;
  },

  async updateRevenu(id: string, revenu: Partial<Revenu>): Promise<Revenu> {
    const { data, error } = await supabase
      .from('revenus')
      .update(revenu)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteRevenu(id: string): Promise<void> {
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
    return data || [];
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
    return data;
  },

  async updateCharge(id: string, charge: Partial<Charge>): Promise<Charge> {
    const { data, error } = await supabase
      .from('charges')
      .update(charge)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteCharge(id: string): Promise<void> {
    const { error } = await supabase
      .from('charges')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};