/**
 * Coefficients annuels de revalorisation CNAV des salaires portés au compte,
 * appliqués à un revenu de l'année N pour l'exprimer en valeur actuelle avant
 * plafonnement au PASS de l'année (voir calculSAM.ts — l'ordre revalorisation
 * puis plafonnement compte).
 */
export const COEFFICIENT_REVALORISATION_CNAV: Record<number, number> = {
  2018: 1.181,
  2019: 1.164,
  2020: 1.153,
  2021: 1.149,
  2022: 1.137,
  2023: 1.085,
  2024: 1.031,
  2025: 1.009,
};
