import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { AssetFormValues } from '@/schemas/assetSchema';
import { FamilyMember } from '@/hooks/useAssetForm';
import { FamilyInfo } from '@/lib/patrimoine/utils';
import { DemembrementDraft } from '@/components/assets/DemembrementSection';
import { ValeurEstimeeFields } from '@/components/assets/fields/ValeurEstimeeFields';
import { PlusValueBlock } from '@/components/assets/fields/PlusValueBlock';
import { ValorisationDemembreeBlock } from '@/components/assets/fields/ValorisationDemembreeBlock';

interface WizardStepValeurProps {
  form: UseFormReturn<AssetFormValues>;
  familyData: FamilyInfo;
  familyMembers: FamilyMember[];
  demembrements: DemembrementDraft[];
}

// Étape "Valeur" : valeur actuelle estimée et son calcul dérivé — plus-value
// latente (par rapport au prix saisi à l'acquisition) et valorisation
// démembrée. Regroupe ce qui était réparti sur trois étapes.
export const WizardStepValeur: React.FC<WizardStepValeurProps> = ({ form, familyData, familyMembers, demembrements }) => (
  <div className="space-y-6">
    <ValeurEstimeeFields form={form} />
    <PlusValueBlock form={form} />
    <ValorisationDemembreeBlock
      form={form}
      familyData={familyData}
      familyMembers={familyMembers}
      demembrements={demembrements}
    />
  </div>
);
