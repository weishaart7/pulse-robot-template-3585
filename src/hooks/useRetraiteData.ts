import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RegimeDetecte } from '@/lib/retraite/parseRIS';

interface RetraiteData {
  id?: string;
  salaire_annuel_moyen?: number;
  trimestres_valides?: number;
  trimestres_requis?: number;
  epargne_per?: number;
  epargne_assurance_vie?: number;
  autres_epargnes?: number;
  regimes_points?: RegimeDetecte[];
}

export const useRetraiteData = () => {
  const [data, setData] = useState<RetraiteData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Chargement initial des données
  useEffect(() => {
    loadRetraiteData();
  }, []);

  const loadRetraiteData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: retraiteData, error } = await supabase
        .from('retraite_data')
        .select('*')
        .eq('user_id', user.id)
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

  const saveRetraiteData = async (updates: Partial<RetraiteData>) => {
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
          .eq('user_id', user.id);

        if (error) {
          console.error('Error updating retirement data:', error);
          toast({
            title: "Erreur de sauvegarde",
            description: "Impossible de sauvegarder les données de retraite.",
            variant: "destructive",
          });
          return false;
        }
      } else {
        // Création d'un nouvel enregistrement
        const { data: newRecord, error } = await supabase
          .from('retraite_data')
          .insert([{ ...updates, user_id: user.id }] as any)
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

      toast({
        title: "Données sauvegardées",
        description: "Vos informations de retraite ont été sauvegardées avec succès.",
      });
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