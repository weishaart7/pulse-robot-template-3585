import { GainsActionnariatSalarieInput } from './types';

/**
 * Cases exclues du calcul d'IR : montants d'abattement déjà déduits de 1TZ
 * (les ajouter serait un double-comptage), ou contributions salariales qui ne
 * sont pas de l'IR. Les gains à taux historique (3VD/3VI/3VF) sont couverts
 * par `impotForfaitaire` ci-dessous (voir docs/fiscalite.md).
 */
export const CASES_GAINS_ACTIONNARIAT_EXCLUES_DU_CALCUL = [
  'case1uz', 'case1wz', 'case1vz', // montants d'abattement déjà déduits de 1TZ (métadonnées, pas un revenu)
  'case1ny', 'case1oy', // contribution salariale de 30 % sur le carried-interest : pas de l'IR
  'case3vn', // contribution salariale de 10 % sur options/AGA : pas de l'IR
  'case0xx', // système du quotient (art. 163-0 A CGI) : traité séparément par calculerImpot.ts, pas additionné à totalNetImposable
] as const;

/** Taux forfaitaires (gains pré-28.9.2012). */
const TAUX_3VD = 0.18;
const TAUX_3VI = 0.30;
const TAUX_3VF = 0.41;

/**
 * Gains d'actionnariat imposés dans la catégorie des traitements et salaires,
 * soumis à la déduction de 10 %/frais réels du déclarant : 1TP/1TT/1NX/1AY/1MP/
 * 3VJ (et symétriques déclarant 2). Ils ne font pas l'objet d'un abattement
 * propre : ils rejoignent le pool salaires de `calculerRevenuSalaires.ts`
 * (brochure DGFiP IR 2026 p.107 — « la déduction forfaitaire de 10 % ou la
 * déduction des frais réels s'applique sur le total des revenus déclarés dans
 * la catégorie des traitements et salaires », choix unique par personne,
 * plafond 14 555 € par membre du foyer).
 *
 * 1TZ en est exclu : BOFiP BOI-RSA-ES-20-20-20 §43 (régime repris par §44 pour
 * la fraction ≤ 300 000 € des AGA décidées à compter du 31.12.2016) — « la
 * déduction forfaitaire de 10 % pour frais professionnels ne s'applique pas
 * au gain d'acquisition. Aucune déduction au titre des frais réels et
 * justifiés ne peut, par ailleurs, être pratiquée sur ce gain. » La fraction
 * > 300 000 € relève du droit commun des salaires et se déclare en 1TT.
 */
export function basesGainsSalariaux(input: GainsActionnariatSalarieInput): { declarant1: number; declarant2: number } {
  return {
    declarant1: (input.case1tp ?? 0) + (input.case1tt ?? 0)
      + (input.case1nx ?? 0) + (input.case1ay ?? 0) + (input.case1mp ?? 0) + (input.case3vj ?? 0),
    declarant2: (input.case1up ?? 0) + (input.case1ut ?? 0)
      + (input.case1ox ?? 0) + (input.case1by ?? 0) + (input.case1mq ?? 0) + (input.case3vk ?? 0),
  };
}

export interface GainsActionnariatSalarieResult {
  totalNetImposable: number;
  /**
   * Impôt à taux forfaitaire (gains pré-28.9.2012 3VD/3VI/3VF à
   * 18 %/30 %/41 %) : montant d'impôt déjà calculé, distinct du revenu net
   * imposable au barème — ne s'additionne pas à `totalNetImposable`, s'ajoute
   * à l'impôt net après décote dans `calculerImpot.ts` (pas soumis au
   * quotient familial, au plafonnement, à la réduction outre-mer ni à la
   * décote, propres au barème progressif). Le carried-interest (1NX/1OX)
   * n'y figure plus — voir `calculerGainsActionnariatSalarie` ci-dessous.
   */
  impotForfaitaire: number;
  /**
   * Revenus exceptionnels ou différés à imposer selon le système du quotient
   * (0XX, art. 163-0 A CGI) : montant brut transmis tel quel à calculerImpot.ts,
   * qui applique lui-même la formule du quotient (coefficient fixe 4, voir
   * calculerImpot.ts) — n'entre ni dans totalNetImposable ni dans impotForfaitaire.
   */
  revenuExceptionnelQuotient: number;
  casesExclues: readonly string[];
}

/**
 * Gains d'actionnariat salarié imposables au barème comme un salaire (art.
 * 80 bis/80 quaterdecies CGI, revenus 2025/impôt 2026) :
 * - 1TP/1TT/1NX/1AY/1MP/3VJ (et symétriques) : déduction 10 %/frais réels
 *   arbitrée dans le pool salaires du déclarant (voir `basesGainsSalariaux`).
 *   L'appelant passe `gainsNetImposablesPoolSalaires`, part de ces gains dans
 *   le net imposable du pool (`calculerRevenuSalaires(...).gainsActionnariatNetImposable`).
 * - 1TZ : ajouté tel quel, déjà net des abattements 1UZ/1WZ/1VZ, sans 10 %
 *   ni frais réels (BOFiP BOI-RSA-ES-20-20-20 §43-44).
 * - 1NX/1OX : carried-interest ne remplissant pas les conditions du régime de
 *   faveur (art. 150-0 A II 8° CGI), requalifié salaire — barème, pas PFU
 *   (vérifié contre le simulateur officiel, voir docs/fiscalite.md).
 *
 * Cases hors calcul : voir CASES_GAINS_ACTIONNARIAT_EXCLUES_DU_CALCUL.
 *
 * S'y ajoute l'impôt à taux forfaitaire (hors barème, voir `impotForfaitaire`
 * ci-dessus) : 3VD/3VI/3VF (gains pré-28.9.2012, 18 %/30 %/41 % — la
 * ventilation par taux est déjà faite par le déclarant sur le CERFA, aucun
 * seuil à recalculer ici).
 */
export function calculerGainsActionnariatSalarie(
  input: GainsActionnariatSalarieInput,
  gainsNetImposablesPoolSalaires: number,
): GainsActionnariatSalarieResult {
  const totalNetImposable = gainsNetImposablesPoolSalaires + (input.case1tz ?? 0);

  const impotForfaitaire = (input.case3vd ?? 0) * TAUX_3VD
    + (input.case3vi ?? 0) * TAUX_3VI
    + (input.case3vf ?? 0) * TAUX_3VF;

  return {
    totalNetImposable,
    impotForfaitaire,
    revenuExceptionnelQuotient: Math.max(0, input.case0xx ?? 0),
    casesExclues: CASES_GAINS_ACTIONNARIAT_EXCLUES_DU_CALCUL,
  };
}
