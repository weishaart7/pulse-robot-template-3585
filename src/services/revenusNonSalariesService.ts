import { supabase } from '@/integrations/supabase/client';
import { RevenusNonSalariesInput } from '@/lib/fiscalite';

export interface RevenusNonSalaries extends RevenusNonSalariesInput {
  id?: string;
}

const CASES_NUMERIQUES = [
  'case5ta', 'case5ua', 'case5tb', 'case5ub', 'case5te', 'case5ue',
  'case5ko', 'case5lo', 'case5kp', 'case5lp', 'case5no', 'case5oo',
  'case5np', 'case5op', 'case5ng', 'case5og', 'case5nh', 'case5oh',
  'case5ni', 'case5oi', 'case5nj', 'case5oj', 'case5nk', 'case5ok',
  'case5nl', 'case5ol', 'case5hq', 'case5iq', 'case5ku', 'case5lu',
  'case5hy', 'case5iy',
] as const;

/** case5ko → case_5ko (colonne Supabase). */
const colonne = (cle: string) => cle.replace(/^case/, 'case_');

/**
 * Les colonnes `numeric` sont sérialisées en chaîne par PostgREST : coercées en
 * `number` ici (même défaut que `revenusCapitauxMobiliersService.ts`).
 */
type RevenusNonSalariesRow = { id: string; user_id: string } & Record<string, unknown>;

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return typeof value === 'number' ? value : Number(value);
}

function rowToRevenusNonSalaries(row: RevenusNonSalariesRow): RevenusNonSalaries {
  const result = { id: row.id } as RevenusNonSalaries;
  for (const cle of CASES_NUMERIQUES) result[cle] = toNumberOrNull(row[colonne(cle)]);
  return result;
}

function revenusNonSalariesToRow(rns: RevenusNonSalaries, userId: string) {
  const row: Record<string, unknown> = { user_id: userId };
  for (const cle of CASES_NUMERIQUES) row[colonne(cle)] = rns[cle];
  return row;
}

export const revenusNonSalariesService = {
  async getRevenusNonSalaries(): Promise<RevenusNonSalaries | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('revenus_non_salaries')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching revenus non salaries:', error);
      }
      throw error;
    }

    return data ? rowToRevenusNonSalaries(data as RevenusNonSalariesRow) : null;
  },

  async upsertRevenusNonSalaries(rns: RevenusNonSalaries): Promise<RevenusNonSalaries> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const { data, error } = await supabase
      .from('revenus_non_salaries')
      .upsert(revenusNonSalariesToRow(rns, user.id) as never, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error upserting revenus non salaries:', error);
      }
      throw error;
    }

    return rowToRevenusNonSalaries(data as RevenusNonSalariesRow);
  },

  async deleteRevenusNonSalaries(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const { error } = await supabase
      .from('revenus_non_salaries')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error deleting revenus non salaries:', error);
      }
      throw error;
    }
  },
};
