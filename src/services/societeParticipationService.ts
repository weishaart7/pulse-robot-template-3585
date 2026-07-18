import { supabase } from '@/integrations/supabase/client';

export interface SocieteParticipation {
  id: string;
  user_id: string;
  societe_mere_id: string;
  societe_fille_id: string;
  pourcentage: number;
  nombre_titres?: number | null;
  date_debut?: string | null;
  commentaire?: string | null;
}

const requireUser = async () => {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Non authentifié');
  return data.user;
};

// Traduit les erreurs Postgres (trigger anti-boucle/cross-user, contrainte UNIQUE,
// CHECK) en message lisible, pour affichage direct dans un toast côté UI plutôt que
// de laisser remonter le message technique brut de Postgres.
export const toReadableParticipationError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('boucle de détention')) return message;
  if (message.includes('même utilisateur')) return message;
  if (message.includes('societe_participations_unique_edge')) {
    return 'Ce lien de participation existe déjà entre ces deux sociétés.';
  }
  if (message.includes('societe_participations_no_self_loop')) {
    return 'Une société ne peut pas détenir des parts d\'elle-même.';
  }
  if (message.includes('pourcentage')) {
    return 'Le pourcentage doit être compris entre 0 (exclu) et 100.';
  }
  return message;
};

export const societeParticipationService = {
  async list(): Promise<SocieteParticipation[]> {
    const { data, error } = await supabase
      .from('societe_participations')
      .select('*');
    if (error) throw error;
    return (data || []) as SocieteParticipation[];
  },

  async create(participation: {
    societe_mere_id: string;
    societe_fille_id: string;
    pourcentage: number;
    nombre_titres?: number | null;
    date_debut?: string | null;
    commentaire?: string | null;
  }): Promise<SocieteParticipation> {
    const user = await requireUser();
    const { data, error } = await supabase
      .from('societe_participations')
      .insert({ ...participation, user_id: user.id })
      .select()
      .single();
    if (error) throw new Error(toReadableParticipationError(error));
    return data as SocieteParticipation;
  },

  async update(
    id: string,
    changes: Partial<Pick<SocieteParticipation, 'societe_mere_id' | 'societe_fille_id' | 'pourcentage' | 'nombre_titres' | 'date_debut' | 'commentaire'>>
  ): Promise<SocieteParticipation> {
    const { data, error } = await supabase
      .from('societe_participations')
      .update(changes)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(toReadableParticipationError(error));
    return data as SocieteParticipation;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('societe_participations').delete().eq('id', id);
    if (error) throw new Error(toReadableParticipationError(error));
  },
};
