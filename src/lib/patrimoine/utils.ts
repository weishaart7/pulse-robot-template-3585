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

// Répartition user/conjoint pour un bien détenu en commun (défaut 50/50).
//
// Les deux colonnes (`pourcentage_utilisateur` / `pourcentage_conjoint`) sont
// indépendantes en base : une saisie partielle est donc possible. Le défaut
// appliqué à la valeur manquante est le COMPLÉMENT À 100 de celle qui est
// renseignée (et 50/50 si aucune ne l'est), de sorte que la somme des deux
// quotes-parts fasse toujours 100 % — auparavant chacune recevait un défaut
// de 50 % indépendant, ce qui faisait qu'une saisie « 30 % pour
// l'utilisateur » produisait 30 % + 50 % = 80 % du bien, le solde
// disparaissant silencieusement des calculs de succession.
export interface PourcentagesRepartition {
  userQuote: number;
  spouseQuote: number;
}

const clampPourcentage = (n: number): number => Math.min(100, Math.max(0, n));

// Part de l'utilisateur pour un bien détenu en indivision avec des tiers
// (`detenteur === 'Indivision'`, distinct de "Le couple" — cf.
// getPourcentagesRepartition ci-dessus pour ce second cas). Source de vérité :
// la liste des co-indivisaires saisie via IndivisairesSection/
// asset_indivisaires, jamais un 50/50 par défaut (cf. succession.ts, P14).
//
// Le conjoint n'a structurellement aucune part sur ce type de bien : les
// co-indivisaires viennent de `family_links`, dont les types de lien
// (Enfant, Parent, Petit-enfant, ...) n'incluent pas "Conjoint" — le conjoint
// est modélisé séparément (`marital_status`) et ne peut donc jamais figurer
// dans `asset_indivisaires`. Sa quote-part sur ce bien est donc 0, pas un
// complément déduit.
export const getPartUtilisateurIndivisionTiers = (
  coIndivisaires: Array<{ pourcentage: number }>
): number => {
  const totalTiers = coIndivisaires.reduce((acc, i) => acc + (Number(i.pourcentage) || 0), 0);
  return clampPourcentage(100 - totalTiers);
};

export const getPourcentagesRepartition = (
  pourcentageUtilisateur: number | undefined,
  pourcentageConjoint: number | undefined
): PourcentagesRepartition => {
  // Les deux valeurs sont renseignées : on les respecte telles quelles, sans
  // rien recalculer (une éventuelle incohérence de saisie reste visible
  // plutôt que corrigée en silence).
  if (pourcentageUtilisateur !== undefined && pourcentageConjoint !== undefined) {
    return {
      userQuote: pourcentageUtilisateur / 100,
      spouseQuote: pourcentageConjoint / 100,
    };
  }

  if (pourcentageUtilisateur !== undefined) {
    const user = clampPourcentage(pourcentageUtilisateur);
    return { userQuote: user / 100, spouseQuote: (100 - user) / 100 };
  }

  if (pourcentageConjoint !== undefined) {
    const spouse = clampPourcentage(pourcentageConjoint);
    return { userQuote: (100 - spouse) / 100, spouseQuote: spouse / 100 };
  }

  return { userQuote: 0.5, spouseQuote: 0.5 };
};

// Plus-value calculation
export interface PlusValueResult {
  plusValue: number;
  hasData: boolean;
}

export const calculatePlusValue = (
  valeurEstimee: number | undefined | null,
  valeurAcquisition: number | undefined | null,
  fraisAcquisition: number | undefined | null
): PlusValueResult => {
  if (valeurEstimee === undefined || valeurEstimee === null
    || valeurAcquisition === undefined || valeurAcquisition === null) {
    return { plusValue: 0, hasData: false };
  }
  const frais = fraisAcquisition || 0;
  const plusValue = valeurEstimee - valeurAcquisition - frais;
  return { plusValue, hasData: true };
};
