import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { AssetFormValues } from '@/schemas/assetSchema';
import { MaritalContext } from '@/hooks/useAssetForm';
import { OrigineQualificationFields } from '@/components/assets/fields/OrigineQualificationFields';
import { PlusValueBlock } from '@/components/assets/fields/PlusValueBlock';

interface WizardStep3OrigineProps {
  form: UseFormReturn<AssetFormValues>;
  maritalContext: MaritalContext;
  qualificationRaison?: string;
}

// Étape 3 — "D'où vient-il" : bloc origine + qualification (réutilisé tel
// quel depuis l'onglet Propriété actuel) + calcul de plus-value latente,
// affiché ici plutôt que dans l'onglet "Essentiel" du formulaire de
// modification (cf. brief).
export const WizardStep3Origine: React.FC<WizardStep3OrigineProps> = ({ form, maritalContext, qualificationRaison }) => (
  <div className="space-y-6">
    <OrigineQualificationFields form={form} maritalContext={maritalContext} qualificationRaison={qualificationRaison} />
    <PlusValueBlock form={form} />
  </div>
);
