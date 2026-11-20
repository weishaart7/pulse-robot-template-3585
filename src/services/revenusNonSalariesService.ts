import { supabase } from '@/integrations/supabase/client';
import { RevenusNonSalariesInput } from '@/lib/fiscalite';
import { CASES_2027 } from '@/lib/fiscalite/cases2027';

export interface RevenusNonSalaries extends RevenusNonSalariesInput {
  id?: string;
}

const CASES_NUMERIQUES = [
  'case5ja', 'case5jb', 'case5jc', 'case5jd', 'case5je', 'case5jf', 'case5jp', 'case5jq', 'case5jr', 'case5jv', 'case5jw', 'case5jx', 'case5jy', 'case5lk', 'case5mb', 'case5mc', 'case5me', 'case5mf', 'case5mj', 'case5mn', 'case5mo', 'case5mp', 'case5mq', 'case5mu', 'case5mv', 'case5mx', 'case5my', 'case5mz', 'case5ot', 'case5pa', 'case5pb', 'case5pc', 'case5pe', 'case5pg', 'case5ph', 'case5pi', 'case5pj', 'case5pk', 'case5pl', 'case5pm', 'case5pn', 'case5po', 'case5pp', 'case5pq', 'case5px', 'case5sa', 'case5sb', 'case5sc', 'case5sd', 'case5se', 'case5sf', 'case5sj', 'case5sl', 'case5sx', 'case5va', 'case5vb', 'case5vc', 'case5ve', 'case5vf', 'case5vh', 'case5wi', 'case5za', 'case5zb', 'case5zo',
  'case5ta', 'case5ua', 'case5tb', 'case5ub', 'case5te', 'case5ue', 'case5ko', 'case5lo',
  'case5kp', 'case5lp', 'case5no', 'case5oo', 'case5np', 'case5op', 'case5ng', 'case5og',
  'case5nh', 'case5oh', 'case5ni', 'case5oi', 'case5nj', 'case5oj', 'case5nk', 'case5ok',
  'case5nl', 'case5ol', 'case5hq', 'case5iq', 'case5ku', 'case5lu', 'case5hy', 'case5iy',
  'case5xb', 'case5yb', 'case5xa', 'case5ya', 'case5hw', 'case5iw', 'case5xo', 'case5yo',
  'case5hx', 'case5ix', 'case5xn', 'case5yn', 'case5hb', 'case5ib', 'case5hc', 'case5ic',
  'case5ak', 'case5bk', 'case5ha', 'case5ia', 'case5hf', 'case5if', 'case5he', 'case5ie',
  'case5kn', 'case5ln', 'case5kx', 'case5lx', 'case5kj', 'case5lj', 'case5kq', 'case5lq',
  'case5kr', 'case5lr', 'case5kb', 'case5lb', 'case5kc', 'case5lc', 'case5df', 'case5ef',
  'case5ui', 'case5vi', 'case5kf', 'case5lf', 'case5ke', 'case5le', 'case5nn', 'case5on',
  'case5nx', 'case5ox', 'case5iu', 'case5rz', 'case5nq', 'case5oq', 'case5nr', 'case5or',
  'case5nb', 'case5ob', 'case5nc', 'case5oc', 'case5ur', 'case5vr', 'case5nf', 'case5of',
  'case5ne', 'case5oe', 'case5na', 'case5oa', 'case5ey', 'case5fy', 'case5nm', 'case5om',
  'case5ny', 'case5oy', 'case5we', 'case5xe', 'case5hp', 'case5ip', 'case5hv', 'case5iv',
  'case5kz', 'case5lz', 'case5hr', 'case5ir', 'case5hs', 'case5is', 'case5qb', 'case5rb',
  'case5qc', 'case5rc', 'case5xj', 'case5yj', 'case5qa', 'case5ra', 'case5qe', 'case5re',
  'case5qd', 'case5rd', 'case5th', 'case5uh', 'case5ky', 'case5ly', 'case5ju', 'case5ld',
  'case5kv', 'case5lv', 'case5kw', 'case5lw', 'case5hk', 'case5jk', 'case5jg', 'case5rf',
  'case5xs', 'case5ys', 'case5jj', 'case5rg', 'case5so', 'case5nt', 'case5qf', 'case5qg',
  'case5qn', 'case5qo', 'case5qp', 'case5qq', 'case5rn', 'case5ro', 'case5rp', 'case5rq',
  'case5rr', 'case5rw', 'case5ga', 'case5gb', 'case5gc', 'case5gd', 'case5ge', 'case5gf',
  'case5gg', 'case5gh', 'case5gi', 'case5gj', 'case5ht', 'case5it', 'case5jt', 'case5kt',
  'case5lt', 'case5mt', 'case5hg', 'case5ig', 'case5qj', 'case5rj', 'case5tc', 'case5uc',
  'case5xt', 'case5xu', 'case5hd', 'case5id', 'case5tf', 'case5uf', 'case5ql', 'case5rl',
  'case5sv', 'case5sw', 'case5qm', 'case5rm',
  'case5ck', 'case5ff', 'case5wr', 'case5gy', 'case5zj', 'case5zs', 'case5sz', 'case5md', 'case5pf', 'case5py', 'case5sg', 'case5ye',
  'case5xm', 'case5yt', 'case5zt', 'case5ym', 'case5yu', 'case5zu',
  // Cases de la déclaration 2027 (revenus 2026), voir cases2027.ts.
  ...CASES_2027.nonSalaries,
] as const;

/** case5ko → case_5ko (colonne Supabase). */
const colonne = (cle: string) => cle.replace(/^case/, 'case_');

/**
 * Les colonnes `numeric` sont sérialisées en chaîne par PostgREST : coercées en
 * `number` ici (même défaut que `revenusCapitauxMobiliersService.ts`).
 */
type RevenusNonSalariesRow = { id: string; user_id: string } & Record<string, unknown>;

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return typeof value === 'number' ? value : Number(value);
}

function rowToRevenusNonSalaries(row: RevenusNonSalariesRow): RevenusNonSalaries {
  const result = { id: row.id } as RevenusNonSalaries;
  for (const cle of CASES_NUMERIQUES) result[cle] = toNumberOrNull(row[colonne(cle)]);
  return result;
}

function revenusNonSalariesToRow(rns: RevenusNonSalaries, userId: string) {
  const row: Record<string, unknown> = { user_id: userId };
  for (const cle of CASES_NUMERIQUES) row[colonne(cle)] = rns[cle];
  return row;
}

export const revenusNonSalariesService = {
  async getRevenusNonSalaries(): Promise<RevenusNonSalaries | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('revenus_non_salaries')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching revenus non salaries:', error);
      }
      throw error;
    }

    return data ? rowToRevenusNonSalaries(data as RevenusNonSalariesRow) : null;
  },

  async upsertRevenusNonSalaries(rns: RevenusNonSalaries): Promise<RevenusNonSalaries> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const { data, error } = await supabase
      .from('revenus_non_salaries')
      .upsert(revenusNonSalariesToRow(rns, user.id) as never, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error upserting revenus non salaries:', error);
      }
      throw error;
    }

    return rowToRevenusNonSalaries(data as RevenusNonSalariesRow);
  },

  async deleteRevenusNonSalaries(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const { error } = await supabase
      .from('revenus_non_salaries')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error deleting revenus non salaries:', error);
      }
      throw error;
    }
  },
};
