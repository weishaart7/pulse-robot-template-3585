import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { familyService } from '@/services/familyService';
import { mapDetenteurToDisplay, FamilyInfo } from '@/lib/patrimoine/utils';

export type Periodicite = 'mensuel' | 'trimestriel' | 'semestriel' | 'annuel' | 'ponctuel';

export interface Revenu {
  id: string;
  user_id: string;
  nature: string;
  libelle: string;
  beneficiaire?: string;
  montant?: number;
  revenu_disponible: boolean;
  commentaire?: string;
  periodicite?: string;
  date_debut?: string;
  date_fin?: string;
  jour_fixe?: number;
  created_at: string;
  updated_at: string;
  // Extended fields for immobilier
  source?: 'budget' | 'immobilier';
  asset_id?: string;
  asset_name?: string;
}

export interface Charge {
  id: string;
  user_id: string;
  nature: string;
  libelle: string;
  debiteur?: string;
  montant?: number;
  commentaire?: string;
  periodicite?: string;
  date_debut?: string;
  date_fin?: string;
  jour_fixe?: number;
  created_at: string;
  updated_at: string;
  // Extended fields for immobilier / emprunts
  source?: 'budget' | 'immobilier' | 'emprunt';
  asset_id?: string;
  asset_name?: string;
}

// asset_charges/asset_revenus stockent la périodicité à l'accord féminin
// ('mensuelle', 'trimestrielle', 'annuelle'), tandis que revenus/charges
// utilisent l'accord masculin ('mensuel', 'trimestriel', 'annuel', + 'semestriel'/'ponctuel').
// Cette fonction ramène tout à la convention masculine dès la lecture,
// pour que le reste du code (BudgetList, BudgetResume, Dashboard) n'ait
// qu'une seule graphie à gérer.
const normalizeAssetPeriodicite = (periodicite: string | null | undefined): string => {
  const p = (periodicite || '').toLowerCase();
  switch (p) {
    case 'mensuelle':
      return 'mensuel';
    case 'trimestrielle':
      return 'trimestriel';
    case 'annuelle':
      return 'annuel';
    default:
      return periodicite || 'mensuel';
  }
};

// Récupère les prénoms utilisateur/conjoint pour résoudre assets.detenteur ('user'/'spouse'/'common',
// cf. docs/patrimoine.md) en un libellé civil affichable, via le même mapping que Patrimoine
// (mapDetenteurToDisplay, src/lib/patrimoine/utils.ts) plutôt qu'une comparaison aux libellés français
// que la colonne ne contient jamais.
const getFamilyInfoForDetenteur = async (): Promise<FamilyInfo> => {
  const [familyProfile, maritalStatus] = await Promise.all([
    familyService.getFamilyProfile(),
    familyService.getMaritalStatus(),
  ]);
  return {
    hasPartner: !!maritalStatus?.prenom_conjoint,
    userFirstName: familyProfile?.prenom,
    partnerFirstName: maritalStatus?.prenom_conjoint,
  };
};

// Fait correspondre la nature libre d'un emprunt (EMPRUNT_NATURES, src/constants/assetTypes.ts) à l'une
// des 6 natures fermées de CHARGES_CATEGORIES['Emprunts & Crédits'] (budgetCategories.ts), pour que la
// mensualité remonte dans le calcul du taux/capacité d'endettement de BudgetResume.tsx sans code
// supplémentaire côté calcul (le filtre par catégorie existant la capte automatiquement).
const EMPRUNT_NATURE_TO_BUDGET_CATEGORY: Record<string, string> = {
  'Crédit à la consommation': 'Crédit à la consommation',
  'Crédit renouvelable / revolving': 'Crédit renouvelable / revolving',
  'Prêt immobilier (résidence principale)': 'Crédit immobilier (résidence principale, secondaire, locatif)',
  'Prêt immobilier (résidences secondaires)': 'Crédit immobilier (résidence principale, secondaire, locatif)',
  'Prêt immobilier locatif (investissement locatif)': 'Crédit immobilier (résidence principale, secondaire, locatif)',
  'Prêt pour acquisition de SCPI': 'Crédit immobilier (résidence principale, secondaire, locatif)',
};
const mapEmpruntNatureToBudgetCategory = (nature: string): string =>
  EMPRUNT_NATURE_TO_BUDGET_CATEGORY[nature] || 'Autres emprunts';

