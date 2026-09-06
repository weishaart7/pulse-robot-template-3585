import { supabase } from '@/integrations/supabase/client';
import { RevenusSalairesInput } from '@/lib/fiscalite';

export interface RevenusSalaires extends RevenusSalairesInput {
  id?: string;
}

/**
 * Les colonnes `numeric` de Postgres sont sérialisées en chaîne par PostgREST
 * (préservation de la précision) : le type ci-dessous reflète la forme réelle
 * reçue sur le fil, coercée en `number` par `toNumberOrNull` dans
 * `rowToRevenusSalaires`.
 */
interface RevenusSalairesRow {
  id: string;
  user_id: string;
  case_1aj: number | string | null;
  case_1bj: number | string | null;
  case_1aa: number | string | null;
  case_1ba: number | string | null;
  case_1ga: number | string | null;
  case_1ha: number | string | null;
  case_1gh: number | string | null;
  case_1hh: number | string | null;
  case_1pb: number | string | null;
  case_1pc: number | string | null;
  case_1ad: number | string | null;
  case_1bd: number | string | null;
  case_1av: boolean;
  case_1bv: boolean;
  case_1gb: number | string | null;
  case_1hb: number | string | null;
  case_1gk: boolean;
  case_1gl: boolean;
  case_1gf: number | string | null;
  case_1hf: number | string | null;
  case_1gg: number | string | null;
  case_1hg: number | string | null;
  case_1aq: number | string | null;
  case_1bq: number | string | null;
  case_1ap: number | string | null;
  case_1bp: number | string | null;
  case_1af: number | string | null;
  case_1bf: number | string | null;
  case_1ag: number | string | null;
  case_1bg: number | string | null;
  case_1ak: number | string | null;
  case_1bk: number | string | null;
  case_1pm: number | string | null;
  case_1qm: number | string | null;
  case_1dy: number | string | null;
  case_1ey: number | string | null;
  case_1sm: number | string | null;
  case_1dn: number | string | null;
}

function toNumberOrNull(value: number | string | null): number | null {
  if (value === null) return null;
  return typeof value === 'number' ? value : Number(value);
}

function rowToRevenusSalaires(row: RevenusSalairesRow): RevenusSalaires {
  return {
    id: row.id,
    case1aj: toNumberOrNull(row.case_1aj),
    case1bj: toNumberOrNull(row.case_1bj),
    case1aa: toNumberOrNull(row.case_1aa),
    case1ba: toNumberOrNull(row.case_1ba),
    case1ga: toNumberOrNull(row.case_1ga),
    case1ha: toNumberOrNull(row.case_1ha),
    case1gh: toNumberOrNull(row.case_1gh),
    case1hh: toNumberOrNull(row.case_1hh),
    case1pb: toNumberOrNull(row.case_1pb),
    case1pc: toNumberOrNull(row.case_1pc),
    case1ad: toNumberOrNull(row.case_1ad),
    case1bd: toNumberOrNull(row.case_1bd),
    case1av: row.case_1av,
    case1bv: row.case_1bv,
    case1gb: toNumberOrNull(row.case_1gb),
    case1hb: toNumberOrNull(row.case_1hb),
    case1gk: row.case_1gk,
    case1gl: row.case_1gl,
    case1gf: toNumberOrNull(row.case_1gf),
    case1hf: toNumberOrNull(row.case_1hf),
    case1gg: toNumberOrNull(row.case_1gg),
    case1hg: toNumberOrNull(row.case_1hg),
    case1aq: toNumberOrNull(row.case_1aq),
    case1bq: toNumberOrNull(row.case_1bq),
    case1ap: toNumberOrNull(row.case_1ap),
    case1bp: toNumberOrNull(row.case_1bp),
    case1af: toNumberOrNull(row.case_1af),
    case1bf: toNumberOrNull(row.case_1bf),
    case1ag: toNumberOrNull(row.case_1ag),
    case1bg: toNumberOrNull(row.case_1bg),
    case1ak: toNumberOrNull(row.case_1ak),
    case1bk: toNumberOrNull(row.case_1bk),
    case1pm: toNumberOrNull(row.case_1pm),
    case1qm: toNumberOrNull(row.case_1qm),
    case1dy: toNumberOrNull(row.case_1dy),
    case1ey: toNumberOrNull(row.case_1ey),
    case1sm: toNumberOrNull(row.case_1sm),
    case1dn: toNumberOrNull(row.case_1dn),
  };
}

function revenusSalairesToRow(revenus: RevenusSalaires, userId: string) {
  return {
    user_id: userId,
    case_1aj: revenus.case1aj,
    case_1bj: revenus.case1bj,
    case_1aa: revenus.case1aa,
    case_1ba: revenus.case1ba,
    case_1ga: revenus.case1ga,
    case_1ha: revenus.case1ha,
    case_1gh: revenus.case1gh,
    case_1hh: revenus.case1hh,
    case_1pb: revenus.case1pb,
    case_1pc: revenus.case1pc,
    case_1ad: revenus.case1ad,
    case_1bd: revenus.case1bd,
    case_1av: revenus.case1av,
    case_1bv: revenus.case1bv,
    case_1gb: revenus.case1gb,
    case_1hb: revenus.case1hb,
    case_1gk: revenus.case1gk,
    case_1gl: revenus.case1gl,
    case_1gf: revenus.case1gf,
    case_1hf: revenus.case1hf,
    case_1gg: revenus.case1gg,
    case_1hg: revenus.case1hg,
    case_1aq: revenus.case1aq,
    case_1bq: revenus.case1bq,
    case_1ap: revenus.case1ap,
    case_1bp: revenus.case1bp,
    case_1af: revenus.case1af,
    case_1bf: revenus.case1bf,
    case_1ag: revenus.case1ag,
    case_1bg: revenus.case1bg,
    case_1ak: revenus.case1ak,
    case_1bk: revenus.case1bk,
    case_1pm: revenus.case1pm,
    case_1qm: revenus.case1qm,
    case_1dy: revenus.case1dy,
    case_1ey: revenus.case1ey,
    case_1sm: revenus.case1sm,
    case_1dn: revenus.case1dn,
  };
}

export const revenusSalairesService = {
  async getRevenusSalaires(): Promise<RevenusSalaires | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('revenus_salaires')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching revenus salaires:', error);
      }
      throw error;
    }

    return data ? rowToRevenusSalaires(data as RevenusSalairesRow) : null;
  },

  async upsertRevenusSalaires(revenus: RevenusSalaires): Promise<RevenusSalaires> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const { data, error } = await supabase
      .from('revenus_salaires')
      .upsert(revenusSalairesToRow(revenus, user.id), { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error upserting revenus salaires:', error);
      }
      throw error;
    }

    return rowToRevenusSalaires(data as RevenusSalairesRow);
  },

  async deleteRevenusSalaires(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const { error } = await supabase
      .from('revenus_salaires')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error deleting revenus salaires:', error);
      }
      throw error;
    }
  },
};
