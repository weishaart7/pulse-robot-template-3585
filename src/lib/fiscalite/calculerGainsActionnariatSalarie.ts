import { GainsActionnariatSalarieInput } from './types';

/**
 * Cases exclues du calcul d'IR : montants d'abattement déjà déduits de 1TZ
 * (les ajouter serait un double-comptage), ou contributions salariales qui ne
 * sont pas de l'IR. Le carried-interest (1NX/1OX) et les gains à taux
 * historique (3VD/3VI/3VF) sont désormais couverts par `impotForfaitaire`
 * ci-dessous (voir docs/fiscalite.md).
 */
export const CASES_GAINS_ACTIONNARIAT_EXCLUES_DU_CALCUL = [
  'case1uz', 'case1wz', 'case1vz', // montants d'abattement déjà déduits de 1TZ (métadonnées, pas un revenu)
  'case1ny', 'case1oy', // contribution salariale de 30 % sur le carried-interest : pas de l'IR
  'case3vn', // contribution salariale de 10 % sur options/AGA : pas de l'IR
] as const;

/** Taux forfaitaires (art. 150-0 A II 8° et gains pré-28.9.2012). */
const TAUX_CARRIED_INTEREST = 0.128; // PFU, IR seul (PS hors périmètre)
const TAUX_3VD = 0.18;
const TAUX_3VI = 0.30;
const TAUX_3VF = 0.41;

export interface GainsActionnariatSalarieResult {
  totalNetImposable: number;
  /**
   * Impôt à taux forfaitaire (carried-interest 1NX/1OX à 12,8 % PFU, gains
   * pré-28.9.2012 3VD/3VI/3VF à 18 %/30 %/41 %) : montant d'impôt déjà
   * calculé, distinct du revenu net imposable au barème — ne s'additionne
   * pas à `totalNetImposable`, s'ajoute à l'impôt net après décote dans
   * `calculerImpot.ts` (pas soumis au quotient familial, au plafonnement, à
   * la réduction outre-mer ni à la décote, propres au barème progressif).
   */
  impotForfaitaire: number;
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
 *
 * S'y ajoute l'impôt à taux forfaitaire (hors barème, voir `impotForfaitaire`
 * ci-dessus) : 1NX/1OX (carried-interest, PFU 12,8 %) et 3VD/3VI/3VF (gains
 * pré-28.9.2012, 18 %/30 %/41 % — la ventilation par taux est déjà faite par
 * le déclarant sur le CERFA, aucun seuil à recalculer ici).
 */
export function calculerGainsActionnariatSalarie(
  input: GainsActionnariatSalarieInput,
): GainsActionnariatSalarieResult {
  const totalNetImposable = (input.case1tp ?? 0) + (input.case1up ?? 0)
    + (input.case1tt ?? 0) + (input.case1ut ?? 0)
    + (input.case1tz ?? 0)
    + (input.case3vj ?? 0) + (input.case3vk ?? 0);

  const carriedInterest = (input.case1nx ?? 0) + (input.case1ox ?? 0);
  const impotForfaitaire = carriedInterest * TAUX_CARRIED_INTEREST
    + (input.case3vd ?? 0) * TAUX_3VD
    + (input.case3vi ?? 0) * TAUX_3VI
    + (input.case3vf ?? 0) * TAUX_3VF;

  return {
    totalNetImposable,
    impotForfaitaire,
    casesExclues: CASES_GAINS_ACTIONNARIAT_EXCLUES_DU_CALCUL,
  };
}
