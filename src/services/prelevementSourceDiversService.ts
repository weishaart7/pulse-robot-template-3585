import { supabase } from '@/integrations/supabase/client';
import { PrelevementSourceDiversInput } from '@/lib/fiscalite';

export interface PrelevementSourceDivers extends PrelevementSourceDiversInput {
  id?: string;
}

const CASES_NUMERIQUES = [
  'case8hv', 'case8iv', 'case8jv', 'case8kv', 'case8hw', 'case8iw', 'case8jw', 'case8kw', 'case8hx', 'case8ix', 'case8jx', 'case8kx', 'case8hy', 'case8iy', 'case8jy', 'case8ky', 'case8hz', 'case8iz', 'case8jz', 'case8kz', 'case8hr', 'case8hs', 'case8ea', 'case8tk', 'case8ta', 'case8ut', 'case8ti', 'case8pl', 'case8vl', 'case8pm', 'case8vm', 'case8wm', 'case8um', 'case8tf', 'case8rf', 'case8rv', 'case8rc', 'case8rm',
  'case8tq', 'case8tr', 'case8sc', 'case8sw', 'case8sx', 'case8tw', 'case8tv', 'case8qv', 'case8th', 'case8qh', 'case8tx', 'case8qx', 'case8sa', 'case8sd', 'case8sb',
] as const;
const CASES_A_COCHER = ['case8tt', 'case8uu', 'case8sh', 'case8si', 'case8vf'] as const;

/** case8hv → case_8hv (colonne Supabase). */
const colonne = (cle: string) => cle.replace(/^case/, 'case_');

/**
 * Les colonnes `numeric` sont sérialisées en chaîne par PostgREST : coercées en
 * `number` ici (même défaut que `revenusCapitauxMobiliersService.ts`).
 */
type PrelevementSourceDiversRow = { id: string; user_id: string } & Record<string, unknown>;

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return typeof value === 'number' ? value : Number(value);
}

function rowToPrelevementSourceDivers(row: PrelevementSourceDiversRow): PrelevementSourceDivers {
  const result = { id: row.id } as PrelevementSourceDivers;
  for (const cle of CASES_A_COCHER) result[cle] = (row[colonne(cle)] as boolean | null) ?? false;
  for (const cle of CASES_NUMERIQUES) result[cle] = toNumberOrNull(row[colonne(cle)]);
  return result;
}

function prelevementSourceDiversToRow(rf: PrelevementSourceDivers, userId: string) {
  const row: Record<string, unknown> = { user_id: userId };
  for (const cle of CASES_A_COCHER) row[colonne(cle)] = rf[cle];
  for (const cle of CASES_NUMERIQUES) row[colonne(cle)] = rf[cle];
  return row;
}

export const prelevementSourceDiversService = {
  async getPrelevementSourceDivers(): Promise<PrelevementSourceDivers | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('prelevement_source_divers')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching prelevement source divers:', error);
      }
      throw error;
    }

    return data ? rowToPrelevementSourceDivers(data as PrelevementSourceDiversRow) : null;
  },

  async upsertPrelevementSourceDivers(rf: PrelevementSourceDivers): Promise<PrelevementSourceDivers> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const { data, error } = await supabase
      .from('prelevement_source_divers')
      .upsert(prelevementSourceDiversToRow(rf, user.id) as never, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error upserting prelevement source divers:', error);
      }
      throw error;
    }

    return rowToPrelevementSourceDivers(data as PrelevementSourceDiversRow);
  },

  async deletePrelevementSourceDivers(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const { error } = await supabase
      .from('prelevement_source_divers')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error deleting prelevement source divers:', error);
      }
      throw error;
    }
  },
};
