import { supabase } from '@/integrations/supabase/client';

export interface Liberalite {
  id?: string;
  user_id?: string;
  type: 'donation' | 'legs';
  denomination: string;
  beneficiaire: string;
  montant?: number;
  date_acte?: string;
  notaire?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export const liberaliteService = {
  async getLiberalites(): Promise<Liberalite[]> {
    const { data, error } = await supabase
      .from('liberalites')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Liberalite[];
  },

  async createLiberalite(liberalite: Omit<Liberalite, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Liberalite> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('liberalites')
      .insert({ ...liberalite, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    return data as Liberalite;
  },

  async updateLiberalite(id: string, liberalite: Partial<Liberalite>): Promise<Liberalite> {
    const { data, error } = await supabase
      .from('liberalites')
      .update(liberalite)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Liberalite;
  },

  async deleteLiberalite(id: string) {
    const { error } = await supabase
      .from('liberalites')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};