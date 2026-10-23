import { supabase } from '@/integrations/supabase/client';
import { RevenusFonciers2042Input } from '@/lib/fiscalite';

export interface RevenusFonciers2042 extends RevenusFonciers2042Input {
  id?: string;
}

const CASES_NUMERIQUES = ['case4be', 'case4bk', 'case4bl', 'case4by', 'case4ea', 'case4eb'] as const;

/** case4be → case_4be (colonne Supabase). */
const colonne = (cle: string) => cle.replace(/^case/, 'case_');

/**
 * Les colonnes `numeric` sont sérialisées en chaîne par PostgREST : coercées en
 * `number` ici (même défaut que `revenusCapitauxMobiliersService.ts`).
 */
type RevenusFonciers2042Row = { id: string; user_id: string; case_4bn: boolean | null; case_4bz: boolean | null } & Record<string, unknown>;

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return typeof value === 'number' ? value : Number(value);
}

function rowToRevenusFonciers2042(row: RevenusFonciers2042Row): RevenusFonciers2042 {
  const result = { id: row.id, case4bn: row.case_4bn ?? false, case4bz: row.case_4bz ?? false } as RevenusFonciers2042;
  for (const cle of CASES_NUMERIQUES) result[cle] = toNumberOrNull(row[colonne(cle)]);
  return result;
}

function revenusFonciers2042ToRow(rf: RevenusFonciers2042, userId: string) {
  const row: Record<string, unknown> = { user_id: userId, case_4bn: rf.case4bn, case_4bz: rf.case4bz };
  for (const cle of CASES_NUMERIQUES) row[colonne(cle)] = rf[cle];
  return row;
}

export const revenusFonciers2042Service = {
  async getRevenusFonciers2042(): Promise<RevenusFonciers2042 | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('revenus_fonciers_2042')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching revenus fonciers 2042:', error);
      }
      throw error;
    }

    return data ? rowToRevenusFonciers2042(data as RevenusFonciers2042Row) : null;
  },

  async upsertRevenusFonciers2042(rf: RevenusFonciers2042): Promise<RevenusFonciers2042> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const { data, error } = await supabase
      .from('revenus_fonciers_2042')
      .upsert(revenusFonciers2042ToRow(rf, user.id) as never, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error upserting revenus fonciers 2042:', error);
      }
      throw error;
    }

    return rowToRevenusFonciers2042(data as RevenusFonciers2042Row);
  },

  async deleteRevenusFonciers2042(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const { error } = await supabase
      .from('revenus_fonciers_2042')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error deleting revenus fonciers 2042:', error);
      }
      throw error;
    }
  },
};
