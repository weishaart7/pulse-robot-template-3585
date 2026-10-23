import { supabase } from '@/integrations/supabase/client';
import { ReductionsCreditsImpotInput } from '@/lib/fiscalite';

export interface ReductionsCreditsImpot extends ReductionsCreditsImpotInput {
  id?: string;
}

const CASES_NUMERIQUES = ['case7ud', 'case7uq', 'case7uj', 'case7uf', 'case7db', 'case7dr', 'case7dl'] as const;

/** case7ud → case_7ud (colonne Supabase). */
const colonne = (cle: string) => cle.replace(/^case/, 'case_');

/**
 * Les colonnes `numeric` sont sérialisées en chaîne par PostgREST : coercées en
 * `number` ici (même défaut que `revenusCapitauxMobiliersService.ts`).
 */
type ReductionsCreditsImpotRow = { id: string; user_id: string; case_7dq: boolean | null; case_7dg: boolean | null; membres_plus_65_ans: number | null } & Record<string, unknown>;

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return typeof value === 'number' ? value : Number(value);
}

function rowToReductionsCreditsImpot(row: ReductionsCreditsImpotRow): ReductionsCreditsImpot {
  const result = { id: row.id, case7dq: row.case_7dq ?? false, case7dg: row.case_7dg ?? false, membresPlus65Ans: row.membres_plus_65_ans } as ReductionsCreditsImpot;
  for (const cle of CASES_NUMERIQUES) result[cle] = toNumberOrNull(row[colonne(cle)]);
  return result;
}

function reductionsCreditsImpotToRow(rf: ReductionsCreditsImpot, userId: string) {
  const row: Record<string, unknown> = { user_id: userId, case_7dq: rf.case7dq, case_7dg: rf.case7dg, membres_plus_65_ans: rf.membresPlus65Ans };
  for (const cle of CASES_NUMERIQUES) row[colonne(cle)] = rf[cle];
  return row;
}

export const reductionsCreditsImpotService = {
  async getReductionsCreditsImpot(): Promise<ReductionsCreditsImpot | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('reductions_credits_impot')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching reductions credits impot:', error);
      }
      throw error;
    }

    return data ? rowToReductionsCreditsImpot(data as ReductionsCreditsImpotRow) : null;
  },

  async upsertReductionsCreditsImpot(rf: ReductionsCreditsImpot): Promise<ReductionsCreditsImpot> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const { data, error } = await supabase
      .from('reductions_credits_impot')
      .upsert(reductionsCreditsImpotToRow(rf, user.id) as never, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error upserting reductions credits impot:', error);
      }
      throw error;
    }

    return rowToReductionsCreditsImpot(data as ReductionsCreditsImpotRow);
  },

  async deleteReductionsCreditsImpot(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const { error } = await supabase
      .from('reductions_credits_impot')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error deleting reductions credits impot:', error);
      }
      throw error;
    }
  },
};
