/**
 * Moteur de calcul de la créance de participation (art. 1569-1581 C. civ.),
 * décès uniquement pour cette v1 (divorce = chantier séparé plus tard).
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
  exclusionBiensProfessionnels: boolean
): number {
  const originaire = sommeParEpoux(patrimoineOriginaire, epoux, exclusionBiensProfessionnels);
  const final = sommeParEpoux(patrimoineFinal, epoux, exclusionBiensProfessionnels);
  return Math.max(0, final - originaire);
}

/**
 * Créance de participation (art. 1571 al. 1) : la moitié de la différence
 * entre les acquêts nets des deux époux, due par l'époux au plus fort
 * acquêt net à l'autre. Nulle si les deux acquêts nets sont égaux.
 */
export function computeParticipationAcquets(input: ParticipationAcquetsInput): ParticipationAcquetsResult {
  const { patrimoineOriginaire, patrimoineFinal, exclusionBiensProfessionnels } = input;

  const acquetNet: Record<EpouxConcerne, number> = {
    user: computeAcquetNet('user', patrimoineOriginaire, patrimoineFinal, exclusionBiensProfessionnels),
    spouse: computeAcquetNet('spouse', patrimoineOriginaire, patrimoineFinal, exclusionBiensProfessionnels),
  };

  if (acquetNet.user === acquetNet.spouse) {
    return { acquetNet, epouxDebiteur: null, epouxCreancier: null, montantCreance: 0 };
  }

  const epouxDebiteur: EpouxConcerne = acquetNet.user > acquetNet.spouse ? 'user' : 'spouse';
  const epouxCreancier: EpouxConcerne = epouxDebiteur === 'user' ? 'spouse' : 'user';
  const montantCreance = Math.abs(acquetNet.user - acquetNet.spouse) / 2;

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
