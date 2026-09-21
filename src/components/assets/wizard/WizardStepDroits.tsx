import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { AssetFormValues } from '@/schemas/assetSchema';
import { FamilyMember } from '@/hooks/useAssetForm';
import { DemembrementDraft } from '@/components/assets/DemembrementSection';
import { DemembrementFields, ModeDetentionField } from '@/components/assets/fields/DetentionFields';

interface WizardStepDroitsProps {
  form: UseFormReturn<AssetFormValues>;
  familyMembers: FamilyMember[];
  demembrements: DemembrementDraft[];
  setDemembrements: (value: DemembrementDraft[]) => void;
}

// Étape "Droits détenus" : pleine propriété, usufruit ou nue-propriété, et
// contreparties de démembrement. Le mode de détention n'influence pas la
// qualification (qualifierBien() ne le lit pas), il peut donc venir après.
export const WizardStepDroits: React.FC<WizardStepDroitsProps> = ({ form, familyMembers, demembrements, setDemembrements }) => (
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
  </div>
);
