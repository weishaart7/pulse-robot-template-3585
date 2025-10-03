import { supabase } from '@/integrations/supabase/client';

export interface Emprunt {
  id: string;
  user_id: string;
  nature: string;
  libelle: string;
  capital_restant_du?: number;
  taux_interet?: number;
  mensualite?: number;
  duree_restante?: number;
  detenteur?: string;
  pourcentage_utilisateur?: number;
  pourcentage_conjoint?: number;
  created_at: string;
  updated_at: string;
}

export interface Passif {
  id: string;
  user_id: string;
  nature: string;
  montant_du: number;
  detenteur?: string;
  pourcentage_utilisateur?: number;
  pourcentage_conjoint?: number;
  created_at: string;
  updated_at: string;
}

export const passifService = {
  // Emprunts methods
  async getEmprunts(): Promise<Emprunt[]> {
    const { data, error } = await supabase
      .from('emprunts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async createEmprunt(emprunt: Omit<Emprunt, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Emprunt> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('emprunts')
      .insert({ ...emprunt, user_id: user.id })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateEmprunt(id: string, emprunt: Partial<Emprunt>): Promise<Emprunt> {
    const { data, error } = await supabase
      .from('emprunts')
      .update(emprunt)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteEmprunt(id: string): Promise<void> {
    const { error } = await supabase
      .from('emprunts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Passifs methods
  async getPassifs(): Promise<Passif[]> {
    const { data, error } = await supabase
      .from('passifs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async createPassif(passif: Omit<Passif, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Passif> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('passifs')
      .insert({ ...passif, user_id: user.id })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updatePassif(id: string, passif: Partial<Passif>): Promise<Passif> {
    const { data, error } = await supabase
      .from('passifs')
      .update(passif)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deletePassif(id: string): Promise<void> {
    const { error } = await supabase
      .from('passifs')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};