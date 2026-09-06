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
  'case0xx', // système du quotient (art. 163-0 A CGI) : traité séparément par calculerImpot.ts, pas additionné à totalNetImposable
] as const;

/** Taux forfaitaires (art. 150-0 A II 8° et gains pré-28.9.2012). */
const TAUX_CARRIED_INTEREST = 0.128; // PFU, IR seul (PS hors périmètre)
const TAUX_3VD = 0.18;
const TAUX_3VI = 0.30;
const TAUX_3VF = 0.41;

/**
 * Abattement forfaitaire de 10 % sur 1TP/1TT/1AY/1MP/3VJ (options sur titres,
 * BSPCE sur option barème, "dispositifs innommés"/management packages) —
 * recherche BOFiP complémentaire (BOI-IR-DOMIC-10-20-20-30, retenue à la
 * source des non-résidents, art. 182 A ter CGI, assiette légalement définie
 * comme identique à l'avantage imposable ordinaire de l'art. 80 bis/80
 * quaterdecies CGI) : « l'assiette [...] est diminuée de la déduction
 * forfaitaire pour frais professionnels de 10 %. Aucune déduction au titre
 * des frais réels et justifiés ne peut être pratiquée. » — confirmé pour les
 * options sur titres (avant et après le 28.9.2012, y compris sur option pour
 * le barème, 3VJ), les BSPCE sur option barème depuis 2025 (1AY, mise à jour
 * BOFiP du 12.08.2025) et les "dispositifs innommés/plans non qualifiés"
 * (management packages, 1MP). Autonome, sans plancher (509 €)/plafond
 * (14 555 €) ni fusion avec le pool 1AJ/1GB/1AF de calculerRevenuSalaires.ts :
 * le texte exclut explicitement l'option frais réels pour ce gain, ce qui
 * exclut le mécanisme de choix unique par déclarant qui justifierait une
 * fusion de pool — décision validée en session (voir docs/fiscalite.md).
 * 1TZ n'y participe pas : déjà net des abattements 1UZ/1WZ/1VZ (durée de
 * détention, mécanisme différent et exclusif du forfaitaire de 10 % pour les
 * actions gratuites, BOI-RSA-ES-20-20-20 §43).
 */
const TAUX_ABATTEMENT_ACTIONNARIAT = 0.10;

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
 * 80 bis/80 quaterdecies CGI, revenus 2025/impôt 2026), limité aux cases dont
 * le régime est sans ambiguïté le barème progressif :
 * - 1TP/1UP (rabais excédentaire sur options) : imposé comme un salaire,
 *   **abattement forfaitaire de 10 % désormais appliqué** (voir
 *   TAUX_ABATTEMENT_ACTIONNARIAT ci-dessus).
 * - 1TT/1UT (gains de levée d'options / AGA post-28.9.2012, cas général ou
 *   fraction > 300 000 €) : barème, **abattement forfaitaire de 10 %**.
 * - 1TZ (gain imposable "après abattement", case unique) : déjà net des
 *   abattements 1UZ/1WZ/1VZ (durée de détention), s'ajoute tel quel, sans le
 *   forfaitaire de 10 % (mécanismes exclusifs, voir ci-dessus).
 * - 1AY/1BY (BSPCE, gain d'exercice taxable en salaires sur option, à compter
 *   du 1.1.2025) : **abattement forfaitaire de 10 %**, même famille que
 *   1TT/1UT.
 * - 1MP/1MQ (management packages, gains de cession sur titres souscrits par
 *   salariés/dirigeants à compter du 15.2.2025, part imposée en salaires) :
 *   **abattement forfaitaire de 10 %**, comme 1TT/1UT.
 * - 3VJ/3VK (option barème pour les gains pré-28.9.2012, en lieu et place des
 *   taux forfaitaires 3VD/3VI/3VF) : le CERFA les qualifie explicitement de
 *   "catégorie des salaires", **abattement forfaitaire de 10 %**.
 *
 * **Bug corrigé — 1TP/1TT/1AY/1MP/3VJ étaient ajoutées brutes, sans
 * l'abattement forfaitaire de 10 % que la brochure et le BOFiP consultés lors
 * de l'audit initial (Phase 4) ne permettaient ni de confirmer ni d'infirmer
 * explicitement.** Recherche BOFiP complémentaire (BOI-IR-DOMIC-10-20-20-30,
 * mise à jour du 12.08.2025) trouvée, confirmant le mécanisme pour ces 5
 * cases précisément — voir TAUX_ABATTEMENT_ACTIONNARIAT ci-dessus pour le
 * détail et les sources.
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
  // Abattement forfaitaire de 10 % (autonome, sans plancher/plafond) sur 1TP/1TT/1AY/1MP/3VJ, par déclarant.
  const baseAbattementDeclarant1 = (input.case1tp ?? 0) + (input.case1tt ?? 0)
    + (input.case1ay ?? 0) + (input.case1mp ?? 0) + (input.case3vj ?? 0);
  const baseAbattementDeclarant2 = (input.case1up ?? 0) + (input.case1ut ?? 0)
    + (input.case1by ?? 0) + (input.case1mq ?? 0) + (input.case3vk ?? 0);

  const totalNetImposable = baseAbattementDeclarant1 * (1 - TAUX_ABATTEMENT_ACTIONNARIAT)
    + baseAbattementDeclarant2 * (1 - TAUX_ABATTEMENT_ACTIONNARIAT)
    + (input.case1tz ?? 0);

  const carriedInterest = (input.case1nx ?? 0) + (input.case1ox ?? 0);
  const impotForfaitaire = carriedInterest * TAUX_CARRIED_INTEREST
    + (input.case3vd ?? 0) * TAUX_3VD
    + (input.case3vi ?? 0) * TAUX_3VI
    + (input.case3vf ?? 0) * TAUX_3VF;

  return {
    totalNetImposable,
    impotForfaitaire,
    revenuExceptionnelQuotient: Math.max(0, input.case0xx ?? 0),
    casesExclues: CASES_GAINS_ACTIONNARIAT_EXCLUES_DU_CALCUL,
  };
}
