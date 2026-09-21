import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { AssetFormValues } from '@/schemas/assetSchema';
import { FamilyMember } from '@/hooks/useAssetForm';
import { FamilyInfo } from '@/lib/patrimoine/utils';
import { IndivisaireDraft } from '@/components/assets/IndivisairesSection';
import { DetenteurFields, IndivisairesFields } from '@/components/assets/fields/DetentionFields';

interface WizardStepQuiProps {
  form: UseFormReturn<AssetFormValues>;
  detenteurOptions: string[];
  familyData: FamilyInfo;
  familyMembers: FamilyMember[];
  indivisaires: IndivisaireDraft[];
  setIndivisaires: (value: IndivisaireDraft[]) => void;
  detenteurAResoudre: boolean;
}

// Étape "Qui" : titulaire du bien (détenteur/souscripteur, ou indivision avec
// un tiers) et co-indivisaires. Demandée avant l'acquisition car l'origine
// (donation, héritage) dépend de qui a reçu le bien. L'alerte de résolution du
// détenteur n'est pas affichée ici : elle l'est à l'étape "Qualification",
// une fois la qualification calculée.
export const WizardStepQui: React.FC<WizardStepQuiProps> = ({
  form,
  detenteurOptions,
  familyData,
  familyMembers,
  indivisaires,
  setIndivisaires,
  detenteurAResoudre
}) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <DetenteurFields
        form={form}
        detenteurOptions={detenteurOptions}
        familyData={familyData}
        detenteurAResoudre={detenteurAResoudre}
        hideResolutionAlert
      />
    </div>
    <IndivisairesFields
      form={form}
      familyMembers={familyMembers}
      indivisaires={indivisaires}
      setIndivisaires={setIndivisaires}
    />
  </div>
);
