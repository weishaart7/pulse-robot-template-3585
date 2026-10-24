import { supabase } from '@/integrations/supabase/client';
import { ChargesDeductiblesInput } from '@/lib/fiscalite';

export interface ChargesDeductibles extends ChargesDeductiblesInput {
  id?: string;
}

const CASES_NUMERIQUES = [
  'case6de', 'case6el', 'case6em', 'case6gu', 'case6gi', 'case6gj', 'case6gp', 'case6ns', 'case6nt', 'case6rs', 'case6rt', 'case6ps', 'case6pt', 'case6os', 'case6ot', 'case6qs', 'case6qt', 'case6dg', 'case6dd', 'case6ev', 'case6eu', 'case6hp', 'case6hq', 'case6hr', 'case6gh', 'case6fa', 'case6fb', 'case6fc', 'case6fd', 'case6fe', 'case6fl',
] as const;

/** case6de → case_6de (colonne Supabase). */
const colonne = (cle: string) => cle.replace(/^case/, 'case_');

/**
 * Les colonnes `numeric` sont sérialisées en chaîne par PostgREST : coercées en
 * `number` ici (même défaut que `revenusCapitauxMobiliersService.ts`).
 */
type ChargesDeductiblesRow = { id: string; user_id: string; case_6qr: boolean | null; case_6qw: boolean | null; entretien_seul_6el: boolean | null; entretien_seul_6em: boolean | null } & Record<string, unknown>;

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return typeof value === 'number' ? value : Number(value);
}

function rowToChargesDeductibles(row: ChargesDeductiblesRow): ChargesDeductibles {
  const result = { id: row.id, case6qr: row.case_6qr ?? false, case6qw: row.case_6qw ?? false,
    entretienSeul6el: row.entretien_seul_6el ?? false, entretienSeul6em: row.entretien_seul_6em ?? false } as ChargesDeductibles;
  for (const cle of CASES_NUMERIQUES) result[cle] = toNumberOrNull(row[colonne(cle)]);
  return result;
}

function chargesDeductiblesToRow(rf: ChargesDeductibles, userId: string) {
  const row: Record<string, unknown> = { user_id: userId, case_6qr: rf.case6qr, case_6qw: rf.case6qw,
    entretien_seul_6el: rf.entretienSeul6el, entretien_seul_6em: rf.entretienSeul6em };
  for (const cle of CASES_NUMERIQUES) row[colonne(cle)] = rf[cle];
  return row;
}

export const chargesDeductiblesService = {
  async getChargesDeductibles(): Promise<ChargesDeductibles | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('charges_deductibles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching charges deductibles:', error);
      }
      throw error;
    }

    return data ? rowToChargesDeductibles(data as ChargesDeductiblesRow) : null;
  },

  async upsertChargesDeductibles(rf: ChargesDeductibles): Promise<ChargesDeductibles> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const { data, error } = await supabase
      .from('charges_deductibles')
      .upsert(chargesDeductiblesToRow(rf, user.id) as never, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error upserting charges deductibles:', error);
      }
      throw error;
    }

    return rowToChargesDeductibles(data as ChargesDeductiblesRow);
  },

  async deleteChargesDeductibles(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const { error } = await supabase
      .from('charges_deductibles')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error deleting charges deductibles:', error);
      }
      throw error;
    }
  },
};
