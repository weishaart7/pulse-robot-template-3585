import { supabase } from '@/integrations/supabase/client';

export interface Societe {
  id: string;
  user_id: string;
  denomination: string;
  type_societe: string;
  date_creation?: string;
  valeur_estimee?: number;
  pourcentage_ifi?: number;
  capital_social?: number;
  nombre_titres?: number;
  nombre_salaries?: number;
  jour_cloture?: string;
  mois_cloture?: string;
  siret?: string;
  rue_adresse?: string;
  code_postal?: string;
  commune?: string;
  pays?: string;
  type_activite?: string;
  regime_fiscal?: string;
  valeur_ifi?: number;
  activite?: string;
  holding?: string;
  forme_societe_civile?: string;
  created_at?: string;
  updated_at?: string;
}

export const societeService = {
  async getAll(): Promise<Societe[]> {
    const { data, error } = await supabase
      .from('societes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async create(societe: Omit<Societe, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Societe> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('societes')
      .insert([{ ...societe, user_id: user.id }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, societe: Partial<Omit<Societe, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<Societe> {
    const { data, error } = await supabase
      .from('societes')
      .update(societe)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('societes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};