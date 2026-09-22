import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { AssetCharge } from '@/services/assetService';
import { useAssetWizard } from '@/hooks/useAssetWizard';
import { IndivisaireDraft } from '@/components/assets/IndivisairesSection';
import { DemembrementDraft } from '@/components/assets/DemembrementSection';
import { ChargeForm } from '@/components/assets/ChargeForm';
import { ActifFormFrame } from '@/components/assets/ActifFormFrame';
import { WizardConfirmDialog } from './WizardConfirmDialog';
import { WizardStepQuoi } from './WizardStepQuoi';
import { WizardStepOrigine } from './WizardStepOrigine';
import { WizardStepPrix } from './WizardStepPrix';
import { WizardStepDroitsValeur } from './WizardStepDroitsValeur';
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

  // Dialogues de confirmation intégrés (pas window.confirm : bloqué dans le
  // navigateur de l'app desktop, cf. WizardConfirmDialog).
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [natureEnAttente, setNatureEnAttente] = useState<string | null>(null);

  const handleCancel = () => {
    if (form.formState.isDirty) {
      setConfirmCancelOpen(true);
      return;
    }
    onCancel();
  };

  // Avertissement quand la nature change après que l'utilisateur soit déjà
  // allé au-delà de l'étape 1 : des champs saisis aux étapes "Origine et
  // propriété", "Prix" ou "Particularités" (conditionnées à la nature) peuvent devenir
  // invalides ou masqués. Tant que l'utilisateur n'a pas confirmé, la nature
  // précédente reste la référence ; un refus la restaure, plutôt que de perdre
  // silencieusement ces informations.
  const previousNatureRef = useRef(form.getValues('nature'));
  const watchedNature = form.watch('nature');
  useEffect(() => {
    const previousNature = previousNatureRef.current;
    if (watchedNature === previousNature) return;
    if (maxStepIndexReached > 0 && previousNature) {
      setNatureEnAttente(watchedNature);
      return;
    }
    previousNatureRef.current = watchedNature;
  }, [watchedNature, maxStepIndexReached]);

  const confirmerChangementNature = () => {
    previousNatureRef.current = natureEnAttente ?? form.getValues('nature');
    setNatureEnAttente(null);
  };

  const refuserChangementNature = () => {
    form.setValue('nature', previousNatureRef.current);
    setNatureEnAttente(null);
  };

  const renderStep = () => {
    switch (currentStep.id) {
      case 'quoi':
        return <WizardStepQuoi form={form} />;
      case 'origine':
        return (
          <WizardStepOrigine
            form={form}
            detenteurOptions={detenteurOptions}
            familyData={familyData}
            familyMembers={familyMembers}
            maritalContext={maritalContext}
            indivisaires={indivisaires}
            setIndivisaires={setIndivisaires}
            qualificationRaison={qualificationRaison}
          />
        );
      case 'prix':
        return <WizardStepPrix form={form} maritalContext={maritalContext} qualificationRaison={qualificationRaison} />;
      case 'droitsvaleur':
        return (
          <WizardStepDroitsValeur
            form={form}
            familyData={familyData}
            familyMembers={familyMembers}
            demembrements={demembrements}
            setDemembrements={setDemembrements}
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
      <ActifFormFrame
        title="Ajouter un actif"
        aside={
          <p className="af-mono text-[var(--af-smoke)]">
            Étape {currentStepIndex + 1}/{totalSteps} — {currentStep.label}
          </p>
        }
      >
        <div className="flex gap-2 flex-wrap">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`h-1 flex-1 rounded-full transition-colors ${index <= currentStepIndex ? 'bg-[var(--af-ink)]' : 'bg-[var(--af-track)]'}`}
            />
          ))}
        </div>

        <Form {...form}>
          <div className="mt-8">
            {renderStep()}
          </div>

          <div className="flex justify-between pt-8">
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
      </ActifFormFrame>

      <WizardConfirmDialog
        open={confirmCancelOpen}
        title="Quitter sans enregistrer ?"
        description="Toutes les informations saisies pour cet actif seront perdues."
        confirmLabel="Quitter"
        cancelLabel="Continuer la saisie"
        onConfirm={() => { setConfirmCancelOpen(false); onCancel(); }}
        onCancel={() => setConfirmCancelOpen(false)}
      />

      <WizardConfirmDialog
        open={natureEnAttente !== null}
        title="Changer la nature de l'actif ?"
        description="Cela peut invalider ou masquer des informations déjà saisies aux étapes suivantes (origine, prix, particularités)."
        confirmLabel="Changer la nature"
        cancelLabel="Garder la nature actuelle"
        onConfirm={confirmerChangementNature}
        onCancel={refuserChangementNature}
      />

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
