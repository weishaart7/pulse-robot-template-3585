import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { AssetCharge } from '@/services/assetService';
import { useAssetWizard } from '@/hooks/useAssetWizard';
import { IndivisaireDraft } from '@/components/assets/IndivisairesSection';
import { DemembrementDraft } from '@/components/assets/DemembrementSection';
import { ChargeForm } from '@/components/assets/ChargeForm';
import { WizardStepQuoi } from './WizardStepQuoi';
import { WizardStepQui } from './WizardStepQui';
import { WizardStepAcquisition } from './WizardStepAcquisition';
import { WizardStepQualification } from './WizardStepQualification';
import { WizardStepDroits } from './WizardStepDroits';
import { WizardStepValeur } from './WizardStepValeur';
import { WizardStepParticularites } from './WizardStepParticularites';
import { WizardStepCharges } from './WizardStepCharges';
import { WizardStepRecap } from './WizardStepRecap';

interface AssetCreationWizardProps {
  onSubmit: (asset: any, charges: AssetCharge[], indivisaires: IndivisaireDraft[], demembrements: DemembrementDraft[]) => Promise<void>;
  onCancel: () => void;
}

// Orchestrateur du wizard de création d'un actif en étapes adaptatives
// (cf. brief du 2026-09-10). Le formulaire de modification (AssetForm.tsx,
// 4 onglets) n'est pas concerné par ce composant.
export const AssetCreationWizard: React.FC<AssetCreationWizardProps> = ({ onSubmit, onCancel }) => {
  const wizard = useAssetWizard({ onSubmit });
  const {
    form,
    charges,
    showChargeForm,
    setShowChargeForm,
    editingCharge,
    setEditingCharge,
    isLoading,
    detenteurOptions,
    familyMembers,
    familyData,
    maritalContext,
    indivisaires,
    setIndivisaires,
    demembrements,
    setDemembrements,
    qualificationRaison,
    detenteurAResoudre,
    handleSubmit,
    handleChargeSubmit,
    handleChargeDelete,
    handleChargeEdit,
    steps,
    currentStep,
    currentStepIndex,
    totalSteps,
    isFirstStep,
    isLastStep,
    maxStepIndexReached,
    goToStep,
    goNext,
    goPrevious,
  } = wizard;

  const handleValidate = () => {
    form.handleSubmit(handleSubmit)();
  };

  // Avertissement de fermeture (onglet/navigateur) tant que le récapitulatif
  // n'a pas été validé : aucune écriture en base n'a lieu avant ce point
  // (handleValidate, appelé uniquement depuis WizardStepRecap), donc tout
  // abandon avant coup perd la saisie en cours.
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!form.formState.isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [form.formState.isDirty]);

  const handleCancel = () => {
    if (form.formState.isDirty && !window.confirm(
      "Vous allez quitter sans enregistrer : toutes les informations saisies pour cet actif seront perdues. Continuer ?"
    )) {
      return;
    }
    onCancel();
  };

  // Avertissement quand la nature change après que l'utilisateur soit déjà
  // allé au-delà de l'étape 1 : des champs saisis aux étapes "Acquisition",
  // "Qualification" ou "Particularités" (conditionnées à la nature) peuvent devenir
  // invalides ou masqués. On revient sur la nature précédente si l'utilisateur
  // ne confirme pas, plutôt que de perdre silencieusement ces informations.
  const previousNatureRef = useRef(form.getValues('nature'));
  const watchedNature = form.watch('nature');
  useEffect(() => {
    const previousNature = previousNatureRef.current;
    if (watchedNature === previousNature) return;
    if (maxStepIndexReached > 0 && previousNature) {
      const confirmed = window.confirm(
        "Changer la nature de l'actif peut invalider ou masquer des informations déjà saisies aux étapes suivantes (acquisition, qualification, particularités). Continuer ?"
      );
      if (!confirmed) {
        form.setValue('nature', previousNature);
        return;
      }
    }
    previousNatureRef.current = watchedNature;
  }, [watchedNature, maxStepIndexReached, form]);

  const renderStep = () => {
    switch (currentStep.id) {
      case 'quoi':
        return <WizardStepQuoi form={form} />;
      case 'qui':
        return (
          <WizardStepQui
            form={form}
            detenteurOptions={detenteurOptions}
            familyData={familyData}
            familyMembers={familyMembers}
            indivisaires={indivisaires}
            setIndivisaires={setIndivisaires}
            detenteurAResoudre={detenteurAResoudre}
          />
        );
      case 'acquisition':
        return <WizardStepAcquisition form={form} maritalContext={maritalContext} />;
      case 'qualification':
        return (
          <WizardStepQualification
            form={form}
            familyData={familyData}
            maritalContext={maritalContext}
            qualificationRaison={qualificationRaison}
            detenteurAResoudre={detenteurAResoudre}
          />
        );
      case 'droits':
        return (
          <WizardStepDroits
            form={form}
            familyMembers={familyMembers}
            demembrements={demembrements}
            setDemembrements={setDemembrements}
          />
        );
      case 'valeur':
        return (
          <WizardStepValeur
            form={form}
            familyData={familyData}
            familyMembers={familyMembers}
            demembrements={demembrements}
          />
        );
      case 'particularites':
        return <WizardStepParticularites form={form} />;
      case 'charges':
        return (
          <WizardStepCharges
            charges={charges}
            onAdd={() => setShowChargeForm(true)}
            onEdit={handleChargeEdit}
            onDelete={handleChargeDelete}
            onSkip={() => { goNext(); }}
          />
        );
      case 'recapitulatif':
        return (
          <WizardStepRecap
            form={form}
            charges={charges}
            familyData={familyData}
            familyMembers={familyMembers}
            demembrements={demembrements}
            indivisaires={indivisaires}
            onEditStep={goToStep}
            onValidate={handleValidate}
            isSubmitting={isLoading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Ajouter un actif</h2>
        <p className="text-sm text-muted-foreground">
          Étape {currentStepIndex + 1}/{totalSteps} — {currentStep.label}
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`h-1.5 flex-1 rounded-full ${index <= currentStepIndex ? 'bg-[#62706d]' : 'bg-[#ebf1f1]'}`}
          />
        ))}
      </div>

      <Form {...form}>
        <div className="mt-6">
          {renderStep()}
        </div>

        <div className="flex justify-between pt-6 border-t">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Annuler
          </Button>
          <div className="flex space-x-2">
            {!isFirstStep && (
              <Button type="button" variant="outline" onClick={goPrevious}>
                Précédent
              </Button>
            )}
            {!isLastStep && (
              <Button type="button" onClick={goNext}>
                Suivant
              </Button>
            )}
          </div>
        </div>
      </Form>

      {showChargeForm && (
        <ChargeForm
          charge={editingCharge || undefined}
          onSubmit={handleChargeSubmit}
          onCancel={() => {
            setShowChargeForm(false);
            setEditingCharge(null);
          }}
        />
      )}
    </div>
  );
};
