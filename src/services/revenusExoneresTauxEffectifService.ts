import { supabase } from '@/integrations/supabase/client';
import { RevenusExoneresTauxEffectifInput } from '@/lib/fiscalite';

export interface RevenusExoneresTauxEffectif extends RevenusExoneresTauxEffectifInput {
  id?: string;
}

/**
 * Les colonnes `numeric` de Postgres sont sérialisées en chaîne par PostgREST
 * (préservation de la précision) : le type ci-dessous reflète la forme réelle
 * reçue sur le fil, coercée en `number` par `toNumberOrNull` dans
 * `rowToRevenusExoneresTauxEffectif` (même défaut que `revenusSalairesService.ts`).
 */
interface RevenusExoneresTauxEffectifRow {
  id: string;
  user_id: string;
  case_1ac: number | string | null;
  case_1bc: number | string | null;
  case_1ge: boolean;
  case_1he: boolean;
  case_1ae: number | string | null;
  case_1be: number | string | null;
  case_1ah: number | string | null;
  case_1bh: number | string | null;
  case_rse: string | null;
  case_rsf: string | null;
}

function toNumberOrNull(value: number | string | null): number | null {
  if (value === null) return null;
  return typeof value === 'number' ? value : Number(value);
}

function rowToRevenusExoneresTauxEffectif(row: RevenusExoneresTauxEffectifRow): RevenusExoneresTauxEffectif {
  return {
    id: row.id,
    case1ac: toNumberOrNull(row.case_1ac),
    case1bc: toNumberOrNull(row.case_1bc),
    case1ge: row.case_1ge,
    case1he: row.case_1he,
    case1ae: toNumberOrNull(row.case_1ae),
    case1be: toNumberOrNull(row.case_1be),
    case1ah: toNumberOrNull(row.case_1ah),
    case1bh: toNumberOrNull(row.case_1bh),
    caseRse: row.case_rse,
    caseRsf: row.case_rsf,
  };
}

function revenusExoneresTauxEffectifToRow(revenus: RevenusExoneresTauxEffectif, userId: string) {
  return {
    user_id: userId,
    case_1ac: revenus.case1ac,
    case_1bc: revenus.case1bc,
    case_1ge: revenus.case1ge,
    case_1he: revenus.case1he,
    case_1ae: revenus.case1ae,
    case_1be: revenus.case1be,
    case_1ah: revenus.case1ah,
    case_1bh: revenus.case1bh,
    case_rse: revenus.caseRse,
    case_rsf: revenus.caseRsf,
  };
}

export const revenusExoneresTauxEffectifService = {
  async getRevenusExoneresTauxEffectif(): Promise<RevenusExoneresTauxEffectif | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('revenus_exoneres_taux_effectif')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching revenus exoneres taux effectif:', error);
      }
      throw error;
    }

    return data ? rowToRevenusExoneresTauxEffectif(data as RevenusExoneresTauxEffectifRow) : null;
  },

  async upsertRevenusExoneresTauxEffectif(revenus: RevenusExoneresTauxEffectif): Promise<RevenusExoneresTauxEffectif> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const { data, error } = await supabase
      .from('revenus_exoneres_taux_effectif')
      .upsert(revenusExoneresTauxEffectifToRow(revenus, user.id), { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error upserting revenus exoneres taux effectif:', error);
      }
      throw error;
    }

    return rowToRevenusExoneresTauxEffectif(data as RevenusExoneresTauxEffectifRow);
  },

  async deleteRevenusExoneresTauxEffectif(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const { error } = await supabase
      .from('revenus_exoneres_taux_effectif')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error deleting revenus exoneres taux effectif:', error);
      }
      throw error;
    }
  },
};
