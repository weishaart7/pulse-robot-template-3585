import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Asset } from '@/services/assetService';
import { 
  immobilierPropertySchema, 
  ImmobilierPropertyFormValues,
  isResidenceType,
  isRentalPropertyType
} from '@/schemas/immobilierPropertySchema';

interface UseImmobilierPropertyFormProps {
  asset: Asset | null;
  onSuccess: () => void;
  onClose: () => void;
}

export const useImmobilierPropertyForm = ({ asset, onSuccess, onClose }: UseImmobilierPropertyFormProps) => {
  const { toast } = useToast();
  
  const isResidence = isResidenceType(asset?.nature);
  const isRentalProperty = isRentalPropertyType(asset?.nature);

  const form = useForm<ImmobilierPropertyFormValues>({
    resolver: zodResolver(immobilierPropertySchema),
    defaultValues: getDefaultValues(asset),
  });

  // Reset form when asset changes
  useEffect(() => {
    if (asset) {
      form.reset(getDefaultValues(asset));
    }
  }, [asset, form]);

  // Auto-calculate frais_notaire when montant_immeuble changes (7.5%)
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'montant_immeuble' && value.montant_immeuble) {
        const montant = Number(value.montant_immeuble);
        if (!isNaN(montant) && montant > 0) {
          form.setValue('frais_notaire', montant * 0.075);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const handleSubmit = async (data: ImmobilierPropertyFormValues) => {
    if (!asset) return;

    try {
      const updateData: Record<string, any> = {
        typologie_bien: data.typologie_bien || null,
        surface_m2: data.surface_m2 || null,
        date_acquisition: data.date_acquisition?.toISOString() || null,
        valeur_estimee: data.valeur_estimee || null,
        statut_bien: data.statut_bien || null,
        montant_immeuble: data.montant_immeuble || null,
        frais_agence: data.frais_agence || null,
        frais_notaire: data.frais_notaire || null,
        frais_bancaires: data.frais_bancaires || null,
        frais_hypotheque: data.frais_hypotheque || null,
        travaux_renovation: data.travaux_renovation || null,
        travaux_construction: data.travaux_construction || null,
        meubles: data.meubles || null,
        financement_actif: data.financement_actif || false,
        financement_duree_mois: data.financement_duree_mois || null,
        financement_apport: data.financement_apport || null,
        financement_taux_credit: data.financement_taux_credit || null,
        financement_taux_assurance: data.financement_taux_assurance || null,
        type_location: data.type_location || null,
        regime_location: data.regime_location || null,
      };

      const { error } = await supabase
        .from('assets')
        .update(updateData)
        .eq('id', asset.id);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Les informations du bien ont été mises à jour',
      });

      onSuccess();
      onClose();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour les informations',
        variant: 'destructive',
      });
    }
  };

  return {
    form,
    isResidence,
    isRentalProperty,
    handleSubmit: form.handleSubmit(handleSubmit),
  };
};

function getDefaultValues(asset: Asset | null): ImmobilierPropertyFormValues {
  if (!asset) {
    return {
      typologie_bien: undefined,
      surface_m2: '',
      date_acquisition: undefined,
      valeur_estimee: '',
      statut_bien: undefined,
      montant_immeuble: '',
      frais_agence: '',
      frais_notaire: '',
      frais_bancaires: '',
      frais_hypotheque: '',
      travaux_renovation: '',
      travaux_construction: '',
      meubles: '',
      financement_actif: false,
      financement_duree_mois: '',
      financement_apport: '',
      financement_taux_credit: '',
      financement_taux_assurance: '',
      type_location: undefined,
      regime_location: undefined,
    };
  }

  return {
    typologie_bien: (asset.typologie_bien ?? undefined) as 'Appartement' | 'Maison' | undefined,
    surface_m2: asset.surface_m2 ? Number(asset.surface_m2) : '',
    date_acquisition: asset.date_acquisition ? new Date(asset.date_acquisition) : undefined,
    valeur_estimee: asset.valeur_estimee ? Number(asset.valeur_estimee) : '',
    statut_bien: (asset.statut_bien ?? undefined) as 'Usage personnel' | 'En rénovation' | 'En vente' | undefined,
    montant_immeuble: asset.montant_immeuble ? Number(asset.montant_immeuble) : '',
    frais_agence: asset.frais_agence ? Number(asset.frais_agence) : '',
    frais_notaire: asset.frais_notaire ? Number(asset.frais_notaire) : '',
    frais_bancaires: asset.frais_bancaires ? Number(asset.frais_bancaires) : '',
    frais_hypotheque: asset.frais_hypotheque ? Number(asset.frais_hypotheque) : '',
    travaux_renovation: asset.travaux_renovation ? Number(asset.travaux_renovation) : '',
    travaux_construction: asset.travaux_construction ? Number(asset.travaux_construction) : '',
    meubles: asset.meubles ? Number(asset.meubles) : '',
    financement_actif: asset.financement_actif || false,
    financement_duree_mois: asset.financement_duree_mois ? Number(asset.financement_duree_mois) : '',
    financement_apport: asset.financement_apport ? Number(asset.financement_apport) : '',
    financement_taux_credit: asset.financement_taux_credit ? Number(asset.financement_taux_credit) : '',
    financement_taux_assurance: asset.financement_taux_assurance ? Number(asset.financement_taux_assurance) : '',
    type_location: asset.type_location as any,
    regime_location: asset.regime_location as any,
  };
}
