import React from 'react';
import { Info } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { AssetFormValues } from '@/schemas/assetSchema';
import { FamilyInfo, mapDetenteurToDb } from '@/lib/patrimoine/utils';
import { FamilyMember } from '@/hooks/useAssetForm';
import { getTrancheDemembrement } from '@/lib/patrimoine/demembrementFraction';
import { DemembrementDraft } from '@/components/assets/DemembrementSection';

const formatEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

interface ValorisationDemembreeBlockProps {
  form: UseFormReturn<AssetFormValues>;
  familyData: FamilyInfo;
  familyMembers: FamilyMember[];
  demembrements: DemembrementDraft[];
}

// Affiche la répartition usufruit / nue-propriété (barème art. 669 CGI) dès
// que le mode de détention est démembré et que la valeur estimée est connue.
export const ValorisationDemembreeBlock: React.FC<ValorisationDemembreeBlockProps> = ({
  form,
  familyData,
  familyMembers,
  demembrements
}) => {
  const watchedModeDetention = form.watch('mode_detention');
  const watchedDetenteur = form.watch('detenteur');
  const watchedValeurEstimee = form.watch('valeur_estimee');
  const isDemembre = watchedModeDetention === 'Usufruit' || watchedModeDetention === 'Nue-propriété';

  if (!isDemembre || !watchedValeurEstimee) return null;

  // Même calcul que les totaux du Résumé Patrimoine et de Transmission
  // (getTrancheDemembrement) : le détenteur saisi (libellé affiché) est
  // ramené à sa valeur persistée avant le calcul.
  const trancheBareme669 = getTrancheDemembrement(
    { mode_detention: watchedModeDetention, detenteur: mapDetenteurToDb(watchedDetenteur || '', familyData) },
    demembrements,
    {
      familyProfile: { date_naissance: familyData.userDateNaissance },
      maritalStatus: { date_naissance_conjoint: familyData.partnerDateNaissance },
      familyLinks: familyMembers,
    }
  );

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <Info className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-widest">Valorisation démembrée (barème art. 669 CGI)</p>
      </div>
      {trancheBareme669 ? (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-[11px] text-muted-foreground/60">Valeur pleine propriété</p>
            <p className="text-[15px] font-semibold text-foreground tabular-nums mt-0.5">{formatEur(watchedValeurEstimee)}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground/60">Valeur usufruit ({(trancheBareme669.usufruit * 100).toFixed(0)}%)</p>
            <p className="text-[15px] font-semibold text-foreground tabular-nums mt-0.5">{formatEur(watchedValeurEstimee * trancheBareme669.usufruit)}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground/60">Valeur nue-propriété ({(trancheBareme669.nuePropriete * 100).toFixed(0)}%)</p>
            <p className="text-[15px] font-semibold text-foreground tabular-nums mt-0.5">{formatEur(watchedValeurEstimee * trancheBareme669.nuePropriete)}</p>
          </div>
        </div>
      ) : (
        <p className="text-[12px] text-muted-foreground/70">
          Non calculable : renseignez la date de naissance de l'usufruitier (fiche client, conjoint, ou membre de la famille / tiers en contrepartie) pour obtenir la répartition.
        </p>
      )}
    </div>
  );
};
