import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RegimeDetecte } from '@/lib/retraite/parseRIS';
import { ModeHypotheseRevenuFutur } from '@/lib/retraite/hypotheseRevenuFutur';
import type { Json, Tables, TablesUpdate } from '@/integrations/supabase/types';

export interface RetraiteData {
  id?: string;
  salaire_annuel_moyen?: number;
  trimestres_valides?: number;
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
// 20260814235607_add_personne_to_retraite_tables.sql.
export type Personne = 'utilisateur' | 'conjoint';

// Conversion ligne DB <-> RetraiteData : la base type `regimes_points` en Json
// et les colonnes à valeurs contraintes (CHECK) en string ; les valeurs
// autorisées sont garanties par les contraintes CHECK de retraite_data.
const depuisLigne = (ligne: Tables<'retraite_data'>): RetraiteData => ({
  ...ligne,
  regimes_points: (ligne.regimes_points ?? undefined) as unknown as RegimeDetecte[] | undefined,
  regime_affiliation_fp: (ligne.regime_affiliation_fp ?? undefined) as RetraiteData['regime_affiliation_fp'],
  mode_hypothese_revenu_futur: ligne.mode_hypothese_revenu_futur as ModeHypotheseRevenuFutur,
} as RetraiteData);

const versLigne = (updates: Partial<RetraiteData>): TablesUpdate<'retraite_data'> => {
  const { regimes_points, ...reste } = updates;
  return regimes_points === undefined
    ? reste
    : { ...reste, regimes_points: regimes_points as unknown as Json };
};

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

      const { data: retraiteData, error } = await supabase
        .from('retraite_data')
        .select('*')
        .eq('user_id', user.id)
        .eq('personne', personne)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        if (import.meta.env.DEV) {
          console.error('Error loading retirement data:', error);
        }
        return;
      }

      if (retraiteData) {
        setData(depuisLigne(retraiteData));
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error loading retirement data:', error);
      }
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
          .update(versLigne(updates))
          .eq('id', data.id)
          .eq('user_id', user.id)
          .eq('personne', personne);

        if (error) {
          if (import.meta.env.DEV) {
            console.error('Error updating retirement data:', error);
          }
          toast({
            title: "Erreur de sauvegarde",
            description: "Impossible de sauvegarder les données de retraite.",
            variant: "destructive",
          });
          return false;
        }

        setData((prev) => ({ ...prev, ...updates }));
      } else {
        // Création (ou fusion si une sauvegarde concurrente a déjà créé la ligne)
        const { data: newRecord, error } = await supabase
          .from('retraite_data')
          .upsert([{ ...versLigne(updates), user_id: user.id, personne }], { onConflict: 'user_id,personne' })
          .select()
          .single();

        if (error) {
          if (import.meta.env.DEV) {
            console.error('Error creating retirement data:', error);
          }
          toast({
            title: "Erreur de sauvegarde",
            description: "Impossible de créer les données de retraite.",
            variant: "destructive",
          });
          return false;
        }

        if (newRecord) {
          setData(depuisLigne(newRecord));
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
      if (import.meta.env.DEV) {
        console.error('Error saving retirement data:', error);
      }
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