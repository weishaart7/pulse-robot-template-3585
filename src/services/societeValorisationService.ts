import { supabase } from "@/integrations/supabase/client";

export interface SocieteValorisation {
  id: string;
  user_id: string;
  societe_id: string;
  date_valorisation: string;
  valeur: number;
  methode_valorisation?: string;
  commentaire?: string;
  created_at?: string;
  updated_at?: string;
}

export const societeValorisationService = {
  async getBySociete(societeId: string): Promise<SocieteValorisation[]> {
    const { data, error } = await supabase
      .from('societe_valorisations')
      .select('*')
      .eq('societe_id', societeId)
      .order('date_valorisation', { ascending: true });

    if (error) throw error;
    return (data || []) as SocieteValorisation[];
  },

  async create(valorisation: Omit<SocieteValorisation, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<SocieteValorisation> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Non authentifié');

    const { data, error } = await supabase
      .from('societe_valorisations')
      .insert({
        ...valorisation,
        user_id: userData.user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data as SocieteValorisation;
  },

  async update(id: string, valorisation: Partial<Omit<SocieteValorisation, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<SocieteValorisation> {
    const { data, error } = await supabase
      .from('societe_valorisations')
      .update(valorisation)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as SocieteValorisation;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('societe_valorisations')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
