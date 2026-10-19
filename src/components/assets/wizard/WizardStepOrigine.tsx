import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { AssetFormValues } from '@/schemas/assetSchema';
import { NATURES_WITHOUT_ACQUISITION, isCreance } from '@/constants/assetTypes';
import { FamilyMember, MaritalContext } from '@/hooks/useAssetForm';
import { FamilyInfo } from '@/lib/patrimoine/utils';
import { IndivisaireDraft } from '@/components/assets/IndivisairesSection';
import { OrigineFields, QualificationFields } from '@/components/assets/fields/OrigineQualificationFields';
import { DemembrementFields, DetenteurFields, IndivisairesFields, LicitationPacsFields, ModeDetentionField, QuotePartFields } from '@/components/assets/fields/DetentionFields';
import { DemembrementDraft } from '@/components/assets/DemembrementSection';

interface WizardStepOrigineProps {
  form: UseFormReturn<AssetFormValues>;
  detenteurOptions: string[];
  familyData: FamilyInfo;
  familyMembers: FamilyMember[];
  maritalContext: MaritalContext;
  indivisaires: IndivisaireDraft[];
  setIndivisaires: (value: IndivisaireDraft[]) => void;
  demembrements: DemembrementDraft[];
  setDemembrements: (value: DemembrementDraft[]) => void;
  qualificationRaison?: string;
  assetId?: string;
}

// Étape "Origine et propriété" : d'où vient le bien (date, origine, clauses
// qui déterminent sa qualification), à qui il appartient et comment (mode de
// détention, détenteur, indivision, contreparties de démembrement,
// co-indivisaires), la qualification qui en résulte — affichée
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
  demembrements,
  setDemembrements,
  qualificationRaison,
  assetId
}) => {
  const watchedNature = form.watch('nature');
  // Créance : origine et date demandées malgré l'absence de prix (cf. OrigineFields).
  const sansAcquisition = NATURES_WITHOUT_ACQUISITION.includes(watchedNature) && !isCreance(watchedNature);

  return (
    <div className="space-y-6">
      {!sansAcquisition && <OrigineFields form={form} maritalContext={maritalContext} section="origine" />}

      {/* Détention et qualification ensemble, comme dans l'onglet Propriété du formulaire de
          modification : mode de détention et détenteur côte à côte, la qualification juste dessous. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ModeDetentionField form={form} />
        <DetenteurFields form={form} detenteurOptions={detenteurOptions} maritalContext={maritalContext} assetId={assetId} />
      </div>
      <QualificationFields form={form} qualificationRaison={qualificationRaison} />

      <DemembrementFields
        form={form}
        familyMembers={familyMembers}
        demembrements={demembrements}
        setDemembrements={setDemembrements}
      />

      <IndivisairesFields
        form={form}
        familyMembers={familyMembers}
        indivisaires={indivisaires}
        setIndivisaires={setIndivisaires}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <QuotePartFields form={form} familyData={familyData} />
      </div>

      <LicitationPacsFields form={form} familyData={familyData} maritalContext={maritalContext} />
    </div>
  );
};
