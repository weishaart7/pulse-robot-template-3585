import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RetraiteData {
  id?: string;
  salaire_annuel_moyen?: number;
  trimestres_valides?: number;
  trimestres_requis?: number;
  epargne_per?: number;
  epargne_assurance_vie?: number;
  autres_epargnes?: number;
}

export const useRetraiteData = () => {
  const [data, setData] = useState<RetraiteData>({});
  const [loading, setLoading] = useState(true);
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
        setData(retraiteData);
      }
    } catch (error) {
      console.error('Error loading retirement data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateRetraiteData = async (updates: Partial<RetraiteData>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erreur d'authentification",
          description: "Vous devez être connecté pour sauvegarder les données.",
          variant: "destructive",
        });
        return;
      }

      const newData = { ...data, ...updates };
      setData(newData);

      if (data.id) {
        // Mise à jour d'un enregistrement existant
        const { error } = await supabase
          .from('retraite_data')
          .update(updates)
          .eq('id', data.id)
          .eq('user_id', user.id);

        if (error) {
          console.error('Error updating retirement data:', error);
          toast({
            title: "Erreur de sauvegarde",
            description: "Impossible de sauvegarder les données de retraite.",
            variant: "destructive",
          });
          return;
        }
      } else {
        // Création d'un nouvel enregistrement
        const { data: newRecord, error } = await supabase
          .from('retraite_data')
          .insert([{ ...updates, user_id: user.id }])
          .select()
          .single();

        if (error) {
          console.error('Error creating retirement data:', error);
          toast({
            title: "Erreur de sauvegarde",
            description: "Impossible de créer les données de retraite.",
            variant: "destructive",
          });
          return;
        }

        if (newRecord) {
          setData(newRecord);
        }
      }

      toast({
        title: "Données sauvegardées",
        description: "Vos informations de retraite ont été automatiquement sauvegardées.",
      });
    } catch (error) {
      console.error('Error saving retirement data:', error);
      toast({
        title: "Erreur de sauvegarde",
        description: "Une erreur est survenue lors de la sauvegarde.",
        variant: "destructive",
      });
    }
  };

  return {
    data,
    loading,
    updateRetraiteData,
  };
};