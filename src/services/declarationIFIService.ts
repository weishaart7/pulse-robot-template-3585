import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import type { CategorieBienIFI } from '@/lib/fiscalite/calculerDeclarationIFI';
import type { LigneActifIFI, LigneDetteIFI } from '@/lib/fiscalite/preremplissageIFI';

// Persistance de la déclaration 2042-IFI (une par foyer et par année d'imposition) — voir la
// migration declaration_ifi. Seules les surcharges sont stockées : une colonne à NULL signifie
// « valeur préremplie » (depuis Patrimoine / Passifs, calculée à l'affichage), une valeur signifie
// « saisi par l'utilisateur ». Une ligne sans actif ni emprunt relié est une saisie libre.

export type DeclarationIFIRecord = Tables<'declarations_ifi'>;
export type DeclarationIFIActifRecord = Tables<'declaration_ifi_actifs'>;
export type DeclarationIFIDetteRecord = Tables<'declaration_ifi_dettes'>;

export interface DeclarationIFIComplete {
  declaration: DeclarationIFIRecord;
  actifs: DeclarationIFIActifRecord[];
  dettes: DeclarationIFIDetteRecord[];
}

type Modifiable<T> = Omit<T, 'id' | 'user_id' | 'declaration_id' | 'created_at' | 'updated_at'>;
type DeclarationChanges = Omit<TablesUpdate<'declarations_ifi'>, 'id' | 'user_id' | 'annee' | 'created_at' | 'updated_at'>;
type ActifChanges = Modifiable<TablesUpdate<'declaration_ifi_actifs'>>;
type DetteChanges = Modifiable<TablesUpdate<'declaration_ifi_dettes'>>;

const requireUser = async () => {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Non authentifié');
  return data.user;
};

export const declarationIFIService = {
  /** Charge la déclaration de l'année avec ses actifs et dettes ; `creer` la crée si elle n'existe pas (sinon null). */
  async get(annee: number, creer = false): Promise<DeclarationIFIComplete | null> {
    const user = await requireUser();
    const { data: existante, error } = await supabase
      .from('declarations_ifi')
      .select('*')
      .eq('user_id', user.id)
      .eq('annee', annee)
      .maybeSingle();
    if (error) throw error;

    let declaration = existante;
    if (!declaration) {
      if (!creer) return null;
      const { data, error: insertError } = await supabase
        .from('declarations_ifi')
        .insert({ user_id: user.id, annee })
        .select()
        .single();
      if (insertError) throw insertError;
      declaration = data;
    }

    const [actifs, dettes] = await Promise.all([
      supabase.from('declaration_ifi_actifs').select('*')
        .eq('declaration_id', declaration.id).eq('user_id', user.id).order('ordre'),
      supabase.from('declaration_ifi_dettes').select('*')
        .eq('declaration_id', declaration.id).eq('user_id', user.id).order('ordre'),
    ]);
    if (actifs.error) throw actifs.error;
    if (dettes.error) throw dettes.error;
    return { declaration, actifs: actifs.data || [], dettes: dettes.data || [] };
  },

  async update(id: string, changes: DeclarationChanges): Promise<DeclarationIFIRecord> {
    const user = await requireUser();
    const { data, error } = await supabase.from('declarations_ifi')
      .update(changes).eq('id', id).eq('user_id', user.id).select().single();
    if (error) throw error;
    return data;
  },

  async createActif(declarationId: string, values: ActifChanges = {}): Promise<DeclarationIFIActifRecord> {
    const user = await requireUser();
    const row: TablesInsert<'declaration_ifi_actifs'> = { ...values, declaration_id: declarationId, user_id: user.id };
    const { data, error } = await supabase.from('declaration_ifi_actifs').insert(row).select().single();
    if (error) throw error;
    return data;
  },

  async updateActif(id: string, changes: ActifChanges): Promise<DeclarationIFIActifRecord> {
    const user = await requireUser();
    const { data, error } = await supabase.from('declaration_ifi_actifs')
      .update(changes).eq('id', id).eq('user_id', user.id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteActif(id: string): Promise<void> {
    const user = await requireUser();
    const { error } = await supabase.from('declaration_ifi_actifs').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw error;
  },

  async createDette(declarationId: string, values: DetteChanges = {}): Promise<DeclarationIFIDetteRecord> {
    const user = await requireUser();
    const row: TablesInsert<'declaration_ifi_dettes'> = { ...values, declaration_id: declarationId, user_id: user.id };
    const { data, error } = await supabase.from('declaration_ifi_dettes').insert(row).select().single();
    if (error) throw error;
    return data;
  },

  async updateDette(id: string, changes: DetteChanges): Promise<DeclarationIFIDetteRecord> {
    const user = await requireUser();
    const { data, error } = await supabase.from('declaration_ifi_dettes')
      .update(changes).eq('id', id).eq('user_id', user.id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteDette(id: string): Promise<void> {
    const user = await requireUser();
    const { error } = await supabase.from('declaration_ifi_dettes').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw error;
  },
};

/** 'indirect' en base = part de société (9CA), sans catégorie d'annexe 2 côté moteur. */
const categorieDepuisBase = (c: string | null): CategorieBienIFI | undefined | null =>
  c === null ? null : c === 'indirect' ? undefined : (c as CategorieBienIFI);

/** Ligne préremplie écrasée par les seules colonnes non NULL (surcharges) de l'enregistrement. */
export function toLigneActifIFI(record: DeclarationIFIActifRecord, prerempli?: LigneActifIFI): LigneActifIFI & { id: string; exclu: boolean; fractionTaxable?: number } {
  const categorie = categorieDepuisBase(record.categorie);
  return {
    id: record.id,
    assetId: record.asset_id ?? undefined,
    denomination: record.denomination ?? prerempli?.denomination ?? 'Bien',
    categorie: categorie === null ? prerempli?.categorie : categorie,
    valeur: record.valeur !== null ? Number(record.valeur) : prerempli?.valeur ?? 0,
    fractionTaxable: record.fraction_taxable !== null ? Number(record.fraction_taxable) : undefined,
    exclu: record.exclu,
    aVerifier: prerempli?.aVerifier ?? [],
  };
}

export function toLigneDetteIFI(record: DeclarationIFIDetteRecord, prerempli?: LigneDetteIFI): LigneDetteIFI & { id: string; exclue: boolean } {
  const categorie = categorieDepuisBase(record.categorie_bien);
  const montantSaisi = record.montant !== null;
  return {
    ...prerempli,
    id: record.id,
    empruntId: record.emprunt_id ?? undefined,
    denomination: record.denomination ?? prerempli?.denomination ?? 'Dette',
    ligne: (record.ligne as LigneDetteIFI['ligne'] | null) ?? prerempli?.ligne ?? '9GH',
    montant: montantSaisi ? Number(record.montant) : prerempli?.montant ?? 0,
    categorieBien: categorie === null ? prerempli?.categorieBien : categorie,
    // Un montant saisi remplace le calcul dégressif du prêt in fine.
    inFine: montantSaisi ? undefined : prerempli?.inFine,
    exclue: record.exclue,
    aVerifier: prerempli?.aVerifier ?? [],
  };
}
