import { Asset } from '@/services/assetService';
import { AssetDemembrement } from '@/services/assetDemembrementService';
import { calculatePlusValue } from './utils';
import { getFractionDemembrement, DemembrementFractionContext } from './demembrementFraction';

export interface PlusValueActif {
  plusValue: number;
  // Valeurs pondérées (démembrement × part retenue), frais inclus à part.
  valeurEstimee: number;
  valeurAcquisition: number;
  fraisAcquisition: number;
}

/**
 * Plus-value latente (économique) d'un actif — source unique partagée par le
 * Résumé (usePatrimoineCalculations) et l'arborescence (PatrimoineTreeView).
 *
 * - `part` : quote-part retenue (part du foyer pour les agrégats, 1 pour une
 *   ligne d'actif affichée à sa valeur totale) ; appliquée aux trois termes.
 * - Actif démembré : `valeur_acquisition` est la valeur en PLEINE propriété au
 *   jour de l'acquisition (convention retenue), pondérée par la fraction du
 *   barème 669 CGI à cette date ; la valeur estimée l'est par la fraction
 *   actuelle. Frais non pondérés par le barème (montant réellement payé).
 *
 * `null` si non calculable : valeur estimée ou d'acquisition absente, âge de
 * l'usufruitier inconnu, ou actif démembré sans date d'acquisition.
 */
export const computePlusValueActif = (
  asset: Asset,
  demembrementsForAsset: AssetDemembrement[],
  ctx: DemembrementFractionContext,
  part = 1
): PlusValueActif | null => {
  const fractionActuelle = getFractionDemembrement(asset, demembrementsForAsset, ctx);
  if (fractionActuelle === null) return null;

  let fractionAcquisition: number | null = 1;
  if (asset.mode_detention === 'Usufruit' || asset.mode_detention === 'Nue-propriété') {
    const dateAcq = asset.date_acquisition ? new Date(asset.date_acquisition) : null;
    fractionAcquisition = dateAcq && !isNaN(dateAcq.getTime())
      ? getFractionDemembrement(asset, demembrementsForAsset, ctx, dateAcq)
      : null;
  }
  if (fractionAcquisition === null) return null;

  if (asset.valeur_estimee == null || asset.valeur_acquisition == null) return null;
  const valeurEstimee = asset.valeur_estimee * fractionActuelle * part;
  const valeurAcquisition = asset.valeur_acquisition * fractionAcquisition * part;
  const fraisAcquisition = (asset.frais_acquisition || 0) * part;
  const { plusValue } = calculatePlusValue(valeurEstimee, valeurAcquisition, fraisAcquisition);
  return { plusValue, valeurEstimee, valeurAcquisition, fraisAcquisition };
};
