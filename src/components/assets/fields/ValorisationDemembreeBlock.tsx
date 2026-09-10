import React from 'react';
import { Info } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { AssetFormValues } from '@/schemas/assetSchema';
import { FamilyInfo } from '@/lib/patrimoine/utils';
import { FamilyMember } from '@/hooks/useAssetForm';
import { computeAge, getTrancheBaremeForYoungest } from '@/lib/patrimoine/bareme669CGI';
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

  const clientIsUsufruitier = watchedModeDetention === 'Usufruit';
  const clientAges: number[] = [];
  if (watchedDetenteur === familyData.userFirstName || watchedDetenteur === 'Vous') {
    const age = computeAge(familyData.userDateNaissance);
    if (age !== null) clientAges.push(age);
  } else if (watchedDetenteur === familyData.partnerFirstName || watchedDetenteur === 'Conjoint') {
    const age = computeAge(familyData.partnerDateNaissance);
    if (age !== null) clientAges.push(age);
  } else if (watchedDetenteur === 'Le couple') {
    const ageUser = computeAge(familyData.userDateNaissance);
    const ageSpouse = computeAge(familyData.partnerDateNaissance);
    if (ageUser !== null) clientAges.push(ageUser);
    if (ageSpouse !== null) clientAges.push(ageSpouse);
  }
  const counterpartAges: number[] = demembrements
    .map((d) => d.type_partie === 'tiers'
      ? computeAge(d.date_naissance_tiers)
      : computeAge(familyMembers.find((m) => m.id === d.family_link_id)?.date_naissance))
    .filter((a): a is number => a !== null);
  const usufruitierAges = clientIsUsufruitier ? clientAges : counterpartAges;
  const trancheBareme669 = getTrancheBaremeForYoungest(usufruitierAges);

  return (
    <div className="rounded-md border border-border/60 bg-card p-5 animate-fade-in">
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
