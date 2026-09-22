import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { AssetFormValues } from '@/schemas/assetSchema';
import { NATURES_WITHOUT_ACQUISITION } from '@/constants/assetTypes';
import { FamilyMember, MaritalContext } from '@/hooks/useAssetForm';
import { FamilyInfo } from '@/lib/patrimoine/utils';
import { IndivisaireDraft } from '@/components/assets/IndivisairesSection';
import { OrigineFields, QualificationFields } from '@/components/assets/fields/OrigineQualificationFields';
import { DetenteurFields, IndivisairesFields, LicitationPacsFields, QuotePartFields } from '@/components/assets/fields/DetentionFields';

interface WizardStepOrigineProps {
  form: UseFormReturn<AssetFormValues>;
  detenteurOptions: string[];
  familyData: FamilyInfo;
  familyMembers: FamilyMember[];
  maritalContext: MaritalContext;
  indivisaires: IndivisaireDraft[];
  setIndivisaires: (value: IndivisaireDraft[]) => void;
  qualificationRaison?: string;
}

// Étape "Origine et propriété" : d'où vient le bien (date, origine, clauses
// qui déterminent sa qualification), à qui il appartient (détenteur,
// indivision, co-indivisaires), la qualification qui en résulte — affichée
// juste à côté pour que toute incohérence soit visible et corrigeable sur
// place — puis ce qui en découle (quote-part, licitation PACS).
//
// Toujours visible : pour une nature sans acquisition (livrets, comptes) ou un
// bien en indivision hors couple, seuls le détenteur (et ses dépendances)
// restent affichés. Le prix, lui, est demandé à l'étape suivante.
export const WizardStepOrigine: React.FC<WizardStepOrigineProps> = ({
  form,
  detenteurOptions,
  familyData,
  familyMembers,
  maritalContext,
  indivisaires,
  setIndivisaires,
  qualificationRaison
}) => {
  const watchedNature = form.watch('nature');
  const sansAcquisition = NATURES_WITHOUT_ACQUISITION.includes(watchedNature);

  return (
    <div className="space-y-6">
      {!sansAcquisition && <OrigineFields form={form} maritalContext={maritalContext} section="origine" />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DetenteurFields form={form} detenteurOptions={detenteurOptions} />
      </div>

      <IndivisairesFields
        form={form}
        familyMembers={familyMembers}
        indivisaires={indivisaires}
        setIndivisaires={setIndivisaires}
      />

      <QualificationFields form={form} qualificationRaison={qualificationRaison} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <QuotePartFields form={form} familyData={familyData} />
      </div>

      <LicitationPacsFields form={form} familyData={familyData} maritalContext={maritalContext} />
    </div>
  );
};
