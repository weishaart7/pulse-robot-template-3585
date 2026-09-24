import { useMemo } from 'react';
import { Asset } from '@/services/assetService';
import { Passif, Emprunt } from '@/services/passifService';
import { AssetDemembrement } from '@/services/assetDemembrementService';
import {
  checkIsInCouple,
  formatCurrency as formatCurrencyUtil
} from '@/lib/patrimoine/utils';
import { getAssetCategory } from '@/constants/assetTypes';
import { getRepartitionFoyer, BienNonQualifieError, SuccessionAssetInput } from '@/lib/patrimoine/succession';
import { getFractionDemembrement, DemembrementFractionContext } from '@/lib/patrimoine/demembrementFraction';
import { computePlusValueActif } from '@/lib/patrimoine/plusValueActif';

// Valeurs par défaut stables : un `[]`/`{}` littéral en paramètre serait
// recréé à chaque rendu et invaliderait tous les useMemo qui en dépendent.
const NO_DEMEMBREMENTS: AssetDemembrement[] = [];

interface FinancialSummary {
  totalActifs: number;
  totalPassifs: number;
  patrimoineNet: number;
}

interface PatrimoineParPersonne {
  userFirstName: string;
  spouseFirstName: string;
  userValue: number;
  spouseValue: number;
  userOwnValue: number;
  userSharedValue: number;
  spouseOwnValue: number;
  spouseSharedValue: number;
  userActifs: number;
  spouseActifs: number;
  userPassifs: number;
  spousePassifs: number;
  totalValue: number;
  showSpouse: boolean;
}

export interface UnqualifiedItem {
  id: string;
  label: string;
  type: 'actif' | 'passif' | 'emprunt';
  // Motif de l'exclusion des totaux : qualification civile absente (défaut,
  // cf. BienNonQualifieError) ou, pour un actif démembré, âge de l'usufruitier
  // non renseigné (barème 669 CGI non calculable).
  reason?: 'qualification' | 'demembrement';
}

interface PlusValuesSummary {
  totalPlusValues: number;
  totalMoinsValues: number;
  netPlusValue: number;
  byCategory: Record<string, { plusValue: number; count: number }>;
  assetsWithPlusValue: Array<{
    id: string;
    denomination: string;
    nature: string;
    plusValue: number;
    valeurEstimee: number;
    valeurAcquisition: number;
    fraisAcquisition: number;
    dateAcquisition?: string;
    origineActif?: string[];
    partsCedants: number[];
  }>;
}

interface UsePatrimoineCalculationsProps {
  assets: Asset[];
  passifs: Passif[];
  emprunts: Emprunt[];
  userFirstName?: string;
  spouseFirstName?: string;
  statutCouple?: string;
  // Optionnels : nécessaires pour pondérer un actif en usufruit/nue-propriété
  // par le barème 669 CGI dans les totaux. Sans eux, tout actif démembré
  // reste compté à sa valeur pleine propriété (comportement historique).
  assetDemembrements?: AssetDemembrement[];
  demembrementCtx?: DemembrementFractionContext;
}

