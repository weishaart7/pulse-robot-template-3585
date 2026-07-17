import { useMemo } from 'react';
import { Asset } from '@/services/assetService';
import { Passif, Emprunt } from '@/services/passifService';
import {
  checkIsInCouple,
  calculatePlusValue,
  formatCurrency as formatCurrencyUtil
} from '@/lib/patrimoine/utils';
import { getAssetCategory } from '@/constants/assetTypes';
import { getPartSuccessorale, BienNonQualifieError } from '@/lib/patrimoine/succession';

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
}

export const usePatrimoineCalculations = ({
  assets,
  passifs,
  emprunts,
  userFirstName = 'Vous',
  spouseFirstName = 'Conjoint',
  statutCouple
}: UsePatrimoineCalculationsProps) => {
  const isInCouple = useMemo(() => checkIsInCouple(statutCouple), [statutCouple]);

  const financialSummary = useMemo<FinancialSummary>(() => {
    const totalActifs = assets.reduce((sum, asset) => sum + (asset.valeur_estimee || 0), 0);
    const totalPassifs = passifs.reduce((sum, passif) => sum + (passif.montant_du || 0), 0) 
      + emprunts.reduce((sum, emprunt) => sum + (emprunt.capital_restant_du || 0), 0);
    const patrimoineNet = totalActifs - totalPassifs;
    return { totalActifs, totalPassifs, patrimoineNet };
  }, [assets, passifs, emprunts]);

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
      const estimatedValue = asset.valeur_estimee || 0;
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
          unqualified.push({ id: asset.id!, label: asset.denomination || asset.nature, type: 'actif' });
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
          unqualified.push({ id: passif.id, label: passif.nature, type: 'passif' });
        } else {
          throw error;
        }
      }
    });

    // Process emprunts
    emprunts.forEach(emprunt => {
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
          unqualified.push({ id: emprunt.id, label: emprunt.libelle || emprunt.nature, type: 'emprunt' });
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
  }, [assets, passifs, emprunts, userFirstName, spouseFirstName, isInCouple]);

  const plusValuesSummary = useMemo<PlusValuesSummary>(() => {
    let totalPlusValues = 0;
    let totalMoinsValues = 0;
    const byCategory: Record<string, { plusValue: number; count: number }> = {};
    const assetsWithPlusValue: PlusValuesSummary['assetsWithPlusValue'] = [];

    assets.forEach(asset => {
      const { plusValue, hasData } = calculatePlusValue(
        asset.valeur_estimee,
        asset.valeur_acquisition,
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
          valeurEstimee: asset.valeur_estimee || 0,
          valeurAcquisition: asset.valeur_acquisition || 0,
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
  }, [assets]);

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
