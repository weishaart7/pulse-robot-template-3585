import { supabase } from '@/integrations/supabase/client';
import { GainsActionnariatSalarieInput } from '@/lib/fiscalite';

export interface GainsActionnariatSalarie extends GainsActionnariatSalarieInput {
  id?: string;
}

interface GainsActionnariatSalarieRow {
  id: string;
  user_id: string;
  case_1tp: number | null;
  case_1up: number | null;
  case_1tt: number | null;
  case_1ut: number | null;
  case_1tz: number | null;
  case_1uz: number | null;
  case_1wz: number | null;
  case_1vz: number | null;
  case_1nx: number | null;
  case_1ox: number | null;
  case_1ny: number | null;
  case_1oy: number | null;
  case_3vd: number | null;
  case_3vi: number | null;
  case_3vf: number | null;
  case_3vj: number | null;
  case_3vk: number | null;
  case_3vn: number | null;
}

function rowToGainsActionnariatSalarie(row: GainsActionnariatSalarieRow): GainsActionnariatSalarie {
  return {
    id: row.id,
    case1tp: row.case_1tp,
    case1up: row.case_1up,
    case1tt: row.case_1tt,
    case1ut: row.case_1ut,
    case1tz: row.case_1tz,
    case1uz: row.case_1uz,
    case1wz: row.case_1wz,
    case1vz: row.case_1vz,
    case1nx: row.case_1nx,
    case1ox: row.case_1ox,
    case1ny: row.case_1ny,
    case1oy: row.case_1oy,
    case3vd: row.case_3vd,
    case3vi: row.case_3vi,
    case3vf: row.case_3vf,
    case3vj: row.case_3vj,
    case3vk: row.case_3vk,
    case3vn: row.case_3vn,
  };
}

function gainsActionnariatSalarieToRow(gains: GainsActionnariatSalarie, userId: string) {
  return {
    user_id: userId,
    case_1tp: gains.case1tp,
    case_1up: gains.case1up,
    case_1tt: gains.case1tt,
    case_1ut: gains.case1ut,
    case_1tz: gains.case1tz,
    case_1uz: gains.case1uz,
    case_1wz: gains.case1wz,
    case_1vz: gains.case1vz,
    case_1nx: gains.case1nx,
    case_1ox: gains.case1ox,
    case_1ny: gains.case1ny,
    case_1oy: gains.case1oy,
    case_3vd: gains.case3vd,
    case_3vi: gains.case3vi,
    case_3vf: gains.case3vf,
    case_3vj: gains.case3vj,
    case_3vk: gains.case3vk,
    case_3vn: gains.case3vn,
  };
}

export const gainsActionnariatSalarieService = {
  async getGainsActionnariatSalarie(): Promise<GainsActionnariatSalarie | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('gains_actionnariat_salarie')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching gains actionnariat salarie:', error);
      }
      throw error;
    }

    return data ? rowToGainsActionnariatSalarie(data as GainsActionnariatSalarieRow) : null;
  },

  async upsertGainsActionnariatSalarie(gains: GainsActionnariatSalarie): Promise<GainsActionnariatSalarie> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const { data, error } = await supabase
      .from('gains_actionnariat_salarie')
      .upsert(gainsActionnariatSalarieToRow(gains, user.id), { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error upserting gains actionnariat salarie:', error);
      }
      throw error;
    }

    return rowToGainsActionnariatSalarie(data as GainsActionnariatSalarieRow);
  },
};
