import { supabase } from '@/integrations/supabase/client';
import { RevenusCapitauxMobiliersInput } from '@/lib/fiscalite';

export interface RevenusCapitauxMobiliers extends RevenusCapitauxMobiliersInput {
  id?: string;
}

/**
 * Les colonnes `numeric` de Postgres sont sérialisées en chaîne par PostgREST
 * (préservation de la précision) : le type ci-dessous reflète la forme réelle
 * reçue sur le fil, coercée en `number` par `toNumberOrNull` dans
 * `rowToRevenusCapitauxMobiliers` (même défaut que les autres services du
 * module, cf. `revenusSalairesService.ts`).
 */
interface RevenusCapitauxMobiliersRow {
  id: string;
  user_id: string;
  case_2dh: number | string | null;
  case_2ch: number | string | null;
  case_2uu: number | string | null;
  case_2vv: number | string | null;
  case_2ww: number | string | null;
  case_2xx: number | string | null;
  case_2yy: number | string | null;
  case_2zz: number | string | null;
  case_2dc: number | string | null;
  case_2fu: number | string | null;
  case_2tr: number | string | null;
  case_2tt: number | string | null;
  case_2tq: number | string | null;
  case_2ts: number | string | null;
  case_2tz: number | string | null;
  case_2go: number | string | null;
  case_2tu: number | string | null;
  case_2tv: number | string | null;
  case_2tw: number | string | null;
  case_2tx: number | string | null;
  case_2ty: number | string | null;
  case_2cg: number | string | null;
  case_2bh: number | string | null;
  case_2df: number | string | null;
  case_2dg: number | string | null;
  case_2di: number | string | null;
  case_2ca: number | string | null;
  case_2ab: number | string | null;
  case_2ck: number | string | null;
  case_2ee: number | string | null;
  case_2aa: number | string | null;
  case_2al: number | string | null;
  case_2am: number | string | null;
  case_2an: number | string | null;
  case_2aq: number | string | null;
  case_2ar: number | string | null;
  case_2vm: number | string | null;
  case_2vn: number | string | null;
  case_2vo: number | string | null;
  case_2vp: number | string | null;
  case_2vq: number | string | null;
  case_2vr: number | string | null;
  case_2vs: number | string | null;
  case_2vt: number | string | null;
  case_2vu: number | string | null;
  case_2op: boolean | null;
}

function toNumberOrNull(value: number | string | null): number | null {
  if (value === null) return null;
  return typeof value === 'number' ? value : Number(value);
}

function rowToRevenusCapitauxMobiliers(row: RevenusCapitauxMobiliersRow): RevenusCapitauxMobiliers {
  return {
    id: row.id,
    case2dh: toNumberOrNull(row.case_2dh),
    case2ch: toNumberOrNull(row.case_2ch),
    case2uu: toNumberOrNull(row.case_2uu),
    case2vv: toNumberOrNull(row.case_2vv),
    case2ww: toNumberOrNull(row.case_2ww),
    case2xx: toNumberOrNull(row.case_2xx),
    case2yy: toNumberOrNull(row.case_2yy),
    case2zz: toNumberOrNull(row.case_2zz),
    case2dc: toNumberOrNull(row.case_2dc),
    case2fu: toNumberOrNull(row.case_2fu),
    case2tr: toNumberOrNull(row.case_2tr),
    case2tt: toNumberOrNull(row.case_2tt),
    case2tq: toNumberOrNull(row.case_2tq),
    case2ts: toNumberOrNull(row.case_2ts),
    case2tz: toNumberOrNull(row.case_2tz),
    case2go: toNumberOrNull(row.case_2go),
    case2tu: toNumberOrNull(row.case_2tu),
    case2tv: toNumberOrNull(row.case_2tv),
    case2tw: toNumberOrNull(row.case_2tw),
    case2tx: toNumberOrNull(row.case_2tx),
    case2ty: toNumberOrNull(row.case_2ty),
    case2cg: toNumberOrNull(row.case_2cg),
    case2bh: toNumberOrNull(row.case_2bh),
    case2df: toNumberOrNull(row.case_2df),
    case2dg: toNumberOrNull(row.case_2dg),
    case2di: toNumberOrNull(row.case_2di),
    case2ca: toNumberOrNull(row.case_2ca),
    case2ab: toNumberOrNull(row.case_2ab),
    case2ck: toNumberOrNull(row.case_2ck),
    case2ee: toNumberOrNull(row.case_2ee),
    case2aa: toNumberOrNull(row.case_2aa),
    case2al: toNumberOrNull(row.case_2al),
    case2am: toNumberOrNull(row.case_2am),
    case2an: toNumberOrNull(row.case_2an),
    case2aq: toNumberOrNull(row.case_2aq),
    case2ar: toNumberOrNull(row.case_2ar),
    case2vm: toNumberOrNull(row.case_2vm),
    case2vn: toNumberOrNull(row.case_2vn),
    case2vo: toNumberOrNull(row.case_2vo),
    case2vp: toNumberOrNull(row.case_2vp),
    case2vq: toNumberOrNull(row.case_2vq),
    case2vr: toNumberOrNull(row.case_2vr),
    case2vs: toNumberOrNull(row.case_2vs),
    case2vt: toNumberOrNull(row.case_2vt),
    case2vu: toNumberOrNull(row.case_2vu),
    case2op: row.case_2op ?? false,
  };
}

