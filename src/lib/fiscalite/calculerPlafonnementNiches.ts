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
 * Montants attendus : avantages effectivement imputés (simulateur officiel 2026 : PFU seul, 7DB 12 000 € et
 * PME 9 000 € → aucun excédent). La part imputée des réductions est calculée par useFiscalOverview.
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
  /** Avantages Scellier par année d'investissement (plafonds historiques, voir PLAFONDS_MILLESIMES). */
  millesimes?: Partial<Record<2009 | 2010 | 2011 | 2012, number>>;
  /** Revenu net imposable : base de la part proportionnelle des plafonds historiques. */
  revenuNetImposable?: number;
}

/**
 * Plafonds de l'année d'investissement (art. 200-0 A, versions 2009 à 2012), relevés sur le
 * simulateur officiel 2026 (RNI 470 890 € → 72 089 / 57 671 / 46 253 / 36 836 €). Emboîtés de
 * l'année courante vers la plus ancienne : retenu = min(retenu + avantages de l'année, plafond).
 */
export const PLAFONDS_MILLESIMES: [2012 | 2011 | 2010 | 2009, number, number][] = [
  [2012, 18_000, 0.04], [2011, 18_000, 0.06], [2010, 20_000, 0.08], [2009, 25_000, 0.10],
];

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
  const actuels = courants + esus + outreMer + sofica;
  const plafondActuel = PLAFOND_NICHES + Math.min(MAJORATION_PLAFOND_ESUS, esus)
    + Math.min(MAJORATION_PLAFOND_OUTRE_MER, outreMer + sofica);
  let avantagesRetenus = actuels;
  let retenus = Math.min(actuels, plafondActuel);
  let plafond = plafondActuel;
  const rni = Math.max(0, a.revenuNetImposable ?? 0);
  for (const [annee, fixe, taux] of PLAFONDS_MILLESIMES) {
    const avantages = Math.max(0, a.millesimes?.[annee] ?? 0);
    if (avantages === 0) continue;
    avantagesRetenus += avantages;
    plafond = Math.round(fixe + taux * rni);
    retenus = Math.min(retenus + avantages, plafond);
  }
  return {
    avantagesRetenus,
    plafond,
    excedent: Math.round(Math.max(0, avantagesRetenus - retenus)),
  };
}
