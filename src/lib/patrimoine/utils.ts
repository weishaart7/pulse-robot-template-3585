/**
 * Patrimoine utilities - centralized functions for asset/liability management
 */

// Category colors for consistent visualization
export const CATEGORY_COLORS: Record<string, string> = {
  'actifs immobiliers': '#05E8A4',
  'actifs mobiliers corporels': '#2609D6',
  'actifs professionnels': '#D5B7FF',
  'épargne retraite et prévoyance': '#7B0700',
  'épargne et assurance-vie': '#FF0095',
  'épargne salariale': '#FF8B55',
  'épargne bancaire / liquidités': '#314A46',
  'valeurs mobilières et placements financiers': '#89FC00',
  'autres': '#FF8B55',
};

export const getCategoryColor = (category: string): string => {
  return CATEGORY_COLORS[category.toLowerCase()] || '#000000';
};

// Currency formatting
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Percentage formatting
export const formatPercentage = (value: number, total: number): string => {
  if (total === 0) return '0.00';
  return ((value / total) * 100).toFixed(2);
};

// Detenteur mapping functions
export interface FamilyInfo {
  hasPartner: boolean;
  userFirstName?: string;
  partnerFirstName?: string;
  userDateNaissance?: string;
  partnerDateNaissance?: string;
}

export const mapDetenteurToDisplay = (dbValue: string | undefined, familyInfo: FamilyInfo): string => {
  if (!dbValue) return familyInfo.userFirstName || 'Utilisateur';
  
  switch (dbValue.toLowerCase()) {
    case 'user':
    case 'utilisateur':
      return familyInfo.userFirstName || 'Utilisateur';
    case 'spouse':
    case 'conjoint':
      return familyInfo.partnerFirstName || 'Conjoint';
    case 'common':
    case 'commun':
    case 'couple':
    case 'le couple':
      return 'Le couple';
    default:
      return dbValue;
  }
};

export const mapDetenteurToDb = (displayValue: string, familyInfo: FamilyInfo): string => {
  if (displayValue === familyInfo.userFirstName || displayValue === 'Vous' || displayValue === 'Utilisateur') {
    return 'user';
  }
  if (displayValue === familyInfo.partnerFirstName || displayValue === 'Conjoint') {
    return 'spouse';
  }
  if (displayValue === 'Le couple' || displayValue === 'Commun') {
    return 'common';
  }
  return displayValue;
};

export const isDetenteurUser = (detenteur: string | undefined): boolean => {
  if (!detenteur) return true;
  const d = detenteur.toLowerCase();
  return d === 'user' || d === 'utilisateur';
};

export const isDetenteurSpouse = (detenteur: string | undefined): boolean => {
  if (!detenteur) return false;
  const d = detenteur.toLowerCase();
  return d === 'spouse' || d === 'conjoint';
};

export const isDetenteurCommon = (detenteur: string | undefined): boolean => {
  if (!detenteur) return false;
  const d = detenteur.toLowerCase();
  return d === 'common' || d === 'commun' || d === 'couple' || d === 'le couple';
};

// Check if user is in couple
export const checkIsInCouple = (statutCouple: string | undefined): boolean => {
  if (!statutCouple) return false;
  const s = statutCouple
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z ]/g, '');
  if (s.includes('mari')) return true;
  if (s.includes('pacs')) return true;
  if (s.includes('concubin')) return true;
  return false;
};

// Répartition user/conjoint pour un bien détenu en commun (défaut 50/50)
export interface PourcentagesRepartition {
  userQuote: number;
  spouseQuote: number;
}

export const getPourcentagesRepartition = (
  pourcentageUtilisateur: number | undefined,
  pourcentageConjoint: number | undefined
): PourcentagesRepartition => {
  return {
    userQuote: (pourcentageUtilisateur ?? 50) / 100,
    spouseQuote: (pourcentageConjoint ?? 50) / 100,
  };
};

// Plus-value calculation
export interface PlusValueResult {
  plusValue: number;
  hasData: boolean;
}

export const calculatePlusValue = (
  valeurEstimee: number | undefined,
  valeurAcquisition: number | undefined,
  fraisAcquisition: number | undefined
): PlusValueResult => {
  if (valeurEstimee === undefined || valeurAcquisition === undefined) {
    return { plusValue: 0, hasData: false };
  }
  const frais = fraisAcquisition || 0;
  const plusValue = valeurEstimee - valeurAcquisition - frais;
  return { plusValue, hasData: true };
};
