/**
 * Périmètre de la société d'acquêts (régime « Séparation de biens avec
 * société d'acquêts »). Le contrat en fixe librement le contenu (art. 1387,
 * 1497 C. civ.) : tous les acquêts, des catégories de biens, ou des biens
 * désignés nommément. Stocké dans `marital_status.clauses_contrat.societe_acquets`
 * (même clé qu'avant, champs ajoutés sans migration) :
 *   { enabled, selectedAssets, excludedAssets, options: { residencePrincipale, tousAcquets, categories } }
 * `options.residencePrincipale` est l'ancienne case, toujours lue et écrite :
 * elle vaut la catégorie « Logement de la famille ».
 */

import { getAssetCategory } from '@/constants/assetTypes';
import type { Json } from '@/integrations/supabase/types';

export type CategorieSocieteAcquets =
  | 'residence_principale'
  | 'residences_secondaires'
  | 'immeubles'
  | 'meubles'
  | 'valeurs_mobilieres';

export const CATEGORIES_SOCIETE_ACQUETS: { key: CategorieSocieteAcquets; label: string }[] = [
  { key: 'residence_principale', label: 'Logement de la famille' },
  { key: 'residences_secondaires', label: 'Résidences secondaires' },
  { key: 'immeubles', label: 'Tous les immeubles' },
  { key: 'meubles', label: 'Tous les meubles' },
  { key: 'valeurs_mobilieres', label: 'Valeurs mobilières' },
];

export interface PerimetreSocieteAcquets {
  tousAcquets: boolean;
  categories: CategorieSocieteAcquets[];
  /** Biens désignés nommément : communs, y compris acquis avant le mariage (apport exprès). */
  biensDesignes: string[];
  /** Biens exclus nommément : jamais dans la société. */
  biensExclus: string[];
}

// Alias de type (et non interface) : assignable à la colonne JSON clauses_contrat.
export type SocieteAcquetsStockee = {
  enabled?: boolean;
  selectedAssets?: string[];
  excludedAssets?: string[];
  options?: {
    residencePrincipale?: boolean;
    tousAcquets?: boolean;
    categories?: CategorieSocieteAcquets[];
  };
};

export const lirePerimetre = (stocke?: SocieteAcquetsStockee | null): PerimetreSocieteAcquets => {
  const categories = new Set<CategorieSocieteAcquets>(stocke?.options?.categories ?? []);
  if (stocke?.options?.residencePrincipale) categories.add('residence_principale');
  return {
    tousAcquets: !!stocke?.options?.tousAcquets,
    categories: [...categories],
    biensDesignes: stocke?.selectedAssets ?? [],
    biensExclus: stocke?.excludedAssets ?? [],
  };
};

const objetJson = (clauses: Json | null | undefined): { [cle: string]: Json | undefined } =>
  clauses && typeof clauses === 'object' && !Array.isArray(clauses) ? clauses : {};

/** Périmètre lu dans `marital_status.clauses_contrat` (colonne JSON). */
export const lirePerimetreDesClauses = (clauses: Json | null | undefined): PerimetreSocieteAcquets =>
  lirePerimetre(objetJson(clauses).societe_acquets as SocieteAcquetsStockee | undefined);

/** `clauses_contrat` avec le périmètre écrit ; les autres clés éventuelles sont conservées. */
export const clausesAvecPerimetre = (clauses: Json | null | undefined, p: PerimetreSocieteAcquets): Json => ({
  ...objetJson(clauses),
  societe_acquets: ecrirePerimetre(p),
});

export const ecrirePerimetre = (p: PerimetreSocieteAcquets): SocieteAcquetsStockee => ({
  enabled: p.tousAcquets || p.categories.length > 0 || p.biensDesignes.length > 0,
  selectedAssets: p.biensDesignes,
  excludedAssets: p.biensExclus,
  options: {
    residencePrincipale: p.categories.includes('residence_principale'),
    tousAcquets: p.tousAcquets,
    categories: p.categories,
  },
});

const estImmeuble = (nature?: string) => !!nature && getAssetCategory(nature) === 'actifs immobiliers';

/** Catégorie du périmètre qui couvre ce bien (libellé), ou null. */
export const categorieCouvrante = (p: PerimetreSocieteAcquets, nature?: string): string | null => {
  if (p.tousAcquets) return 'tous les acquêts';
  const label = (k: CategorieSocieteAcquets) => CATEGORIES_SOCIETE_ACQUETS.find(c => c.key === k)!.label;
  if (p.categories.includes('residence_principale') && nature === 'Résidence principale') return label('residence_principale');
  if (p.categories.includes('residences_secondaires') && nature === 'Résidences secondaires') return label('residences_secondaires');
  if (p.categories.includes('immeubles') && estImmeuble(nature)) return label('immeubles');
  if (p.categories.includes('meubles') && nature && !estImmeuble(nature)) return label('meubles');
  if (
    p.categories.includes('valeurs_mobilieres') &&
    !!nature &&
    getAssetCategory(nature) === 'valeurs mobilières et placements financiers'
  ) return label('valeurs_mobilieres');
  return null;
};
