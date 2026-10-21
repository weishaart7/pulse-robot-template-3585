import { supabase } from '@/integrations/supabase/client';

// Appels de fonds et distributions d'un fonds à appels (FCPR / FPCI, fonds de dette privée).
// La somme des appels alimente assets.valeur_acquisition (montant appelé, cf. useAssetForm.ts).
export type TypeMouvementFonds = 'appel' | 'distribution';

export interface FondsMouvement {
  id?: string;
  user_id?: string;
  asset_id?: string;
  type_mouvement: TypeMouvementFonds;
  date_mouvement: string;
  montant: number;
  created_at?: string;
  updated_at?: string;
}

export const fondsMouvementService = {
  async getByAsset(assetId: string): Promise<FondsMouvement[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('fonds_mouvements')
      .select('*')
      .eq('asset_id', assetId)
      .eq('user_id', user.id)
      .order('date_mouvement', { ascending: true });
    if (error) throw error;
    return (data || []) as FondsMouvement[];
  },

  // Remplace l'ensemble des mouvements de l'actif. Même ordre que assetIndivisaireService :
  // insertion d'abord, suppression des anciennes lignes ensuite, pour ne rien perdre si
  // l'insertion échoue.
  async replaceForAsset(assetId: string, mouvements: Pick<FondsMouvement, 'type_mouvement' | 'date_mouvement' | 'montant'>[]) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: existing, error: fetchError } = await supabase
      .from('fonds_mouvements')
      .select('id')
      .eq('asset_id', assetId)
      .eq('user_id', user.id);
    if (fetchError) throw fetchError;
    const existingIds = (existing || []).map((row) => row.id);

    if (mouvements.length > 0) {
      const { error } = await supabase
        .from('fonds_mouvements')
        .insert(mouvements.map((m) => ({ ...m, asset_id: assetId, user_id: user.id })));
      if (error) throw error;
    }

    if (existingIds.length > 0) {
      const { error: delError } = await supabase
        .from('fonds_mouvements')
        .delete()
        .in('id', existingIds);
      if (delError) {
        throw new Error(
          mouvements.length > 0
            ? "Les nouveaux mouvements ont été enregistrés mais les anciens n'ont pas pu être supprimés. Merci de vérifier les appels de fonds de cet actif."
            : "Les mouvements supprimés n'ont pas pu être effacés."
        );
      }
    }
  },
};
