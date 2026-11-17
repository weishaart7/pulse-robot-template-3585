import { supabase } from '@/integrations/supabase/client';
import { ReductionsCreditsImpotInput } from '@/lib/fiscalite';

export interface ReductionsCreditsImpot extends ReductionsCreditsImpotInput {
  id?: string;
}

const CASES_NUMERIQUES = [
  'case7ud', 'case7uq', 'case7uj', 'case7uf', 'case7db', 'case7dr', 'case7dl',
  'case7ga', 'case7gb', 'case7gc', 'case7ge', 'case7gf', 'case7gg',
  'case7ea', 'case7eb', 'case7ec', 'case7ed', 'case7ef', 'case7eg',
  'case7ac', 'case7ae', 'case7wn', 'case7wo', 'case7wm', 'case7uh', 'case7dc',
  'case7ci', 'case7co', 'case7cr', 'case7dz', 'case7gw', 'case7ct', 'case7cu', 'case7cw', 'case7cp', 'case7cq', 'case7cv', 'case7do', 'case7dp', 'case7ca', 'case7gq', 'case7gr', 'case7fm', 'case7fl', 'case7fn', 'case7gn', 'case7en',
  'case7bs', 'case7bt', 'case7bu', 'case7bw', 'case7ek', 'case7cy', 'case7dy', 'case7ey', 'case7fy', 'case7gy', 'case7mx', 'case7my', 'case7nz', 'case7uc', 'case7fh', 'case7us',
  'case7un', 'case7ul', 'case7up', 'case7ut', 'case7tr', 'case7ts', 'case7tt', 'case7tu', 'case7tv', 'case7tw', 'case7ta', 'case7tb', 'case7vq', 'case7te', 'case7vr', 'case7tf', 'case7vs', 'case7th', 'case7vu', 'case7ti', 'case7vv', 'case7tj', 'case7vt', 'case7tk',
  'case7uo', 'case7xs', 'case7xt', 'case7xu', 'case7xw', 'case7xy', 'case7va', 'case7vm', 'case7vc', 'case7ag', 'case7wp', 'case7zq', 'case7zr', 'case7zs', 'case7zt', 'case7bk', 'case7bl', 'case7bm', 'case7bn', 'case7bo', 'case7wr', 'case7tx', 'case7ty', 'case7kw', 'case7ky', 'case7kx',
  'case7nm', 'case7nn', 'case7pf', 'case7pg', 'case7no', 'case7np', 'case7nq', 'case7nr', 'case7lq', 'case7lr', 'case7ls', 'case7lt', 'case7lu', 'case7lv', 'case7lw', 'case7lx', 'case7vw', 'case7vx', 'case7vy', 'case7vz', 'case7vd', 'case7ve', 'case7vf', 'case7vg', 'case7qm', 'case7qn', 'case7qo', 'case7qp', 'case7qr', 'case7qs', 'case7qt', 'case7qu', 'case7sd', 'case7se', 'case7sf', 'case7sg', 'case7jb', 'case7jd', 'case7jr', 'case7js', 'case7jt', 'case7ju', 'case7lg', 'case7lh', 'case7li', 'case7lj', 'case7je', 'case7jf', 'case7jg', 'case7jh', 'case7ie', 'case7if', 'case7ig', 'case7ih', 'case7ne', 'case7nf', 'case7ng', 'case7nh', 'case7jn', 'case7jo', 'case7jp', 'case7jq', 'case7jv', 'case7jw', 'case7jx', 'case7jy', 'case7ji', 'case7jj', 'case7jk', 'case7jl', 'case7ia', 'case7ib', 'case7ic', 'case7id', 'case7kn', 'case7ko', 'case7kp', 'case7kq', 'case7km', 'case7mm', 'case7jm', 'case7lm', 'case7rb', 'case7rd', 'case7rf', 'case7rh', 'case7fw', 'case7fx', 'case7hl', 'case7hm', 'case7xa', 'case7xb', 'case7xh', 'case7xi', 'case7rx', 'case7ry', 'case7ri', 'case7rj', 'case7sh', 'case7si', 'case7ro', 'case7rp', 'case7of', 'case7og', 'case7na', 'case7nb', 'case7nc', 'case7nd', 'case7oh', 'case7oi', 'case7la', 'case7lb', 'case7lc', 'case7ld', 'case7le', 'case7lf', 'case7sy', 'case7sz', 'case7uy', 'case7uz', 'case7wy', 'case7wz',
  'case7rt', 'case7ru', 'case7mo', 'case7ma', 'case7mi', 'case7ns', 'case7oj', 'case7me', 'case7mp', 'case7mb', 'case7mj', 'case7nt', 'case7ou', 'case7mf', 'case7mq', 'case7mc', 'case7mk', 'case7nu', 'case7ov', 'case7mg', 'case7mr', 'case7md', 'case7ml', 'case7nv', 'case7ow', 'case7mh', 'case7xc', 'case7xd', 'case7xe', 'case7xl', 'case7xm', 'case7xn', 'case7ya', 'case7yc', 'case7ym', 'case7yn', 'case7yo', 'case7yp', 'case7xj', 'case7xk', 'case7xo', 'case7xp', 'case7xq', 'case7yr', 'case7ys', 'case7yt', 'case7yu', 'case7yv', 'case7yw', 'case7el', 'case7em', 'case7eq', 'case7er', 'case7ev', 'case7ew', 'case7ex', 'case7fa', 'case7fc', 'case7fd', 'case7eh', 'case7ei', 'case7eu', 'case7ez', 'case7fb', 'case7fe', 'case7fi', 'case7fk', 'case7zi', 'case7uu', 'case7rk', 'case7lk', 'case7im', 'case7ba', 'case7zj', 'case7uv', 'case7rl', 'case7ll', 'case7in', 'case7bb', 'case7zk', 'case7uw', 'case7rm', 'case7lo', 'case7io', 'case7bc', 'case7zl', 'case7ux', 'case7rn', 'case7lp', 'case7ip', 'case7bd', 'case7ha', 'case7hj', 'case7hk', 'case7hn', 'case7hy', 'case7ij', 'case7iq', 'case7iw', 'case7ka', 'case7kb', 'case7kk', 'case7ox', 'case7ok', 'case7ol', 'case7om', 'case7on', 'case7oo', 'case7pa', 'case7pb', 'case7ph', 'case7pi', 'case7pj', 'case7py', 'case7bi', 'case7bq', 'case7bx', 'case7by', 'case7bz', 'case7di', 'case7du', 'case7dv', 'case7dx', 'case7ai', 'case7ap', 'case7aq', 'case7ar', 'case7as', 'case7at', 'case7au', 'case7sj', 'case7sk', 'case7sr', 'case7tc', 'case7td', 'case7ua', 'case7ub', 'case7ue', 'case7ug', 'case7ui', 'case7uk', 'case7qa', 'case7qb', 'case7qc', 'case7qd', 'case7qe', 'case7qg', 'case7qq', 'case7qw', 'case7qx', 'case7qy', 'case7qz', 'case7ra', 'case7rc', 'case7hz', 'case7iv', 'case7vj', 'case7vb', 'case7kd', 'case7pd', 'case7ku', 'case7iy', 'case7vl', 'case7vh', 'case7kc', 'case7pc', 'case7kt', 'case7ix', 'case7vk', 'case7vi', 'case7pe', 'case7kv', 'case7iz', 'case7vo', 'case7vp',
  'case7mn', 'case7mw', 'case7mz', 'case7pz', 'case7sl', 'case7sx', 'case7st', 'case7ss', 'case7sm', 'case7sp', 'case7sn', 'case7so', 'case7sa', 'case7sb', 'case7sc', 'case7ht', 'case7hd', 'case7ke', 'case7oa', 'case7po', 'case7pt', 'case7hu', 'case7he', 'case7kf', 'case7ob', 'case7pp', 'case7pu', 'case7hv', 'case7hf', 'case7kg', 'case7oc', 'case7pq', 'case7pv', 'case7hw', 'case7hg', 'case7kh', 'case7od', 'case7pr', 'case7pw', 'case7hx', 'case7hh', 'case7ki', 'case7oe', 'case7ps', 'case7px',
  'case7wl', 'case7gz', 'case7cd', 'case7ce', 'case7wi', 'case7zz', 'case7zy', 'case7zx', 'case7zw', 'case8ys', 'case8yu',
  'caseHqa', 'caseHyj', 'caseHye', 'caseHyf', 'caseHyg', 'caseHyh', 'caseHyi', 'caseHoa', 'caseHob', 'caseHoc', 'caseHoh', 'caseHoi', 'caseHoj', 'caseHok', 'caseHol', 'caseHom', 'caseHon', 'caseHoo', 'caseHop', 'caseHoq', 'caseHor', 'caseHos', 'caseHot', 'caseHou', 'caseHov', 'caseHow', 'caseHod', 'caseHoe', 'caseHof', 'caseHog', 'caseHox', 'caseHoy', 'caseHoz', 'caseHua', 'caseHub', 'caseHuc', 'caseHud', 'caseHue', 'caseHuf', 'caseHug', 'caseHuh', 'caseHui', 'caseHuj', 'caseHuk', 'caseHul', 'caseHum', 'caseHun', 'caseHuo', 'caseHup', 'caseHuq', 'caseHur', 'caseHus', 'caseHut', 'caseHuu', 'caseHkc', 'caseHva', 'caseHvb', 'caseHvc', 'caseHvd', 'caseHve', 'caseHvf', 'caseHvg', 'caseHvk', 'caseHvl', 'caseHvm', 'caseHvn', 'caseHvo', 'caseHls', 'caseHlt', 'caseHlu', 'caseHlv', 'caseHlw', 'caseHgs', 'caseHgt', 'caseHgu', 'caseHgw', 'caseHhs', 'caseHht', 'caseHhu', 'caseHhw', 'caseHis', 'caseHit', 'caseHiu', 'caseHiw', 'caseHjs', 'caseHjt', 'caseHju', 'caseHjw', 'caseHks', 'caseHkt', 'caseHku', 'caseHkw', 'caseHja',
] as const;

