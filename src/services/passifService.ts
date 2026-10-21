import { actualiserEmprunt } from '@/lib/credit/contrat';
import { supabase } from '@/integrations/supabase/client';
import { societeService } from '@/services/societeService';

export interface Emprunt {
  id: string;
  user_id: string;
  nature: string;
  libelle: string;
  capital_restant_du?: number;
  taux_interet?: number;
  mensualite?: number;
  duree_restante?: number;
  detenteur?: string;
  contributeur_remboursement?: 'utilisateur' | 'conjoint' | 'les_deux' | string | null;
  pourcentage_utilisateur?: number;
  pourcentage_conjoint?: number;
  qualification_bien?: string;
  qualification_auto?: boolean;
  reporter_budget?: boolean;
  asset_id?: string | null;
  /** Actif donné en garantie (nantissement, bien à vendre d'un relais) : informatif, hors calculs. */
  actif_garantie_id?: string | null;
  // Emprunt porté par une société : exclu du passif successoral du particulier
  // (cf. transmissionHelpers.ts::buildPassifLines). Déjà renvoyé par le
  // `select('*')` de getEmprunts, simplement jamais typé jusqu'ici.
  societe_id?: string | null;
  type_garantie?: string | null;
  assure?: boolean;
  quotite_assuree_utilisateur?: number;
  quotite_assuree_conjoint?: number;
  capital_garanti_deces?: number;
  // Déclaratifs, saisis tels que figurant sur l'offre de prêt — jamais
  // recalculés (cf. docs/patrimoine.md).
  mode_amortissement?: 'Amortissable' | 'In fine' | string;
  type_taux?: 'Fixe' | 'Variable' | 'Mixte' | string;
  taeg?: number;
  cout_total_credit?: number;
  // Date à laquelle la dette a été contractée (qualification, cf. qualifierDette).
  date_souscription?: string | null;
  // Données d'origine du contrat (facultatives). Complètes (capital, première échéance, durée totale),
  // elles déterminent le tableau d'amortissement et le capital restant dû (src/lib/credit/contrat.ts).
  capital_initial?: number | null;
  date_premiere_echeance?: string | null;
  /** Durée totale en mois, différé compris. */
  duree_totale_mois?: number | null;
  differe_mois?: number | null;
  differe_type?: 'partiel' | 'total' | string | null;
  assurance_mode?: 'taux_capital_initial' | 'taux_crd' | 'montant' | string | null;
  /** Taux annuel en % (modes « taux ») ou montant mensuel en € (mode « montant »). */
  assurance_valeur?: number | null;
  frais_dossier?: number | null;
  frais_garantie?: number | null;
  created_at: string;
  updated_at: string;
}

export interface Passif {
  id: string;
  user_id: string;
  nature: string;
  libelle?: string | null;
  montant_du: number;
  date_souscription?: string | null;
  detenteur?: string;
  pourcentage_utilisateur?: number;
  pourcentage_conjoint?: number;
  qualification_bien?: string;
  qualification_auto?: boolean;
  created_at: string;
  updated_at: string;
}

export const passifService = {
  // Emprunts methods
  async getEmprunts(): Promise<Emprunt[]> {
    const { data, error } = await supabase
      .from('emprunts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    // Contrat complet : capital restant dû et durée restante calculés à la date du jour.
    return (data || []).map((e) => actualiserEmprunt(e as Emprunt));
  },

  async createEmprunt(emprunt: Omit<Emprunt, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Emprunt> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('emprunts')
      .insert({ ...emprunt, user_id: user.id })
      .select()
      .single();
    
    if (error) throw error;
    // Même actualisation qu'à la lecture : sans elle, une mensualité non saisie s'affiche à 0.
    return actualiserEmprunt(data as Emprunt);
  },

  async updateEmprunt(id: string, emprunt: Partial<Emprunt>): Promise<Emprunt> {
    const { data, error } = await supabase
      .from('emprunts')
      .update(emprunt)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    // Emprunt de société : il entre dans la valeur de la société (lib/societes/valeurSociete.ts).
    if (data.societe_id) await societeService.recalculerSociete(data.societe_id);
    return actualiserEmprunt(data as Emprunt);
  },

  async deleteEmprunt(id: string): Promise<void> {
    const { data: existant } = await supabase.from('emprunts').select('societe_id').eq('id', id).single();
    const { error } = await supabase
      .from('emprunts')
      .delete()
      .eq('id', id);

    if (error) throw error;
    if (existant?.societe_id) await societeService.recalculerSociete(existant.societe_id);
  },

  async getEmpruntsByAssetId(assetId: string): Promise<Emprunt[]> {
    const { data, error } = await supabase
      .from('emprunts')
      .select('*')
      .eq('asset_id', assetId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /** Emprunts reliés à plusieurs biens, en une requête (`IN`) — crédits des biens d'Immobilier. */
  async getEmpruntsByAssetIds(assetIds: string[]): Promise<Emprunt[]> {
    if (assetIds.length === 0) return [];
    const { data, error } = await supabase
      .from('emprunts')
      .select('*')
      .in('asset_id', assetIds)
      .order('created_at', { ascending: false });

    if (error) throw error;
    // Comme getEmprunts : mensualité et capital restant dû recalculés depuis le tableau
    // (la mensualité d'un contrat complet n'est pas stockée en base).
    return (data || []).map((e) => actualiserEmprunt(e as Emprunt));
  },

  // Passifs methods
  async getPassifs(): Promise<Passif[]> {
    const { data, error } = await supabase
      .from('passifs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async createPassif(passif: Omit<Passif, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Passif> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('passifs')
      .insert({ ...passif, user_id: user.id })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updatePassif(id: string, passif: Partial<Passif>): Promise<Passif> {
    const { data, error } = await supabase
      .from('passifs')
      .update(passif)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deletePassif(id: string): Promise<void> {
    const { error } = await supabase
      .from('passifs')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};