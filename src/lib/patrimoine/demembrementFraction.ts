import { Asset } from '@/services/assetService';
import { AssetDemembrement } from '@/services/assetDemembrementService';
import { computeAge, getTrancheBaremeForYoungest, TrancheBareme669 } from './bareme669CGI';

/**
 * Fraction (barème 669 CGI) à appliquer à `valeur_estimee` d'un actif démembré
 * pour refléter sa valeur réelle en usufruit/nue-propriété dans les totaux
 * agrégés. Factorisé depuis AssetDetailsDialog.tsx (seul endroit qui
 * appliquait déjà ce calcul, mais uniquement à l'affichage informatif d'un
 * actif à la fois) pour être réutilisable par les agrégats du Résumé
 * Patrimoine.
 *
 * Retourne 1 (pleine valeur) pour un bien en pleine propriété. Retourne `null`
 * pour un bien démembré dont l'âge de l'usufruitier n'est pas calculable : ne
 * devine jamais un âge — à charge de l'appelant d'exclure ce bien des totaux
 * plutôt que de le compter à une valeur potentiellement fausse (même
 * traitement que `BienNonQualifieError` côté qualification civile).
 */

export interface DemembrementFractionContext {
  familyProfile?: { date_naissance?: string | null } | null;
  maritalStatus?: { date_naissance_conjoint?: string | null } | null;
  familyLinks?: Array<{ id: string; date_naissance?: string | null }>;
}

/**
 * Tranche du barème 669 CGI applicable à un actif démembré, déterminée à
 * partir de l'âge de l'usufruitier (client, conjoint, ou tiers/famille via
 * `asset_demembrements`). `null` si le bien n'est pas démembré ou si l'âge de
 * l'usufruitier n'est pas calculable.
 */
export const getTrancheDemembrement = (
  asset: Pick<Asset, 'mode_detention' | 'detenteur'>,
  demembrementsForAsset: AssetDemembrement[],
  ctx: DemembrementFractionContext
): TrancheBareme669 | null => {
  if (asset.mode_detention !== 'Usufruit' && asset.mode_detention !== 'Nue-propriété') {
    return null;
  }

  const clientIsUsufruitier = asset.mode_detention === 'Usufruit';
  const detenteurLower = (asset.detenteur || '').toLowerCase();
  const clientAges: number[] = [];

  if (detenteurLower === 'user' || detenteurLower === 'utilisateur' || !asset.detenteur) {
    const age = computeAge(ctx.familyProfile?.date_naissance);
    if (age !== null) clientAges.push(age);
  } else if (detenteurLower === 'spouse' || detenteurLower === 'conjoint') {
    const age = computeAge(ctx.maritalStatus?.date_naissance_conjoint);
    if (age !== null) clientAges.push(age);
  } else if (detenteurLower === 'common' || detenteurLower === 'commun' || detenteurLower === 'couple') {
    const ageUser = computeAge(ctx.familyProfile?.date_naissance);
    const ageSpouse = computeAge(ctx.maritalStatus?.date_naissance_conjoint);
    if (ageUser !== null) clientAges.push(ageUser);
    if (ageSpouse !== null) clientAges.push(ageSpouse);
  }

  const counterpartAges = demembrementsForAsset
    .map((d) => d.type_partie === 'tiers'
      ? computeAge(d.date_naissance_tiers)
      : computeAge(ctx.familyLinks?.find((m) => m.id === d.family_link_id)?.date_naissance))
    .filter((a): a is number => a !== null);

  const usufruitierAges = clientIsUsufruitier ? clientAges : counterpartAges;
  return getTrancheBaremeForYoungest(usufruitierAges);
};

export const getFractionDemembrement = (
  asset: Pick<Asset, 'mode_detention' | 'detenteur'>,
  demembrementsForAsset: AssetDemembrement[],
  ctx: DemembrementFractionContext
): number | null => {
  const isDemembre = asset.mode_detention === 'Usufruit' || asset.mode_detention === 'Nue-propriété';
  if (!isDemembre) return 1;

  const tranche = getTrancheDemembrement(asset, demembrementsForAsset, ctx);
  if (!tranche) return null;
  return asset.mode_detention === 'Usufruit' ? tranche.usufruit : tranche.nuePropriete;
};
