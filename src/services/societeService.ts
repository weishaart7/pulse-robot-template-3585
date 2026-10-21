import { supabase } from '@/integrations/supabase/client';
import { secureService } from './secureService';
import { sanitizeObject } from '@/lib/security';
import { actifDepuisSociete } from '@/lib/societes/partsFoyer';
import { calculerValeurSociete, valeurSocieteRetenue } from '@/lib/societes/valeurSociete';

export interface Societe {
  id: string;
  user_id: string;
  denomination: string;
  type_societe: string;
  date_creation?: string;
  parts_negociables?: boolean;
  date_souscription?: string;
  valeur_estimee?: number;
  pourcentage_ifi?: number;
  capital_social?: number;
  nombre_titres?: number;
  nombre_salaries?: number;
  jour_cloture?: string;
  mois_cloture?: string;
  siret?: string;
  rue_adresse?: string;
  code_postal?: string;
  commune?: string;
  pays?: string;
  regime_fiscal?: string;
  valeur_ifi?: number;
  activite?: string;
  holding?: string;
  forme_societe_civile?: string;
  pourcentage_utilisateur?: number;
  pourcentage_conjoint?: number;
  qualification_bien?: string;
  detenteur?: string;
  // Entrée du foyer dans la société (cf. lib/societes/partsFoyer.ts)
  origine_entree?: string | null;
  montant_entree?: number | null;
  remploi_entree?: boolean;
  qualification_auto?: boolean;
  /** Valeur calculée depuis les biens et dettes de la société (true) ou saisie à la main. */
  valeur_auto?: boolean;
  // Financial fields
  chiffre_affaires?: number;
  resultat_net?: number;
  tresorerie_disponible?: number;
  compte_courant_associes?: number;
  reserves?: number;
  date_dernier_bilan?: string;
  eligible_taux_reduit_pme?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Recopie la société sur son actif lié (assets.societe_id) à chaque sauvegarde d'une société
// existante — sens unique société → actif (societes fait autorité) : valeur des parts du foyer,
// répartition entre époux, origine, date, prix de revient, qualification et détenteur
// (lib/societes/partsFoyer.ts). N'agit que si exactement un actif est lié ; ne devine jamais
// lequel synchroniser si plusieurs le sont.
const syncQualificationToLinkedAsset = async (societe: Societe): Promise<void> => {
  const { data: linkedAssets, error } = await supabase
    .from('assets')
    .select('id')
    .eq('societe_id', societe.id);

  if (error) {
    if (import.meta.env.DEV) console.error('Erreur lors de la recherche de l\'actif lié à la société:', error);
    return;
  }

  if (!linkedAssets || linkedAssets.length === 0) return;

  if (linkedAssets.length > 1) {
    if (import.meta.env.DEV) console.warn(`Société ${societe.id} : plusieurs actifs liés, synchronisation ignorée.`);
    return;
  }

  const { error: updateError } = await supabase
    .from('assets')
    .update(actifDepuisSociete(societe))
    .eq('id', linkedAssets[0].id);

  if (updateError && import.meta.env.DEV) {
    console.error('Erreur lors de la synchronisation société → actif:', updateError);
  }
};

// Valeur de la société depuis ses biens (assets.societe_proprietaire_id), ses emprunts
// (emprunts.societe_id), sa trésorerie et ses comptes courants (lib/societes/valeurSociete.ts) :
// enregistrée dans valeur_estimee si valeur_auto, puis recopiée sur l'actif « parts » lié.
const recalculerSociete = async (societeId: string): Promise<Societe | null> => {
  const [{ data: societe }, { data: biens }, { data: emprunts }] = await Promise.all([
    supabase.from('societes').select('*').eq('id', societeId).single(),
    supabase.from('assets').select('valeur_estimee').eq('societe_proprietaire_id', societeId),
    supabase.from('emprunts').select('capital_restant_du').eq('societe_id', societeId),
  ]);
  if (!societe) return null;
  const detail = calculerValeurSociete({
    biens: biens || [],
    emprunts: emprunts || [],
    compteCourantAssocies: societe.compte_courant_associes,
    tresorerie: societe.tresorerie_disponible,
  });
  const valeur = valeurSocieteRetenue(societe.valeur_estimee, societe.valeur_auto, detail, (biens || []).length);
  let aJour = societe as Societe;
  if (valeur !== societe.valeur_estimee) {
    const { data } = await supabase.from('societes').update({ valeur_estimee: valeur }).eq('id', societeId).select().single();
    if (data) aJour = data as Societe;
  }
  await syncQualificationToLinkedAsset(aJour);
  return aJour;
};

export const societeService = {
  recalculerSociete,

  /** Valeur calculée (détail) d'une société depuis ce qu'elle détient et doit. */
  async getValeurCalculee(societeId: string) {
    const [{ data: societe }, { data: biens }, { data: emprunts }] = await Promise.all([
      supabase.from('societes').select('compte_courant_associes, tresorerie_disponible').eq('id', societeId).single(),
      supabase.from('assets').select('valeur_estimee').eq('societe_proprietaire_id', societeId),
      supabase.from('emprunts').select('capital_restant_du').eq('societe_id', societeId),
    ]);
    return {
      nbBiens: (biens || []).length,
      ...calculerValeurSociete({
        biens: biens || [],
        emprunts: emprunts || [],
        compteCourantAssocies: societe?.compte_courant_associes,
        tresorerie: societe?.tresorerie_disponible,
      }),
    };
  },

  /**
   * Rattache un bien à la société propriétaire : il sort du patrimoine direct (plus de détenteur,
   * de qualification ni de quotités, revenus et charges hors budget du foyer) et ses emprunts
   * deviennent ceux de la société.
   */
  async rattacherBien(societeId: string, assetId: string): Promise<void> {
    const { error } = await supabase.from('assets').update({
      societe_proprietaire_id: societeId,
      detenteur: null,
      qualification_bien: null,
      qualification_auto: true,
      pourcentage_utilisateur: null,
      pourcentage_conjoint: null,
    }).eq('id', assetId);
    if (error) throw error;
    await Promise.all([
      supabase.from('emprunts').update({ societe_id: societeId }).eq('asset_id', assetId),
      supabase.from('asset_revenus').update({ impact_budget: false }).eq('asset_id', assetId),
      supabase.from('asset_charges').update({ impact_budget: false }).eq('asset_id', assetId),
    ]);
    await recalculerSociete(societeId);
  },

  /** Rend un bien au patrimoine direct (détenteur et qualification à ressaisir sur sa fiche). */
  async detacherBien(societeId: string, assetId: string): Promise<void> {
    const { error } = await supabase.from('assets').update({ societe_proprietaire_id: null }).eq('id', assetId);
    if (error) throw error;
    await supabase.from('emprunts').update({ societe_id: null }).eq('asset_id', assetId).eq('societe_id', societeId);
    await recalculerSociete(societeId);
  },

  async getAll(): Promise<Societe[]> {
    const { user } = await secureService.getCurrentUserSecure();
    if (!user) return [];

    const { data, error } = await supabase
      .from('societes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Log access to sensitive financial data
    await secureService.logFinancialDataAccess(user.id, 'societes', data?.length);
    
    return data || [];
  },

  async getById(id: string): Promise<Societe> {
    const { user } = await secureService.getCurrentUserSecure();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('societes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    
    // Log access to sensitive financial data
    await secureService.logFinancialDataAccess(user.id, 'societes', 1);
    
    return data;
  },

  async create(societe: Omit<Societe, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Societe> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Sanitize input data
    const sanitizedSociete = sanitizeObject(societe);

    const { data, error } = await supabase
      .from('societes')
      .insert([{ ...sanitizedSociete, user_id: user.id }])
      .select()
      .single();

    if (error) throw error;
    
    // Log creation of sensitive financial data
    // Identifiant seul, jamais la dénomination (donnée patrimoniale, cf. règle RGPD du projet).
    await secureService.logDataModification(user.id, 'societes', `Created company: ${data.id}`);
    
    return data;
  },

  async update(id: string, societe: Partial<Omit<Societe, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<Societe> {
    const { user } = await secureService.getCurrentUserSecure();
    if (!user) throw new Error('User not authenticated');

    // Sanitize input data
    const sanitizedSociete = sanitizeObject(societe);

    const { data, error } = await supabase
      .from('societes')
      .update(sanitizedSociete)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    // Log modification of sensitive financial data
    await secureService.logDataModification(user.id, 'societes', `Updated company: ${id}`);

    // Valeur recalculée (trésorerie, comptes courants ou valeur_auto modifiés) puis actif lié recopié.
    return (await recalculerSociete(id)) ?? data;
  },

  async delete(id: string): Promise<void> {
    const { user } = await secureService.getCurrentUserSecure();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('societes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    // Log deletion of sensitive financial data
    await secureService.logDataModification(user.id, 'societes', `Deleted company: ${id}`);
  }
};