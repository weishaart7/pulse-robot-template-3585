import { useMemo, useState } from 'react';
import { AssetFormValues } from '@/schemas/assetSchema';
import { NATURES_WITHOUT_ACQUISITION } from '@/constants/assetTypes';
import { useAssetForm } from './useAssetForm';
import { AssetCharge } from '@/services/assetService';
import { IndivisaireDraft } from '@/components/assets/IndivisairesSection';
import { DemembrementDraft } from '@/components/assets/DemembrementSection';

export type WizardStepId = 'quoi' | 'detention' | 'origine' | 'particularites' | 'charges' | 'recapitulatif';

interface WizardStepDef {
  id: WizardStepId;
  label: string;
  // Champs déclenchant une validation Zod ciblée (form.trigger) au clic sur "Suivant".
  // Aujourd'hui seul `nature` est requis par assetSchema.ts : les autres champs listés
  // ici ne bloquent donc rien tant que le schéma ne les rend pas obligatoires, mais le
  // déclenchement reste en place pour ne pas avoir à y repenser si ça change.
  fields: (keyof AssetFormValues)[];
  // Prédicat de saut : une étape sans champ pertinent pour la nature/détention
  // sélectionnées est retirée de la liste plutôt qu'affichée vide.
  isVisible: (values: Partial<AssetFormValues>) => boolean;
}

// Étape "D'où vient-il" : mêmes conditions que le bloc Origine de l'onglet
// Propriété actuel (AssetForm.tsx) — masqué pour un bien en indivision hors
// couple (la qualification est alors directement "Indivision") et pour les
// natures sans notion d'acquisition (livrets/comptes bancaires).
const isOrigineStepVisible = (values: Partial<AssetFormValues>) =>
  values.detenteur !== 'Indivision' && !NATURES_WITHOUT_ACQUISITION.includes(values.nature || '');

// Étape "Particularités" : contient toujours au moins le champ "Situation
// particulière" (jamais masqué, quelle que soit la nature) et, pour la
// plupart des natures, "Attachement émotionnel" — elle n'est donc jamais
// sautée, à la différence des autres étapes conditionnées par la nature.
// Cf. échange du 2026-09-10 : décision explicite de ne pas la rendre
// sautable plutôt que de déplacer ces deux champs génériques ailleurs.
const WIZARD_STEPS: WizardStepDef[] = [
  {
    id: 'quoi',
    label: 'Quoi',
    fields: ['nature', 'denomination', 'valeur_estimee', 'date_estimation'],
    isVisible: () => true,
  },
  {
    id: 'detention',
    label: 'À qui appartient-il',
    fields: ['mode_detention', 'detenteur', 'pourcentage_utilisateur', 'pourcentage_conjoint', 'licitation_acquereur', 'part_licitation_personnelle'],
    isVisible: () => true,
  },
  {
    id: 'origine',
    label: "D'où vient-il",
    fields: ['date_acquisition', 'origine_actif', 'valeur_acquisition', 'frais_acquisition', 'clause_entree_communaute', 'clause_remploi', 'financement_mixte_apport_propre', 'est_propre_par_nature', 'qualification_bien'],
    isVisible: isOrigineStepVisible,
  },
  {
    id: 'particularites',
    label: 'Particularités',
    fields: [],
    isVisible: () => true,
  },
  {
    id: 'charges',
    label: 'Charges',
    fields: [],
    isVisible: () => true,
  },
  {
    id: 'recapitulatif',
    label: 'Récapitulatif',
    fields: [],
    isVisible: () => true,
  },
];

interface UseAssetWizardProps {
  onSubmit: (asset: any, charges: AssetCharge[], indivisaires: IndivisaireDraft[], demembrements: DemembrementDraft[]) => Promise<void>;
}

// Pilote le wizard de création d'un actif au-dessus de useAssetForm (instance
// react-hook-form unique, partagée par toutes les étapes). N'ajoute que la
// logique propre au wizard : étapes visibles, navigation, validation par étape.
export const useAssetWizard = ({ onSubmit }: UseAssetWizardProps) => {
  const assetForm = useAssetForm({ asset: undefined, onSubmit });
  const { form } = assetForm;
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  // Plus haut index déjà atteint : sert à savoir si l'utilisateur est revenu
  // en arrière sur l'étape 1 après avoir déjà avancé, pour avertir d'un
  // changement de nature plutôt que de laisser des champs déjà saisis
  // devenir silencieusement invalides/masqués (cf. brief du 2026-09-10).
  const [maxStepIndexReached, setMaxStepIndexReached] = useState(0);

  // Résubscrit à chaque changement de champ : les prédicats de saut ne
  // dépendent aujourd'hui que de `nature` et `detenteur`, mais s'appuient sur
  // les valeurs complètes du formulaire pour rester correctes si un futur
  // prédicat dépend d'un autre champ.
  const watchedValues = form.watch();

  const visibleSteps = useMemo(
    () => WIZARD_STEPS.filter((step) => step.isVisible(watchedValues)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [watchedValues.nature, watchedValues.detenteur]
  );

  // Si l'étape courante vient de disparaître (ex. nature changée en cours de
  // route côté étape 1), on se replie sur l'étape visible la plus proche en
  // arrière plutôt que d'afficher une étape fantôme. L'avertissement de perte
  // de données potentielle (champs déjà saisis devenant invalides) reste à
  // traiter en Phase 4 : ce repli est un garde-fou minimal, pas la solution
  // finale demandée dans le brief.
  const safeIndex = Math.min(currentStepIndex, visibleSteps.length - 1);
  const currentStep = visibleSteps[safeIndex];
  const isFirstStep = safeIndex === 0;
  const isLastStep = safeIndex === visibleSteps.length - 1;

  const goToStep = (stepId: WizardStepId) => {
    const index = visibleSteps.findIndex((s) => s.id === stepId);
    if (index !== -1) setCurrentStepIndex(index);
  };

  const goNext = async () => {
    const stepDef = WIZARD_STEPS.find((s) => s.id === currentStep.id);
    if (stepDef && stepDef.fields.length > 0) {
      const valid = await form.trigger(stepDef.fields);
      if (!valid) return false;
    }
    if (!isLastStep) {
      const nextIndex = safeIndex + 1;
      setCurrentStepIndex(nextIndex);
      setMaxStepIndexReached((prev) => Math.max(prev, nextIndex));
    }
    return true;
  };

  const goPrevious = () => {
    if (!isFirstStep) setCurrentStepIndex(safeIndex - 1);
  };

  return {
    ...assetForm,
    steps: visibleSteps,
    currentStep,
    currentStepIndex: safeIndex,
    totalSteps: visibleSteps.length,
    isFirstStep,
    isLastStep,
    maxStepIndexReached,
    goToStep,
    goNext,
    goPrevious,
  };
};
