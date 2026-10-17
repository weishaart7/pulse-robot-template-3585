import { Asset } from '@/services/assetService';
import { Passif, Emprunt } from '@/services/passifService';
import { AssetDemembrement } from '@/services/assetDemembrementService';
import { getAssetCategory } from '@/constants/assetTypes';
import { getFractionDemembrement, DemembrementFractionContext } from '@/lib/patrimoine/demembrementFraction';
import { CATEGORY_COLORS } from '@/lib/patrimoine/utils';
import { getRepartitionFoyer, BienNonQualifieError, SuccessionAssetInput } from '@/lib/patrimoine/succession';
import { ASH, NEGATIVE } from '@/lib/palette';
// Répartition du patrimoine par catégorie d'actif + ligne « Passifs ».
// Exportée pour être réutilisée par la Vue d'ensemble (Dashboard).
export function computePatrimoineBreakdown(
  assets: Asset[],
  passifs: Passif[],
  emprunts: Emprunt[],
  assetDemembrements: AssetDemembrement[] = [],
  demembrementCtx: DemembrementFractionContext = {}
) {
  // Même périmètre que usePatrimoineCalculations (cartes du Résumé) : seule
  // la part du foyer compte (hors quote-part de tiers indivisaires), et un
  // élément non qualifié est exclu (0) — le net au centre du donut est ainsi
  // égal à la carte « Patrimoine net ».
  const partFoyer = (item: SuccessionAssetInput): number => {
    try {
      const { user, spouse } = getRepartitionFoyer(item);
      return user + spouse;
    } catch (error) {
      if (error instanceof BienNonQualifieError) return 0;
      throw error;
    }
  };

  const demembrementsByAsset = new Map<string, AssetDemembrement[]>();
  assetDemembrements.forEach((d) => {
    const list = demembrementsByAsset.get(d.asset_id);
    if (list) list.push(d);
    else demembrementsByAsset.set(d.asset_id, [d]);
  });

  // Vue par catégorie pour les actifs
  const categoryData = assets.reduce((acc, asset) => {
    const category = getAssetCategory(asset.nature);
    const demembrementsForAsset = asset.id ? demembrementsByAsset.get(asset.id) ?? [] : [];
    const fraction = getFractionDemembrement(asset, demembrementsForAsset, demembrementCtx);
    // fraction === null : actif démembré dont l'âge de l'usufruitier n'est
    // pas calculable — exclu du total plutôt que compté à sa valeur pleine
    // propriété (même règle que usePatrimoineCalculations.ts).
    const value = fraction === null ? 0 : (asset.valeur_estimee || 0) * fraction * partFoyer(asset);
    if (!acc[category]) {
      acc[category] = {
        category,
        value: 0,
        assets: []
      };
    }
    acc[category].value += value;
    acc[category].assets.push(asset);
    return acc;
  }, {} as Record<string, {
    category: string;
    value: number;
    assets: Asset[];
  }>);
  const actifData = Object.values(categoryData).map(item => ({
    name: item.category.charAt(0).toUpperCase() + item.category.slice(1),
    value: item.value,
    color: CATEGORY_COLORS[item.category] || ASH,
    assets: item.assets,
    type: 'actif'
  }));

  // Ajouter les passifs (hors emprunts de société, déjà reflétés dans la valorisation des parts)
  const totalPassifs = passifs.reduce((sum, passif) => sum + (passif.montant_du || 0) * partFoyer(passif), 0)
    + emprunts.filter(e => !e.societe_id).reduce((sum, emprunt) => sum + (emprunt.capital_restant_du || 0) * partFoyer(emprunt), 0);
  if (totalPassifs > 0) {
    actifData.push({
      name: 'Passifs',
      value: totalPassifs,
      color: NEGATIVE,
      assets: [],
      type: 'passif'
    });
  }
  return actifData.sort((a, b) => b.value - a.value);
}
