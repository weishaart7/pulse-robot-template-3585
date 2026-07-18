import { Societe } from '@/services/societeService';
import { SocieteParticipation } from '@/services/societeParticipationService';
import { buildParticipationGraph, computeNodeDepths, ParticipationEdge } from '@/lib/societes/participations';

export interface SocieteParticipationGraphNode {
  id: string;
  denomination: string;
  typeSociete: string;
  depth: number;
  // Somme des participations directes entrantes (pas le calcul indirect multi-chemins,
  // qui suppose de choisir une société de départ) : signale une incohérence de saisie
  // simple à détecter (plusieurs mères déclarant ensemble plus de 100% d'une même fille).
  pourcentageEntrantDirect: number;
  depasse100: boolean;
  originalData: Societe;
}

export interface SocieteParticipationGraphEdge {
  id: string;
  source: string;
  target: string;
  pourcentage: number;
}

export interface SocieteParticipationGraphResult {
  nodes: SocieteParticipationGraphNode[];
  edges: SocieteParticipationGraphEdge[];
}

/**
 * Construit le graphe de détention société → société à partir des données brutes,
 * indépendamment de toute librairie de rendu (consommé par SocieteParticipationsGraph).
 * Les sociétés sans aucune participation entrante ou sortante apparaissent comme
 * nœuds isolés à la profondeur 0.
 */
export function buildSocieteParticipationGraph(
  societes: Societe[],
  participations: SocieteParticipation[]
): SocieteParticipationGraphResult {
  const participationEdges: ParticipationEdge[] = participations.map(p => ({
    id: p.id,
    societeMereId: p.societe_mere_id,
    societeFilleId: p.societe_fille_id,
    pourcentage: p.pourcentage,
  }));

  const graph = buildParticipationGraph(participationEdges);
  const depthsById = new Map(computeNodeDepths(graph).map(d => [d.id, d.depth]));

  const pourcentageEntrantParSociete = new Map<string, number>();
  participations.forEach(p => {
    pourcentageEntrantParSociete.set(
      p.societe_fille_id,
      (pourcentageEntrantParSociete.get(p.societe_fille_id) ?? 0) + p.pourcentage
    );
  });

  const nodes: SocieteParticipationGraphNode[] = societes.map(societe => {
    const pourcentageEntrantDirect = pourcentageEntrantParSociete.get(societe.id) ?? 0;
    return {
      id: societe.id,
      denomination: societe.denomination,
      typeSociete: societe.type_societe,
      depth: depthsById.get(societe.id) ?? 0,
      pourcentageEntrantDirect,
      depasse100: pourcentageEntrantDirect > 100,
      originalData: societe,
    };
  });

  const edges: SocieteParticipationGraphEdge[] = participations.map(p => ({
    id: p.id,
    source: p.societe_mere_id,
    target: p.societe_fille_id,
    pourcentage: p.pourcentage,
  }));

  return { nodes, edges };
}
