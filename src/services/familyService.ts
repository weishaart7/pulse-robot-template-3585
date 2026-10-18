import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface FamilyProfile {
  id?: string;
  user_id?: string;
  civility?: string;
  nom?: string;
  prenom?: string;
  commune_naissance?: string;
  pays_naissance?: string;
  nationalite?: string;
  nationalite_2?: string;
  date_naissance?: string;
  profession?: string;
  telephone?: string;
  email?: string;
  personne_handicapee?: boolean;
  est_dirigeant?: boolean;
  residence_fiscale_etranger?: boolean;
  ancien_combattant?: boolean;
  adresse_postale?: string;
  code_postal?: string;
  ville?: string;
  pays?: string;
  capacite_juridique?: string;
  mandat_protection_future?: boolean;
  date_mandat_protection_future?: string | null;
}

export interface MaritalStatus {
  id?: string;
  user_id?: string;
  statut_couple?: string | null;
  separation_de_corps?: boolean;
  separation_corps_clause_renonciation?: boolean;
  date_jugement_separation_corps?: string | null;
  nom_conjoint?: string;
  prenom_conjoint?: string;
  civilite_conjoint?: string;
  date_naissance_conjoint?: string | null;
  lieu_naissance_conjoint?: string;
  nationalite_conjoint?: string;
  nationalite_2_conjoint?: string;
  profession_conjoint?: string;
  profession_csp_conjoint?: string;
  personne_handicapee_conjoint?: boolean;
  est_dirigeant_conjoint?: boolean;
  residence_fiscale_etranger_conjoint?: boolean;
  ancien_combattant_conjoint?: boolean;
  capacite_juridique_conjoint?: string;
  mandat_protection_future_conjoint?: boolean;
  date_mandat_protection_future_conjoint?: string | null;
  nom_jeune_fille_conjoint?: string;
  pays_naissance_conjoint?: string;
  telephone_conjoint?: string;
  email_conjoint?: string;
  adresse_conjoint?: string;
  code_postal_conjoint?: string;
  ville_conjoint?: string;
  pays_conjoint?: string;
  date_pacs?: string | null;
  lieu_pacs?: string;
  convention_pacs?: string;
  date_mariage?: string | null;
  lieu_mariage?: string;
  regime_matrimonial?: string;
  // Éléments d'extranéité du régime matrimonial (DIP, §4.4, §12.1) : simple
  // signalement déclaratif, sans automatisation des régimes de rattachement
  // (Convention de La Haye 1978, Règlement Rome III) — cf. RelationInfoForm.tsx
  // et lib/alertes/regles.ts (alerte dédiée, distincte de
  // extraneite_residence_fiscale_etranger).
  loi_applicable_regime?: string;
  pays_premier_domicile_matrimonial?: string;
  pas_de_contrat_mariage?: boolean;
  parent_isole?: boolean;
  nombre_enfants_charges?: number;
  imposition_distincte?: boolean;
  // Condition nécessaire (avec le régime séparation de biens / participation aux
  // acquêts) pour autoriser imposition_distincte (art. 6, 4-a CGI) côté UI —
  // cf. RelationInfoForm.tsx.
  residence_separee?: boolean;
  mariage_precedent_personne?: boolean;
  mariage_precedent_conjoint?: boolean;
  duree_mariage_precedent_personne_annees?: number | null;
  duree_mariage_precedent_personne_mois?: number | null;
  duree_mariage_precedent_conjoint_annees?: number | null;
  duree_mariage_precedent_conjoint_mois?: number | null;
  donation_dernier_vivant_personne?: boolean;
  donation_dernier_vivant_conjoint?: boolean;
  date_donation_personne?: string | null;
  date_donation_conjoint?: string | null;
  /** Réservé à la clé societe_acquets (qualification de bien, cf. lib/patrimoine/qualification.ts) — le catalogue de clauses de régime a été retiré en V1. */
  // Lu / écrit via lirePerimetreDesClauses / clausesAvecPerimetre (lib/patrimoine/societeAcquets.ts).
  clauses_contrat?: Json | null;
  // Le droit de partage (2,5% de l'actif net partagé, art. 746 CGI) n'est dû que
  // si un partage est effectivement envisagé entre les héritiers — jamais présumé
  // (cf. transmission/netBreakdown.ts::computeNetPerHeir). Sans effet en cas de
  // démembrement (usufruit/nue-propriété).
  partage_envisage?: boolean;
}

export interface FamilyLink {
  id?: string;
  user_id?: string;
  lien_familial: string;
  civilite?: string;
  nom: string;
  prenom?: string;
  date_naissance?: string;
  nationalite?: string;
  nationalite_2?: string;
  est_decede?: boolean;
  date_deces?: string;
  handicap?: boolean;
  enfant_adopte?: string;
  adoption_simple_abattement_plein?: boolean;
  adoption_simple_motif?: string;
  enfant_renoncant?: boolean;
  enfant_renoncant_de?: string;
  branche_familiale?: string;
  lien_fratrie?: string | null;
  enfant_de?: string | null;
  parent_de?: string | null;
  exoneration_succession?: boolean;
  exo_frere_soeur_seul?: boolean;
  exo_frere_soeur_infirmite?: boolean;
  exo_frere_soeur_cohabitation_5_ans?: boolean;
  enfant_a_charge?: boolean;
  fiscalement_a_charge?: boolean;
  mesure_protection_juridique?: string;
  mandat_protection_future?: boolean;
  date_mandat_protection_future?: string | null;
  personne_a_charge?: boolean;
  created_at?: string;
  updated_at?: string;
}

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