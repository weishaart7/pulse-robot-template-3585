import React, { useState, useEffect } from 'react';
import AnimatedBackground from '@/components/ui/animated-tabs';
import { SocietesSynthese } from '@/components/societes/SocietesSynthese';
import { SocietesStrategies } from '@/components/societes/SocietesStrategies';
import { SocietesMesSocietes } from '@/components/societes/SocietesMesSocietes';
import { SocieteForm } from '@/components/societes/SocieteForm';
import { societeService, type Societe } from '@/services/societeService';
import { assetService } from '@/services/assetService';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

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

export const SocietesSection = () => {
  const [activeTab, setActiveTab] = useState('synthese');
  const [editingMode, setEditingMode] = useState<'list' | 'edit' | 'create'>('list');
  const [editingSocieteId, setEditingSocieteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SocieteFormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [formTab, setFormTab] = useState('informations');

  const FORM_TABS = [
    { id: 'synthese', label: 'Synthèse' },
    { id: 'informations', label: 'Informations' },
    { id: 'finances', label: 'Finances' }
  ];
  const TABS = [
    { id: 'synthese', label: 'Synthèse' },
    { id: 'mes_societes', label: 'Mes sociétés' },
    { id: 'strategies', label: 'Stratégies' }
  ];

  useEffect(() => {
    if (editingMode === 'edit' && editingSocieteId) {
      loadSociete(editingSocieteId);
    } else if (editingMode === 'create') {
      setFormData(null);
    }
  }, [editingMode, editingSocieteId]);

  const loadSociete = async (id: string) => {
    try {
      setLoading(true);
      const societe = await societeService.getById(id);
      if (societe) {
        setFormData(societeToFormData(societe));
      }
    } catch (error) {
      console.error('Error loading societe:', error);
      toast.error('Erreur lors du chargement de la société');
    } finally {
      setLoading(false);
    }
  };

  const societeToFormData = (societe: Societe): SocieteFormData => ({
    denomination: societe.denomination || '',
    typeSociete: societe.type_societe || '',
    dateCreation: societe.date_creation || '',
    valeurEstimee: societe.valeur_estimee || 0,
    pourcentageIFI: societe.pourcentage_ifi || 0,
    capitalSocial: societe.capital_social || 0,
    nombreTitres: societe.nombre_titres || 0,
    nombreSalaries: societe.nombre_salaries || 0,
    jourCloture: societe.jour_cloture || '31',
    moisCloture: societe.mois_cloture || 'Décembre',
    siret: societe.siret || '',
    rueAdresse: societe.rue_adresse || '',
    codePostal: societe.code_postal || '',
    commune: societe.commune || '',
    pays: societe.pays || 'France',
    typeActivite: societe.type_activite || '',
    regimeFiscal: societe.regime_fiscal || '',
    valeurIFI: societe.valeur_ifi || 0,
    activite: societe.activite || '',
    holding: societe.holding || 'Non',
    formeSocieteCivile: societe.forme_societe_civile || '',
    transfertVersActifs: false
  });

  const formDataToSociete = (data: SocieteFormData): Omit<Societe, 'id' | 'user_id' | 'created_at' | 'updated_at'> => ({
    denomination: data.denomination,
    type_societe: data.typeSociete,
    date_creation: data.dateCreation || null,
    valeur_estimee: data.valeurEstimee || null,
    pourcentage_ifi: data.pourcentageIFI || null,
    capital_social: data.capitalSocial || null,
    nombre_titres: data.nombreTitres || null,
    nombre_salaries: data.nombreSalaries || null,
    jour_cloture: data.jourCloture || null,
    mois_cloture: data.moisCloture || null,
    siret: data.siret || null,
    rue_adresse: data.rueAdresse || null,
    code_postal: data.codePostal || null,
    commune: data.commune || null,
    pays: data.pays || null,
    type_activite: data.typeActivite || null,
    regime_fiscal: data.regimeFiscal || null,
    valeur_ifi: data.valeurIFI || null,
    activite: data.activite || null,
    holding: data.holding || null,
    forme_societe_civile: data.formeSocieteCivile || null
  });

  const handleEditSociete = (societeId: string) => {
    setEditingSocieteId(societeId);
    setEditingMode('edit');
  };

  const handleAddSociete = () => {
    setEditingSocieteId(null);
    setEditingMode('create');
  };

  const handleCancel = () => {
    setEditingMode('list');
    setEditingSocieteId(null);
    setFormData(null);
    setFormTab('informations');
  };

  const handleSubmit = async (data: SocieteFormData) => {
    try {
      const societeData = formDataToSociete(data);
      
      if (editingMode === 'edit' && editingSocieteId) {
        await societeService.update(editingSocieteId, societeData);
        toast.success('Société modifiée avec succès');
      } else {
        const newSociete = await societeService.create(societeData);
        
        // Create asset if requested
        if (data.transfertVersActifs && data.natureActif && newSociete) {
          await assetService.createAsset({
            nature: data.natureActif,
            denomination: data.denomination,
            valeur_estimee: data.valeurEstimee || undefined,
            etablissement: data.denomination
          });
        }
        
        toast.success('Société créée avec succès');
      }
      
      handleCancel();
    } catch (error) {
      console.error('Error saving societe:', error);
      toast.error('Erreur lors de l\'enregistrement de la société');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'synthese':
        return <SocietesSynthese />;
      case 'mes_societes':
        return (
          <SocietesMesSocietes 
            onEdit={handleEditSociete}
            onAdd={handleAddSociete}
          />
        );
      case 'strategies':
        return <SocietesStrategies />;
      default:
        return <SocietesSynthese />;
    }
  };

  // Full-page form mode
  if (editingMode === 'edit' || editingMode === 'create') {
    return (
      <div className="p-6">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={handleCancel}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux sociétés
          </Button>

          <div className="mb-6 flex justify-start">
            <div className="rounded-[8px] bg-muted p-[2px]">
              <AnimatedBackground
                defaultValue={formTab}
                onValueChange={(value) => setFormTab(value || 'informations')}
                className="rounded-lg bg-background shadow-sm"
                transition={{
                  ease: "easeInOut",
                  duration: 0.2,
                }}
              >
                {FORM_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    data-id={tab.id}
                    type="button"
                    className="inline-flex min-w-24 items-center justify-center px-3 py-2 text-sm font-medium text-foreground transition-transform active:scale-[0.98]"
                  >
                    {tab.label}
                  </button>
                ))}
              </AnimatedBackground>
            </div>
          </div>

          <h2 className="text-2xl font-bold tracking-tight">
            {editingMode === 'edit' ? 'Modifier la société' : 'Nouvelle société'}
          </h2>
          <p className="text-muted-foreground">
            {editingMode === 'edit' 
              ? 'Modifiez les informations de votre société' 
              : 'Ajoutez une nouvelle société à votre patrimoine'}
          </p>
        </div>
        
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        ) : (
          <>
            {formTab === 'synthese' && (
              <div className="text-center py-12 text-muted-foreground">
                Synthèse de la société (à venir)
              </div>
            )}
            {formTab === 'informations' && (
              <SocieteForm
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                initialData={formData}
                activeTab={formTab}
              />
            )}
            {formTab === 'finances' && (
              <div className="text-center py-12 text-muted-foreground">
                Informations financières (à venir)
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sociétés</h2>
          <p className="text-muted-foreground">
            Administrez vos participations et structures sociétaires
          </p>
        </div>
      </div>

      <div className="mb-6 flex justify-start">
        <div className="rounded-[8px] bg-muted p-[2px]">
          <AnimatedBackground
            defaultValue="synthese"
            onValueChange={(value) => setActiveTab(value || 'synthese')}
            className="rounded-lg bg-background shadow-sm"
            transition={{
              ease: "easeInOut",
              duration: 0.2,
            }}
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                data-id={tab.id}
                type="button"
                className="inline-flex min-w-24 items-center justify-center px-3 py-2 text-sm font-medium text-foreground transition-transform active:scale-[0.98]"
              >
                {tab.label}
              </button>
            ))}
          </AnimatedBackground>
        </div>
      </div>

      <div className="mt-6">
        {renderContent()}
      </div>
    </div>
  );
};