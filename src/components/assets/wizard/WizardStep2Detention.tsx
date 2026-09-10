import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { AssetFormValues } from '@/schemas/assetSchema';
import { FamilyMember, MaritalContext } from '@/hooks/useAssetForm';
import { FamilyInfo } from '@/lib/patrimoine/utils';
import { IndivisaireDraft } from '@/components/assets/IndivisairesSection';
import { DemembrementDraft } from '@/components/assets/DemembrementSection';
import { DetentionFields } from '@/components/assets/fields/DetentionFields';
import { ValorisationDemembreeBlock } from '@/components/assets/fields/ValorisationDemembreeBlock';

interface WizardStep2DetentionProps {
  form: UseFormReturn<AssetFormValues>;
  detenteurOptions: string[];
  familyData: FamilyInfo;
  familyMembers: FamilyMember[];
  maritalContext: MaritalContext;
  indivisaires: IndivisaireDraft[];
  setIndivisaires: (value: IndivisaireDraft[]) => void;
  demembrements: DemembrementDraft[];
  setDemembrements: (value: DemembrementDraft[]) => void;
  detenteurAResoudre: boolean;
}

// Étape 2 — "À qui appartient-il" : bloc détention (DetentionFields, réutilisé
// tel quel depuis l'onglet Propriété actuel) + calcul de valorisation
// démembrée, affiché ici plutôt que dans l'onglet "Essentiel" du formulaire
// de modification (cf. brief).
export const WizardStep2Detention: React.FC<WizardStep2DetentionProps> = (props) => {
  const { form, familyData, familyMembers, demembrements } = props;
  return (
    <div className="space-y-6">
      <DetentionFields {...props} />
      <ValorisationDemembreeBlock
        form={form}
        familyData={familyData}
        familyMembers={familyMembers}
        demembrements={demembrements}
      />
    </div>
  );
};
