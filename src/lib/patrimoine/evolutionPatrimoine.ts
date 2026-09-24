import { format } from 'date-fns';
import { Asset } from '@/services/assetService';
import { AssetValorisation } from '@/services/assetValorisationService';
import { AssetDemembrement } from '@/services/assetDemembrementService';
import { getRepartitionFoyer, BienNonQualifieError } from './succession';
import { getFractionDemembrement, DemembrementFractionContext } from './demembrementFraction';

export interface EvolutionPatrimoinePoint {
  date: string;
  total: number;
}

export interface EvolutionPatrimoineOptions {
  assetDemembrements?: AssetDemembrement[];
  demembrementCtx?: DemembrementFractionContext;
  // Date du point final « aujourd'hui » (injectable pour les tests).
  today?: Date;
}

/**
 * Évolution des ACTIFS du foyer (pas du patrimoine net : aucun historique
 * n'existe pour les passifs) à chaque date où au moins un actif a une entrée
 * dans asset_valorisations, plus un point final « aujourd'hui » aux valeurs
 * courantes — égal à `financialSummary.totalActifs`.
 *
 * Même périmètre que les cartes du Résumé (usePatrimoineCalculations) :
 * - part du foyer uniquement (getRepartitionFoyer, hors tiers indivisaires),
 *   actif non qualifié exclu ;
 * - actif démembré pondéré par le barème 669 CGI selon l'âge de
 *   l'usufruitier À LA DATE DU POINT ; âge non calculable → exclu.
 *
 * Valeur brute d'un actif à une date : dernière valorisation connue à cette
 * date ou avant. Si aucune n'existe : repli sur `valeur_estimee` uniquement
 * si l'actif n'a aucun historique du tout ; s'il a un historique entièrement
 * postérieur à cette date, l'actif n'était pas encore suivi (valeur 0).
 */
export const computeEvolutionPatrimoine = (
  assets: Asset[],
  valorisations: AssetValorisation[],
  options: EvolutionPatrimoineOptions = {}
): EvolutionPatrimoinePoint[] => {
  if (valorisations.length === 0) return [];
  const { assetDemembrements = [], demembrementCtx = {}, today = new Date() } = options;

  const historiqueParActif: Record<string, AssetValorisation[]> = {};
  valorisations.forEach((v) => {
    if (!historiqueParActif[v.asset_id]) historiqueParActif[v.asset_id] = [];
    historiqueParActif[v.asset_id].push(v);
  });
  Object.values(historiqueParActif).forEach((liste) =>
    liste.sort((a, b) => a.date_valorisation.localeCompare(b.date_valorisation))
  );

  const demembrementsParActif: Record<string, AssetDemembrement[]> = {};
  assetDemembrements.forEach((d) => {
    (demembrementsParActif[d.asset_id] ||= []).push(d);
  });

  // Part du foyer, indépendante de la date. Non qualifié → 0 (exclu).
  const partFoyer = new Map<string, number>();
  assets.forEach((asset) => {
    if (!asset.id) return;
    try {
      const { user, spouse } = getRepartitionFoyer(asset);
      partFoyer.set(asset.id, user + spouse);
    } catch (error) {
      if (error instanceof BienNonQualifieError) partFoyer.set(asset.id, 0);
      else throw error;
    }
  });

  const ponderation = (asset: Asset & { id: string }, date: Date): number => {
    const part = partFoyer.get(asset.id) ?? 0;
    if (part === 0) return 0;
    const fraction = getFractionDemembrement(asset, demembrementsParActif[asset.id] || [], demembrementCtx, date);
    return fraction === null ? 0 : part * fraction;
  };

  const todayStr = format(today, 'yyyy-MM-dd');
  const dates = Array.from(new Set(valorisations.map((v) => v.date_valorisation)))
    .filter((d) => d < todayStr)
    .sort();

  const points = dates.map((date) => {
    const refDate = new Date(date);
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
      return sum + valeur * ponderation(asset as Asset & { id: string }, refDate);
    }, 0);

    return { date, total };
  });

  // Point final aux valeurs courantes (valeur_estimee), pour que la courbe
  // se termine sur le total affiché par la carte « Actifs ».
  const totalActuel = assets.reduce(
    (sum, asset) => asset.id ? sum + (asset.valeur_estimee || 0) * ponderation(asset as Asset & { id: string }, today) : sum,
    0
  );
  points.push({ date: todayStr, total: totalActuel });

  return points;
};
