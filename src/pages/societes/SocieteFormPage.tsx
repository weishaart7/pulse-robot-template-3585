import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SocieteForm } from '@/components/societes/SocieteForm';
import { societeService, type Societe } from '@/services/societeService';
import { useAssets } from '@/hooks/useAssets';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SocieteFormData {
  denomination: string;
  typeSociete: string;
  dateCreation: string;
  valeurEstimee: number;
  pourcentageIFI: number;
  capitalSocial: number;
  nombreTitres: number;
  nombreSalaries: number;
  jourCloture: string;
  moisCloture: string;
  siret: string;
  rueAdresse: string;
  codePostal: string;
  commune: string;
  pays: string;
  typeActivite: string;
  regimeFiscal: string;
  valeurIFI: number;
  activite?: string;
  holding?: string;
  formeSocieteCivile?: string;
  transfertVersActifs?: boolean;
  natureActif?: string;
}

export const SocieteFormPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const societeId = searchParams.get('id');
  const [initialData, setInitialData] = useState<SocieteFormData | null>(null);
  const [loading, setLoading] = useState(false);
  const { createAsset } = useAssets();

  useEffect(() => {
    if (societeId) {
      loadSociete(societeId);
    }
  }, [societeId]);

  const loadSociete = async (id: string) => {
    try {
      setLoading(true);
      const societe = await societeService.getById(id);
      setInitialData(societeToFormData(societe));
    } catch (error) {
      console.error('Error loading societe:', error);
      toast.error('Erreur lors du chargement de la société');
      navigate('/dashboard/societes');
    } finally {
      setLoading(false);
    }
  };

  const societeToFormData = (societe: Societe): SocieteFormData => ({
    denomination: societe.denomination,
    typeSociete: societe.type_societe,
    dateCreation: societe.date_creation || '',
    valeurEstimee: societe.valeur_estimee || 0,
    pourcentageIFI: societe.pourcentage_ifi || 0,
    capitalSocial: societe.capital_social || 0,
    nombreTitres: societe.nombre_titres || 0,
    nombreSalaries: societe.nombre_salaries || 0,
    jourCloture: societe.jour_cloture || '',
    moisCloture: societe.mois_cloture || '',
    siret: societe.siret || '',
    rueAdresse: societe.rue_adresse || '',
    codePostal: societe.code_postal || '',
    commune: societe.commune || '',
    pays: societe.pays || '',
    typeActivite: societe.type_activite || '',
    regimeFiscal: societe.regime_fiscal || '',
    valeurIFI: societe.valeur_ifi || 0,
    activite: societe.activite,
    holding: societe.holding,
    formeSocieteCivile: societe.forme_societe_civile,
    transfertVersActifs: true
  });

  const formDataToSociete = (formData: SocieteFormData) => ({
    denomination: formData.denomination,
    type_societe: formData.typeSociete,
    date_creation: formData.dateCreation || undefined,
    valeur_estimee: formData.valeurEstimee || undefined,
    pourcentage_ifi: formData.pourcentageIFI || undefined,
    capital_social: formData.capitalSocial || undefined,
    nombre_titres: formData.nombreTitres || undefined,
    nombre_salaries: formData.nombreSalaries || undefined,
    jour_cloture: formData.jourCloture || undefined,
    mois_cloture: formData.moisCloture || undefined,
    siret: formData.siret || undefined,
    rue_adresse: formData.rueAdresse || undefined,
    code_postal: formData.codePostal || undefined,
    commune: formData.commune || undefined,
    pays: formData.pays || undefined,
    type_activite: formData.typeActivite || undefined,
    regime_fiscal: formData.regimeFiscal || undefined,
    valeur_ifi: formData.valeurIFI || undefined,
    activite: formData.activite || undefined,
    holding: formData.holding || undefined,
    forme_societe_civile: formData.formeSocieteCivile || undefined
  });

  const handleSubmit = async (data: SocieteFormData) => {
    try {
      const societeData = formDataToSociete(data);
      
      if (societeId) {
        await societeService.update(societeId, societeData);
        toast.success('Société modifiée avec succès');
      } else {
        const savedSociete = await societeService.create(societeData);
        toast.success('Société ajoutée avec succès');

        // Create asset if transfertVersActifs is checked
        if (data.transfertVersActifs && data.natureActif) {
          try {
            await createAsset({
              nature: data.natureActif,
              denomination: data.denomination,
              valeur_estimee: data.valeurEstimee || 0,
              date_estimation: new Date().toISOString().split('T')[0],
              detenteur: 'user',
              mode_detention: 'Pleine propriété'
            });
            toast.success('Actif créé avec succès');
          } catch (assetError) {
            console.error('Error creating asset:', assetError);
            toast.error('Société créée mais erreur lors de la création de l\'actif');
          }
        }
      }
      
      navigate('/dashboard/societes');
    } catch (error) {
      console.error('Error saving societe:', error);
      toast.error('Erreur lors de la sauvegarde de la société');
    }
  };

  const handleCancel = () => {
    navigate('/dashboard/societes');
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={handleCancel}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <h1 className="text-2xl font-bold">
          {societeId ? 'Modifier la société' : 'Ajouter une société'}
        </h1>
      </div>
      
      <div className="bg-background rounded-lg p-6 border">
        <SocieteForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          initialData={initialData}
        />
      </div>
    </div>
  );
};
