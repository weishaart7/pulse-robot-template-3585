import { supabase } from '@/integrations/supabase/client';
import type {
  IFIImmeubleBati,
  IFIImmeableNonBati,
  IFIBienDetenuIndirectement,
  IFIBienProfessionnelExonere,
  IFIPassifDeduction,
  IFIHorsFrance,
  IFIHypothese,
} from '@/types/ifi';

// Services pour Immeubles Bâtis
export const ifiImmeubleBatiService = {
  async getAll() {
    const { data, error } = await supabase
      .from('ifi_immeubles_batis')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async create(bien: Omit<IFIImmeubleBati, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');

    const { data, error } = await supabase
      .from('ifi_immeubles_batis')
      .insert({ ...bien, user_id: user.id })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, bien: Partial<IFIImmeubleBati>) {
    const { data, error } = await supabase
      .from('ifi_immeubles_batis')
      .update(bien)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('ifi_immeubles_batis')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// Services pour Immeubles Non Bâtis
export const ifiImmeableNonBatiService = {
  async getAll() {
    const { data, error } = await supabase
      .from('ifi_immeubles_non_batis')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async create(bien: Omit<IFIImmeableNonBati, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');

    const { data, error } = await supabase
      .from('ifi_immeubles_non_batis')
      .insert({ ...bien, user_id: user.id })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, bien: Partial<IFIImmeableNonBati>) {
    const { data, error } = await supabase
      .from('ifi_immeubles_non_batis')
      .update(bien)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('ifi_immeubles_non_batis')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// Services pour Biens Détenus Indirectement
export const ifiBienDetenuIndirectementService = {
  async getAll() {
    const { data, error } = await supabase
      .from('ifi_biens_detenus_indirectement')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async create(bien: Omit<IFIBienDetenuIndirectement, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');

    const { data, error } = await supabase
      .from('ifi_biens_detenus_indirectement')
      .insert({ ...bien, user_id: user.id })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, bien: Partial<IFIBienDetenuIndirectement>) {
    const { data, error } = await supabase
      .from('ifi_biens_detenus_indirectement')
      .update(bien)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('ifi_biens_detenus_indirectement')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// Services pour Biens Professionnels Exonérés
export const ifiBienProfessionnelExonereService = {
  async getAll() {
    const { data, error } = await supabase
      .from('ifi_biens_professionnels_exoneres')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async create(bien: Omit<IFIBienProfessionnelExonere, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');

    const { data, error } = await supabase
      .from('ifi_biens_professionnels_exoneres')
      .insert({ ...bien, user_id: user.id })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, bien: Partial<IFIBienProfessionnelExonere>) {
    const { data, error } = await supabase
      .from('ifi_biens_professionnels_exoneres')
      .update(bien)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('ifi_biens_professionnels_exoneres')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};