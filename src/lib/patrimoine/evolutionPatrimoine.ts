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
 * cette date ou avant. Si aucune n'existe : repli sur `valeur_estimee`
 * (valeur courante) uniquement si l'actif n'a aucun historique du tout ;
 * s'il a un historique mais entièrement postérieur à cette date, l'actif
 * n'était pas encore suivi et ne contribue pas au total (valeur 0).
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
        // Aucune valorisation connue à cette date ou avant :
        // - sans historique du tout, on n'a que la valeur courante -> meilleure estimation disponible.
        // - avec un historique qui démarre après cette date, l'actif n'était pas encore
        //   suivi à cette date -> il ne doit pas contribuer au total (sinon on lui prête
        //   rétroactivement une valeur qu'il n'a eue que plus tard).
        valeur = historique.length === 0 ? (asset.valeur_estimee || 0) : 0;
      }
      return sum + valeur;
    }, 0);

    return { date, total };
  });
};
