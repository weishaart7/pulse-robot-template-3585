import { supabase } from '@/integrations/supabase/client';
import { PensionsRetraitesRentesInput } from '@/lib/fiscalite';

export interface PensionsRetraitesRentes extends PensionsRetraitesRentesInput {
  id?: string;
}

/**
 * Les colonnes `numeric` de Postgres sont sérialisées en chaîne par PostgREST
 * (préservation de la précision) : le type ci-dessous reflète la forme réelle
 * reçue sur le fil, coercée en `number` par `toNumberOrNull` dans
 * `rowToPensionsRetraitesRentes`.
 */
interface PensionsRetraitesRentesRow {
  id: string;
  user_id: string;
  case_1as: number | string | null;
  case_1bs: number | string | null;
  case_1at: number | string | null;
  case_1bt: number | string | null;
  case_1ai: number | string | null;
  case_1bi: number | string | null;
  case_1az: number | string | null;
  case_1bz: number | string | null;
  case_1ao: number | string | null;
  case_1bo: number | string | null;
  case_1al: number | string | null;
  case_1bl: number | string | null;
  case_1am: number | string | null;
  case_1bm: number | string | null;
  case_1aw: number | string | null;
  case_1bw: number | string | null;
  case_1cw: number | string | null;
  case_1dw: number | string | null;
  case_1ar: number | string | null;
  case_1br: number | string | null;
  case_1cr: number | string | null;
  case_1dr: number | string | null;
  case_1hk: boolean;
  case_1hl: boolean;
}

function toNumberOrNull(value: number | string | null): number | null {
  if (value === null) return null;
  return typeof value === 'number' ? value : Number(value);
}

function rowToPensionsRetraitesRentes(row: PensionsRetraitesRentesRow): PensionsRetraitesRentes {
  return {
    id: row.id,
    case1as: toNumberOrNull(row.case_1as),
    case1bs: toNumberOrNull(row.case_1bs),
    case1at: toNumberOrNull(row.case_1at),
    case1bt: toNumberOrNull(row.case_1bt),
    case1ai: toNumberOrNull(row.case_1ai),
    case1bi: toNumberOrNull(row.case_1bi),
    case1az: toNumberOrNull(row.case_1az),
    case1bz: toNumberOrNull(row.case_1bz),
    case1ao: toNumberOrNull(row.case_1ao),
    case1bo: toNumberOrNull(row.case_1bo),
    case1al: toNumberOrNull(row.case_1al),
    case1bl: toNumberOrNull(row.case_1bl),
    case1am: toNumberOrNull(row.case_1am),
    case1bm: toNumberOrNull(row.case_1bm),
    case1aw: toNumberOrNull(row.case_1aw),
    case1bw: toNumberOrNull(row.case_1bw),
    case1cw: toNumberOrNull(row.case_1cw),
    case1dw: toNumberOrNull(row.case_1dw),
    case1ar: toNumberOrNull(row.case_1ar),
    case1br: toNumberOrNull(row.case_1br),
    case1cr: toNumberOrNull(row.case_1cr),
    case1dr: toNumberOrNull(row.case_1dr),
    case1hk: row.case_1hk,
    case1hl: row.case_1hl,
  };
}

function pensionsRetraitesRentesToRow(pensions: PensionsRetraitesRentes, userId: string) {
  return {
    user_id: userId,
    case_1as: pensions.case1as,
    case_1bs: pensions.case1bs,
    case_1at: pensions.case1at,
    case_1bt: pensions.case1bt,
    case_1ai: pensions.case1ai,
    case_1bi: pensions.case1bi,
    case_1az: pensions.case1az,
    case_1bz: pensions.case1bz,
    case_1ao: pensions.case1ao,
    case_1bo: pensions.case1bo,
    case_1al: pensions.case1al,
    case_1bl: pensions.case1bl,
    case_1am: pensions.case1am,
    case_1bm: pensions.case1bm,
    case_1aw: pensions.case1aw,
    case_1bw: pensions.case1bw,
    case_1cw: pensions.case1cw,
    case_1dw: pensions.case1dw,
    case_1ar: pensions.case1ar,
    case_1br: pensions.case1br,
    case_1cr: pensions.case1cr,
    case_1dr: pensions.case1dr,
    case_1hk: pensions.case1hk,
    case_1hl: pensions.case1hl,
  };
}

export const pensionsRetraitesRentesService = {
  async getPensionsRetraitesRentes(): Promise<PensionsRetraitesRentes | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('pensions_retraites_rentes')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching pensions retraites rentes:', error);
      }
      throw error;
    }

    return data ? rowToPensionsRetraitesRentes(data as PensionsRetraitesRentesRow) : null;
  },

  async upsertPensionsRetraitesRentes(pensions: PensionsRetraitesRentes): Promise<PensionsRetraitesRentes> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const { data, error } = await supabase
      .from('pensions_retraites_rentes')
      .upsert(pensionsRetraitesRentesToRow(pensions, user.id), { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error upserting pensions retraites rentes:', error);
      }
      throw error;
    }

    return rowToPensionsRetraitesRentes(data as PensionsRetraitesRentesRow);
  },

  async deletePensionsRetraitesRentes(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const { error } = await supabase
      .from('pensions_retraites_rentes')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error deleting pensions retraites rentes:', error);
      }
      throw error;
    }
  },
};
