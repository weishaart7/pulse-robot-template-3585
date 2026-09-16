/**
 * Moteur de calcul de la créance de participation (art. 1569-1581 C. civ.).
 * La formule elle-même (moitié de la différence des acquêts nets) ne dépend
 * pas de la cause de dissolution, mais son seul consommateur est
 * `computeTransmission` (lib/transmission/index.ts), un moteur de succession
 * qui simule un décès. Le cas du divorce est une limite assumée, documentée
 * dans docs/transmission.md §4 : le traiter suppose de construire une
 * nouvelle surface produit (simulation de divorce, sans lien avec la
 * succession/DMTG) hors périmètre décidé de l'outil, pas de corriger cette
 * fonction — décision actée avec l'utilisateur, pas un chantier en attente.
 *
 * Indépendant du mécanisme A (qualifierBien/getPartSuccessorale) : la
 * participation aux acquêts n'a pas de masse commune, donc pas de
 * qualification bien par bien — c'est un calcul de créance entre deux
 * patrimoines (originaire et final) de chaque époux. Le résultat identifie
 * le débiteur/créancier indépendamment de qui décède, pour que le
 * branchement transmission (chantier séparé) puisse déterminer si la
 * créance est un actif ou un passif de la succession du défunt.
 */

import { EpouxConcerne } from '@/types/participationAcquets';

export interface PatrimoineLigneCalcInput {
  epoux: EpouxConcerne;
  valeur: number;
  bienProfessionnel: boolean;
}

export interface ParticipationAcquetsInput {
  patrimoineOriginaire: PatrimoineLigneCalcInput[];
  patrimoineFinal: PatrimoineLigneCalcInput[];
  /** Clause d'exclusion des biens professionnels du calcul de la créance de participation, active ou non. */
  exclusionBiensProfessionnels: boolean;
  /**
   * Clause de partage inégal des acquêts (art. 1581 C. civ.) : part de la
   * différence des acquêts nets attribuée à l'époux créancier, en % (0-100).
   * Par défaut 50 (partage par moitié, art. 1571 al. 1) si la clause n'est
   * pas active. 100 correspond à l'attribution de la totalité des acquêts de
   * l'un à l'autre, également permise par l'art. 1581.
   */
  partCreancierPct?: number;
  /**
   * Clause d'extension de la qualification d'acquêts : transfère l'intégralité
   * du patrimoine originaire propre des époux au profit de l'indivision, ce qui
   * a pour effet d'augmenter la masse de calcul de la créance de participation.
   * En pratique, le patrimoine originaire n'est plus déduit : l'acquêt net
   * devient égal au patrimoine final dans son intégralité.
   */
  extensionQualificationAcquets?: boolean;
}

export interface ParticipationAcquetsResult {
  acquetNet: Record<EpouxConcerne, number>;
  /** null si acquêts nets égaux (aucune créance due). */
  epouxDebiteur: EpouxConcerne | null;
  epouxCreancier: EpouxConcerne | null;
  montantCreance: number;
}

function sommeParEpoux(
  lignes: PatrimoineLigneCalcInput[],
  epoux: EpouxConcerne,
  exclusionBiensProfessionnels: boolean
): number {
  return lignes
    .filter((l) => l.epoux === epoux)
    .filter((l) => !exclusionBiensProfessionnels || !l.bienProfessionnel)
    .reduce((sum, l) => sum + l.valeur, 0);
}

/**
 * Acquêt net d'un époux (art. 1570) : différence entre son patrimoine final
 * et son patrimoine originaire, plancher à zéro (l'appauvrissement ne se
 * compense pas).
 */
export function computeAcquetNet(
  epoux: EpouxConcerne,
  patrimoineOriginaire: PatrimoineLigneCalcInput[],
  patrimoineFinal: PatrimoineLigneCalcInput[],
  exclusionBiensProfessionnels: boolean,
  extensionQualificationAcquets = false
): number {
  const originaire = extensionQualificationAcquets
    ? 0
    : sommeParEpoux(patrimoineOriginaire, epoux, exclusionBiensProfessionnels);
  const final = sommeParEpoux(patrimoineFinal, epoux, exclusionBiensProfessionnels);
  return Math.max(0, final - originaire);
}

/**
 * Créance de participation (art. 1571 al. 1) : la moitié de la différence
 * entre les acquêts nets des deux époux, due par l'époux au plus fort
 * acquêt net à l'autre. Nulle si les deux acquêts nets sont égaux.
 */
export function computeParticipationAcquets(input: ParticipationAcquetsInput): ParticipationAcquetsResult {
  const { patrimoineOriginaire, patrimoineFinal, exclusionBiensProfessionnels, partCreancierPct, extensionQualificationAcquets } = input;

  const acquetNet: Record<EpouxConcerne, number> = {
    user: computeAcquetNet('user', patrimoineOriginaire, patrimoineFinal, exclusionBiensProfessionnels, extensionQualificationAcquets),
    spouse: computeAcquetNet('spouse', patrimoineOriginaire, patrimoineFinal, exclusionBiensProfessionnels, extensionQualificationAcquets),
  };

  if (acquetNet.user === acquetNet.spouse) {
    return { acquetNet, epouxDebiteur: null, epouxCreancier: null, montantCreance: 0 };
  }

  const epouxDebiteur: EpouxConcerne = acquetNet.user > acquetNet.spouse ? 'user' : 'spouse';
  const epouxCreancier: EpouxConcerne = epouxDebiteur === 'user' ? 'spouse' : 'user';
  const pct = partCreancierPct ?? 50;
  const montantCreance = Math.abs(acquetNet.user - acquetNet.spouse) * (pct / 100);

  return { acquetNet, epouxDebiteur, epouxCreancier, montantCreance };
}

/**
 * Régime de participation aux acquêts (art. 1569 s.), détecté sur le libellé
 * humain stocké en base (`marital_status.regime_matrimonial`, ex.
 * "Participation aux acquêts"), pas sur la clé RegimeType — même approche que
 * recompensesCreances.ts::regimeHasMasseCommune, pour la même raison (aucune
 * table ne stocke la clé courte).
 */
export function regimeIsParticipationAcquets(regimeMatrimonial: string | null | undefined): boolean {
  if (!regimeMatrimonial) return false;
  return regimeMatrimonial.toLowerCase().includes('participation');
}
