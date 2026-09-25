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
  familyLinks?: Array<{ id?: string; date_naissance?: string | null }>;
}

// Seuls champs lus sur une ligne de démembrement : permet de passer aussi bien
// des lignes persistées (`AssetDemembrement`) que des brouillons de saisie
// (`DemembrementDraft`, aperçu du formulaire).
export type DemembrementPartie = Pick<AssetDemembrement, 'type_partie' | 'family_link_id' | 'date_naissance_tiers'>;

/**
 * Tranche du barème 669 CGI applicable à un actif démembré, déterminée à
 * partir de l'âge de l'usufruitier (client, conjoint, ou tiers/famille via
 * `asset_demembrements`). `null` si le bien n'est pas démembré ou si l'âge de
 * l'usufruitier n'est pas calculable.
 */
export const getTrancheDemembrement = (
  asset: Pick<Asset, 'mode_detention' | 'detenteur'>,
  demembrementsForAsset: DemembrementPartie[],
  ctx: DemembrementFractionContext,
  // Date à laquelle l'âge de l'usufruitier est apprécié (aujourd'hui par
  // défaut ; date d'un point d'historique ou date d'acquisition sinon).
  referenceDate: Date = new Date()
): TrancheBareme669 | null => {
  if (asset.mode_detention !== 'Usufruit' && asset.mode_detention !== 'Nue-propriété') {
    return null;
  }

  const clientIsUsufruitier = asset.mode_detention === 'Usufruit';
  const detenteurLower = (asset.detenteur || '').toLowerCase();
  const clientAges: number[] = [];

  if (detenteurLower === 'user' || detenteurLower === 'utilisateur' || !asset.detenteur) {
    const age = computeAge(ctx.familyProfile?.date_naissance, referenceDate);
    if (age !== null) clientAges.push(age);
  } else if (detenteurLower === 'spouse' || detenteurLower === 'conjoint') {
    const age = computeAge(ctx.maritalStatus?.date_naissance_conjoint, referenceDate);
    if (age !== null) clientAges.push(age);
  } else if (detenteurLower === 'common' || detenteurLower === 'commun' || detenteurLower === 'couple') {
    const ageUser = computeAge(ctx.familyProfile?.date_naissance, referenceDate);
    const ageSpouse = computeAge(ctx.maritalStatus?.date_naissance_conjoint, referenceDate);
    if (ageUser !== null) clientAges.push(ageUser);
    if (ageSpouse !== null) clientAges.push(ageSpouse);
  } else if (detenteurLower === 'indivision') {
    // Indivision avec des tiers : seule la quote-part du client entre dans le
    // foyer (le conjoint ne peut pas être co-indivisaire, cf.
    // getPartUtilisateurIndivisionTiers). Sur cette quote-part, l'usufruitier
    // est le client ; l'âge des co-indivisaires ne joue que sur leurs propres
    // quotes-parts, hors foyer.
    const age = computeAge(ctx.familyProfile?.date_naissance, referenceDate);
    if (age !== null) clientAges.push(age);
  }

  const counterpartAges = demembrementsForAsset
    .map((d) => d.type_partie === 'tiers'
      ? computeAge(d.date_naissance_tiers, referenceDate)
      : computeAge(ctx.familyLinks?.find((m) => m.id === d.family_link_id)?.date_naissance, referenceDate))
    .filter((a): a is number => a !== null);

  const usufruitierAges = clientIsUsufruitier ? clientAges : counterpartAges;
  return getTrancheBaremeForYoungest(usufruitierAges);
};

export const getFractionDemembrement = (
  asset: Pick<Asset, 'mode_detention' | 'detenteur'>,
  demembrementsForAsset: DemembrementPartie[],
  ctx: DemembrementFractionContext,
  referenceDate: Date = new Date()
): number | null => {
  const isDemembre = asset.mode_detention === 'Usufruit' || asset.mode_detention === 'Nue-propriété';
  if (!isDemembre) return 1;

  const tranche = getTrancheDemembrement(asset, demembrementsForAsset, ctx, referenceDate);
  if (!tranche) return null;
  return asset.mode_detention === 'Usufruit' ? tranche.usufruit : tranche.nuePropriete;
};
