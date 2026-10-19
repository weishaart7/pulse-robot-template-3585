import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { Asset, assetService } from '@/services/assetService';
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

  const handleSubmit = async (data: ImmobilierPropertyFormValues) => {
    if (!asset) return;

    try {
      // Les champs numériques sont `number | ''` côté formulaire (immobilierPropertySchema.ts) : `0`
      // est une valeur saisie valide (bien dévalorisé, frais nul) et ne doit pas devenir `null`
      // (« non renseigné ») à la sauvegarde — seul `''`/`undefined` doit l'être. `0` étant falsy en JS,
      // `data.champ || null` écrasait silencieusement un `0` saisi (cf. docs/immobilier.md §3).
      const numOrNull = (v: number | '' | undefined): number | null => typeof v === 'number' ? v : null;

      const updateData: Partial<Asset> = {
        typologie_bien: data.typologie_bien || null,
        surface_m2: numOrNull(data.surface_m2),
        // Colonne `date` : date locale formatée, comme Patrimoine (useAssetForm.ts). toISOString()
        // convertissait en UTC et enregistrait la veille en France (minuit local = 22 h/23 h UTC).
        date_acquisition: data.date_acquisition ? format(data.date_acquisition, 'yyyy-MM-dd') : null,
        valeur_estimee: numOrNull(data.valeur_estimee),
        statut_bien: data.statut_bien || null,
        // Coût de revient : en lecture seule ici, saisi dans Patrimoine (PropertyCostSection).
        financement_actif: data.financement_actif || false,
        financement_duree_mois: numOrNull(data.financement_duree_mois),
        financement_apport: numOrNull(data.financement_apport),
        financement_taux_credit: numOrNull(data.financement_taux_credit),
        financement_taux_assurance: numOrNull(data.financement_taux_assurance),
        type_location: data.type_location || null,
        regime_location: data.regime_location || null,
      };

      // Via assetService : contrôle de propriété applicatif avant écriture (en plus des RLS).
      await assetService.updateAsset(asset.id!, updateData);

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

// Valeur numérique stockée → champ de formulaire : `0` est une valeur saisie et reste affichée, seul
// `null`/`undefined` devient un champ vide (pendant de `numOrNull` à la sauvegarde).
const numOrEmpty = (v: number | string | null | undefined): number | '' =>
  v == null || v === '' ? '' : Number(v);

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
    surface_m2: numOrEmpty(asset.surface_m2),
    date_acquisition: asset.date_acquisition ? new Date(asset.date_acquisition) : undefined,
    valeur_estimee: numOrEmpty(asset.valeur_estimee),
    statut_bien: (asset.statut_bien ?? undefined) as 'Usage personnel' | 'En rénovation' | 'En vente' | undefined,
    montant_immeuble: numOrEmpty(asset.montant_immeuble),
    frais_agence: numOrEmpty(asset.frais_agence),
    frais_notaire: numOrEmpty(asset.frais_notaire),
    frais_bancaires: numOrEmpty(asset.frais_bancaires),
    frais_hypotheque: numOrEmpty(asset.frais_hypotheque),
    travaux_renovation: numOrEmpty(asset.travaux_renovation),
    travaux_construction: numOrEmpty(asset.travaux_construction),
    meubles: numOrEmpty(asset.meubles),
    financement_actif: asset.financement_actif || false,
    financement_duree_mois: numOrEmpty(asset.financement_duree_mois),
    financement_apport: numOrEmpty(asset.financement_apport),
    financement_taux_credit: numOrEmpty(asset.financement_taux_credit),
    financement_taux_assurance: numOrEmpty(asset.financement_taux_assurance),
    // Valeurs garanties par les contraintes CHECK de `assets`, comme les unions de l'Asset.
    type_location: (asset.type_location ?? undefined) as ImmobilierPropertyFormValues['type_location'],
    regime_location: (asset.regime_location ?? undefined) as ImmobilierPropertyFormValues['regime_location'],
  };
}
