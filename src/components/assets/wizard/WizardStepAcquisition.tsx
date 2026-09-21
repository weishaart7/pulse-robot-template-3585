import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { AssetFormValues } from '@/schemas/assetSchema';
import { MaritalContext } from '@/hooks/useAssetForm';
import { OrigineFields } from '@/components/assets/fields/OrigineQualificationFields';

interface WizardStepAcquisitionProps {
  form: UseFormReturn<AssetFormValues>;
  maritalContext: MaritalContext;
}

// Étape "Acquisition" : date, origine, prix, frais et clauses matrimoniales.
// Ce sont les faits dont se déduit la qualification, affichée à l'étape
// suivante.
export const WizardStepAcquisition: React.FC<WizardStepAcquisitionProps> = ({ form, maritalContext }) => (
  <div className="space-y-6">
    <OrigineFields form={form} maritalContext={maritalContext} />
  </div>
);
