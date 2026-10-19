import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { AssetCharge } from '@/services/assetService';
import { useAssetWizard } from '@/hooks/useAssetWizard';
import { IndivisaireDraft } from '@/components/assets/IndivisairesSection';
import { DemembrementDraft } from '@/components/assets/DemembrementSection';
import { ChargeForm } from '@/components/assets/ChargeForm';
import { panelButtonClass, panelPrimaryButtonClass } from '@/components/layout/workspace-panel';
import { ActifFormFrame } from '@/components/assets/ActifFormFrame';
import { WizardConfirmDialog } from './WizardConfirmDialog';
import { WizardStepQuoi } from './WizardStepQuoi';
import { WizardStepOrigine } from './WizardStepOrigine';
import { WizardStepPrix } from './WizardStepPrix';
import { WizardStepDroitsValeur } from './WizardStepDroitsValeur';
import { WizardStepParticularites } from './WizardStepParticularites';
import { WizardStepCharges } from './WizardStepCharges';
import { WizardStepRecap } from './WizardStepRecap';

// Phrase d'introduction de chaque étape, sous son titre.
const STEP_INTROS: Record<string, string> = {
  quoi: 'Ce que vous possédez et comment vous l\'appelez.',
  origine: 'D\'où vient le bien et à qui il appartient — la qualification en découle.',
  prix: 'Ce que le bien a coûté à l\'acquisition.',
  droitsvaleur: 'Les droits détenus (pleine propriété, usufruit…) et la valeur actuelle.',
  particularites: 'Situations spécifiques utiles au conseil.',
  charges: 'Facultatif : dépenses récurrentes liées au bien, à ajouter maintenant ou plus tard.',
  recapitulatif: 'Vérifiez avant de créer l\'actif : rien n\'est enregistré avant validation.',
};

interface AssetCreationWizardProps {
  onSubmit: (asset: any, charges: AssetCharge[], indivisaires: IndivisaireDraft[], demembrements: DemembrementDraft[]) => Promise<boolean | void>;
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
    setCharges,
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
            charges={charges}
            setCharges={setCharges}
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
          />
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <ActifFormFrame
        title="Ajouter un actif"
        aside={
          <p className="text-[12.5px] text-muted-foreground">
            Étape {currentStepIndex + 1} sur {totalSteps}
          </p>
        }
        actions={
          <Button type="button" variant="outline" onClick={handleCancel} className={panelButtonClass}>
            Annuler
          </Button>
        }
      >
        {/* Étapes nommées : celles déjà atteintes sont cliquables pour y revenir. */}
        <ol className="flex gap-1">
          {steps.map((step, index) => {
            const atteinte = index <= maxStepIndexReached;
            const courante = index === currentStepIndex;
            return (
              <li key={step.id} className="min-w-0 flex-1">
                <button
                  type="button"
                  disabled={!atteinte}
                  onClick={() => goToStep(step.id)}
                  aria-current={courante ? 'step' : undefined}
                  className="group w-full text-left disabled:cursor-default"
                >
                  <span className={`block h-1 rounded-[1px] transition-colors ${index <= currentStepIndex ? 'bg-foreground' : atteinte ? 'bg-foreground/35' : 'bg-border'}`} />
                  <span className={`mt-2 hidden truncate text-[11.5px] md:block ${courante ? 'font-medium text-foreground' : atteinte ? 'text-muted-foreground group-hover:text-foreground' : 'text-muted-foreground/60'}`}>
                    {step.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <Form {...form}>
          <div className="mt-8">
            <h2 className="text-[16px] font-medium tracking-[-0.01em] text-foreground">{currentStep.label}</h2>
            {STEP_INTROS[currentStep.id] && (
              <p className="mt-1 text-[12.5px] text-muted-foreground">{STEP_INTROS[currentStep.id]}</p>
            )}
          </div>

          <div className="mt-6">
            {renderStep()}
          </div>

          {/* Pied collé en bas de l'écran sur les étapes longues : les boutons restent accessibles. */}
          <div className="sticky bottom-0 z-10 -mx-8 mt-8 flex justify-end gap-2 border-t border-border bg-background px-8 py-4">
            {!isFirstStep && (
              <Button type="button" variant="outline" onClick={goPrevious} className={panelButtonClass}>
                Précédent
              </Button>
            )}
            {isLastStep ? (
              <Button type="button" onClick={handleValidate} disabled={isLoading} className={panelPrimaryButtonClass}>
                {isLoading ? 'Création…' : "Valider et créer l'actif"}
              </Button>
            ) : (
              <Button type="button" onClick={goNext} className={panelPrimaryButtonClass}>
                Suivant
              </Button>
            )}
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
