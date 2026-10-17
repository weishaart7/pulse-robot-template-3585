import React, { useState, useEffect } from 'react';
import { GooeyNav } from '@/components/ui/gooey-nav';
import { WorkspaceHeader, panelButtonClass } from '@/components/layout/workspace-panel';
import { useModuleSubNav } from '@/hooks/useModuleSubNav';
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
import { ArrowLeft, Briefcase } from 'lucide-react';
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

  const isEditingForm = editingMode === 'edit' || editingMode === 'create';
  useModuleSubNav(isEditingForm ? [] : TABS, activeTab, setActiveTab);

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
      if (import.meta.env.DEV) console.error('Error loading societe:', error);
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
      if (import.meta.env.DEV) console.error('Error saving societe:', error);
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
      if (import.meta.env.DEV) console.error('Error saving finances:', error);
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

  const nomSociete = editingMode === 'edit' ? formData?.denomination || 'Société' : 'Nouvelle société';

  // Fiche société en « panneau de travail » (comme les fiches de bien Immobilier) : barre d'en-tête
  // à fil d'Ariane portant le retour, titre 24 px, onglets de la fiche, contenu bord à bord.
  if (editingMode === 'edit' || editingMode === 'create') {
    return (
      <div className="workspace-panel -mx-4 -mt-3 md:-m-6">
        <WorkspaceHeader
          icon={<Briefcase strokeWidth={1.75} />}
          trail={['Sociétés', 'Mes sociétés', nomSociete]}
          actions={
            <Button type="button" variant="outline" onClick={handleCancel} className={`gap-1.5 ${panelButtonClass}`}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Retour aux sociétés
            </Button>
          }
        />

        <div className="px-8 pt-6 pb-1">
          <h1 className="text-[24px] font-medium leading-tight tracking-[-0.02em]">{nomSociete}</h1>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {editingMode === 'edit'
              ? 'Modifiez les informations de votre société'
              : 'Ajoutez une nouvelle société à votre patrimoine'}
          </p>
        </div>

        <div className="px-8 pt-5 pb-4">
          <GooeyNav aria-label="Onglets de la fiche société" items={FORM_TABS} value={formTab} onValueChange={setFormTab} />
        </div>

        <div className="border-t border-border">
        {loading ? (
          <p className="px-8 py-6 text-[13px] text-muted-foreground">Chargement…</p>
        ) : (
          <>
            {formTab === 'synthese' && (
              <p className="px-8 py-6 text-[13px] text-muted-foreground">Synthèse de la société (à venir)</p>
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
                  pourcentage_utilisateur: formData.pourcentageUtilisateur,
                  pourcentage_conjoint: formData.pourcentageConjoint,
                  regime_fiscal: formData.regimeFiscal,
                  holding: formData.holding,
                  chiffre_affaires: formData.chiffreAffaires,
                  resultat_net: formData.resultatNet,
                  tresorerie_disponible: formData.tresorerieDisponible,
                  compte_courant_associes: formData.compteCourantAssocies,
                  reserves: formData.reserves,
                  date_dernier_bilan: formData.dateDernierBilan,
                  eligible_taux_reduit_pme: formData.eligibleTauxReduitPme,
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
                    eligibleTauxReduitPme: data.eligible_taux_reduit_pme,
                  });
                }}
                onSave={handleSaveFinances}
                isSaving={saving}
              />
            )}
            {formTab === 'finances' && !formData && (
              <p className="px-8 py-6 text-[13px] text-muted-foreground">Chargement…</p>
            )}
            {formTab === 'bilans' && editingSocieteId && (
              <SocietesBilans />
            )}
            {formTab === 'bilans' && !editingSocieteId && (
              <p className="px-8 py-6 text-[13px] text-muted-foreground">Enregistrez d'abord la société pour saisir ses bilans.</p>
            )}
            {formTab === 'actifs' && editingSocieteId && (
              <SocieteActifsDetenus societeId={editingSocieteId} />
            )}
            {formTab === 'actifs' && !editingSocieteId && (
              <p className="px-8 py-6 text-[13px] text-muted-foreground">Enregistrez d'abord la société pour voir ses actifs détenus.</p>
            )}
          </>
        )}
        </div>
      </div>
    );
  }

  const tabLabel = TABS.find((t) => t.id === activeTab)?.label ?? 'Synthèse';
  const SUMMARIES: Record<string, string> = {
    synthese: 'Valeur, comptes et alertes des sociétés du foyer',
    mes_societes: 'Sociétés détenues et participations entre elles',
    gouvernance: 'Associés, dividendes, pacte et comptes courants d\'une société',
    strategies: 'Simulations IS / IR, rémunération / dividendes et holding',
    transmission: 'Pacte Dutreil, OBO et donation de parts',
  };

  // Cadre « panneau de travail », sur le modèle de Famille, Patrimoine et Immobilier.
  return (
    <div className="workspace-panel -mx-4 -mt-3 md:-m-6">
      <WorkspaceHeader icon={<Briefcase strokeWidth={1.75} />} trail={['Sociétés', tabLabel]} />

      <div className="px-8 pt-6 pb-4">
        <h1 className="text-[24px] font-medium leading-tight tracking-[-0.02em]">{tabLabel}</h1>
        <p className="mt-1 text-[12.5px] text-muted-foreground">{SUMMARIES[activeTab]}</p>
      </div>

      <div className="border-t border-border">
        {renderContent()}
      </div>
    </div>
  );
};