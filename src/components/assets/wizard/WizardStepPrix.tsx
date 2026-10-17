import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { AssetFormValues } from '@/schemas/assetSchema';
import { MaritalContext } from '@/hooks/useAssetForm';
import { isRegimeCommunautaire } from '@/lib/patrimoine/qualification';
import { OrigineFields } from '@/components/assets/fields/OrigineQualificationFields';

interface WizardStepPrixProps {
  form: UseFormReturn<AssetFormValues>;
  maritalContext: MaritalContext;
  qualificationRaison?: string;
}

// Étape "Prix" : valeur d'achat / réception, frais d'acquisition et, le cas
// échéant, financement mixte. Le prix n'influence la qualification que dans ce
// dernier cas (régime communautaire, acquisition à titre onéreux, sans clause
// de remploi : art. 1436, apport en fonds propres comparé au coût total) —
// on rappelle alors la qualification mise à jour, calculée à l'étape
// précédente avec les valeurs saisies ici.
export const WizardStepPrix: React.FC<WizardStepPrixProps> = ({ form, maritalContext, qualificationRaison }) => {
  const watchedOrigineActif = form.watch('origine_actif');
  const watchedClauseRemploi = form.watch('clause_remploi');
  const watchedQualificationBien = form.watch('qualification_bien');
  const watchedDetenteur = form.watch('detenteur');

  const qualificationDependDuPrix = watchedDetenteur !== 'Indivision'
    && isRegimeCommunautaire(maritalContext.regimeMatrimonial)
    && (watchedOrigineActif || []).includes('Acquisition à titre onéreux')
    && !watchedClauseRemploi;

  return (
    <div className="space-y-6">
      <OrigineFields form={form} maritalContext={maritalContext} section="prix" />

      {qualificationDependDuPrix && (
        <div className="max-w-2xl border-l-2 border-lagon bg-lagon-soft/60 px-4 py-3">
          <div className="space-y-1">
            <p className="text-[12px] text-lagon-ink">Qualification du bien</p>
            <p className="text-sm font-medium text-foreground">{watchedQualificationBien || 'Non calculable'}</p>
            {qualificationRaison && (
              <p className="text-[12.5px] leading-snug text-muted-foreground">{qualificationRaison}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
