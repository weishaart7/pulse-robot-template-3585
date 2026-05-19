import { supabase } from '@/integrations/supabase/client';

const requireUser = async () => {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Non authentifié');
  return data.user;
};

// ============ Bilans ============
export interface SocieteBilan {
  id: string;
  user_id: string;
  societe_id: string;
  exercice_annee: number;
  date_cloture?: string | null;
  chiffre_affaires?: number | null;
  resultat_net?: number | null;
  tresorerie?: number | null;
  capitaux_propres?: number | null;
  dettes_financieres?: number | null;
  commentaire?: string | null;
}

export const societeBilanService = {
  async list(societeId: string): Promise<SocieteBilan[]> {
    const { data, error } = await supabase
      .from('societe_bilans')
      .select('*')
      .eq('societe_id', societeId)
      .order('exercice_annee', { ascending: false });
    if (error) throw error;
    return (data || []) as SocieteBilan[];
  },
  async upsert(bilan: Omit<SocieteBilan, 'id' | 'user_id'> & { id?: string }) {
    const user = await requireUser();
    const payload = { ...bilan, user_id: user.id };
    if (bilan.id) {
      const { data, error } = await supabase.from('societe_bilans').update(payload).eq('id', bilan.id).select().single();
      if (error) throw error;
      return data;
    }
    const { data, error } = await supabase.from('societe_bilans').insert(payload).select().single();
    if (error) throw error;
    return data;
  },
  async delete(id: string) {
    const { error } = await supabase.from('societe_bilans').delete().eq('id', id);
    if (error) throw error;
  },
};

// ============ Associés ============
export interface SocieteAssocie {
  id: string;
  user_id: string;
  societe_id: string;
  family_link_id?: string | null;
  nom_libre?: string | null;
  societe_associee_id?: string | null;
  nombre_titres?: number | null;
  pourcentage?: number | null;
  nature_detention: string; // 'Pleine propriété' | 'Nue-propriété' | 'Usufruit'
  detention_directe: boolean;
}

export const societeAssocieService = {
  async list(societeId: string): Promise<SocieteAssocie[]> {
    const { data, error } = await supabase
      .from('societe_associes')
      .select('*')
      .eq('societe_id', societeId)
      .order('pourcentage', { ascending: false });
    if (error) throw error;
    return (data || []) as SocieteAssocie[];
  },
  async upsert(assoc: Omit<SocieteAssocie, 'id' | 'user_id'> & { id?: string }) {
    const user = await requireUser();
    const payload = { ...assoc, user_id: user.id };
    if (assoc.id) {
      const { data, error } = await supabase.from('societe_associes').update(payload).eq('id', assoc.id).select().single();
      if (error) throw error;
      return data;
    }
    const { data, error } = await supabase.from('societe_associes').insert(payload).select().single();
    if (error) throw error;
    return data;
  },
  async delete(id: string) {
    const { error } = await supabase.from('societe_associes').delete().eq('id', id);
    if (error) throw error;
  },
};

// ============ Pacte d'associés ============
export interface SocietePacte {
  id: string;
  user_id: string;
  societe_id: string;
  existe: boolean;
  date_signature?: string | null;
  duree_annees?: number | null;
  clause_preemption?: boolean;
  clause_agrement?: boolean;
  clause_sortie_conjointe?: boolean;
  clause_drag_along?: boolean;
  commentaire?: string | null;
}

export const societePacteService = {
  async get(societeId: string): Promise<SocietePacte | null> {
    const { data, error } = await supabase
      .from('societe_pactes')
      .select('*')
      .eq('societe_id', societeId)
      .maybeSingle();
    if (error) throw error;
    return (data as SocietePacte) || null;
  },
  async upsert(pacte: Omit<SocietePacte, 'id' | 'user_id'> & { id?: string }) {
    const user = await requireUser();
    const payload = { ...pacte, user_id: user.id };
    const { data, error } = await supabase
      .from('societe_pactes')
      .upsert(payload, { onConflict: 'societe_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// ============ Comptes courants d'associés ============
export interface SocieteCCA {
  id: string;
  user_id: string;
  societe_id: string;
  associe_id?: string | null;
  associe_libelle?: string | null;
  solde: number;
  taux?: number | null;
  date_remboursement?: string | null;
  commentaire?: string | null;
}

export const societeCCAService = {
  async list(societeId: string): Promise<SocieteCCA[]> {
    const { data, error } = await supabase
      .from('societe_comptes_courants')
      .select('*')
      .eq('societe_id', societeId);
    if (error) throw error;
    return (data || []) as SocieteCCA[];
  },
  async upsert(cca: Omit<SocieteCCA, 'id' | 'user_id'> & { id?: string }) {
    const user = await requireUser();
    const payload = { ...cca, user_id: user.id };
    if (cca.id) {
      const { data, error } = await supabase.from('societe_comptes_courants').update(payload).eq('id', cca.id).select().single();
      if (error) throw error;
      return data;
    }
    const { data, error } = await supabase.from('societe_comptes_courants').insert(payload).select().single();
    if (error) throw error;
    return data;
  },
  async delete(id: string) {
    const { error } = await supabase.from('societe_comptes_courants').delete().eq('id', id);
    if (error) throw error;
  },
};

// ============ Pacte Dutreil ============
export interface SocieteDutreil {
  id: string;
  user_id: string;
  societe_id: string;
  engagement_collectif_date?: string | null;
  engagement_individuel_date?: string | null;
  dirigeant_family_link_id?: string | null;
  fonction_direction?: string | null;
  eligibilite_validee?: boolean;
  valeur_parts_transmises?: number | null;
  commentaire?: string | null;
}

export const societeDutreilService = {
  async get(societeId: string): Promise<SocieteDutreil | null> {
    const { data, error } = await supabase
      .from('societe_dutreil')
      .select('*')
      .eq('societe_id', societeId)
      .maybeSingle();
    if (error) throw error;
    return (data as SocieteDutreil) || null;
  },
  async upsert(d: Omit<SocieteDutreil, 'id' | 'user_id'> & { id?: string }) {
    const user = await requireUser();
    const payload = { ...d, user_id: user.id };
    const { data, error } = await supabase
      .from('societe_dutreil')
      .upsert(payload, { onConflict: 'societe_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
