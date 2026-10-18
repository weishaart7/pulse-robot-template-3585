// Détention du foyer dans chaque société, directe et indirecte (via les participations
// entre sociétés du foyer, table `societe_participations`).
//
// - Détention directe : quotités de la fiche (`pourcentage_utilisateur` + `pourcentage_conjoint`),
//   une quotité jamais saisie valant 100 % / 0 % (cf. formMapping.ts).
// - Détention indirecte : pour chaque société détenue en direct, sa détention multipliée par
//   la participation totale, en cascade et tous chemins confondus, vers la société visée
//   (computeTotalParticipations, participations/graph.ts).
// Les fractions ne sont jamais plafonnées : une sur-déclaration reste visible.
import { buildParticipationGraph, computeTotalParticipations } from './participations';

interface SocieteDetention {
  id: string;
  pourcentage_utilisateur?: number | null;
  pourcentage_conjoint?: number | null;
}

interface ParticipationDetention {
  id: string;
  societe_mere_id: string;
  societe_fille_id: string;
  pourcentage: number;
}

export interface DetentionFoyer {
  /** Fraction (0 à 1) détenue directement par le foyer. */
  directe: number;
  /** Fraction (0 à 1) détenue au travers d'autres sociétés du foyer. */
  indirecte: number;
  /** directe + indirecte. */
  totale: number;
}

export const detentionDirecteFoyer = (societe: SocieteDetention): number =>
  ((Number(societe.pourcentage_utilisateur ?? 100) || 0) + (Number(societe.pourcentage_conjoint ?? 0) || 0)) / 100;

export function computeDetentionsFoyer(
  societes: SocieteDetention[],
  participations: ParticipationDetention[]
): Map<string, DetentionFoyer> {
  const graph = buildParticipationGraph(participations.map(p => ({
    id: p.id,
    societeMereId: p.societe_mere_id,
    societeFilleId: p.societe_fille_id,
    pourcentage: Number(p.pourcentage),
  })));

  const indirectes = new Map<string, number>();
  for (const mere of societes) {
    const directeMere = detentionDirecteFoyer(mere);
    if (directeMere <= 0) continue;
    for (const r of computeTotalParticipations(graph, mere.id)) {
      indirectes.set(r.societeCibleId, (indirectes.get(r.societeCibleId) ?? 0) + directeMere * r.pourcentageTotal / 100);
    }
  }

  return new Map(societes.map(s => {
    const directe = detentionDirecteFoyer(s);
    const indirecte = indirectes.get(s.id) ?? 0;
    return [s.id, { directe, indirecte, totale: directe + indirecte }];
  }));
}
