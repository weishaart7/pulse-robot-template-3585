import React, { useState, useEffect } from 'react';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { THEME_INK } from '@/lib/theme';
import { SocietesSynthese } from '@/components/societes/SocietesSynthese';
import { SocietesMesSocietes } from '@/components/societes/SocietesMesSocietes';
import { SocietesGouvernance } from '@/components/societes/gouvernance/SocietesGouvernance';
import { SocietesStrategiesFiscales } from '@/components/societes/strategies/SocietesStrategiesFiscales';
import { SocietesTransmission } from '@/components/societes/transmission/SocietesTransmission';
import { SocietesBilans } from '@/components/societes/bilans/SocietesBilans';
import { SocieteActifsDetenus } from '@/components/societes/actifs/SocieteActifsDetenus';
import { SocieteForm } from '@/components/societes/SocieteForm';
import { SocieteFinances } from '@/components/societes/finances/SocieteFinances';
import { societeService } from '@/services/societeService';
import { assetService } from '@/services/assetService';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { type SocieteFormData, societeToFormData, formDataToSociete } from '@/lib/societes/formMapping';

export const SocietesSection = () => {
  const [activeTab, setActiveTab] = useState('synthese');
  const [editingMode, setEditingMode] = useState<'list' | 'edit' | 'create'>('list');
  const [editingSocieteId, setEditingSocieteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SocieteFormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formTab, setFormTab] = useState('informations');

  const FORM_TABS = [
    { id: 'synthese', label: 'Synthèse' },
    { id: 'informations', label: 'Informations' },
    { id: 'finances', label: 'Finances' },
    { id: 'bilans', label: 'Bilans' },
    { id: 'actifs', label: 'Actifs détenus' },
  ];
  const TABS = [
    { id: 'synthese', label: 'Synthèse' },
    { id: 'mes_societes', label: 'Mes sociétés' },
    { id: 'gouvernance', label: 'Associés & gouvernance' },
    { id: 'strategies', label: 'Stratégies fiscales' },
    { id: 'transmission', label: 'Transmission des parts' },
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
      setSaving(true);
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
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFinances = async () => {
    if (!formData) return;
    
    try {
      setSaving(true);
      const societeData = formDataToSociete(formData);
      
      if (editingSocieteId) {
        await societeService.update(editingSocieteId, societeData);
        toast.success('Données financières enregistrées');
      }
    } catch (error) {
      console.error('Error saving finances:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'synthese':
        return <SocietesSynthese />;
      case 'mes_societes':
        return <SocietesMesSocietes onEdit={handleEditSociete} onAdd={handleAddSociete} />;
      case 'gouvernance':
        return <SocietesGouvernance />;
      case 'strategies':
        return <SocietesStrategiesFiscales />;
      case 'transmission':
        return <SocietesTransmission />;
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

          <div className="mb-8 flex justify-start">
            <SegmentedTabs tabs={FORM_TABS} value={formTab} onValueChange={setFormTab} />
          </div>

          <h1 className="text-[34px] font-bold" style={{ color: THEME_INK, letterSpacing: '-0.02em' }}>
            {editingMode === 'edit' ? 'Modifier la société' : 'Nouvelle société'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
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
            {formTab === 'finances' && formData && (
              <SocieteFinances
                societeId={editingSocieteId}
                formData={{
                  denomination: formData.denomination,
                  type_societe: formData.typeSociete,
                  valeur_estimee: formData.valeurEstimee,
                  capital_social: formData.capitalSocial,
                  nombre_titres: formData.nombreTitres,
                  nombre_salaries: formData.nombreSalaries,
                  pourcentage_ifi: formData.pourcentageIFI,
                  valeur_ifi: formData.valeurIFI,
                  regime_fiscal: formData.regimeFiscal,
                  holding: formData.holding,
                  chiffre_affaires: formData.chiffreAffaires,
                  resultat_net: formData.resultatNet,
                  tresorerie_disponible: formData.tresorerieDisponible,
                  compte_courant_associes: formData.compteCourantAssocies,
                  reserves: formData.reserves,
                  date_dernier_bilan: formData.dateDernierBilan,
                }}
                onFormDataChange={(data) => {
                  setFormData({
                    ...formData,
                    chiffreAffaires: data.chiffre_affaires,
                    resultatNet: data.resultat_net,
                    tresorerieDisponible: data.tresorerie_disponible,
                    compteCourantAssocies: data.compte_courant_associes,
                    reserves: data.reserves,
                    dateDernierBilan: data.date_dernier_bilan,
                  });
                }}
                onSave={handleSaveFinances}
                isSaving={saving}
              />
            )}
            {formTab === 'finances' && !formData && (
              <div className="text-center py-12 text-muted-foreground">
                Chargement...
              </div>
            )}
            {formTab === 'bilans' && editingSocieteId && (
              <SocietesBilans />
            )}
            {formTab === 'bilans' && !editingSocieteId && (
              <p className="text-sm text-muted-foreground">Enregistrez d'abord la société pour saisir ses bilans.</p>
            )}
            {formTab === 'actifs' && editingSocieteId && (
              <SocieteActifsDetenus societeId={editingSocieteId} />
            )}
            {formTab === 'actifs' && !editingSocieteId && (
              <p className="text-sm text-muted-foreground">Enregistrez d'abord la société pour voir ses actifs détenus.</p>
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
          <h1 className="text-[34px] font-bold" style={{ color: THEME_INK, letterSpacing: '-0.02em' }}>Sociétés</h1>
        </div>
      </div>

      <div className="mb-6 flex justify-start">
        <SegmentedTabs tabs={TABS} value={activeTab} onValueChange={setActiveTab} />
      </div>

      {renderContent()}
    </div>
  );
};