import { PARAMETRES_REVENUS_2025 } from './revenus2025';
import type { ParametresFiscaux } from './types';

export type { ParametresFiscaux, TrancheBareme } from './types';
export { PARAMETRES_REVENUS_2025 };

/** Millésimes disponibles, par année de revenus. */
const PARAMETRES_PAR_ANNEE: Readonly<Record<number, ParametresFiscaux>> = {
  2025: PARAMETRES_REVENUS_2025,
};

/** Année de revenus calculée par défaut (déclaration en cours). */
export const ANNEE_REVENUS_PAR_DEFAUT = 2025;
export const PARAMETRES_PAR_DEFAUT = PARAMETRES_PAR_ANNEE[ANNEE_REVENUS_PAR_DEFAUT];

export const anneesRevenusDisponibles = (): number[] => Object.keys(PARAMETRES_PAR_ANNEE).map(Number).sort();

/** Paramètres d'une année de revenus ; erreur explicite si le millésime n'existe pas. */
export function parametresFiscaux(anneeRevenus: number): ParametresFiscaux {
  const parametres = PARAMETRES_PAR_ANNEE[anneeRevenus];
  if (!parametres) throw new Error(`Millésime fiscal indisponible : revenus ${anneeRevenus}`);
  return parametres;
}
