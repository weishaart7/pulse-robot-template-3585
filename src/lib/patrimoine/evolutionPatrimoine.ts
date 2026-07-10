import { Asset } from '@/services/assetService';
import { AssetValorisation } from '@/services/assetValorisationService';

export interface EvolutionPatrimoinePoint {
  date: string;
  total: number;
}

/**
 * Agrège la valeur totale du patrimoine (somme de tous les actifs) à chaque
 * date où au moins un actif a une entrée dans asset_valorisations.
 *
 * Pour un actif donné à une date donnée : dernière valorisation connue à
 * cette date ou avant ; si aucune valorisation connue à cette date ou avant
 * n'existe (pas d'historique du tout, ou historique entièrement postérieur),
 * repli sur `valeur_estimee` (valeur courante).
 */
export const computeEvolutionPatrimoine = (
  assets: Asset[],
  valorisations: AssetValorisation[]
): EvolutionPatrimoinePoint[] => {
  const historiqueParActif: Record<string, AssetValorisation[]> = {};
  valorisations.forEach((v) => {
    if (!historiqueParActif[v.asset_id]) historiqueParActif[v.asset_id] = [];
    historiqueParActif[v.asset_id].push(v);
  });
  Object.values(historiqueParActif).forEach((liste) =>
    liste.sort((a, b) => a.date_valorisation.localeCompare(b.date_valorisation))
  );

  const dates = Array.from(new Set(valorisations.map((v) => v.date_valorisation))).sort();

  return dates.map((date) => {
    const total = assets.reduce((sum, asset) => {
      if (!asset.id) return sum;
      const historique = historiqueParActif[asset.id] || [];

      let valeur: number | undefined;
      for (let i = historique.length - 1; i >= 0; i--) {
        if (historique[i].date_valorisation <= date) {
          valeur = historique[i].valeur;
          break;
        }
      }
      if (valeur === undefined) {
        valeur = asset.valeur_estimee || 0;
      }
      return sum + valeur;
    }, 0);

    return { date, total };
  });
};