function revenusCapitauxMobiliersToRow(revenus: RevenusCapitauxMobiliers, userId: string) {
  return {
    user_id: userId,
    case_2dh: revenus.case2dh,
    case_2ch: revenus.case2ch,
    case_2uu: revenus.case2uu,
    case_2vv: revenus.case2vv,
    case_2ww: revenus.case2ww,
    case_2xx: revenus.case2xx,
    case_2yy: revenus.case2yy,
    case_2zz: revenus.case2zz,
    case_2dc: revenus.case2dc,
    case_2fu: revenus.case2fu,
    case_2tr: revenus.case2tr,
    case_2tt: revenus.case2tt,
    case_2tq: revenus.case2tq,
    case_2ts: revenus.case2ts,
    case_2tz: revenus.case2tz,
    case_2go: revenus.case2go,
    case_2tu: revenus.case2tu,
    case_2tv: revenus.case2tv,
    case_2tw: revenus.case2tw,
    case_2tx: revenus.case2tx,
    case_2ty: revenus.case2ty,
    case_2cg: revenus.case2cg,
    case_2bh: revenus.case2bh,
    case_2df: revenus.case2df,
    case_2dg: revenus.case2dg,
    case_2di: revenus.case2di,
    case_2ca: revenus.case2ca,
    case_2ab: revenus.case2ab,
    case_2ck: revenus.case2ck,
    case_2ee: revenus.case2ee,
    case_2aa: revenus.case2aa,
    case_2al: revenus.case2al,
    case_2am: revenus.case2am,
    case_2an: revenus.case2an,
    case_2aq: revenus.case2aq,
    case_2ar: revenus.case2ar,
    case_2vm: revenus.case2vm,
    case_2vn: revenus.case2vn,
    case_2vo: revenus.case2vo,
    case_2vp: revenus.case2vp,
    case_2vq: revenus.case2vq,
    case_2vr: revenus.case2vr,
    case_2vs: revenus.case2vs,
    case_2vt: revenus.case2vt,
    case_2vu: revenus.case2vu,
    case_2op: revenus.case2op,
  };
}

export const revenusCapitauxMobiliersService = {
  async getRevenusCapitauxMobiliers(): Promise<RevenusCapitauxMobiliers | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('revenus_capitaux_mobiliers')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching revenus capitaux mobiliers:', error);
      }
      throw error;
    }

    return data ? rowToRevenusCapitauxMobiliers(data as RevenusCapitauxMobiliersRow) : null;
  },

  async upsertRevenusCapitauxMobiliers(revenus: RevenusCapitauxMobiliers): Promise<RevenusCapitauxMobiliers> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const { data, error } = await supabase
      .from('revenus_capitaux_mobiliers')
      .upsert(revenusCapitauxMobiliersToRow(revenus, user.id), { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error upserting revenus capitaux mobiliers:', error);
      }
      throw error;
    }

    return rowToRevenusCapitauxMobiliers(data as RevenusCapitauxMobiliersRow);
  },
};
