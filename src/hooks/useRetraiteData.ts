import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RegimeDetecte } from '@/lib/retraite/parseRIS';
import { ModeHypotheseRevenuFutur } from '@/lib/retraite/hypotheseRevenuFutur';

export interface RetraiteData {
  id?: string;
  salaire_annuel_moyen?: number;
  trimestres_valides?: number;
  trimestres_requis?: number;
  epargne_per?: number;
  epargne_assurance_vie?: number;
  autres_epargnes?: number;
  regimes_points?: RegimeDetecte[];
  // Pensions personnelles brutes d'autres régimes non modélisés par cet
  // outil (étranger, complémentaires non saisies...) — sert uniquement à
  // l'écrêtement du MICO (référentiel §3.5.5). cf.
  // docs/audit/audit-pension-consolidation.md : auparavant saisi dans
  // Carriere.tsx mais jamais persisté, donc jamais vu par Synthèse (usePensionConsolidee.ts).
  autres_pensions_mensuelles?: number;
  // Condition n°1 (déclarative) de la surcote parentale, référentiel §2.3.2 —
  // cf. surcoteParentale() dans src/lib/retraite/calcul.ts.
  au_moins_un_trimestre_majoration_enfant?: boolean;
  trimestres_cotises_apres_age_legal_fp?: number;
  trimestres_cotises_apres_age_legal_cnavpl?: number;
  // Carrière fonction publique / CNAVPL (CarriereFonctionPublique.tsx /
  // CarriereCNAVPL.tsx) — cf. docs/audit/audit-fonction-publique-cnavpl.md :
  // ces deux blocs n'avaient jusqu'ici aucune colonne pour persister leur
  // saisie, d'où la perte silencieuse constatée à chaque rechargement.
  has_fonction_publique?: boolean;
  trimestres_liquidables_fp?: number;
  has_cnavpl?: boolean;
  trimestres_cnavpl?: number;
  traitement_indiciaire_brut?: number;
  points_rafp?: number;
  depart_anticipe_categorie_active?: boolean;
  age_depart_anticipe?: number;
  age_annulation_decote?: number;
  depart_pour_invalidite?: boolean;
  annee_ouverture_droits?: number;
  points_cnavpl?: number;
  valeur_point_cnavpl?: number;
  // Supplément NBI (écart #13-NBI) : formule sourcée uniquement pour
  // SRE/CNRACL (docs/retraite-base-referentiel.md §7.7.1) — regime_affiliation_fp
  // non renseigné = supplément non calculé, jamais accordé par défaut.
  regime_affiliation_fp?: 'SRE' | 'CNRACL';
  moyenne_annuelle_nbi?: number;
  trimestres_liquidables_nbi?: number;
  // Hypothèse de revenu pour les années futures manquantes (entre l'année en
  // cours et l'âge légal réel) — cf. src/lib/retraite/hypotheseRevenuFutur.ts
  // et le toggle de Synthese.tsx. `revenu_hypothese_manuel` n'est lu qu'en
  // mode 'revenu_moyen_projete' ; ignoré en mode 'derniere_annee_connue' (la
  // valeur y est dérivée du RIS, jamais stockée).
  mode_hypothese_revenu_futur?: ModeHypotheseRevenuFutur;
  revenu_hypothese_manuel?: number;
}

// 'conjoint' : même user_id (le conjoint n'a pas de compte séparé, cf.
// marital_status.prenom_conjoint/nom_conjoint) — seule la colonne `personne`
// distingue les deux jeux de données, cf. migration
// 20260815000000_add_personne_to_retraite_tables.sql.
export type Personne = 'utilisateur' | 'conjoint';

export const useRetraiteData = (personne: Personne = 'utilisateur') => {
  const [data, setData] = useState<RetraiteData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Chargement initial des données
  useEffect(() => {
    loadRetraiteData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personne]);

  const loadRetraiteData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: retraiteData, error } = await (supabase
        .from('retraite_data') as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('personne', personne)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading retirement data:', error);
        return;
      }

      if (retraiteData) {
        setData(retraiteData as any);
      }
    } catch (error) {
      console.error('Error loading retirement data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveRetraiteData = async (updates: Partial<RetraiteData>, options: { silent?: boolean } = {}) => {
    const { silent = false } = options;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erreur d'authentification",
          description: "Vous devez être connecté pour sauvegarder les données.",
          variant: "destructive",
        });
        return false;
      }

      if (data.id) {
        // Mise à jour d'un enregistrement existant
        const { error } = await supabase
          .from('retraite_data')
          .update(updates as any)
          .eq('id', data.id)
          .eq('user_id', user.id)
          .eq('personne', personne as any);

        if (error) {
          console.error('Error updating retirement data:', error);
          toast({
            title: "Erreur de sauvegarde",
            description: "Impossible de sauvegarder les données de retraite.",
            variant: "destructive",
          });
          return false;
        }

        setData((prev) => ({ ...prev, ...updates }));
      } else {
        // Création d'un nouvel enregistrement
        const { data: newRecord, error } = await supabase
          .from('retraite_data')
          .insert([{ ...updates, user_id: user.id, personne }] as any)
          .select()
          .single();

        if (error) {
          console.error('Error creating retirement data:', error);
          toast({
            title: "Erreur de sauvegarde",
            description: "Impossible de créer les données de retraite.",
            variant: "destructive",
          });
          return false;
        }

        if (newRecord) {
          setData(newRecord as any);
        }
      }

      if (!silent) {
        toast({
          title: "Données sauvegardées",
          description: "Vos informations de retraite ont été sauvegardées avec succès.",
        });
      }
      return true;
    } catch (error) {
      console.error('Error saving retirement data:', error);
      toast({
        title: "Erreur de sauvegarde",
        description: "Une erreur est survenue lors de la sauvegarde.",
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    data,
    loading,
    saving,
    saveRetraiteData,
  };
};