export const usePatrimoineCalculations = ({
  assets,
  passifs,
  emprunts,
  userFirstName = 'Vous',
  spouseFirstName = 'Conjoint',
  statutCouple,
  assetDemembrements = NO_DEMEMBREMENTS,
  demembrementCtx: demembrementCtxProp
}: UsePatrimoineCalculationsProps) => {
  const isInCouple = useMemo(() => checkIsInCouple(statutCouple), [statutCouple]);

  // Les appelants passent un objet littéral recréé à chaque rendu : on le
  // stabilise sur ses trois champs pour ne pas relancer les calculs.
  const { familyProfile, maritalStatus, familyLinks } = demembrementCtxProp ?? {};
  const demembrementCtx = useMemo<DemembrementFractionContext>(
    () => ({ familyProfile, maritalStatus, familyLinks }),
    [familyProfile, maritalStatus, familyLinks]
  );

  // Démembrements indexés une fois par actif (au lieu d'un filter par actif).
  const demembrementsByAsset = useMemo(() => {
    const map = new Map<string, AssetDemembrement[]>();
    assetDemembrements.forEach((d) => {
      const list = map.get(d.asset_id);
      if (list) list.push(d);
      else map.set(d.asset_id, [d]);
    });
    return map;
  }, [assetDemembrements]);

  // Valeur estimée pondérée par la fraction de démembrement (1 pour un bien en
  // pleine propriété). Un actif démembré dont l'âge de l'usufruitier n'est pas
  // calculable est exclu des totaux (valueById = 0, id dans unqualifiedIds)
  // plutôt que compté à sa valeur pleine propriété — même traitement que
  // `BienNonQualifieError`, cf. `unqualifiedItems` plus bas.
  const demembrement = useMemo(() => {
    const valueById = new Map<string, number>();
    const unqualifiedIds = new Set<string>();
    assets.forEach((asset) => {
      if (!asset.id) return;
      const demembrementsForAsset = demembrementsByAsset.get(asset.id) ?? [];
      const fraction = getFractionDemembrement(asset, demembrementsForAsset, demembrementCtx);
      if (fraction === null) {
        unqualifiedIds.add(asset.id);
        valueById.set(asset.id, 0);
      } else {
        valueById.set(asset.id, (asset.valeur_estimee || 0) * fraction);
      }
    });
    return { valueById, unqualifiedIds };
  }, [assets, demembrementsByAsset, demembrementCtx]);

  // Source unique de vérité pour "part revenant à l'utilisateur" : même
  // fonction que le module Transmission (lib/patrimoine/succession.ts),
  // fusionnée ici pour remplacer l'ancienne logique dupliquée basée
  // uniquement sur `detenteur` (qui ignorait `qualification_bien` et pouvait
  // diverger du calcul de succession pour un même bien — cf. incident du
  // 2026-07-18). "Own" = qualification 'Bien propre'/'Bien personnel'
  // (binaire), "Shared" = 'Bien commun'/'Indivision' (fraction). Un bien/
  // passif/emprunt jamais qualifié est exclu des totaux (jamais deviné) et
  // remonté dans `unqualifiedItems`.
  const { patrimoineParPersonne, unqualifiedItems, repartitionById } = useMemo<{
    patrimoineParPersonne: PatrimoineParPersonne;
    unqualifiedItems: UnqualifiedItem[];
    repartitionById: Map<string, { user: number; spouse: number }>;
  }>(() => {
    let userOwnValue = 0;
    let userSharedValue = 0;
    let spouseOwnValue = 0;
    let spouseSharedValue = 0;
    let userOwnPassifs = 0;
    let userSharedPassifs = 0;
    let spouseOwnPassifs = 0;
    let spouseSharedPassifs = 0;
    const unqualified: UnqualifiedItem[] = [];
    // Répartition user/conjoint de chaque actif qualifié (user + spouse < 1
    // pour une indivision avec des tiers), réutilisée par les plus-values.
    const repartitions = new Map<string, { user: number; spouse: number }>();

    const isShared = (qualification?: string | null) =>
      qualification === 'Bien commun' || qualification === 'Indivision';

    // Répartit `montant` entre utilisateur et conjoint (getRepartitionFoyer,
    // jamais `1 - part utilisateur`, cf. indivision avec des tiers). Retourne
    // null si l'élément n'est pas qualifié (exclu des totaux).
    const repartir = (
      item: SuccessionAssetInput & { qualification_bien?: string | null },
      label: string,
      onUnqualified: () => void
    ): { user: number; spouse: number; shared: boolean } | null => {
      try {
        const { user, spouse } = getRepartitionFoyer(item, label);
        return { user, spouse, shared: isShared(item.qualification_bien) };
      } catch (error) {
        if (error instanceof BienNonQualifieError) {
          onUnqualified();
          return null;
        }
        throw error;
      }
    };

    // Process assets
    assets.forEach(asset => {
      const label = asset.denomination || asset.nature;
      if (asset.id && demembrement.unqualifiedIds.has(asset.id)) {
        unqualified.push({ id: asset.id, label, type: 'actif', reason: 'demembrement' });
        return;
      }
      const estimatedValue = (asset.id ? demembrement.valueById.get(asset.id) : undefined) ?? (asset.valeur_estimee || 0);
      const r = repartir(asset, label, () =>
        unqualified.push({ id: asset.id!, label, type: 'actif', reason: 'qualification' })
      );
      if (!r) return;
      if (asset.id) repartitions.set(asset.id, { user: r.user, spouse: r.spouse });
      if (r.shared) {
        userSharedValue += estimatedValue * r.user;
        spouseSharedValue += estimatedValue * r.spouse;
      } else {
        userOwnValue += estimatedValue * r.user;
        spouseOwnValue += estimatedValue * r.spouse;
      }
    });

    const ajouterPassif = (montant: number, r: { user: number; spouse: number; shared: boolean }) => {
      if (r.shared) {
        userSharedPassifs += montant * r.user;
        spouseSharedPassifs += montant * r.spouse;
      } else {
        userOwnPassifs += montant * r.user;
        spouseOwnPassifs += montant * r.spouse;
      }
    };

    // Process passifs
    passifs.forEach(passif => {
      const r = repartir(passif, passif.nature, () =>
        unqualified.push({ id: passif.id, label: passif.nature, type: 'passif', reason: 'qualification' })
      );
      if (r) ajouterPassif(passif.montant_du || 0, r);
    });

    // Process emprunts (hors emprunts de société, déjà reflétés dans la valorisation des parts)
    emprunts.filter(e => !e.societe_id).forEach(emprunt => {
      const label = emprunt.libelle || emprunt.nature;
      const r = repartir(emprunt, label, () =>
        unqualified.push({ id: emprunt.id, label, type: 'emprunt', reason: 'qualification' })
      );
      if (r) ajouterPassif(emprunt.capital_restant_du || 0, r);
    });

    const userActifs = userOwnValue + userSharedValue;
    const spouseActifs = spouseOwnValue + spouseSharedValue;
    const userPassifs = userOwnPassifs + userSharedPassifs;
    const spousePassifs = spouseOwnPassifs + spouseSharedPassifs;
    const userValue = userActifs - userPassifs;
    const spouseValue = spouseActifs - spousePassifs;
    const totalValue = userValue + spouseValue;

    return {
      patrimoineParPersonne: {
        userFirstName,
        spouseFirstName,
        userValue,
        spouseValue,
        userOwnValue,
        userSharedValue,
        spouseOwnValue,
        spouseSharedValue,
        userActifs,
        spouseActifs,
        userPassifs,
        spousePassifs,
        totalValue,
        showSpouse: isInCouple
      },
      unqualifiedItems: unqualified,
      repartitionById: repartitions
    };
  }, [assets, passifs, emprunts, userFirstName, spouseFirstName, isInCouple, demembrement]);

  // Dérivé de patrimoineParPersonne (mêmes exclusions démembrement +
  // qualification civile) pour garantir financialSummary.patrimoineNet ===
  // patrimoineParPersonne.userValue + spouseValue dans tous les cas — cf. B1,
  // le bandeau "éléments exclus des totaux" du Résumé doit rester exact pour
  // les 3 cartes du haut, pas seulement pour "Patrimoine par tête".
  const financialSummary = useMemo<FinancialSummary>(() => {
    const totalActifs = patrimoineParPersonne.userActifs + patrimoineParPersonne.spouseActifs;
    const totalPassifs = patrimoineParPersonne.userPassifs + patrimoineParPersonne.spousePassifs;
    const patrimoineNet = patrimoineParPersonne.userValue + patrimoineParPersonne.spouseValue;
    return { totalActifs, totalPassifs, patrimoineNet };
  }, [patrimoineParPersonne]);

  const plusValuesSummary = useMemo<PlusValuesSummary>(() => {
    let totalPlusValues = 0;
    let totalMoinsValues = 0;
    const byCategory: Record<string, { plusValue: number; count: number }> = {};
    const assetsWithPlusValue: PlusValuesSummary['assetsWithPlusValue'] = [];

    assets.forEach(asset => {
      // Actif démembré dont l'âge de l'usufruitier n'est pas calculable :
      // exclu de la plus-value, même traitement que les autres agrégats
      // (cf. `demembrement.unqualifiedIds` plus haut).
      if (asset.id && demembrement.unqualifiedIds.has(asset.id)) return;

      // Pondération par la part du foyer : en indivision avec des tiers,
      // seule la quote-part du foyer entre dans la plus-value. Un bien non
      // qualifié (absent de repartitionById) reste à 100 %, détenu par
      // l'utilisateur seul pour le calcul par cédant de la surtaxe.
      const repartition = asset.id ? repartitionById.get(asset.id) : undefined;
      const partFoyer = repartition ? repartition.user + repartition.spouse : 1;
      const pv = computePlusValueActif(asset, demembrementsByAsset.get(asset.id ?? '') ?? [], demembrementCtx, partFoyer);
      const hasData = pv !== null;
      const plusValue = pv?.plusValue ?? 0;
      if (hasData) {
        const category = getAssetCategory(asset.nature);

        if (!byCategory[category]) {
          byCategory[category] = { plusValue: 0, count: 0 };
        }
        byCategory[category].plusValue += plusValue;
        byCategory[category].count += 1;

        if (plusValue > 0) {
          totalPlusValues += plusValue;
        } else {
          totalMoinsValues += Math.abs(plusValue);
        }

        assetsWithPlusValue.push({
          id: asset.id!,
          denomination: asset.denomination || asset.nature,
          nature: asset.nature,
          plusValue,
          valeurEstimee: pv!.valeurEstimee,
          valeurAcquisition: pv!.valeurAcquisition,
          fraisAcquisition: pv!.fraisAcquisition,
          dateAcquisition: asset.date_acquisition,
          origineActif: asset.origine_actif,
          // Quotes-parts de chaque cédant dans la part du foyer (somme = 1),
          // pour apprécier le seuil de la surtaxe PVI par cédant.
          partsCedants: repartition && partFoyer > 0
            ? [repartition.user / partFoyer, repartition.spouse / partFoyer].filter((p) => p > 0)
            : [1]
        });
      }
    });

    return {
      totalPlusValues,
      totalMoinsValues,
      netPlusValue: totalPlusValues - totalMoinsValues,
      byCategory,
      assetsWithPlusValue: assetsWithPlusValue.sort((a, b) => b.plusValue - a.plusValue)
    };
  }, [assets, demembrement, repartitionById, demembrementsByAsset, demembrementCtx]);

  const formatCurrency = formatCurrencyUtil;

  return {
    isInCouple,
    financialSummary,
    patrimoineParPersonne,
    unqualifiedItems,
    plusValuesSummary,
    formatCurrency
  };
};
