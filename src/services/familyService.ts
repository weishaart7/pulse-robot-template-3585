import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

// Types dérivés du schéma généré (integrations/supabase/types.ts) : une colonne
// ajoutée ou supprimée en base se répercute ici sans copie manuelle. Partial :
// les écritures sont des upserts partiels (seuls les champs fournis changent).
type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

export type FamilyProfile = Partial<Row<'family_profiles'>>;

// clauses_contrat : réservé à la clé societe_acquets, lu / écrit via
// lirePerimetreDesClauses / clausesAvecPerimetre (lib/patrimoine/societeAcquets.ts).
export type MaritalStatus = Partial<Row<'marital_status'>>;

export type FamilyLink = Partial<Row<'family_links'>> & Pick<Row<'family_links'>, 'lien_familial' | 'nom'>;

// Usage d'un membre hors de family_links (fonction Postgres family_link_usages) :
// tant qu'il en a un, sa suppression est refusée par la base.
export interface FamilyLinkUsage {
  type: 'liberalite' | 'indivision' | 'demembrement' | 'assurance_vie';
  libelle: string;
  ref_id: string;
}

// Message levé par delete_family_link_cascade pour un membre encore utilisé.
export const MEMBRE_UTILISE = 'MEMBRE_UTILISE';

export const familyService = {
  // Family Profile
  async getFamilyProfile(): Promise<FamilyProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('family_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching family profile:', error);
      }
      throw error;
    }

    return data;
  },

  async upsertFamilyProfile(profile: FamilyProfile): Promise<FamilyProfile> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const profileData = {
      ...profile,
      user_id: user.id,
    };

    const { data, error } = await supabase
      .from('family_profiles')
      .upsert(profileData, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error upserting family profile:', error);
      }
      throw error;
    }

    return data;
  },

  // Marital Status
  async getMaritalStatus(): Promise<MaritalStatus | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('marital_status')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching marital status:', error);
      }
      throw error;
    }

    return data;
  },

  async upsertMaritalStatus(status: MaritalStatus): Promise<MaritalStatus> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const statusData = {
      ...status,
      user_id: user.id,
    };

    const { data, error } = await supabase
      .from('marital_status')
      .upsert(statusData, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error upserting marital status:', error);
      }
      throw error;
    }

    return data;
  },

  // Family Links
  async getFamilyLinks(): Promise<FamilyLink[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('family_links')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching family links:', error);
      }
      throw error;
    }

    return data || [];
  },

  async createFamilyLink(link: Omit<FamilyLink, 'id' | 'user_id'>): Promise<FamilyLink> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const linkData = {
      ...link,
      user_id: user.id,
    };

    const { data, error } = await supabase
      .from('family_links')
      .insert(linkData)
      .select()
      .single();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error creating family link:', error);
      }
      throw error;
    }

    return data;
  },

  async updateFamilyLink(id: string, link: Partial<FamilyLink>): Promise<FamilyLink> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // La RLS ("Users can update their own family links", auth.uid() = user_id)
    // fait déjà foi : le .eq('user_id', ...) ici évite juste de matcher 0 ligne
    // (et donc une erreur "no rows" peu explicite) sur un id d'un autre user.
    const { data, error } = await supabase
      .from('family_links')
      .update(link)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error updating family link:', error);
      }
      throw error;
    }

    return data;
  },

  // Réinitialise le rattachement (enfant_de / parent_de) des membres donnés,
  // avant un changement de lien du membre auquel ils étaient rattachés.
  async resetRattachements(ids: string[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const { error } = await supabase
      .from('family_links')
      .update({ enfant_de: null, parent_de: null })
      .in('id', ids)
      .eq('user_id', user.id);

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error resetting family links attachment:', error);
      }
      throw error;
    }
  },

  async getFamilyLinkUsages(id: string): Promise<FamilyLinkUsage[]> {
    const { data, error } = await supabase.rpc('family_link_usages', { p_id: id });

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching family link usages:', error);
      }
      throw error;
    }

    return (data ?? []) as FamilyLinkUsage[];
  },

  // Suppression atomique (fonction Postgres delete_family_link_cascade, SECURITY
  // INVOKER donc soumise à la RLS) : réinitialise enfant_de/parent_de des membres
  // dépendants puis supprime le membre, dans une seule transaction.
  async deleteFamilyLinkCascade(id: string): Promise<void> {
    const { error } = await supabase.rpc('delete_family_link_cascade', { p_id: id });

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error deleting family link:', error);
      }
      throw error;
    }
  },
};