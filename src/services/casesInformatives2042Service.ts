import { supabase } from '@/integrations/supabase/client';
import {
  cleCaseInformative,
  colonneCaseInformative,
  FormulaireCasesInformatives,
  TOUTES_CASES_INFORMATIVES_2027,
  ValeursCasesInformatives,
} from '@/lib/fiscalite/casesInformatives2027';

type Row = Record<string, unknown>;

/** Les colonnes `numeric` sont sérialisées en chaîne par PostgREST : coercées en `number`. */
function rowToValeurs(row: Row): ValeursCasesInformatives {
  const valeurs: ValeursCasesInformatives = {};
  for (const { code, type } of TOUTES_CASES_INFORMATIVES_2027) {
    const v = row[colonneCaseInformative(code)];
    valeurs[cleCaseInformative(code)] = type === 'coche' ? Boolean(v) : v === null || v === undefined ? null : Number(v);
  }
  return valeurs;
}

/**
 * Cases sans effet sur le calcul (voir casesInformatives2027.ts). Chaque formulaire n'enregistre que ses
 * propres colonnes : l'upsert laisse intactes celles des autres cadres.
 */
export const casesInformatives2042Service = {
  async get(): Promise<ValeursCasesInformatives | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('cases_informatives_2042')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) {
      if (import.meta.env.DEV) console.error('Error fetching cases informatives 2042:', error);
      throw error;
    }
    return data ? rowToValeurs(data as Row) : null;
  },

  async upsert(valeurs: ValeursCasesInformatives, formulaire: FormulaireCasesInformatives): Promise<ValeursCasesInformatives> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');
    const row: Row = { user_id: user.id };
    for (const { code, type, formulaire: f } of TOUTES_CASES_INFORMATIVES_2027) {
      if (f !== formulaire) continue;
      const v = valeurs[cleCaseInformative(code)];
      row[colonneCaseInformative(code)] = type === 'coche' ? Boolean(v) : v ?? null;
    }
    const { data, error } = await supabase
      .from('cases_informatives_2042')
      .upsert(row as never, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) {
      if (import.meta.env.DEV) console.error('Error upserting cases informatives 2042:', error);
      throw error;
    }
    return rowToValeurs(data as Row);
  },
};
