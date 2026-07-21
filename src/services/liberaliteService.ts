import { supabase } from '@/integrations/supabase/client';

export interface LiberaliteBien {
  asset_id: string;
  // Valeur au jour de l'acte, uniquement pour une donation (figée en base).
  // Absente pour un legs : sa valeur se relit en live depuis assets au
  // moment du calcul de transmission (cf. buildTransmissionLiberalites).
  valeur?: number;
}

export type LiberaliteTypeImputation = 'avance_part' | 'hors_part' | 'partage';

export interface Liberalite {
  id?: string;
  user_id?: string;
  type: 'donation' | 'legs';
  denomination: string;
  beneficiaire_id?: string | null;
  beneficiaire_nom: string;
  groupe_id?: string | null;
  montant?: number;
  // Part (0-100) de ce bénéficiaire/légataire dans le groupe. Sert à
  // proratiser la valeur d'un legs (jamais stockée directement, relue en
  // live depuis les biens — cf. buildTransmissionLiberalites) et à
  // reconstruire la répartition à l'édition d'un groupe multi-bénéficiaires.
  pourcentage?: number;
  date_acte?: string;
  // Note libre côté conseiller — purement informative, jamais lue par le
  // moteur de calcul (buildTransmissionLiberalites/computeTransmission).
  description?: string;
  nature?: string;
  type_imputation?: LiberaliteTypeImputation;
  realise_par?: string;
  clauses?: string[];
  biens?: LiberaliteBien[];
  demembrement?: string;
  prise_en_charge_droits?: boolean;
  testament_realise?: string;
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
    return (data || []) as unknown as Liberalite[];
  },

  async createLiberalite(liberalite: Omit<Liberalite, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Liberalite> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('liberalites')
      .insert({ ...liberalite, user_id: user.id } as unknown as never)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as Liberalite;
  },

  async updateLiberalite(id: string, liberalite: Partial<Liberalite>): Promise<Liberalite> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Verify user owns this liberalite before updating
    const { data: existingLiberalite } = await supabase
      .from('liberalites')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existingLiberalite || existingLiberalite.user_id !== user.id) {
      throw new Error('Unauthorized: Liberalite not found or access denied');
    }

    const { data, error } = await supabase
      .from('liberalites')
      .update(liberalite as unknown as never)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as Liberalite;
  },

  async deleteLiberalite(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Verify user owns this liberalite before deleting
    const { data: existingLiberalite } = await supabase
      .from('liberalites')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existingLiberalite || existingLiberalite.user_id !== user.id) {
      throw new Error('Unauthorized: Liberalite not found or access denied');
    }

    const { error } = await supabase
      .from('liberalites')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};