/** case7ud → case_7ud (colonne Supabase). */
const colonne = (cle: string) => cle.replace(/^case/, 'case_').toLowerCase();

/**
 * Les colonnes `numeric` sont sérialisées en chaîne par PostgREST : coercées en
 * `number` ici (même défaut que `revenusCapitauxMobiliersService.ts`).
 */
type ReductionsCreditsImpotRow = { id: string; user_id: string; case_7dq: boolean | null; case_7dg: boolean | null; membres_plus_65_ans: number | null } & Record<string, unknown>;

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return typeof value === 'number' ? value : Number(value);
}

function rowToReductionsCreditsImpot(row: ReductionsCreditsImpotRow): ReductionsCreditsImpot {
  const result = { id: row.id, case7dq: row.case_7dq ?? false, case7dg: row.case_7dg ?? false, membresPlus65Ans: row.membres_plus_65_ans } as ReductionsCreditsImpot;
  for (const cle of CASES_NUMERIQUES) result[cle] = toNumberOrNull(row[colonne(cle)]);
  return result;
}

function reductionsCreditsImpotToRow(rf: ReductionsCreditsImpot, userId: string) {
  const row: Record<string, unknown> = { user_id: userId, case_7dq: rf.case7dq, case_7dg: rf.case7dg, membres_plus_65_ans: rf.membresPlus65Ans };
  for (const cle of CASES_NUMERIQUES) row[colonne(cle)] = rf[cle];
  return row;
}

export const reductionsCreditsImpotService = {
  async getReductionsCreditsImpot(): Promise<ReductionsCreditsImpot | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('reductions_credits_impot')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching reductions credits impot:', error);
      }
      throw error;
    }

    return data ? rowToReductionsCreditsImpot(data as ReductionsCreditsImpotRow) : null;
  },

  async upsertReductionsCreditsImpot(rf: ReductionsCreditsImpot): Promise<ReductionsCreditsImpot> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const { data, error } = await supabase
      .from('reductions_credits_impot')
      .upsert(reductionsCreditsImpotToRow(rf, user.id) as never, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error upserting reductions credits impot:', error);
      }
      throw error;
    }

    return rowToReductionsCreditsImpot(data as ReductionsCreditsImpotRow);
  },

  async deleteReductionsCreditsImpot(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const { error } = await supabase
      .from('reductions_credits_impot')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error deleting reductions credits impot:', error);
      }
      throw error;
    }
  },
};
