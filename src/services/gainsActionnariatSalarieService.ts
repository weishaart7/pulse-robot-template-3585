import { supabase } from '@/integrations/supabase/client';
import { GainsActionnariatSalarieInput } from '@/lib/fiscalite';

export interface GainsActionnariatSalarie extends GainsActionnariatSalarieInput {
  id?: string;
}

/**
 * Les colonnes `numeric` de Postgres sont sérialisées en chaîne par PostgREST
 * (préservation de la précision) : le type ci-dessous reflète la forme réelle
 * reçue sur le fil, coercée en `number` par `toNumberOrNull` dans
 * `rowToGainsActionnariatSalarie` (même défaut que `revenusSalairesService.ts`).
 */
interface GainsActionnariatSalarieRow {
  id: string;
  user_id: string;
  case_1tp: number | string | null;
  case_1up: number | string | null;
  case_1tt: number | string | null;
  case_1ut: number | string | null;
  case_1tz: number | string | null;
  case_1uz: number | string | null;
  case_1wz: number | string | null;
  case_1vz: number | string | null;
  case_1nx: number | string | null;
  case_1ox: number | string | null;
  case_1ny: number | string | null;
  case_1oy: number | string | null;
  case_1ay: number | string | null;
  case_1by: number | string | null;
  case_1mp: number | string | null;
  case_1mq: number | string | null;
  case_3vd: number | string | null;
  case_3vi: number | string | null;
  case_3vf: number | string | null;
  case_3vj: number | string | null;
  case_3vk: number | string | null;
  case_3vn: number | string | null;
  case_0xx: number | string | null;
}

function toNumberOrNull(value: number | string | null): number | null {
  if (value === null) return null;
  return typeof value === 'number' ? value : Number(value);
}

function rowToGainsActionnariatSalarie(row: GainsActionnariatSalarieRow): GainsActionnariatSalarie {
  return {
    id: row.id,
    case1tp: toNumberOrNull(row.case_1tp),
    case1up: toNumberOrNull(row.case_1up),
    case1tt: toNumberOrNull(row.case_1tt),
    case1ut: toNumberOrNull(row.case_1ut),
    case1tz: toNumberOrNull(row.case_1tz),
    case1uz: toNumberOrNull(row.case_1uz),
    case1wz: toNumberOrNull(row.case_1wz),
    case1vz: toNumberOrNull(row.case_1vz),
    case1nx: toNumberOrNull(row.case_1nx),
    case1ox: toNumberOrNull(row.case_1ox),
    case1ny: toNumberOrNull(row.case_1ny),
    case1oy: toNumberOrNull(row.case_1oy),
    case1ay: toNumberOrNull(row.case_1ay),
    case1by: toNumberOrNull(row.case_1by),
    case1mp: toNumberOrNull(row.case_1mp),
    case1mq: toNumberOrNull(row.case_1mq),
    case3vd: toNumberOrNull(row.case_3vd),
    case3vi: toNumberOrNull(row.case_3vi),
    case3vf: toNumberOrNull(row.case_3vf),
    case3vj: toNumberOrNull(row.case_3vj),
    case3vk: toNumberOrNull(row.case_3vk),
    case3vn: toNumberOrNull(row.case_3vn),
    case0xx: toNumberOrNull(row.case_0xx),
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
    case_1ay: gains.case1ay,
    case_1by: gains.case1by,
    case_1mp: gains.case1mp,
    case_1mq: gains.case1mq,
    case_3vd: gains.case3vd,
    case_3vi: gains.case3vi,
    case_3vf: gains.case3vf,
    case_3vj: gains.case3vj,
    case_3vk: gains.case3vk,
    case_3vn: gains.case3vn,
    case_0xx: gains.case0xx,
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
