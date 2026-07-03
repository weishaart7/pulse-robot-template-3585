import { supabase } from '@/integrations/supabase/client';

export interface FamilyProfile {
  id?: string;
  user_id?: string;
  civility?: string;
  nom?: string;
  prenom?: string;
  commune_naissance?: string;
  pays_naissance?: string;
  nationalite?: string;
  date_naissance?: string;
  profession?: string;
  telephone?: string;
  email?: string;
  personne_handicapee?: boolean;
  ancien_combattant?: boolean;
  adresse_postale?: string;
  code_postal?: string;
  ville?: string;
  pays?: string;
  capacite_juridique?: string;
}

export interface MaritalStatus {
  id?: string;
  user_id?: string;
  statut_couple?: string;
  nom_conjoint?: string;
  prenom_conjoint?: string;
  civilite_conjoint?: string;
  date_naissance_conjoint?: string;
  lieu_naissance_conjoint?: string;
  nationalite_conjoint?: string;
  profession_conjoint?: string;
  profession_csp_conjoint?: string;
  personne_handicapee_conjoint?: boolean;
  ancien_combattant_conjoint?: boolean;
  nom_jeune_fille_conjoint?: string;
  pays_naissance_conjoint?: string;
  telephone_conjoint?: string;
  email_conjoint?: string;
  adresse_conjoint?: string;
  code_postal_conjoint?: string;
  ville_conjoint?: string;
  pays_conjoint?: string;
  date_pacs?: string;
  lieu_pacs?: string;
  convention_pacs?: string;
  date_mariage?: string;
  lieu_mariage?: string;
  regime_matrimonial?: string;
  nom_notaire?: string;
  adresse_notaire?: string;
  contrat_mariage?: string;
  parent_isole?: boolean;
  nombre_enfants_charges?: number;
  imposition_distincte?: boolean;
  mariage_precedent_personne?: boolean;
  mariage_precedent_conjoint?: boolean;
  duree_mariage_precedent_personne_annees?: number | null;
  duree_mariage_precedent_personne_mois?: number | null;
  duree_mariage_precedent_conjoint_annees?: number | null;
  duree_mariage_precedent_conjoint_mois?: number | null;
  donation_dernier_vivant_personne?: boolean;
  donation_dernier_vivant_conjoint?: boolean;
  date_donation_personne?: string;
  date_donation_conjoint?: string;
  clauses_contrat?: any;
}

export interface FamilyLink {
  id?: string;
  user_id?: string;
  lien_familial: string;
  civilite?: string;
  nom: string;
  prenom?: string;
  date_naissance?: string;
  est_decede?: boolean;
  date_deces?: string;
  handicap?: boolean;
  enfant_adopte?: string;
  enfant_renoncant?: boolean;
  enfant_renoncant_de?: string;
  branche_familiale?: string;
  enfant_de?: string;
  parent_de?: string;
  exoneration_succession?: boolean;
  enfant_a_charge?: boolean;
  fiscalement_a_charge?: boolean;
  created_at?: string;
  updated_at?: string;
}

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
      console.error('Error fetching family profile:', error);
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
      console.error('Error upserting family profile:', error);
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
      console.error('Error fetching marital status:', error);
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
      console.error('Error upserting marital status:', error);
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
      console.error('Error fetching family links:', error);
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
      console.error('Error creating family link:', error);
      throw error;
    }

    return data;
  },

  async updateFamilyLink(id: string, link: Partial<FamilyLink>): Promise<FamilyLink> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Verify user owns this family link before updating
    const { data: existingLink } = await supabase
      .from('family_links')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existingLink || existingLink.user_id !== user.id) {
      throw new Error('Unauthorized: Family link not found or access denied');
    }

    const { data, error } = await supabase
      .from('family_links')
      .update(link)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating family link:', error);
      throw error;
    }

    return data;
  },

  async deleteFamilyLink(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Verify user owns this family link before deleting
    const { data: existingLink } = await supabase
      .from('family_links')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existingLink || existingLink.user_id !== user.id) {
      throw new Error('Unauthorized: Family link not found or access denied');
    }

    const { error } = await supabase
      .from('family_links')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting family link:', error);
      throw error;
    }
  },

  async deleteFamilyLinks(ids: string[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Verify user owns all family links before deleting
    const { data: existingLinks } = await supabase
      .from('family_links')
      .select('id, user_id')
      .in('id', ids);

    if (!existingLinks || existingLinks.some(link => link.user_id !== user.id)) {
      throw new Error('Unauthorized: One or more family links not found or access denied');
    }

    const { error } = await supabase
      .from('family_links')
      .delete()
      .in('id', ids);

    if (error) {
      console.error('Error deleting family links:', error);
      throw error;
    }
  }
};