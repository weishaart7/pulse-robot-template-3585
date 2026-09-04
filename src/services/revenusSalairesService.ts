import { supabase } from '@/integrations/supabase/client';
import { RevenusSalairesInput } from '@/lib/fiscalite';

export interface RevenusSalaires extends RevenusSalairesInput {
  id?: string;
}

interface RevenusSalairesRow {
  id: string;
  user_id: string;
  case_1aj: number | null;
  case_1bj: number | null;
  case_1aa: number | null;
  case_1ba: number | null;
  case_1ga: number | null;
  case_1ha: number | null;
  case_1gh: number | null;
  case_1hh: number | null;
  case_1pb: number | null;
  case_1pc: number | null;
  case_1ad: number | null;
  case_1bd: number | null;
  case_1av: boolean;
  case_1bv: boolean;
  case_1gb: number | null;
  case_1hb: number | null;
  case_1gk: boolean;
  case_1gl: boolean;
  case_1gf: number | null;
  case_1hf: number | null;
  case_1gg: number | null;
  case_1hg: number | null;
  case_1ap: number | null;
  case_1bp: number | null;
  case_1af: number | null;
  case_1bf: number | null;
  case_1ag: number | null;
  case_1bg: number | null;
  case_1ak: number | null;
  case_1bk: number | null;
  case_1pm: number | null;
  case_1qm: number | null;
  case_1dy: number | null;
  case_1ey: number | null;
  case_1sm: number | null;
  case_1dn: number | null;
}

function rowToRevenusSalaires(row: RevenusSalairesRow): RevenusSalaires {
  return {
    id: row.id,
    case1aj: row.case_1aj,
    case1bj: row.case_1bj,
    case1aa: row.case_1aa,
    case1ba: row.case_1ba,
    case1ga: row.case_1ga,
    case1ha: row.case_1ha,
    case1gh: row.case_1gh,
    case1hh: row.case_1hh,
    case1pb: row.case_1pb,
    case1pc: row.case_1pc,
    case1ad: row.case_1ad,
    case1bd: row.case_1bd,
    case1av: row.case_1av,
    case1bv: row.case_1bv,
    case1gb: row.case_1gb,
    case1hb: row.case_1hb,
    case1gk: row.case_1gk,
    case1gl: row.case_1gl,
    case1gf: row.case_1gf,
    case1hf: row.case_1hf,
    case1gg: row.case_1gg,
    case1hg: row.case_1hg,
    case1ap: row.case_1ap,
    case1bp: row.case_1bp,
    case1af: row.case_1af,
    case1bf: row.case_1bf,
    case1ag: row.case_1ag,
    case1bg: row.case_1bg,
    case1ak: row.case_1ak,
    case1bk: row.case_1bk,
    case1pm: row.case_1pm,
    case1qm: row.case_1qm,
    case1dy: row.case_1dy,
    case1ey: row.case_1ey,
    case1sm: row.case_1sm,
    case1dn: row.case_1dn,
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
};
