import { supabase } from '@/integrations/supabase/client';
import { Recompense } from '@/types/recompense';
import { CreanceEntreEpoux } from '@/types/creanceEntreEpoux';

export const recompensesCreancesService = {
  async getRecompenses(): Promise<Recompense[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('recompenses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      if (import.meta.env.DEV) console.error('Error fetching recompenses:', error);
      throw error;
    }

    return (data || []) as Recompense[];
  },

  async createRecompense(recompense: Omit<Recompense, 'id' | 'user_id'>): Promise<Recompense> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const { data, error } = await supabase
      .from('recompenses')
      .insert({ ...recompense, user_id: user.id })
      .select()
      .single();

    if (error) {
      if (import.meta.env.DEV) console.error('Error creating recompense:', error);
      throw error;
    }

    return data as Recompense;
  },

  async deleteRecompense(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const { error } = await supabase
      .from('recompenses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      if (import.meta.env.DEV) console.error('Error deleting recompense:', error);
      throw error;
    }
  },

  async getCreancesEntreEpoux(): Promise<CreanceEntreEpoux[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('creances_entre_epoux')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      if (import.meta.env.DEV) console.error('Error fetching creances entre epoux:', error);
      throw error;
    }

    return (data || []) as CreanceEntreEpoux[];
  },

  async createCreanceEntreEpoux(creance: Omit<CreanceEntreEpoux, 'id' | 'user_id'>): Promise<CreanceEntreEpoux> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const { data, error } = await supabase
      .from('creances_entre_epoux')
      .insert({ ...creance, user_id: user.id })
      .select()
      .single();

    if (error) {
      if (import.meta.env.DEV) console.error('Error creating creance entre epoux:', error);
      throw error;
    }

    return data as CreanceEntreEpoux;
  },

  async deleteCreanceEntreEpoux(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const { error } = await supabase
      .from('creances_entre_epoux')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      if (import.meta.env.DEV) console.error('Error deleting creance entre epoux:', error);
      throw error;
    }
  },
};
