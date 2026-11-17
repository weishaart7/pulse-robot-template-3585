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
  'case7bs', 'case7bt', 'case7bu', 'case7bw', 'case7ek', 'case7cy', 'case7dy', 'case7ey', 'case7fy', 'case7gy', 'case7mx', 'case7my', 'case7nz', 'case7uc', 'case7fh',
  'case7un', 'case7ul', 'case7up', 'case7ut', 'case7tr', 'case7ts', 'case7tt', 'case7tu', 'case7tv', 'case7tw', 'case7ta', 'case7tb', 'case7vq', 'case7te', 'case7vr', 'case7tf', 'case7vs', 'case7th', 'case7vu', 'case7ti', 'case7vv', 'case7tj', 'case7vt', 'case7tk',
  'case7uo', 'case7xs', 'case7xt', 'case7xu', 'case7xw', 'case7xy', 'case7va', 'case7vm', 'case7vc', 'case7ag', 'case7wp', 'case7zq', 'case7zr', 'case7zs', 'case7zt', 'case7bk', 'case7bl', 'case7bm', 'case7bn', 'case7bo', 'case7wr', 'case7tx', 'case7ty', 'case7kw', 'case7ky', 'case7kx',
  'case7nm', 'case7nn', 'case7pf', 'case7pg', 'case7no', 'case7np', 'case7nq', 'case7nr', 'case7lq', 'case7lr', 'case7ls', 'case7lt', 'case7lu', 'case7lv', 'case7lw', 'case7lx', 'case7vw', 'case7vx', 'case7vy', 'case7vz', 'case7vd', 'case7ve', 'case7vf', 'case7vg', 'case7qm', 'case7qn', 'case7qo', 'case7qp', 'case7qr', 'case7qs', 'case7qt', 'case7qu', 'case7sd', 'case7se', 'case7sf', 'case7sg', 'case7jb', 'case7jd', 'case7jr', 'case7js', 'case7jt', 'case7ju', 'case7lg', 'case7lh', 'case7li', 'case7lj', 'case7je', 'case7jf', 'case7jg', 'case7jh', 'case7ie', 'case7if', 'case7ig', 'case7ih', 'case7ne', 'case7nf', 'case7ng', 'case7nh', 'case7jn', 'case7jo', 'case7jp', 'case7jq', 'case7jv', 'case7jw', 'case7jx', 'case7jy', 'case7ji', 'case7jj', 'case7jk', 'case7jl', 'case7ia', 'case7ib', 'case7ic', 'case7id', 'case7kn', 'case7ko', 'case7kp', 'case7kq', 'case7km', 'case7mm', 'case7jm', 'case7lm', 'case7rb', 'case7rd', 'case7rf', 'case7rh', 'case7fw', 'case7fx', 'case7hl', 'case7hm', 'case7xa', 'case7xb', 'case7xh', 'case7xi', 'case7rx', 'case7ry', 'case7ri', 'case7rj', 'case7sh', 'case7si', 'case7ro', 'case7rp', 'case7of', 'case7og', 'case7na', 'case7nb', 'case7nc', 'case7nd', 'case7oh', 'case7oi', 'case7la', 'case7lb', 'case7lc', 'case7ld', 'case7le', 'case7lf', 'case7sy', 'case7sz', 'case7uy', 'case7uz', 'case7wy', 'case7wz',
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
