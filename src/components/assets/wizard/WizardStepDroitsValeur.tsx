import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { AssetFormValues } from '@/schemas/assetSchema';
import { FamilyMember } from '@/hooks/useAssetForm';
import { FamilyInfo } from '@/lib/patrimoine/utils';
import { DemembrementDraft } from '@/components/assets/DemembrementSection';
import { DemembrementFields, ModeDetentionField } from '@/components/assets/fields/DetentionFields';
import { ValeurEstimeeFields } from '@/components/assets/fields/ValeurEstimeeFields';
import { PlusValueBlock } from '@/components/assets/fields/PlusValueBlock';
import { ValorisationDemembreeBlock } from '@/components/assets/fields/ValorisationDemembreeBlock';

interface WizardStepDroitsValeurProps {
  form: UseFormReturn<AssetFormValues>;
  familyData: FamilyInfo;
  familyMembers: FamilyMember[];
  demembrements: DemembrementDraft[];
  setDemembrements: (value: DemembrementDraft[]) => void;
}

// Étape "Droits et valeur" : ce que détient réellement le propriétaire (pleine
// propriété, usufruit ou nue-propriété, contreparties de démembrement) et ce
// que ça vaut (valeur estimée, plus-value latente, valorisation démembrée).
// Regroupés car la valorisation démembrée dépend à la fois du mode de
// détention et de la valeur actuelle. Le mode de détention n'influence pas la
// qualification (qualifierBien() ne le lit pas), il peut donc venir après.
export const WizardStepDroitsValeur: React.FC<WizardStepDroitsValeurProps> = ({
  form,
  familyData,
  familyMembers,
  demembrements,
  setDemembrements
}) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ModeDetentionField form={form} />
    </div>
    <DemembrementFields
      form={form}
      familyMembers={familyMembers}
      demembrements={demembrements}
      setDemembrements={setDemembrements}
    />
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
