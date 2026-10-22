import { supabase } from '@/integrations/supabase/client';
import { AttributionMDA } from '@/lib/retraite/trimestresEnfants';

export type MiseAJourAttributionMDA = Partial<Omit<AttributionMDA, 'family_link_id'>>;

/** Écarts à l'attribution par défaut des trimestres enfants (table `retraite_mda_enfants`). */
export const retraiteMdaService = {
  async lister(): Promise<AttributionMDA[]> {
    const { data, error } = await supabase
      .from('retraite_mda_enfants')
      .select('family_link_id, maternite_adoption_client, education_client, regime_attribution, bonification_fp');
    if (error) throw error;
    return data ?? [];
  },

  async enregistrer(familyLinkId: string, miseAJour: MiseAJourAttributionMDA): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');
    const { error } = await supabase
      .from('retraite_mda_enfants')
      .upsert(
        { ...miseAJour, family_link_id: familyLinkId, user_id: user.id, updated_at: new Date().toISOString() },
        { onConflict: 'family_link_id' }
      );
    if (error) throw error;
  },

  /** Revient au défaut pour cet enfant. */
  async reinitialiser(familyLinkId: string): Promise<void> {
    const { error } = await supabase.from('retraite_mda_enfants').delete().eq('family_link_id', familyLinkId);
    if (error) throw error;
  },
};
