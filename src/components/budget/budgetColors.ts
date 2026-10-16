import { REVENUS_CATEGORIES, CHARGES_CATEGORIES } from '@/constants/budgetCategories';
import { INK } from '@/lib/palette';

// Palette des panneaux de travail (Famille) : lagon et citron par touches, encre et gris chauds.
// Revenus en lagon, charges en citron ; solde positif en lagon foncé, déficit et dépassement du
// plafond HCSF en rouge (cf. docs/budget.md, docs/design-system.md).
export const LAGON = '#55b4bd';
export const LAGON_INK = '#16707a';
export const LAGON_MID = '#a9d9de';
export const LAGON_DEEP = '#2d4a4f';
export const CITRON = '#d9fd86';
export const CITRON_MID = '#a8c44a';
export const CITRON_INK = '#4a5a10';
export const GREY = '#8a837c';
export const GREY_LIGHT = '#bfb8af';
// Part des revenus non consommée : piste neutre, pour ne pas concurrencer les couleurs de catégorie.
export const DISPONIBLE = '#e9e5e0';

const REVENUS_COLORS: Record<string, string> = {
  'Revenus du travail': LAGON_INK,
  'Revenus du patrimoine': LAGON,
  'Retraites, pensions & rentes': LAGON_MID,
  'Aides sociales & allocations': CITRON_MID,
  'Indemnités & remboursements': GREY,
  'Autres revenus': GREY_LIGHT,
};

const CHARGES_COLORS: Record<string, string> = {
  'Emprunts & Crédits': INK,
  'Logement & Habitation': CITRON_INK,
  'Transports & Mobilité': CITRON_MID,
  'Alimentation & Vie courante': CITRON,
  'Santé & Bien-être': LAGON,
  'Famille, Enfants & Éducation': LAGON_MID,
  'Impôts, Cotisations & Assurances': GREY,
  'Épargne & Investissements': LAGON_DEEP,
  'Loisirs, Culture & Numérique': LAGON_INK,
  'Solidarité, Pensions & Divers': GREY_LIGHT,
};

export const colorForRevenu = (categorie: string) => REVENUS_COLORS[categorie] || GREY;
export const colorForCharge = (categorie: string) => CHARGES_COLORS[categorie] || GREY;

// Catégorie de repli d'une nature inconnue — même règle que les répartitions du Résumé.
export const REVENU_FALLBACK = 'Revenus du patrimoine';
export const CHARGE_FALLBACK = 'Logement & Habitation';

const categorieOf = (nature: string, categories: Record<string, readonly string[]>, fallback: string) =>
  Object.entries(categories).find(([, natures]) => natures.includes(nature))?.[0] ?? fallback;

export const categorieRevenu = (nature: string) => categorieOf(nature, REVENUS_CATEGORIES, REVENU_FALLBACK);
export const categorieCharge = (nature: string) => categorieOf(nature, CHARGES_CATEGORIES, CHARGE_FALLBACK);
