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

export const societeParticipationService = {
  async list(): Promise<SocieteParticipation[]> {
    const { data, error } = await supabase
      .from('societe_participations')
      .select('*');
    if (error) throw error;
    return (data || []) as SocieteParticipation[];
  },
};
