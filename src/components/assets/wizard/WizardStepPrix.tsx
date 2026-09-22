import React from 'react';
import { FileText } from 'lucide-react';
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
        <div className="flex items-start gap-3 rounded-2xl border p-4 bg-muted/30">
          <FileText className="h-4 w-4 text-muted-foreground mt-0.5" strokeWidth={1.5} />
          <div className="space-y-1 flex-1">
            <p className="text-xs text-muted-foreground">Qualification du bien</p>
            <p className="text-sm font-semibold text-foreground">{watchedQualificationBien || 'Non calculable'}</p>
            {qualificationRaison && (
              <p className="text-xs text-muted-foreground italic">{qualificationRaison}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
