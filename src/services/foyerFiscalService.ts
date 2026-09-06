import { supabase } from '@/integrations/supabase/client';
import { EnfantCharge, FoyerFiscalInput, PersonneInvalideCharge } from '@/lib/fiscalite';

export interface FoyerFiscal extends FoyerFiscalInput {
  id?: string;
}

interface FoyerFiscalRow {
  id: string;
  user_id: string;
  situation_famille: string;
  lieu_residence: string;
  enfants_charge: unknown;
  personnes_invalides_charge: unknown;
  enfants_majeurs_rattaches: number;
  parent_isole: boolean;
  ancien_parent_isole: boolean;
  invalidite_declarant1: boolean;
  invalidite_declarant2: boolean;
  ancien_combattant_declarant1: boolean;
  ancien_combattant_declarant2: boolean;
  veuf_ancien_combattant: boolean;
  veuve_de_guerre: boolean;
}

function rowToFoyerFiscal(row: FoyerFiscalRow): FoyerFiscal {
  return {
    id: row.id,
    situationFamille: row.situation_famille as FoyerFiscalInput['situationFamille'],
    lieuResidence: row.lieu_residence as FoyerFiscalInput['lieuResidence'],
    enfantsCharge: (row.enfants_charge as EnfantCharge[]) ?? [],
    personnesInvalidesCharge: (row.personnes_invalides_charge as PersonneInvalideCharge[]) ?? [],
    enfantsMajeursRattaches: row.enfants_majeurs_rattaches,
    parentIsole: row.parent_isole,
    ancienParentIsole: row.ancien_parent_isole,
    invaliditeDeclarant1: row.invalidite_declarant1,
    invaliditeDeclarant2: row.invalidite_declarant2,
    ancienCombattantDeclarant1: row.ancien_combattant_declarant1,
    ancienCombattantDeclarant2: row.ancien_combattant_declarant2,
    veufAncienCombattant: row.veuf_ancien_combattant,
    veuveDeGuerre: row.veuve_de_guerre,
  };
}

function foyerFiscalToRow(foyer: FoyerFiscal, userId: string) {
  return {
    user_id: userId,
    situation_famille: foyer.situationFamille,
    lieu_residence: foyer.lieuResidence,
    enfants_charge: foyer.enfantsCharge,
    personnes_invalides_charge: foyer.personnesInvalidesCharge,
    enfants_majeurs_rattaches: foyer.enfantsMajeursRattaches,
    parent_isole: foyer.parentIsole,
    ancien_parent_isole: foyer.ancienParentIsole,
    invalidite_declarant1: foyer.invaliditeDeclarant1,
    invalidite_declarant2: foyer.invaliditeDeclarant2,
    ancien_combattant_declarant1: foyer.ancienCombattantDeclarant1,
    ancien_combattant_declarant2: foyer.ancienCombattantDeclarant2,
    veuf_ancien_combattant: foyer.veufAncienCombattant,
    veuve_de_guerre: foyer.veuveDeGuerre,
  };
}

export const foyerFiscalService = {
  async getFoyerFiscal(): Promise<FoyerFiscal | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('foyer_fiscal')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching foyer fiscal:', error);
      }
      throw error;
    }

    return data ? rowToFoyerFiscal(data as FoyerFiscalRow) : null;
  },

  async upsertFoyerFiscal(foyer: FoyerFiscal): Promise<FoyerFiscal> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const { data, error } = await supabase
      .from('foyer_fiscal')
      .upsert(foyerFiscalToRow(foyer, user.id), { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error upserting foyer fiscal:', error);
      }
      throw error;
    }

    return rowToFoyerFiscal(data as FoyerFiscalRow);
  },

  async deleteFoyerFiscal(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const { error } = await supabase
      .from('foyer_fiscal')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error deleting foyer fiscal:', error);
      }
      throw error;
    }
  },
};
