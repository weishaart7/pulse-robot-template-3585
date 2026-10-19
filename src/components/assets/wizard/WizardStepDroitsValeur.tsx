import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { AssetFormValues } from '@/schemas/assetSchema';
import { FamilyMember } from '@/hooks/useAssetForm';
import { FamilyInfo } from '@/lib/patrimoine/utils';
import { DemembrementDraft } from '@/components/assets/DemembrementSection';
import { ValeurEstimeeFields } from '@/components/assets/fields/ValeurEstimeeFields';
import { PlusValueBlock } from '@/components/assets/fields/PlusValueBlock';
import { ValorisationDemembreeBlock } from '@/components/assets/fields/ValorisationDemembreeBlock';
import { PrimeFields } from '@/components/assets/fields/PrimeFields';
import { AssetCharge } from '@/services/assetService';
import { isPrevoyanceDeces } from '@/constants/assetTypes';

interface WizardStepDroitsValeurProps {
  form: UseFormReturn<AssetFormValues>;
  familyData: FamilyInfo;
  familyMembers: FamilyMember[];
  demembrements: DemembrementDraft[];
  setDemembrements: (value: DemembrementDraft[]) => void;
  charges: AssetCharge[];
  setCharges: React.Dispatch<React.SetStateAction<AssetCharge[]>>;
}

// Étape "Valeur" : ce que vaut le bien (valeur estimée, plus-value latente,
// valorisation démembrée). Le mode de détention et les contreparties de
// démembrement sont demandés à l'étape "Origine et propriété", avec le
// détenteur et la qualification ; la valorisation démembrée les reprend ici.
export const WizardStepDroitsValeur: React.FC<WizardStepDroitsValeurProps> = ({
  form,
  familyData,
  familyMembers,
  demembrements,
  setDemembrements,
  charges,
  setCharges
}) => (
  <div className="space-y-6">
    <ValeurEstimeeFields form={form} />
    {isPrevoyanceDeces(form.watch('nature')) && (
      <PrimeFields form={form} charges={charges} setCharges={setCharges} familyData={familyData} />
    )}
    <PlusValueBlock form={form} />
    <ValorisationDemembreeBlock
      form={form}
      familyData={familyData}
      familyMembers={familyMembers}
      demembrements={demembrements}
    />
  </div>
);
