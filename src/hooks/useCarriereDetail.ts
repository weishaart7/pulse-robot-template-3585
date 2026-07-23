import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PeriodeCarriere, TypeActivite } from '@/lib/retraite/parseRIS';

export interface PeriodeCarriereEnregistree extends PeriodeCarriere {
  id: string;
}

export const useCarriereDetail = () => {
  const [periodes, setPeriodes] = useState<PeriodeCarriereEnregistree[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    chargerPeriodes();
  }, []);

  const chargerPeriodes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('retraite_carriere_detail')
        .select('*')
        .eq('user_id', user.id)
        .order('date_debut');

      if (error) {
        console.error('Erreur lors du chargement du détail de carrière:', error);
        return;
      }

      setPeriodes(
        (data ?? []).map((ligne) => ({
          id: ligne.id,
          employeur: ligne.employeur ?? '',
          typeActivite: ligne.type_activite as TypeActivite,
          dateDebut: ligne.date_debut,
          dateFin: ligne.date_fin,
          revenu: ligne.revenu,
          estChiffreAffaires: ligne.est_chiffre_affaires,
          regimes: ligne.regimes,
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Remplace intégralement les périodes enregistrées par un nouvel import RIS
   * — même logique que pour regimesPoints dans Carriere.tsx : un nouvel
   * import écrase la liste précédente plutôt que de la fusionner, pour éviter
   * les doublons si le relevé a été mis à jour.
   */
  const remplacerPeriodes = async (nouvellesPeriodes: PeriodeCarriere[]): Promise<boolean> => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error: erreurSuppression } = await supabase
        .from('retraite_carriere_detail')
        .delete()
        .eq('user_id', user.id);

      if (erreurSuppression) throw erreurSuppression;

      if (nouvellesPeriodes.length > 0) {
        const { error: erreurInsertion } = await supabase.from('retraite_carriere_detail').insert(
          nouvellesPeriodes.map((periode) => ({
            user_id: user.id,
            employeur: periode.employeur,
            type_activite: periode.typeActivite,
            date_debut: periode.dateDebut,
            date_fin: periode.dateFin,
            revenu: periode.revenu,
            est_chiffre_affaires: periode.estChiffreAffaires,
            regimes: periode.regimes,
          }))
        );
        if (erreurInsertion) throw erreurInsertion;
      }

      await chargerPeriodes();
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du détail de carrière:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'enregistrer le détail de carrière.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const supprimerPeriode = async (id: string): Promise<void> => {
    const { error } = await supabase.from('retraite_carriere_detail').delete().eq('id', id);
    if (error) {
      console.error('Erreur lors de la suppression de la période:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer cette période.',
        variant: 'destructive',
      });
      return;
    }
    setPeriodes((prev) => prev.filter((p) => p.id !== id));
  };

  return { periodes, loading, saving, remplacerPeriodes, supprimerPeriode };
};
