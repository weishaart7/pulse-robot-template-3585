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
  date_naissance_conjoint?: string;
  nationalite_conjoint?: string;
  profession_conjoint?: string;
  date_pacs?: string;
  lieu_pacs?: string;
  date_mariage?: string;
  lieu_mariage?: string;
  nom_notaire?: string;
  adresse_notaire?: string;
  contrat_mariage?: string;
  parent_isole?: boolean;
  nombre_enfants_charges?: number;
  mariage_precedent_personne?: boolean;
  mariage_precedent_conjoint?: boolean;
}

export interface FamilyLink {
  id?: string;
  user_id?: string;
  lien_familial: string;
  nom: string;
  prenom?: string;
  date_naissance?: string;
  nationalite?: string;
  niveau_scolaire?: string;
  a_charge?: boolean;
  handicap?: boolean;
  enfant_mineur?: boolean;
}

export const familyService = {
  // Family Profile
  async getFamilyProfile(): Promise<FamilyProfile | null> {
    const { data, error } = await supabase
      .from('family_profiles')
      .select('*')
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
    const { data, error } = await supabase
      .from('marital_status')
      .select('*')
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
    const { data, error } = await supabase
      .from('family_links')
      .select('*')
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