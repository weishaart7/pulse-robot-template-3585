import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { AssetFormValues } from '@/schemas/assetSchema';
import { CaracteristiquesFields } from '@/components/assets/fields/CaracteristiquesFields';

interface WizardStepParticularitesProps {
  form: UseFormReturn<AssetFormValues>;
}

// Étape "Particularités" : reprend tel quel l'onglet "Caractéristiques"
// actuel. Ne se saute jamais (cf. décision du 2026-09-10) : "Situation
// particulière" y est toujours affiché, quelle que soit la nature.
export const WizardStepParticularites: React.FC<WizardStepParticularitesProps> = ({ form }) => (
  <CaracteristiquesFields form={form} />
);
