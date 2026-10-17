import { addMonths, format, startOfMonth } from 'date-fns';
import { Asset } from '@/services/assetService';
import { Passif, Emprunt } from '@/services/passifService';
import { capitalRestantDuAu, construireTableau, contratDepuisEmprunt } from '@/lib/credit/contrat';
import { AssetValorisation } from '@/services/assetValorisationService';
import { AssetDemembrement } from '@/services/assetDemembrementService';
import { getRepartitionFoyer, BienNonQualifieError } from './succession';
import { getFractionDemembrement, DemembrementFractionContext } from './demembrementFraction';

export interface EvolutionPatrimoinePoint {
  date: string;
  actifs: number;
  passifs: number;
  /** Patrimoine net = actifs − passifs. */
  net: number;
  /** Vrai si au moins un actif a une valorisation saisie à cette date. */
  valorisation: boolean;
}

export interface EvolutionPatrimoineOptions {
  passifs?: Passif[];
  emprunts?: Emprunt[];
  assetDemembrements?: AssetDemembrement[];
  demembrementCtx?: DemembrementFractionContext;
  // Date du point final « aujourd'hui » (injectable pour les tests).
  today?: Date;
}

/**
 * Évolution du PATRIMOINE NET du foyer (actifs − passifs) dans le temps.
 * Règles validées le 2026-10-18 (docs/patrimoine.md) :
 *
 * Points : chaque date de valorisation (asset_valorisations), le 1er de
 * chaque mois entre la première et aujourd'hui (amortissement des emprunts),
 * et un point final « aujourd'hui » aux valeurs courantes — égal à
 * `financialSummary.patrimoineNet`.
 *
 * Périmètre identique au Résumé (usePatrimoineCalculations) : part du foyer
 * (getRepartitionFoyer), élément non qualifié exclu ; actif démembré pondéré
 * par le barème 669 CGI selon l'âge de l'usufruitier À LA DATE DU POINT
 * (âge non calculable → exclu) ; emprunts de société exclus.
 *
 * Actif à une date : dernière valorisation connue à cette date ou avant.
 * Avant sa première valorisation, sa première valeur connue (ou
 * `valeur_estimee` s'il n'a aucun historique) à partir de sa date
 * d'acquisition — 0 avant l'acquisition, compté depuis le début si elle est
 * inconnue. Une marche n'apparaît ainsi qu'à une acquisition réelle.
 *
 * Passif à une date : 0 avant sa date de souscription. Emprunt au contrat
 * complet : capital restant dû tiré du tableau d'amortissement
 * (lib/credit/contrat.ts). Sinon (emprunt sans contrat, dette) : montant
 * actuel, constant — approximation.
 */
export const computeEvolutionPatrimoine = (
  assets: Asset[],
  valorisations: AssetValorisation[],
  options: EvolutionPatrimoineOptions = {}
): EvolutionPatrimoinePoint[] => {
  if (valorisations.length === 0) return [];
  const { assetDemembrements = [], demembrementCtx = {}, today = new Date(), passifs = [], emprunts = [] } = options;

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
  const datesValorisation = new Set(valorisations.map((v) => v.date_valorisation));
  const premiere = Array.from(datesValorisation).sort()[0];
  const mensuelles: string[] = [];
  for (let m = startOfMonth(addMonths(new Date(premiere), 1)); format(m, 'yyyy-MM-dd') < todayStr; m = addMonths(m, 1)) {
    mensuelles.push(format(m, 'yyyy-MM-dd'));
  }
  const dates = Array.from(new Set([...datesValorisation, ...mensuelles]))
    .filter((d) => d < todayStr)
    .sort();

  const valeurActif = (asset: Asset & { id: string }, date: string): number => {
    const historique = historiqueParActif[asset.id] || [];
    for (let i = historique.length - 1; i >= 0; i--) {
      if (historique[i].date_valorisation <= date) return historique[i].valeur;
    }
    // Avant toute valorisation : 0 si l'actif n'était pas encore acquis.
    const acquisition = asset.date_acquisition?.slice(0, 10);
    if (acquisition && date < acquisition) return 0;
    return historique.length > 0 ? historique[0].valeur : asset.valeur_estimee || 0;
  };

  const totalActifs = (date: string, refDate: Date, courant: boolean) =>
    assets.reduce((sum, asset) => {
      if (!asset.id) return sum;
      const a = asset as Asset & { id: string };
      const valeur = courant ? asset.valeur_estimee || 0 : valeurActif(a, date);
      return sum + valeur * ponderation(a, refDate);
    }, 0);

  // Passifs : part du foyer (non qualifié → 0), hors emprunts de société.
  const partPassif = (item: Parameters<typeof getRepartitionFoyer>[0]): number => {
    try {
      const { user, spouse } = getRepartitionFoyer(item);
      return user + spouse;
    } catch (error) {
      if (error instanceof BienNonQualifieError) return 0;
      throw error;
    }
  };
  const lignesPassif = [
    ...passifs.map((p) => {
      const debut = p.date_souscription?.slice(0, 10) ?? null;
      return { part: partPassif(p), montant: (date: string) => (debut && date < debut ? 0 : p.montant_du || 0) };
    }),
    ...emprunts.filter((e) => !e.societe_id).map((e) => {
      const contrat = contratDepuisEmprunt(e);
      const tableau = contrat ? construireTableau(contrat) : null;
      // Sans date de souscription, un contrat complet démarre le mois précédant sa première échéance.
      const debut = e.date_souscription?.slice(0, 10)
        ?? (contrat ? format(addMonths(contrat.datePremiereEcheance, -1), 'yyyy-MM-dd') : null);
      return {
        part: partPassif(e),
        montant: (date: string, courant: boolean) => {
          if (courant) return e.capital_restant_du || 0;
          if (debut && date < debut) return 0;
          return contrat && tableau ? capitalRestantDuAu(tableau, contrat.capitalInitial, new Date(date)) : e.capital_restant_du || 0;
        },
      };
    }),
  ];
  const totalPassifs = (date: string, courant: boolean) =>
    lignesPassif.reduce((sum, l) => sum + l.montant(date, courant) * l.part, 0);

  const point = (date: string, refDate: Date, courant: boolean): EvolutionPatrimoinePoint => {
    const actifs = totalActifs(date, refDate, courant);
    const passifsTotal = totalPassifs(date, courant);
    return { date, actifs, passifs: passifsTotal, net: actifs - passifsTotal, valorisation: datesValorisation.has(date) };
  };

  const points = dates.map((date) => point(date, new Date(date), false));
  // Point final aux valeurs courantes (valeur_estimee, capital restant dû
  // actualisé), pour que la courbe se termine sur la carte « Patrimoine net ».
  points.push(point(todayStr, today, true));
  return points;
};
