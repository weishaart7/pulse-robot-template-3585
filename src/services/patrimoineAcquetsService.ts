import { supabase } from '@/integrations/supabase/client';
import { PatrimoineOriginaire, PatrimoineFinal } from '@/types/participationAcquets';

type PatrimoineAcquetsTable = 'patrimoine_originaire' | 'patrimoine_final';
type PatrimoineAcquetsRow<T extends PatrimoineAcquetsTable> =
  T extends 'patrimoine_originaire' ? PatrimoineOriginaire : PatrimoineFinal;

/**
 * Service paramétré par nom de table (`patrimoine_originaire` ou
 * `patrimoine_final`) : mêmes colonnes, même CRUD, seule la table change —
 * pas de duplication à la manière de recompensesCreancesService.ts (qui
 * duplique getRecompenses/getCreancesEntreEpoux) puisque cette fois les deux
 * tables sont réellement identiques en forme.
 */
export function createPatrimoineAcquetsService<T extends PatrimoineAcquetsTable>(table: T) {
  return {
    async getAll(): Promise<PatrimoineAcquetsRow<T>[]> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        if (import.meta.env.DEV) console.error(`Error fetching ${table}:`, error);
        throw error;
      }

      return (data || []) as PatrimoineAcquetsRow<T>[];
    },

    async create(ligne: Omit<PatrimoineAcquetsRow<T>, 'id' | 'user_id'>): Promise<PatrimoineAcquetsRow<T>> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      const { data, error } = await supabase
        .from(table)
        .insert({ ...ligne, user_id: user.id } as any)
        .select()
        .single();

      if (error) {
        if (import.meta.env.DEV) console.error(`Error creating ${table} row:`, error);
        throw error;
      }

      return data as PatrimoineAcquetsRow<T>;
    },

    async remove(id: string): Promise<void> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        if (import.meta.env.DEV) console.error(`Error deleting ${table} row:`, error);
        throw error;
      }
    },
  };
}

export const patrimoineOriginaireService = createPatrimoineAcquetsService('patrimoine_originaire');
export const patrimoineFinalService = createPatrimoineAcquetsService('patrimoine_final');
