import { GainsActionnariatSalarieInput } from './types';

/**
 * Cases exclues du calcul d'IR : montants d'abattement déjà déduits de 1TZ
 * (les ajouter serait un double-comptage), ou régimes fiscaux distincts du
 * barème progressif des salaires — pas de moteur pour ces régimes dans le
 * repo (voir docs/fiscalite.md).
 */
export const CASES_GAINS_ACTIONNARIAT_EXCLUES_DU_CALCUL = [
  'case1uz', 'case1wz', 'case1vz', // montants d'abattement déjà déduits de 1TZ (métadonnées, pas un revenu)
  'case1nx', 'case1ox', // carried-interest : régime plus-value (PFU 12,8 %+PS ou option barème séparée), pas un salaire
  'case1ny', 'case1oy', // contribution salariale de 30 % sur le carried-interest : pas de l'IR
  'case3vd', 'case3vi', 'case3vf', // gains pré-28.9.2012 à taux forfaitaire (18 %/30 %/41 %) : régime à taux proportionnel, pas le barème
  'case3vn', // contribution salariale de 10 % sur options/AGA : pas de l'IR
] as const;

export interface GainsActionnariatSalarieResult {
  totalNetImposable: number;
  casesExclues: readonly string[];
}

/**
 * Gains d'actionnariat salarié imposables au barème comme un salaire (art.
 * 80 bis/80 quaterdecies CGI, revenus 2025/impôt 2026), limité aux cases dont
 * le régime est sans ambiguïté le barème progressif :
 * - 1TP/1UP (rabais excédentaire sur options) : imposé comme un salaire.
 * - 1TT/1UT (gains de levée d'options / AGA post-28.9.2012, cas général ou
 *   fraction > 300 000 €) : barème, sans abattement.
 * - 1TZ (gain imposable "après abattement", case unique) : déjà net des
 *   abattements 1UZ/1WZ/1VZ, s'ajoute tel quel.
 * - 3VJ/3VK (option barème pour les gains pré-28.9.2012, en lieu et place des
 *   taux forfaitaires 3VD/3VI/3VF) : le CERFA les qualifie explicitement de
 *   "catégorie des salaires".
 *
 * Cases hors calcul : voir CASES_GAINS_ACTIONNARIAT_EXCLUES_DU_CALCUL.
 */
export function calculerGainsActionnariatSalarie(
  input: GainsActionnariatSalarieInput,
): GainsActionnariatSalarieResult {
  const totalNetImposable = (input.case1tp ?? 0) + (input.case1up ?? 0)
    + (input.case1tt ?? 0) + (input.case1ut ?? 0)
    + (input.case1tz ?? 0)
    + (input.case3vj ?? 0) + (input.case3vk ?? 0);

  return {
    totalNetImposable,
    casesExclues: CASES_GAINS_ACTIONNARIAT_EXCLUES_DU_CALCUL,
  };
}
