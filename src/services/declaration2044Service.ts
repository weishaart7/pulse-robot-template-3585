import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import type { Immeuble2044Input, PartSociete2044Input } from '@/lib/fiscalite/calculerDeclaration2044';

// Persistance de la déclaration 2044 (une par foyer et par année de revenus) — voir la
// migration declaration_2044. Seules les surcharges sont stockées : une colonne de montant à
// NULL signifie « valeur préremplie » (depuis Immobilier / Actifs-Passifs, calculée à
// l'affichage), une valeur signifie « montant saisi par l'utilisateur ». La rubrique 450
// lit le stock deficits_fonciers_reportes (deficitFoncierService), sans table propre.

export type Declaration2044Record = Tables<'declarations_2044'>;
export type Declaration2044ImmeubleRecord = Tables<'declaration_2044_immeubles'>;
export type Declaration2044PartRecord = Tables<'declaration_2044_parts'>;

export interface Declaration2044Complete {
  declaration: Declaration2044Record;
  immeubles: Declaration2044ImmeubleRecord[];
  parts: Declaration2044PartRecord[];
}

type ImmeubleChanges = Omit<TablesUpdate<'declaration_2044_immeubles'>, 'id' | 'user_id' | 'declaration_id' | 'created_at' | 'updated_at'>;
type PartChanges = Omit<TablesUpdate<'declaration_2044_parts'>, 'id' | 'user_id' | 'declaration_id' | 'created_at' | 'updated_at'>;

const requireUser = async () => {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Non authentifié');
  return data.user;
};

export const declaration2044Service = {
  /** Charge la 2044 de l'année avec ses immeubles et parts ; `creer` la crée si elle n'existe pas (sinon null). */
  async get(annee: number, creer = false): Promise<Declaration2044Complete | null> {
    const user = await requireUser();
    const { data: existante, error } = await supabase
      .from('declarations_2044')
      .select('*')
      .eq('user_id', user.id)
      .eq('annee', annee)
      .maybeSingle();
    if (error) throw error;

    let declaration = existante;
    if (!declaration) {
      if (!creer) return null;
      const { data, error: insertError } = await supabase
        .from('declarations_2044')
        .insert({ user_id: user.id, annee })
        .select()
        .single();
      if (insertError) throw insertError;
      declaration = data;
    }

    const [immeubles, parts] = await Promise.all([
      supabase.from('declaration_2044_immeubles').select('*')
        .eq('declaration_id', declaration.id).eq('user_id', user.id).order('ordre'),
      supabase.from('declaration_2044_parts').select('*')
        .eq('declaration_id', declaration.id).eq('user_id', user.id).order('ordre'),
    ]);
    if (immeubles.error) throw immeubles.error;
    if (parts.error) throw parts.error;
    return { declaration, immeubles: immeubles.data || [], parts: parts.data || [] };
  },

  async createImmeuble(declarationId: string, values: ImmeubleChanges = {}): Promise<Declaration2044ImmeubleRecord> {
    const user = await requireUser();
    const row: TablesInsert<'declaration_2044_immeubles'> = { ...values, declaration_id: declarationId, user_id: user.id };
    const { data, error } = await supabase.from('declaration_2044_immeubles').insert(row).select().single();
    if (error) throw error;
    return data;
  },

  async updateImmeuble(id: string, changes: ImmeubleChanges): Promise<Declaration2044ImmeubleRecord> {
    const user = await requireUser();
    const { data, error } = await supabase.from('declaration_2044_immeubles')
      .update(changes).eq('id', id).eq('user_id', user.id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteImmeuble(id: string): Promise<void> {
    const user = await requireUser();
    const { error } = await supabase.from('declaration_2044_immeubles').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw error;
  },

  async createPart(declarationId: string, values: PartChanges = {}): Promise<Declaration2044PartRecord> {
    const user = await requireUser();
    const row: TablesInsert<'declaration_2044_parts'> = { ...values, declaration_id: declarationId, user_id: user.id };
    const { data, error } = await supabase.from('declaration_2044_parts').insert(row).select().single();
    if (error) throw error;
    return data;
  },

  async updatePart(id: string, changes: PartChanges): Promise<Declaration2044PartRecord> {
    const user = await requireUser();
    const { data, error } = await supabase.from('declaration_2044_parts')
      .update(changes).eq('id', id).eq('user_id', user.id).select().single();
    if (error) throw error;
    return data;
  },

  async deletePart(id: string): Promise<void> {
    const user = await requireUser();
    const { error } = await supabase.from('declaration_2044_parts').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw error;
  },
};

/** Colonne SQL → champ du moteur, pour les montants surchargeables d'un immeuble. */
export const COLONNES_IMMEUBLE_2044 = {
  loyers_bruts: 'loyersBruts',
  depenses_charge_locataires: 'depensesChargeLocataires',
  recettes_diverses: 'recettesDiverses',
  valeur_locative_reservee: 'valeurLocativeReservee',
  frais_administration_gestion: 'fraisAdministrationGestion',
  nombre_locaux: 'nombreLocaux',
  primes_assurance: 'primesAssurance',
  travaux: 'travaux',
  travaux_renovation_energetique: 'travauxRenovationEnergetique',
  charges_non_recuperees: 'chargesNonRecuperees',
  indemnites_eviction: 'indemnitesEviction',
  taxes_foncieres: 'taxesFoncieres',
  taux_deduction_specifique: 'tauxDeductionSpecifique',
  provisions_charges: 'provisionsCharges',
  regularisation_provisions: 'regularisationProvisions',
  interets_emprunt: 'interetsEmprunt',
  reintegration_supplement_deduction: 'reintegrationSupplementDeduction',
} as const satisfies Record<string, keyof Immeuble2044Input>;

export const COLONNES_PART_2044 = {
  revenus_bruts: 'revenusBruts',
  frais_et_charges: 'fraisEtCharges',
  dont_renovation_energetique: 'dontRenovationEnergetique',
  interets_emprunt: 'interetsEmprunt',
} as const satisfies Record<string, keyof PartSociete2044Input>;

/** Valeurs préremplies écrasées par les seules colonnes non NULL (surcharges) de l'enregistrement. */
export function toImmeuble2044Input(
  record: Declaration2044ImmeubleRecord,
  prerempli: Partial<Immeuble2044Input> = {},
): Immeuble2044Input {
  const input: Immeuble2044Input = { loyersBruts: 0, ...prerempli, id: record.id, assetId: record.asset_id ?? undefined };
  input.denomination = record.denomination ?? prerempli.denomination;
  for (const [colonne, champ] of Object.entries(COLONNES_IMMEUBLE_2044)) {
    const valeur = record[colonne as keyof typeof COLONNES_IMMEUBLE_2044];
    if (valeur !== null) input[champ] = Number(valeur);
  }
  return input;
}

export function toPartSociete2044Input(
  record: Declaration2044PartRecord,
  prerempli: Partial<PartSociete2044Input> = {},
): PartSociete2044Input {
  const input: PartSociete2044Input = { revenusBruts: 0, ...prerempli, id: record.id, assetId: record.asset_id ?? undefined };
  input.denomination = record.denomination ?? prerempli.denomination;
  for (const [colonne, champ] of Object.entries(COLONNES_PART_2044)) {
    const valeur = record[colonne as keyof typeof COLONNES_PART_2044];
    if (valeur !== null) input[champ] = Number(valeur);
  }
  return input;
}
