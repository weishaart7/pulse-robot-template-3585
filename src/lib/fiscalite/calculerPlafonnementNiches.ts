/**
 * Plafonnement global des avantages fiscaux (art. 200-0 A CGI), revenus 2025/impôt 2026.
 *
 * Plafond de 10 000 €, majoré de la part ESUS retenue (au plus 3 000 €, soit 13 000 €) et de la part
 * outre-mer retenue (au plus 8 000 €, soit 18 000 € ; 21 000 € avec les deux). L'excédent s'ajoute à
 * l'impôt. Règles et parts relevées sur le simulateur officiel 2026 :
 * - courants : services à la personne (7DB), garde d'enfants (7GA…7GG) — 7DB 10 000 € + 7GA 1 750 €
 *   → baisse de 10 000 €, remboursement limité à 10 000 € pour un foyer non imposable ;
 * - ESUS (7DC) : seul 25 000 € → 13 000 € ;
 * - outre-mer : 100 %, 44 % (rétrocession 56 %), 34 % (rétrocession 66 %) ou 30 % (logement social)
 *   du montant, selon la case — parts appliquées par l'appelant ;
 * - SOFICA : majoration de 8 000 € partagée avec l'outre-mer ; PME, ESUS 2025, FCPI/FIP dans `courants`
 *   (sans majoration ESUS) ; JEI/JEIR hors plafond ;
 * - hors plafond : dons, cotisations syndicales, scolarité, prestations compensatoires, cadre 8.
 *
 * Hypothèse : une réduction non imputée faute d'impôt compte pour son montant entier.
 */
export const PLAFOND_NICHES = 10_000;
export const MAJORATION_PLAFOND_ESUS = 3_000;
export const MAJORATION_PLAFOND_OUTRE_MER = 8_000;

export interface AvantagesPlafonnes {
  /** Avantages soumis au seul plafond de 10 000 €. */
  courants: number;
  /** Réductions ESUS (7DC). */
  esus: number;
  /** Avantages outre-mer, déjà multipliés par leur part retenue. */
  outreMer: number;
  /** Réductions SOFICA (7EN, 7GN, 7FN) : majoration de 8 000 € partagée avec l'outre-mer. */
  sofica?: number;
}

export interface PlafonnementNichesResult {
  avantagesRetenus: number;
  plafond: number;
  /** Excédent ajouté à l'impôt. */
  excedent: number;
}

export function calculerPlafonnementNiches(a: AvantagesPlafonnes): PlafonnementNichesResult {
  const courants = Math.max(0, a.courants);
  const esus = Math.max(0, a.esus);
  const outreMer = Math.max(0, a.outreMer);
  const sofica = Math.max(0, a.sofica ?? 0);
  const avantagesRetenus = courants + esus + outreMer + sofica;
  const plafond = PLAFOND_NICHES + Math.min(MAJORATION_PLAFOND_ESUS, esus)
    + Math.min(MAJORATION_PLAFOND_OUTRE_MER, outreMer + sofica);
  return {
    avantagesRetenus,
    plafond,
    excedent: Math.round(Math.max(0, avantagesRetenus - plafond)),
  };
}
