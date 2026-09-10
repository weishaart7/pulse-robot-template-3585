import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { AssetFormValues } from '@/schemas/assetSchema';
import { CaracteristiquesFields } from '@/components/assets/fields/CaracteristiquesFields';

interface WizardStep4ParticularitesProps {
  form: UseFormReturn<AssetFormValues>;
}

// Étape 4 — "Particularités" : reprend tel quel l'onglet "Caractéristiques"
// actuel. Ne se saute jamais (cf. décision du 2026-09-10) : "Situation
// particulière" y est toujours affiché, quelle que soit la nature.
export const WizardStep4Particularites: React.FC<WizardStep4ParticularitesProps> = ({ form }) => (
  <CaracteristiquesFields form={form} />
);
