import React, { useState, useEffect } from 'react';
import AnimatedBackground from '@/components/ui/animated-tabs';
import { SocietesSynthese } from '@/components/societes/SocietesSynthese';
import { SocietesMesSocietes } from '@/components/societes/SocietesMesSocietes';
import { SocietesGouvernance } from '@/components/societes/gouvernance/SocietesGouvernance';
import { SocietesStrategiesFiscales } from '@/components/societes/strategies/SocietesStrategiesFiscales';
import { SocietesTransmission } from '@/components/societes/transmission/SocietesTransmission';
import { SocietesBilans } from '@/components/societes/bilans/SocietesBilans';
import { SocieteActifsDetenus } from '@/components/societes/actifs/SocieteActifsDetenus';
import { SocieteForm } from '@/components/societes/SocieteForm';
import { SocieteFinances } from '@/components/societes/finances/SocieteFinances';
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
  pourcentageUtilisateur?: number;
  pourcentageConjoint?: number;
  // New financial fields
  chiffreAffaires?: number;
  resultatNet?: number;
  tresorerieDisponible?: number;
  compteCourantAssocies?: number;
  reserves?: number;
  dateDernierBilan?: string;
}

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
    transfertVersActifs: false,
    pourcentageUtilisateur: societe.pourcentage_utilisateur || 100,
    pourcentageConjoint: societe.pourcentage_conjoint || 0,
    // New financial fields
    chiffreAffaires: (societe as any).chiffre_affaires || undefined,
    resultatNet: (societe as any).resultat_net || undefined,
    tresorerieDisponible: (societe as any).tresorerie_disponible || undefined,
    compteCourantAssocies: (societe as any).compte_courant_associes || undefined,
    reserves: (societe as any).reserves || undefined,
    dateDernierBilan: (societe as any).date_dernier_bilan || undefined,
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
    forme_societe_civile: data.formeSocieteCivile || null,
    pourcentage_utilisateur: data.pourcentageUtilisateur || null,
    pourcentage_conjoint: data.pourcentageConjoint || null,
    // New financial fields
    chiffre_affaires: data.chiffreAffaires || null,
    resultat_net: data.resultatNet || null,
    tresorerie_disponible: data.tresorerieDisponible || null,
    compte_courant_associes: data.compteCourantAssocies || null,
    reserves: data.reserves || null,
    date_dernier_bilan: data.dateDernierBilan || null,
  } as any);

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
                  type_activite: formData.typeActivite,
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