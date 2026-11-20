import { supabase } from '@/integrations/supabase/client';
import { PlusValuesGainsDiversInput } from '@/lib/fiscalite';
import { CASES_2027 } from '@/lib/fiscalite/cases2027';

export interface PlusValuesGainsDivers extends PlusValuesGainsDiversInput {
  id?: string;
}

const CASES_NUMERIQUES = [
  'case3vg', 'case3sg', 'case3vh', 'case3ua', 'case3sl', 'case3va', 'case3vt', 'case3pi', 'case3sb', 'case3sz', 'case3we',
  'case3an', 'case3bn', 'case3vz', 'case3vw',
  'case3sj', 'case3tj', 'case3tk', 'case3sk', 'case3tl', 'case3tm', 'case3pc', 'case3pe', 'case3vq', 'case3vr', 'case3vc', 'case3ex',
  'case3wi', 'case3wj', 'case3wn', 'case3xn', 'case3wp', 'case3wr', 'case3ws', 'case3wt',
  'caseRvg', 'caseNvg', 'caseRsg', 'caseRua', 'caseNua', 'caseRsl', 'caseRva',
  // Cases de la déclaration 2027 (revenus 2026), voir cases2027.ts.
  ...CASES_2027.plusValues,
] as const;

/** case3vg → case_3vg, caseRvg → case_rvg (colonne Supabase). */
const colonne = (cle: string) => cle.replace(/^case/, 'case_').toLowerCase();

/**
 * Les colonnes `numeric` sont sérialisées en chaîne par PostgREST : coercées en
 * `number` ici (même défaut que `revenusCapitauxMobiliersService.ts`).
 */
type PlusValuesGainsDiversRow = { id: string; user_id: string; case_3cn: boolean | null } & Record<string, unknown>;

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return typeof value === 'number' ? value : Number(value);
}

function rowToPlusValuesGainsDivers(row: PlusValuesGainsDiversRow): PlusValuesGainsDivers {
  const result = { id: row.id, case3cn: row.case_3cn ?? false } as PlusValuesGainsDivers;
  for (const cle of CASES_NUMERIQUES) result[cle] = toNumberOrNull(row[colonne(cle)]);
  return result;
}

function plusValuesGainsDiversToRow(pv: PlusValuesGainsDivers, userId: string) {
  const row: Record<string, unknown> = { user_id: userId, case_3cn: pv.case3cn };
  for (const cle of CASES_NUMERIQUES) row[colonne(cle)] = pv[cle];
  return row;
}

export const plusValuesGainsDiversService = {
  async getPlusValuesGainsDivers(): Promise<PlusValuesGainsDivers | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('plus_values_gains_divers')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching plus-values gains divers:', error);
      }
      throw error;
    }

    return data ? rowToPlusValuesGainsDivers(data as PlusValuesGainsDiversRow) : null;
  },

  async upsertPlusValuesGainsDivers(pv: PlusValuesGainsDivers): Promise<PlusValuesGainsDivers> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const { data, error } = await supabase
      .from('plus_values_gains_divers')
      .upsert(plusValuesGainsDiversToRow(pv, user.id) as never, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error upserting plus-values gains divers:', error);
      }
      throw error;
    }

    return rowToPlusValuesGainsDivers(data as PlusValuesGainsDiversRow);
  },

  async deletePlusValuesGainsDivers(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const { error } = await supabase
      .from('plus_values_gains_divers')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error deleting plus-values gains divers:', error);
      }
      throw error;
    }
  },
};
