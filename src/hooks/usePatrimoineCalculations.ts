import { useMemo } from 'react';
import { Asset } from '@/services/assetService';
import { Passif, Emprunt } from '@/services/passifService';
import { AssetDemembrement } from '@/services/assetDemembrementService';
import {
  checkIsInCouple,
  calculatePlusValue,
  formatCurrency as formatCurrencyUtil
} from '@/lib/patrimoine/utils';
import { getAssetCategory } from '@/constants/assetTypes';
import { getPartSuccessorale, BienNonQualifieError } from '@/lib/patrimoine/succession';
import { getFractionDemembrement, DemembrementFractionContext } from '@/lib/patrimoine/demembrementFraction';

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
    dateAcquisition?: string;
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
  assetDemembrements = [],
  demembrementCtx = {}
}: UsePatrimoineCalculationsProps) => {
  const isInCouple = useMemo(() => checkIsInCouple(statutCouple), [statutCouple]);

  // Valeur estimée pondérée par la fraction de démembrement (1 pour un bien en
  // pleine propriété). Un actif démembré dont l'âge de l'usufruitier n'est pas
  // calculable est exclu des totaux (valueById = 0, id dans unqualifiedIds)
  // plutôt que compté à sa valeur pleine propriété — même traitement que
  // `BienNonQualifieError`, cf. `unqualifiedItems` plus bas.
  const demembrement = useMemo(() => {
    const valueById = new Map<string, number>();
    const fractionById = new Map<string, number>();
    const unqualifiedIds = new Set<string>();
    assets.forEach((asset) => {
      if (!asset.id) return;
      const demembrementsForAsset = assetDemembrements.filter((d) => d.asset_id === asset.id);
      const fraction = getFractionDemembrement(asset, demembrementsForAsset, demembrementCtx);
      if (fraction === null) {
        unqualifiedIds.add(asset.id);
        valueById.set(asset.id, 0);
        fractionById.set(asset.id, 0);
      } else {
        valueById.set(asset.id, (asset.valeur_estimee || 0) * fraction);
        fractionById.set(asset.id, fraction);
      }
    });
    return { valueById, fractionById, unqualifiedIds };
  }, [assets, assetDemembrements, demembrementCtx]);

  // Source unique de vérité pour "part revenant à l'utilisateur" : même
  // fonction que le module Transmission (lib/patrimoine/succession.ts),
  // fusionnée ici pour remplacer l'ancienne logique dupliquée basée
  // uniquement sur `detenteur` (qui ignorait `qualification_bien` et pouvait
  // diverger du calcul de succession pour un même bien — cf. incident du
  // 2026-07-18). "Own" = qualification 'Bien propre'/'Bien personnel'
  // (binaire), "Shared" = 'Bien commun'/'Indivision' (fraction). Un bien/
  // passif/emprunt jamais qualifié est exclu des totaux (jamais deviné) et
  // remonté dans `unqualifiedItems`.
  const { patrimoineParPersonne, unqualifiedItems } = useMemo<{
    patrimoineParPersonne: PatrimoineParPersonne;
    unqualifiedItems: UnqualifiedItem[];
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

    const isShared = (qualification?: string | null) =>
      qualification === 'Bien commun' || qualification === 'Indivision';

    // Process assets
    assets.forEach(asset => {
      if (asset.id && demembrement.unqualifiedIds.has(asset.id)) {
        unqualified.push({ id: asset.id, label: asset.denomination || asset.nature, type: 'actif', reason: 'demembrement' });
        return;
      }
      const estimatedValue = (asset.id ? demembrement.valueById.get(asset.id) : undefined) ?? (asset.valeur_estimee || 0);
      try {
        const userFraction = getPartSuccessorale(asset, asset.denomination || asset.nature);
        if (isShared(asset.qualification_bien)) {
          userSharedValue += estimatedValue * userFraction;
          spouseSharedValue += estimatedValue * (1 - userFraction);
        } else {
          userOwnValue += estimatedValue * userFraction;
          spouseOwnValue += estimatedValue * (1 - userFraction);
        }
      } catch (error) {
        if (error instanceof BienNonQualifieError) {
          unqualified.push({ id: asset.id!, label: asset.denomination || asset.nature, type: 'actif', reason: 'qualification' });
        } else {
          throw error;
        }
      }
    });

    // Process passifs
    passifs.forEach(passif => {
      const montant = passif.montant_du || 0;
      try {
        const userFraction = getPartSuccessorale(passif, passif.nature);
        if (isShared(passif.qualification_bien)) {
          userSharedPassifs += montant * userFraction;
          spouseSharedPassifs += montant * (1 - userFraction);
        } else {
          userOwnPassifs += montant * userFraction;
          spouseOwnPassifs += montant * (1 - userFraction);
        }
      } catch (error) {
        if (error instanceof BienNonQualifieError) {
          unqualified.push({ id: passif.id, label: passif.nature, type: 'passif', reason: 'qualification' });
        } else {
          throw error;
        }
      }
    });

    // Process emprunts (hors emprunts de société, déjà reflétés dans la valorisation des parts)
    emprunts.filter(e => !e.societe_id).forEach(emprunt => {
      const montant = emprunt.capital_restant_du || 0;
      try {
        const userFraction = getPartSuccessorale(emprunt, emprunt.libelle || emprunt.nature);
        if (isShared(emprunt.qualification_bien)) {
          userSharedPassifs += montant * userFraction;
          spouseSharedPassifs += montant * (1 - userFraction);
        } else {
          userOwnPassifs += montant * userFraction;
          spouseOwnPassifs += montant * (1 - userFraction);
        }
      } catch (error) {
        if (error instanceof BienNonQualifieError) {
          unqualified.push({ id: emprunt.id, label: emprunt.libelle || emprunt.nature, type: 'emprunt', reason: 'qualification' });
        } else {
          throw error;
        }
      }
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
      unqualifiedItems: unqualified
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

      // Valeur estimée ET valeur d'acquisition pondérées par la même fraction
      // de démembrement (barème 669 CGI), pour que la plus-value d'un actif
      // démembré reste cohérente (une nue-propriété acquise 100k€ vaut
      // aujourd'hui une fraction de sa valeur pleine propriété, tout comme son
      // coût d'acquisition d'origine représentait déjà cette même fraction).
      const fraction = asset.id ? demembrement.fractionById.get(asset.id) ?? 1 : 1;
      const valeurEstimeePonderee = (asset.id ? demembrement.valueById.get(asset.id) : undefined) ?? (asset.valeur_estimee || 0);
      const valeurAcquisitionPonderee = (asset.valeur_acquisition === undefined || asset.valeur_acquisition === null)
        ? asset.valeur_acquisition
        : asset.valeur_acquisition * fraction;
      const { plusValue, hasData } = calculatePlusValue(
        valeurEstimeePonderee,
        valeurAcquisitionPonderee,
        asset.frais_acquisition
      );

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
          valeurEstimee: valeurEstimeePonderee,
          valeurAcquisition: valeurAcquisitionPonderee || 0,
          dateAcquisition: asset.date_acquisition
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
  }, [assets, demembrement]);

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
