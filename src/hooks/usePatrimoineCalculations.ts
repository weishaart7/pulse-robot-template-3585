import { useMemo } from 'react';
import { Asset } from '@/services/assetService';
import { Passif, Emprunt } from '@/services/passifService';
import { 
  checkIsInCouple, 
  isDetenteurUser, 
  isDetenteurSpouse, 
  isDetenteurCommon,
  calculatePlusValue,
  formatCurrency as formatCurrencyUtil
} from '@/lib/patrimoine/utils';
import { getAssetCategory } from '@/constants/assetTypes';

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

  const patrimoineParPersonne = useMemo<PatrimoineParPersonne>(() => {
    let userOwnValue = 0;
    let userSharedValue = 0;
    let spouseOwnValue = 0;
    let spouseSharedValue = 0;
    let userOwnPassifs = 0;
    let userSharedPassifs = 0;
    let spouseOwnPassifs = 0;
    let spouseSharedPassifs = 0;

    // Process assets
    assets.forEach(asset => {
      const estimatedValue = asset.valeur_estimee || 0;
      const detenteur = asset.detenteur;

      if (!isInCouple) {
        userOwnValue += estimatedValue;
      } else {
        if (isDetenteurUser(detenteur)) {
          userOwnValue += estimatedValue;
        } else if (isDetenteurSpouse(detenteur)) {
          spouseOwnValue += estimatedValue;
        } else if (isDetenteurCommon(detenteur)) {
          const userQuote = (asset.pourcentage_utilisateur ?? 50) / 100;
          const spouseQuote = (asset.pourcentage_conjoint ?? 50) / 100;
          userSharedValue += estimatedValue * userQuote;
          spouseSharedValue += estimatedValue * spouseQuote;
        }
      }
    });

    // Process passifs
    passifs.forEach(passif => {
      const montant = passif.montant_du || 0;
      const detenteur = passif.detenteur;

      if (!isInCouple) {
        userOwnPassifs += montant;
      } else {
        if (isDetenteurUser(detenteur)) {
          userOwnPassifs += montant;
        } else if (isDetenteurSpouse(detenteur)) {
          spouseOwnPassifs += montant;
        } else if (isDetenteurCommon(detenteur)) {
          const userQuote = (passif.pourcentage_utilisateur ?? 50) / 100;
          const spouseQuote = (passif.pourcentage_conjoint ?? 50) / 100;
          userSharedPassifs += montant * userQuote;
          spouseSharedPassifs += montant * spouseQuote;
        }
      }
    });

    // Process emprunts
    emprunts.forEach(emprunt => {
      const montant = emprunt.capital_restant_du || 0;
      const detenteur = emprunt.detenteur;

      if (!isInCouple) {
        userOwnPassifs += montant;
      } else {
        if (isDetenteurUser(detenteur)) {
          userOwnPassifs += montant;
        } else if (isDetenteurSpouse(detenteur)) {
          spouseOwnPassifs += montant;
        } else if (isDetenteurCommon(detenteur)) {
          const userQuote = (emprunt.pourcentage_utilisateur ?? 50) / 100;
          const spouseQuote = (emprunt.pourcentage_conjoint ?? 50) / 100;
          userSharedPassifs += montant * userQuote;
          spouseSharedPassifs += montant * spouseQuote;
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
    plusValuesSummary,
    formatCurrency
  };
};