// Forme des lignes retournées par la jointure asset_charges -> assets (colonnes sélectionnées uniquement)
type AssetChargeWithAsset = Pick<
  Tables<'asset_charges'>,
  'id' | 'asset_id' | 'type_charge' | 'denomination' | 'debiteur' | 'montant' | 'periodicite' | 'date_debut' | 'duree_fin_date' | 'created_at' | 'updated_at'
> & {
  assets: Pick<Tables<'assets'>, 'id' | 'denomination' | 'user_id' | 'detenteur'>;
};

export const budgetService = {
  // Revenus - retourne les montants bruts avec leur périodicité d'origine
  async getRevenus(): Promise<Revenu[]> {
    const { data, error } = await supabase
      .from('revenus')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(r => ({ ...r, source: 'budget' as const }));
  },

  async getAssetRevenusForBudget(): Promise<Revenu[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Fetch asset_revenus with impact_budget = true
    const { data: revenusData, error: revenusError } = await supabase
      .from('asset_revenus')
      .select('id, asset_id, nature, montant, periodicite, commentaire, date_debut, date_fin, created_at, updated_at')
      .eq('impact_budget', true);

    if (revenusError) throw revenusError;
    if (!revenusData || revenusData.length === 0) return [];

    // Get unique asset_ids
    const assetIds = [...new Set(revenusData.map(r => r.asset_id))];

    // Fetch user's assets with detenteur field
    const [{ data: assetsData, error: assetsError }, familyInfo] = await Promise.all([
      supabase
        .from('assets')
        .select('id, denomination, user_id, detenteur')
        .eq('user_id', user.id)
        .in('id', assetIds),
      getFamilyInfoForDetenteur(),
    ]);

    if (assetsError) throw assetsError;

    // Create a map of assets
    const assetsMap = new Map((assetsData || []).map(a => [a.id, a]));

    // Transform asset_revenus to Revenu format
    return revenusData
      .filter(item => assetsMap.has(item.asset_id))
      .map(item => {
        const asset = assetsMap.get(item.asset_id);
        // Déterminer le bénéficiaire basé sur le détenteur de l'asset ('user'/'spouse'/'common' en base)
        const beneficiaire = mapDetenteurToDisplay(asset?.detenteur, familyInfo);

        return {
          id: item.id,
          user_id: user.id,
          nature: item.nature || 'Revenus locatifs',
          libelle: `${item.nature || 'Revenu'} - ${asset?.denomination || 'Bien immobilier'}`,
          beneficiaire,
          montant: item.montant || 0,
          revenu_disponible: true,
          commentaire: item.commentaire,
          periodicite: normalizeAssetPeriodicite(item.periodicite),
          date_debut: item.date_debut,
          date_fin: item.date_fin,
          created_at: item.created_at,
          updated_at: item.updated_at,
          source: 'immobilier' as const,
          asset_id: item.asset_id,
          asset_name: asset?.denomination || 'Bien immobilier'
        };
      });
  },

  async createRevenu(revenu: Omit<Revenu, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Revenu> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('revenus')
      .insert([{ ...revenu, user_id: userData.user.id }])
      .select()
      .single();

    if (error) throw error;
    return { ...data, source: 'budget' as const };
  },

  async updateRevenu(id: string, revenu: Partial<Revenu>): Promise<Revenu> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Verify user owns this revenue before updating
    const { data: existingRevenu } = await supabase
      .from('revenus')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existingRevenu || existingRevenu.user_id !== user.id) {
      throw new Error('Unauthorized: Revenue not found or access denied');
    }

    const { data, error } = await supabase
      .from('revenus')
      .update(revenu)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { ...data, source: 'budget' as const };
  },

  async deleteRevenu(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Verify user owns this revenue before deleting
    const { data: existingRevenu } = await supabase
      .from('revenus')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existingRevenu || existingRevenu.user_id !== user.id) {
      throw new Error('Unauthorized: Revenue not found or access denied');
    }

    const { error } = await supabase
      .from('revenus')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Charges - retourne les montants bruts avec leur périodicité d'origine
  async getCharges(): Promise<Charge[]> {
    const { data, error } = await supabase
      .from('charges')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(c => ({ ...c, source: 'budget' as const }));
  },

  async getAssetChargesForBudget(): Promise<Charge[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const [{ data, error }, familyInfo] = await Promise.all([
      supabase
        .from('asset_charges')
        .select(`
          id,
          asset_id,
          type_charge,
          denomination,
          debiteur,
          montant,
          periodicite,
          date_debut,
          duree_fin_date,
          created_at,
          updated_at,
          assets!inner (
            id,
            denomination,
            user_id,
            detenteur
          )
        `)
        .eq('impact_budget', true),
      getFamilyInfoForDetenteur(),
    ]);

    if (error) throw error;

    // Transform asset_charges to Charge format
    return ((data || []) as AssetChargeWithAsset[])
      .filter(item => item.assets?.user_id === user.id)
      .map(item => {
        // Déterminer le débiteur basé sur le détenteur de l'asset ('user'/'spouse'/'common' en base)
        const debiteurFinal = mapDetenteurToDisplay(item.assets?.detenteur, familyInfo);

        return {
          id: item.id,
          user_id: user.id,
          nature: item.type_charge || 'Charges locatives',
          libelle: `${item.denomination || item.type_charge} - ${item.assets?.denomination || 'Bien immobilier'}`,
          debiteur: debiteurFinal,
          montant: item.montant || 0,
          commentaire: undefined,
          periodicite: normalizeAssetPeriodicite(item.periodicite),
          date_debut: item.date_debut,
          date_fin: item.duree_fin_date,
          created_at: item.created_at,
          updated_at: item.updated_at,
          source: 'immobilier' as const,
          asset_id: item.asset_id,
          asset_name: item.assets?.denomination || 'Bien immobilier'
        };
      });
  },

  // Mensualités des emprunts réels de Patrimoine marqués « reporter au budget » — seule source qui
  // alimente aujourd'hui le taux/capacité d'endettement avec un crédit réel (cf. docs/budget.md §3).
  // Lecture seule ici (source: 'emprunt'), au même titre que getAssetChargesForBudget : la modification
  // se fait exclusivement depuis Patrimoine, pour éviter toute ressaisie manuelle en double dans Budget.
  async getEmpruntsChargesForBudget(): Promise<Charge[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const [{ data, error }, familyInfo] = await Promise.all([
      supabase
        .from('emprunts')
        .select('id, nature, libelle, mensualite, detenteur, created_at, updated_at')
        .eq('user_id', user.id)
        .eq('reporter_budget', true),
      getFamilyInfoForDetenteur(),
    ]);

    if (error) throw error;

    return (data || [])
      .filter(item => item.mensualite && item.mensualite > 0)
      .map(item => ({
        id: item.id,
        user_id: user.id,
        nature: mapEmpruntNatureToBudgetCategory(item.nature),
        libelle: item.libelle,
        debiteur: mapDetenteurToDisplay(item.detenteur, familyInfo),
        montant: item.mensualite,
        periodicite: 'mensuel',
        created_at: item.created_at,
        updated_at: item.updated_at,
        source: 'emprunt' as const,
      }));
  },

  async createCharge(charge: Omit<Charge, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Charge> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('charges')
      .insert([{ ...charge, user_id: userData.user.id }])
      .select()
      .single();

    if (error) throw error;
    return { ...data, source: 'budget' as const };
  },

  async updateCharge(id: string, charge: Partial<Charge>): Promise<Charge> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Verify user owns this charge before updating
    const { data: existingCharge } = await supabase
      .from('charges')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existingCharge || existingCharge.user_id !== user.id) {
      throw new Error('Unauthorized: Charge not found or access denied');
    }

    const { data, error } = await supabase
      .from('charges')
      .update(charge)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { ...data, source: 'budget' as const };
  },

  async deleteCharge(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Verify user owns this charge before deleting
    const { data: existingCharge } = await supabase
      .from('charges')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existingCharge || existingCharge.user_id !== user.id) {
      throw new Error('Unauthorized: Charge not found or access denied');
    }

    const { error } = await supabase
      .from('charges')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
