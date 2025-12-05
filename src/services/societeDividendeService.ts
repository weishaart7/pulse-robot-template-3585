import { supabase } from "@/integrations/supabase/client";

export interface SocieteDividende {
  id: string;
  user_id: string;
  societe_id: string;
  exercice_annee: number;
  montant_brut: number;
  montant_net?: number;
  date_distribution?: string;
  beneficiaire?: string;
  created_at?: string;
  updated_at?: string;
}

export const societeDividendeService = {
  async getBySociete(societeId: string): Promise<SocieteDividende[]> {
    const { data, error } = await supabase
      .from('societe_dividendes')
      .select('*')
      .eq('societe_id', societeId)
      .order('exercice_annee', { ascending: false });

    if (error) throw error;
    return (data || []) as SocieteDividende[];
  },

  async create(dividende: Omit<SocieteDividende, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<SocieteDividende> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Non authentifié');

    const { data, error } = await supabase
      .from('societe_dividendes')
      .insert({
        ...dividende,
        user_id: userData.user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data as SocieteDividende;
  },

  async update(id: string, dividende: Partial<Omit<SocieteDividende, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<SocieteDividende> {
    const { data, error } = await supabase
      .from('societe_dividendes')
      .update(dividende)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as SocieteDividende;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('societe_dividendes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
