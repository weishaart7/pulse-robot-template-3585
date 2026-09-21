import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { AssetFormValues } from '@/schemas/assetSchema';
import { MaritalContext } from '@/hooks/useAssetForm';
import { FamilyInfo } from '@/lib/patrimoine/utils';
import { QualificationFields } from '@/components/assets/fields/OrigineQualificationFields';
import { DetenteurResolutionAlert, LicitationPacsFields, QuotePartFields } from '@/components/assets/fields/DetentionFields';

interface WizardStepQualificationProps {
  form: UseFormReturn<AssetFormValues>;
  familyData: FamilyInfo;
  maritalContext: MaritalContext;
  qualificationRaison?: string;
  detenteurAResoudre: boolean;
}

// Étape "Qualification" : résultat calculé à partir des étapes "Qui" et
// "Acquisition" (avec correction manuelle possible), puis ce qui en découle —
// alerte de confirmation du détenteur si le bien devient propre/personnel,
// quote-part ou répartition 50/50 pour "Le couple", licitation PACS.
export const WizardStepQualification: React.FC<WizardStepQualificationProps> = ({
  form,
  familyData,
  maritalContext,
  qualificationRaison,
  detenteurAResoudre
}) => (
  <div className="space-y-6">
    <QualificationFields form={form} qualificationRaison={qualificationRaison} />
    {detenteurAResoudre && <DetenteurResolutionAlert form={form} familyData={familyData} />}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <QuotePartFields form={form} familyData={familyData} />
    </div>
    <LicitationPacsFields form={form} familyData={familyData} maritalContext={maritalContext} />
  </div>
);
